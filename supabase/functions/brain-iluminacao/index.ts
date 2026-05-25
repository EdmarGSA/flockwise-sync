// brain-iluminacao: decisor diário de iluminação adaptativa.
// Roda 2x/dia (03:30 e 12:00 local) + invocável on-demand (após nova pesagem).
// Para cada galpão com lote ativo:
//   1. Calcula horas_luz alvo a partir do programa cadastrado (linha base).
//   2. Ajusta com base em:
//       - divergência de peso médio recente vs meta da semana (metas_peso).
//       - estrutura do galpão (tipo_pressao, área) → ramp e intensidade.
//       - crepúsculo civil real (weather_curva_solar) para ancorar acender/apagar.
//       - céu nublado / UV baixo (weather_forecast_horario) → +15min luz.
//   3. Clampa override ≤ ±90 min e ≤ ±20pp intensidade vs faixa cadastrada.
//   4. Persiste em override_iluminacao_brain (1 linha por galpao+dia).
//   5. Cria comando_brain por canal de iluminação (status 'sugerido' se modo shadow, 'aprovado' se auto).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_OFFSET_MIN = 90;
const MAX_INTENSIDADE_PP = 20;
const TZ = "America/Sao_Paulo";

function idadeLoteDias(dataAlojamento: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(dataAlojamento).getTime()) / 86400000) + 1);
}

function semanaIdade(idadeDias: number): number {
  return Math.min(6, Math.max(1, Math.ceil(idadeDias / 7)));
}

function hhmm(d: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const h = parts.find(p => p.type === "hour")?.value ?? "00";
  const m = parts.find(p => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

function hhmmAddMin(base: string, deltaMin: number): string {
  const [h, m] = base.split(":").map(Number);
  let total = (h * 60 + m + deltaMin + 1440) % 1440;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function diffMin(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (ah * 60 + am) - (bh * 60 + bm);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface Decisao {
  galpao_id: string;
  lote_id: string;
  integrado_id: string;
  horas_luz: number;
  acender: string;
  apagar: string;
  intensidade: number;
  motivo: string;
  score: number;
  ramp_up: number;
  ramp_down: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const decisoes: any[] = [];

  try {
    // 1) Lotes ativos com galpão e núcleo (precisa do núcleo para o crepúsculo)
    const { data: lotes, error: eL } = await supabase
      .from("lotes")
      .select(`
        id, integrado_id, galpao_id, data_alojamento, linhagem, sexo, programa_iluminacao_id,
        galpoes!inner (
          id, nome, tipo_pressao, comprimento, largura, nucleo_id, automacao_brain,
          nucleos!inner ( id, tipo_producao )
        )
      `)
      .eq("status", "alojado")
      .not("data_alojamento", "is", null);

    if (eL) throw new Error(`lotes: ${eL.message}`);
    if (!lotes?.length) {
      return new Response(JSON.stringify({ ok: true, decisoes: [], msg: "sem lotes ativos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hojeISO = new Date().toISOString().slice(0, 10);
    const nucleoIds = [...new Set(lotes.map((l: any) => l.galpoes?.nucleo_id).filter(Boolean))];
    const integradoIds = [...new Set(lotes.map((l: any) => l.integrado_id))];

    // 2) Solar de hoje por núcleo
    const { data: solar } = nucleoIds.length
      ? await supabase.from("weather_curva_solar")
          .select("nucleo_id, nascer_sol, por_sol, crepusculo_civil_inicio, crepusculo_civil_fim")
          .eq("data", hojeISO).in("nucleo_id", nucleoIds)
      : { data: [] as any[] };
    const solarByNucleo = new Map<string, any>();
    for (const s of solar ?? []) solarByNucleo.set(s.nucleo_id, s);

    // 3) Forecast do dia (cobertura média de nuvens via weather_code) por núcleo
    const { data: forecast } = nucleoIds.length
      ? await supabase.from("weather_forecast_horario")
          .select("nucleo_id, hora, uv_index, condicao_codigo")
          .gte("hora", `${hojeISO}T00:00:00`).lt("hora", `${hojeISO}T23:59:59`)
          .in("nucleo_id", nucleoIds)
      : { data: [] as any[] };
    const nubladoByNucleo = new Map<string, boolean>();
    const fByNucleo = new Map<string, any[]>();
    for (const f of forecast ?? []) {
      const arr = fByNucleo.get(f.nucleo_id) ?? [];
      arr.push(f); fByNucleo.set(f.nucleo_id, arr);
    }
    for (const [n, arr] of fByNucleo) {
      const uvMedio = arr.reduce((s, x) => s + (x.uv_index ?? 0), 0) / arr.length;
      // weather_code >= 60 = chuva, >= 50 = drizzle, >=45 fog, >=3 nublado
      const codigoAlto = arr.filter(x => (x.condicao_codigo ?? 0) >= 3).length;
      nubladoByNucleo.set(n, uvMedio < 3 || codigoAlto > arr.length * 0.6);
    }

    // 4) Programas/faixas de luz vigentes
    const { data: programas } = await supabase
      .from("programa_iluminacao_lote")
      .select("id, integrado_id, tipo_producao, is_default, ativo")
      .in("integrado_id", integradoIds).eq("ativo", true);
    const programaIds = (programas ?? []).map((p: any) => p.id);
    const { data: faixas } = programaIds.length
      ? await supabase.from("programa_iluminacao_faixa").select("*").in("programa_id", programaIds)
      : { data: [] as any[] };
    const faixasByPrograma = new Map<string, any[]>();
    for (const f of faixas ?? []) {
      const arr = faixasByPrograma.get(f.programa_id) ?? [];
      arr.push(f); faixasByPrograma.set(f.programa_id, arr);
    }
    const defaultByOrgTipo = new Map<string, string>();
    for (const p of programas ?? []) {
      if (p.is_default) defaultByOrgTipo.set(`${p.integrado_id}::${p.tipo_producao}`, p.id);
    }

    // 5) Para cada lote: calcular decisão
    for (const lote of lotes as any[]) {
      const galpao = lote.galpoes;
      const nucleo = galpao?.nucleos;
      const modo = galpao?.automacao_brain ?? "off";
      if (modo === "off") continue;

      const idade = idadeLoteDias(lote.data_alojamento);
      const tipoProd = nucleo?.tipo_producao === "postura" ? "postura" : "frango_corte";
      const programaId = lote.programa_iluminacao_id
        ?? defaultByOrgTipo.get(`${lote.integrado_id}::${tipoProd}`);
      const programaFaixas = programaId ? faixasByPrograma.get(programaId) : null;
      const faixa = programaFaixas?.find((f: any) => idade >= f.dia_inicio && idade <= f.dia_fim);
      if (!faixa) continue;

      // Baseline da faixa cadastrada
      let horasLuz: number = Number(faixa.horas_luz);
      let intensidade: number = Number(faixa.intensidade_pct ?? 80);
      let rampUp: number = Number(faixa.ramp_up_min ?? 20);
      let rampDown: number = Number(faixa.ramp_down_min ?? 20);

      const motivos: string[] = [];
      let ajusteH = 0; // em horas (acumulado)
      let ajusteInt = 0;

      // === 5.1 Peso real vs meta da semana ===
      const sem = semanaIdade(idade);
      const colMeta = `meta_${sem * 7}_dias_kg`;
      const { data: meta } = await supabase
        .from("metas_peso")
        .select(colMeta)
        .eq("lote_id", lote.id)
        .maybeSingle();
      const metaKg = meta ? Number((meta as any)[colMeta]) : null;

      const { data: pesAgg } = await supabase
        .from("pesagens")
        .select("id, data_pesagem, pesagem_itens ( quantidade_aves, peso_liquido_kg, peso_bruto_kg, peso_tara_kg )")
        .eq("lote_id", lote.id)
        .gte("data_pesagem", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
        .order("data_pesagem", { ascending: false })
        .limit(3);

      let pesoMedioKg: number | null = null;
      const itensFlat = (pesAgg ?? []).flatMap((p: any) => p.pesagem_itens ?? []);
      if (itensFlat.length) {
        let somaPeso = 0, somaAves = 0;
        for (const it of itensFlat) {
          const liq = it.peso_liquido_kg ?? (Number(it.peso_bruto_kg ?? 0) - Number(it.peso_tara_kg ?? 0));
          const aves = Number(it.quantidade_aves ?? 0);
          if (aves > 0 && liq > 0) { somaPeso += Number(liq); somaAves += aves; }
        }
        if (somaAves > 0) pesoMedioKg = somaPeso / somaAves;
      }

      let divergenciaPct: number | null = null;
      if (pesoMedioKg != null && metaKg && metaKg > 0) {
        divergenciaPct = ((pesoMedioKg - metaKg) / metaKg) * 100;
        if (divergenciaPct < -5) {
          // peso atrasado → +luz +intensidade
          const extra = Math.min(1.0, Math.abs(divergenciaPct) / 10);
          ajusteH += extra;
          ajusteInt += 5;
          motivos.push(`Peso ${divergenciaPct.toFixed(1)}% abaixo da meta → +${(extra * 60).toFixed(0)}min luz`);
        } else if (divergenciaPct > 5) {
          // peso adiantado → mais escuridão
          const corte = Math.min(1.0, divergenciaPct / 10);
          ajusteH -= corte;
          motivos.push(`Peso ${divergenciaPct.toFixed(1)}% acima → -${(corte * 60).toFixed(0)}min luz`);
        } else {
          motivos.push(`Peso na meta (${divergenciaPct.toFixed(1)}%)`);
        }
      } else {
        motivos.push("Sem pesagem recente (usando baseline)");
      }

      // === 5.2 Estrutura do galpão ===
      const area = (Number(galpao?.comprimento ?? 0) * Number(galpao?.largura ?? 0));
      if (galpao?.tipo_pressao === "negativa") {
        // galpão fechado/dark-house → ramp mais curto, intensidade pode ser menor
        rampUp = Math.max(10, rampUp - 5);
        rampDown = Math.max(10, rampDown - 5);
        motivos.push("Dark-house: ramp curto");
      } else {
        // positiva/aberto → ramp longo para casar com luz natural
        rampUp = Math.min(40, rampUp + 5);
        rampDown = Math.min(40, rampDown + 5);
      }
      if (area > 2000) {
        // galpão grande → +intensidade
        ajusteInt += 3;
        motivos.push("Área grande: +3pp intensidade");
      }

      // === 5.3 Crepúsculo + nublado ===
      const sol = solarByNucleo.get(galpao.nucleo_id);
      let acender: string;
      let apagar: string;

      if (sol?.nascer_sol && sol?.por_sol) {
        const nascer = hhmm(new Date(sol.nascer_sol));
        const por = hhmm(new Date(sol.por_sol));
        // Ancora apagar no fim do crepúsculo civil
        const finalCrep = sol.crepusculo_civil_fim ? hhmm(new Date(sol.crepusculo_civil_fim)) : por;
        apagar = hhmmAddMin(finalCrep, 0);
        // Acender = apagar - horas_luz alvo
        const horasAlvo = clamp(horasLuz + ajusteH, 8, 23);
        acender = hhmmAddMin(apagar, -Math.round(horasAlvo * 60));
        // Se o crepúsculo da manhã é depois do horário calculado, antecipa para o nascer
        const inicioCrep = sol.crepusculo_civil_inicio ? hhmm(new Date(sol.crepusculo_civil_inicio)) : nascer;
        if (diffMin(inicioCrep, acender) > 30 && horasAlvo < 16) {
          // ajusta para não ficar luz artificial enquanto já tem sol
          acender = hhmmAddMin(inicioCrep, -15);
        }
        if (nubladoByNucleo.get(galpao.nucleo_id)) {
          acender = hhmmAddMin(acender, -15);
          motivos.push("Dia nublado: -15min no acender");
        }
        motivos.push(`Ancorado no crepúsculo (nascer ${nascer}, pôr ${por})`);
      } else {
        // Fallback: usa primeiro bloco do programa
        const b0 = (faixa.blocos ?? [])[0] ?? { acender: "05:00", apagar: "23:00" };
        acender = b0.acender;
        apagar = b0.apagar;
        motivos.push("Sem dados solares: usando programa");
      }

      // Recalcula horas efetivas
      const horasEfetivas = ((diffMin(apagar, acender) + 1440) % 1440) / 60;

      // === 5.4 Clamp de segurança contra faixa cadastrada ===
      const horasBase = Number(faixa.horas_luz);
      const desvioMin = (horasEfetivas - horasBase) * 60;
      if (Math.abs(desvioMin) > MAX_OFFSET_MIN) {
        // ajusta apagar para limitar desvio
        const corrMin = desvioMin > 0 ? (desvioMin - MAX_OFFSET_MIN) : (desvioMin + MAX_OFFSET_MIN);
        apagar = hhmmAddMin(apagar, -corrMin);
        motivos.push(`Clamp ±${MAX_OFFSET_MIN}min vs programa`);
      }
      const horasFinal = ((diffMin(apagar, acender) + 1440) % 1440) / 60;
      const intensidadeFinal = clamp(
        intensidade + clamp(ajusteInt, -MAX_INTENSIDADE_PP, MAX_INTENSIDADE_PP),
        20, 100,
      );

      // === 5.5 Decide se grava (skip se diferença for desprezível) ===
      const b0 = (faixa.blocos ?? [])[0] ?? null;
      const baseAcender = b0?.acender ?? "05:00";
      const baseApagar = b0?.apagar ?? "23:00";
      const difAcender = Math.abs(diffMin(acender, baseAcender));
      const difApagar = Math.abs(diffMin(apagar, baseApagar));
      const difInt = Math.abs(intensidadeFinal - intensidade);
      if (difAcender < 10 && difApagar < 10 && difInt < 3) {
        decisoes.push({ galpao_id: galpao.id, skip: "sem divergência relevante" });
        continue;
      }

      const decisao: Decisao = {
        galpao_id: galpao.id,
        lote_id: lote.id,
        integrado_id: lote.integrado_id,
        horas_luz: Number(horasFinal.toFixed(2)),
        acender, apagar,
        intensidade: Math.round(intensidadeFinal),
        motivo: motivos.join(" · "),
        score: divergenciaPct != null ? 0.85 : 0.65,
        ramp_up: rampUp,
        ramp_down: rampDown,
      };

      // === 5.6 Persiste override ===
      const blocos = [{
        acender: decisao.acender,
        apagar: decisao.apagar,
        intensidade_pct: decisao.intensidade,
      }];
      const { error: eUps } = await supabase
        .from("override_iluminacao_brain")
        .upsert({
          integrado_id: decisao.integrado_id,
          galpao_id: decisao.galpao_id,
          lote_id: decisao.lote_id,
          data_ref: hojeISO,
          horas_luz: decisao.horas_luz,
          acender_hhmm: decisao.acender,
          apagar_hhmm: decisao.apagar,
          intensidade_pct: decisao.intensidade,
          blocos,
          ramp_up_min: decisao.ramp_up,
          ramp_down_min: decisao.ramp_down,
          motivo: decisao.motivo,
          score_confianca: decisao.score,
          origem: modo === "auto" ? "brain_auto" : "brain_shadow",
          status: "ativo",
          expira_em: new Date(Date.now() + 24 * 3600_000).toISOString(),
        }, { onConflict: "galpao_id,data_ref" });

      if (eUps) {
        decisoes.push({ galpao_id: galpao.id, erro: eUps.message });
        continue;
      }

      // === 5.7 Gera comando_brain por canal de iluminação afetado ===
      const { data: canais } = await supabase
        .from("canais_dispositivo")
        .select("id, dispositivo_id, dispositivos_iot!inner(galpao_id, ativo)")
        .eq("tipo_equipamento", "iluminacao")
        .eq("ativo", true)
        .eq("dispositivos_iot.galpao_id", galpao.id);

      for (const c of canais ?? []) {
        await supabase.from("comando_brain").insert({
          integrado_id: decisao.integrado_id,
          galpao_id: galpao.id,
          canal_id: c.id,
          funcao: "iluminacao",
          estado_desejado: { horas_luz: decisao.horas_luz, acender: decisao.acender, apagar: decisao.apagar, intensidade: decisao.intensidade },
          motivo: decisao.motivo,
          status: modo === "auto" ? "aprovado" : "sugerido",
          origem: modo === "auto" ? "brain_auto" : "brain_shadow",
        });
      }

      decisoes.push({ galpao_id: galpao.id, ...decisao, modo });
    }

    return new Response(
      JSON.stringify({ ok: true, decisoes, duracao_ms: Date.now() - startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("brain-iluminacao error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
