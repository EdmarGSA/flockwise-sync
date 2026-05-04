// weather-aggregator: roda a cada 3h. Consolida snapshot histórico por núcleo
// e, à 00:30, agrega o clima diário por lote (horas em estresse, ITH, conforto).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const calcITH = (t: number, ur: number) => Number((t - (0.55 - 0.0055 * ur) * (t - 14.5)).toFixed(2));
const idadeDias = (d: string) => Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 86400000) + 1);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const log: any[] = [];
  let inseridos3h = 0, agregadosDiarios = 0;

  try {
    // ===== 1) Snapshot 3h por núcleo (usa observação atual) =====
    const { data: obs } = await supabase
      .from("weather_observacoes")
      .select("nucleo_id, integrado_id, temperatura_c, umidade_pct, vento_kmh, precipitacao_mm");

    const ts3h = (() => {
      const d = new Date();
      d.setUTCMinutes(0, 0, 0);
      const h = Math.floor(d.getUTCHours() / 3) * 3;
      d.setUTCHours(h);
      return d.toISOString();
    })();

    for (const o of obs ?? []) {
      const t = Number(o.temperatura_c), ur = Number(o.umidade_pct);
      const ith = !isNaN(t) && !isNaN(ur) ? calcITH(t, ur) : null;
      const { error } = await supabase.from("weather_historico_3h").upsert({
        nucleo_id: o.nucleo_id, integrado_id: o.integrado_id, ts_3h: ts3h,
        temp_med: t, temp_min: t, temp_max: t, ur_med: ur,
        ith_med: ith, ith_max: ith, vento_max: o.vento_kmh, precipitacao_mm: o.precipitacao_mm,
      }, { onConflict: "nucleo_id,ts_3h" });
      if (!error) inseridos3h++;
    }

    // ===== 2) Agregação diária por lote (executa quando hora local SP < 3) =====
    const horaSP = Number(new Date().toLocaleString("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }));
    const rodarDiario = horaSP < 3;

    if (rodarDiario) {
      const ontem = new Date(); ontem.setUTCDate(ontem.getUTCDate() - 1);
      const dataStr = ontem.toISOString().slice(0, 10);
      const inicio = new Date(dataStr + "T00:00:00Z").toISOString();
      const fim = new Date(dataStr + "T23:59:59Z").toISOString();

      const { data: lotes } = await supabase
        .from("lotes")
        .select("id, integrado_id, data_alojamento, galpao_id, galpoes!inner(nucleo_id, nucleos!inner(tipo_producao))")
        .eq("status", "alojado")
        .not("data_alojamento", "is", null);

      const { data: confortos } = await supabase.from("conforto_termico_ave").select("*");

      for (const lote of (lotes ?? []) as any[]) {
        const nucleoId = lote.galpoes?.nucleo_id;
        const tipoProd = lote.galpoes?.nucleos?.tipo_producao;
        if (!nucleoId) continue;
        const idade = idadeDias(lote.data_alojamento);
        const conf = confortos?.find(c => c.tipo_producao === tipoProd && idade >= c.idade_dia_inicio && idade <= c.idade_dia_fim);

        // Usa o que já estiver em forecast_horario (que cobre 72h passado/futuro durante a janela)
        const { data: leituras } = await supabase
          .from("weather_historico_3h")
          .select("temp_med, temp_min, temp_max, ur_med, ith_med, ith_max")
          .eq("nucleo_id", nucleoId)
          .gte("ts_3h", inicio).lte("ts_3h", fim);

        if (!leituras?.length) continue;

        const temps = leituras.map(l => Number(l.temp_med)).filter(n => !isNaN(n));
        const urs = leituras.map(l => Number(l.ur_med)).filter(n => !isNaN(n));
        const iths = leituras.map(l => Number(l.ith_med)).filter(n => !isNaN(n));
        const tempMin = Math.min(...temps); const tempMax = Math.max(...temps);
        const tempMed = temps.reduce((a, b) => a + b, 0) / temps.length;
        const urMed = urs.length ? urs.reduce((a, b) => a + b, 0) / urs.length : null;
        const ithMed = iths.length ? iths.reduce((a, b) => a + b, 0) / iths.length : null;
        const ithMax = iths.length ? Math.max(...iths) : null;

        let horasCalor = 0, horasFrio = 0, horasIth = 0, dentro = 0;
        if (conf) {
          for (const l of leituras) {
            const t = Number(l.temp_max); const i = Number(l.ith_max);
            const tMin = Number(l.temp_min);
            if (t >= conf.temp_max_critico) horasCalor += 3;
            if (tMin <= conf.temp_min_critico) horasFrio += 3;
            if (i >= conf.ith_max_critico) horasIth += 3;
            if (t <= conf.temp_max_ok && tMin >= conf.temp_min_ok) dentro += 3;
          }
        }

        await supabase.from("weather_lote_diario").upsert({
          lote_id: lote.id, integrado_id: lote.integrado_id, data: dataStr,
          idade_dias: idade,
          temp_min: tempMin, temp_med: Number(tempMed.toFixed(2)), temp_max: tempMax,
          ur_med: urMed != null ? Number(urMed.toFixed(2)) : null,
          ith_med: ithMed != null ? Number(ithMed.toFixed(2)) : null,
          ith_max: ithMax,
          horas_calor: horasCalor, horas_frio: horasFrio, horas_ith_alto: horasIth,
          dentro_conforto_pct: Number((dentro / 24 * 100).toFixed(2)),
        }, { onConflict: "lote_id,data" });
        agregadosDiarios++;
      }

      // Limpa previsões antigas
      await supabase.from("weather_forecast_horario")
        .delete().lt("hora_prevista", new Date(Date.now() - 6 * 3600 * 1000).toISOString());
    }

    return new Response(JSON.stringify({ ok: true, inseridos3h, agregadosDiarios, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
