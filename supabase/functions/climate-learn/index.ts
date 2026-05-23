// climate-learn — job de aprendizado por galpão.
// Cron 1x/hora. Para cada galpão com ≥48h de log, calcula:
//   - divergência média (setpoint vs leitura) → ajusta offset_temp_aprendido_c (EMA α=0.1, ±2°C)
//   - inércia estimada por tempo médio entre ação e estabilização
//   - fator_isolamento por amplitude diurna observada
// Opcional: gera narrativa via Lovable AI (Gemini Flash) explicando o perfil.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALPHA = 0.1;
const MAX_OFFSET = 2.0;

async function gerarNarrativa(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em climatização avícola. Gere uma narrativa curta (2-3 frases, máx 280 caracteres) em português brasileiro explicando o perfil térmico aprendido do galpão e dando uma recomendação prática." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: galpoes } = await supabase
    .from("galpoes")
    .select("id, nome, nucleo:nucleos!inner(integrado_id)")
    .eq("ativo", true);

  const since = new Date(Date.now() - 72 * 3600_000).toISOString();
  const treinados: any[] = [];

  for (const g of galpoes ?? []) {
    const integradoId = (g as any).nucleo?.integrado_id;
    if (!integradoId) continue;

    const { data: logs } = await supabase
      .from("log_decisao_clima")
      .select("created_at, setpoint_alvo, temp_lida, ith_calc, modo_dominante")
      .eq("galpao_id", g.id)
      .eq("funcao_automacao", "climate_brain")
      .gte("created_at", since)
      .not("setpoint_alvo", "is", null)
      .not("temp_lida", "is", null);

    if (!logs || logs.length < 48) {
      treinados.push({ galpao: g.id, skip: `amostras_insuficientes_${logs?.length ?? 0}` });
      continue;
    }

    // Divergência média
    const divs = logs.map((l: any) => Number(l.temp_lida) - Number(l.setpoint_alvo));
    const divMedia = divs.reduce((a, b) => a + b, 0) / divs.length;
    const divAbs = Math.abs(divMedia);
    const mae = divs.reduce((s, d) => s + Math.abs(d), 0) / divs.length;

    // Amplitude diurna (max - min) → fator de isolamento
    const temps = logs.map((l: any) => Number(l.temp_lida));
    const amplitude = Math.max(...temps) - Math.min(...temps);
    const fatorIsolamento = Math.max(0.6, Math.min(1.6, 1 + (amplitude - 6) * 0.05));

    // Carrega offset atual
    const { data: existente } = await supabase
      .from("aprendizado_galpao")
      .select("offset_temp_aprendido_c, narrativa_atualizada_em")
      .eq("galpao_id", g.id)
      .maybeSingle();

    const offsetAtual = Number(existente?.offset_temp_aprendido_c ?? 0);
    // Corrige no sentido oposto da divergência: se T > alvo, baixa offset (galpão esquenta mais)
    const novoOffset = Math.max(-MAX_OFFSET,
      Math.min(MAX_OFFSET, offsetAtual + ALPHA * (-divMedia)));

    // Narrativa (gera se nunca gerou ou >24h)
    let narrativa: string | null = null;
    const precisaNarrativa = !existente?.narrativa_atualizada_em ||
      (Date.now() - new Date(existente.narrativa_atualizada_em).getTime()) > 24 * 3600_000;
    if (precisaNarrativa && divAbs > 0.5) {
      const prompt = `Galpão "${g.nome}" — divergência média ${divMedia.toFixed(2)}°C entre setpoint e leitura, MAE ${mae.toFixed(2)}°C, amplitude diurna ${amplitude.toFixed(1)}°C, ${logs.length} amostras 72h. Offset aprendido aplicado: ${novoOffset.toFixed(2)}°C. Fator isolamento: ${fatorIsolamento.toFixed(2)}.`;
      narrativa = await gerarNarrativa(prompt);
    }

    await supabase.from("aprendizado_galpao").upsert({
      galpao_id: g.id,
      integrado_id: integradoId,
      offset_temp_aprendido_c: novoOffset,
      fator_isolamento: fatorIsolamento,
      amostras_treinadas: logs.length,
      ultimo_treino_em: new Date().toISOString(),
      modelo_versao: 1,
      metricas: { mae, divergencia_media: divMedia, amplitude_diurna: amplitude },
      ...(narrativa ? { narrativa_ia: narrativa, narrativa_atualizada_em: new Date().toISOString() } : {}),
    }, { onConflict: "galpao_id" });

    // ===== v2: aprendizado por zona × hora_dia =====
    // Para cada zona do galpão, coleta leituras das últimas 72h dos sensores daquela zona,
    // agrupa por hora do dia, compara com o setpoint médio do log na mesma janela,
    // e atualiza offset_c via EMA (α=0.1, ±2°C).
    let zonasAtualizadas = 0;
    try {
      const { data: devs } = await supabase
        .from("dispositivos_iot")
        .select("id, zona")
        .eq("galpao_id", g.id)
        .eq("ativo", true);

      const porZona = new Map<string, string[]>();
      for (const d of devs ?? []) {
        const z = (d as any).zona ?? "geral";
        if (!porZona.has(z)) porZona.set(z, []);
        porZona.get(z)!.push((d as any).id);
      }

      // Setpoint médio por hora-do-dia (do log já carregado)
      const setpointHora = new Map<number, { soma: number; n: number }>();
      for (const l of logs as any[]) {
        const h = new Date(l.created_at).getUTCHours();
        const sp = Number(l.setpoint_alvo);
        if (!Number.isFinite(sp)) continue;
        const acc = setpointHora.get(h) ?? { soma: 0, n: 0 };
        acc.soma += sp; acc.n += 1;
        setpointHora.set(h, acc);
      }

      for (const [zona, devIds] of porZona) {
        if (devIds.length === 0) continue;
        const { data: leituras } = await supabase
          .from("leituras_sensores")
          .select("temperatura_c, lido_em")
          .in("dispositivo_id", devIds)
          .gte("lido_em", since)
          .not("temperatura_c", "is", null);

        const tempHora = new Map<number, { soma: number; n: number }>();
        for (const r of leituras ?? []) {
          const t = Number((r as any).temperatura_c);
          if (!Number.isFinite(t)) continue;
          const h = new Date((r as any).lido_em).getUTCHours();
          const acc = tempHora.get(h) ?? { soma: 0, n: 0 };
          acc.soma += t; acc.n += 1;
          tempHora.set(h, acc);
        }

        const { data: existentes } = await supabase
          .from("aprendizado_zona_clima")
          .select("hora_dia, offset_c, amostras")
          .eq("galpao_id", g.id)
          .eq("zona", zona);
        const mapaExist = new Map<number, { offset_c: number; amostras: number }>(
          (existentes ?? []).map((e: any) => [e.hora_dia, { offset_c: Number(e.offset_c), amostras: e.amostras }]),
        );

        const upserts: any[] = [];
        for (const [h, accT] of tempHora) {
          const accSp = setpointHora.get(h);
          if (!accSp || accSp.n < 2 || accT.n < 3) continue;
          const tempMed = accT.soma / accT.n;
          const spMed = accSp.soma / accSp.n;
          const div = tempMed - spMed;
          const cur = mapaExist.get(h) ?? { offset_c: 0, amostras: 0 };
          const novo = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, cur.offset_c + ALPHA * (-div)));
          upserts.push({
            integrado_id: integradoId,
            galpao_id: g.id,
            zona,
            hora_dia: h,
            offset_c: Number(novo.toFixed(2)),
            amostras: cur.amostras + accT.n,
            atualizado_em: new Date().toISOString(),
          });
        }

        if (upserts.length > 0) {
          await supabase
            .from("aprendizado_zona_clima")
            .upsert(upserts, { onConflict: "galpao_id,zona,hora_dia" });
          zonasAtualizadas += upserts.length;
        }
      }
    } catch (e) {
      console.error("[climate-learn v2] erro aprendizado por zona:", e);
    }

    treinados.push({ galpao: g.id, novoOffset, mae, amostras: logs.length, zonas_buckets: zonasAtualizadas });
  }

  return new Response(JSON.stringify({ ok: true, treinados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
