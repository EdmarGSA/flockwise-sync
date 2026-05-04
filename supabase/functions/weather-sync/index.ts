// weather-sync: roda a cada 30 min via pg_cron
// Para cada núcleo com GPS: busca clima atual + previsão 72h no Open-Meteo,
// calcula curva solar local e dispara weather-alertas no fim.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const toJulian = (d: Date) => d.getTime() / 86400000 + 2440587.5;
const fromJulian = (j: number) => new Date((j - 2440587.5) * 86400000);

function calcularSolar(date: Date, lat: number, lon: number) {
  const d0 = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
  const J = toJulian(d0);
  const n = J - 2451545.0 + 0.0008;
  const Jstar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = M * RAD;
  const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaRad = lambda * RAD;
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
  const delta = Math.asin(Math.sin(lambdaRad) * Math.sin(23.44 * RAD));
  const ev = (alt: number) => {
    const cosH = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * Math.sin(delta)) /
                 (Math.cos(lat * RAD) * Math.cos(delta));
    if (cosH > 1 || cosH < -1) return { rise: null as Date | null, set: null as Date | null };
    const H = Math.acos(cosH) * DEG;
    const Jset = 2451545.0 + (Jstar + H / 360) + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
    const Jrise = Jtransit - (Jset - Jtransit);
    return { rise: fromJulian(Jrise), set: fromJulian(Jset) };
  };
  const sol = ev(-0.833);
  const civ = ev(-6);
  const fotoperiodo_min = sol.rise && sol.set ? Math.round((sol.set.getTime() - sol.rise.getTime()) / 60000) : null;
  return { ...sol, civ, fotoperiodo_min };
}

const calcITH = (t: number, ur: number) => Number((t - (0.55 - 0.0055 * ur) * (t - 14.5)).toFixed(2));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedAt = Date.now();
  const log: any[] = [];

  try {
    let nucleoIdFilter: string | null = null;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body && typeof body.nucleo_id === "string") nucleoIdFilter = body.nucleo_id;
      }
    } catch (_) { /* ignore */ }

    let q = supabase
      .from("nucleos")
      .select("id, integrado_id, latitude, longitude, weather_ativo, ativo")
      .eq("weather_ativo", true)
      .eq("ativo", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    if (nucleoIdFilter) q = q.eq("id", nucleoIdFilter);
    const { data: nucleos } = await q;

    if (!nucleos?.length) {
      return new Response(JSON.stringify({ ok: true, processados: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const n of nucleos) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${n.latitude}&longitude=${n.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,uv_index,precipitation&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,precipitation,uv_index,weather_code&forecast_days=3&timezone=auto&wind_speed_unit=kmh`;
        const r = await fetch(url);
        if (!r.ok) { log.push({ nucleo: n.id, erro: `http ${r.status}` }); continue; }
        const j = await r.json();

        // Observação atual
        const cur = j.current ?? {};
        await supabase.from("weather_observacoes").upsert({
          nucleo_id: n.id, integrado_id: n.integrado_id,
          temperatura_c: cur.temperature_2m, umidade_pct: cur.relative_humidity_2m,
          vento_kmh: cur.wind_speed_10m, vento_direcao_deg: cur.wind_direction_10m,
          uv_index: cur.uv_index, precipitacao_mm: cur.precipitation,
          condicao_codigo: cur.weather_code,
          observado_em: cur.time ? new Date(cur.time).toISOString() : new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        }, { onConflict: "nucleo_id" });

        // Previsão horária
        const h = j.hourly ?? {};
        const horas: string[] = h.time ?? [];
        const rows = horas.map((t, i) => {
          const temp = h.temperature_2m?.[i];
          const ur = h.relative_humidity_2m?.[i];
          return {
            nucleo_id: n.id, integrado_id: n.integrado_id,
            hora_prevista: new Date(t).toISOString(),
            temperatura_c: temp, umidade_pct: ur,
            vento_kmh: h.wind_speed_10m?.[i],
            prob_chuva_pct: h.precipitation_probability?.[i],
            precipitacao_mm: h.precipitation?.[i],
            uv_index: h.uv_index?.[i],
            condicao_codigo: h.weather_code?.[i],
            ith: temp != null && ur != null ? calcITH(temp, ur) : null,
          };
        });
        // limpa janela antiga e insere nova
        await supabase.from("weather_forecast_horario").delete().eq("nucleo_id", n.id);
        for (let i = 0; i < rows.length; i += 100) {
          await supabase.from("weather_forecast_horario").insert(rows.slice(i, i + 100));
        }

        // Solar 7 dias
        const lat = Number(n.latitude); const lon = Number(n.longitude);
        const solarRows = [] as any[];
        for (let d = 0; d < 7; d++) {
          const dt = new Date(); dt.setUTCDate(dt.getUTCDate() + d);
          const s = calcularSolar(dt, lat, lon);
          const dataStr = dt.toISOString().slice(0, 10);
          solarRows.push({
            nucleo_id: n.id, integrado_id: n.integrado_id, data: dataStr,
            nascer_sol: s.rise?.toISOString() ?? null,
            por_sol: s.set?.toISOString() ?? null,
            crepusculo_civil_inicio: s.civ.rise?.toISOString() ?? null,
            crepusculo_civil_fim: s.civ.set?.toISOString() ?? null,
            fotoperiodo_min: s.fotoperiodo_min,
          });
        }
        await supabase.from("solar_diario").upsert(solarRows, { onConflict: "nucleo_id,data" });

        log.push({ nucleo: n.id, horas: rows.length });
      } catch (e) {
        log.push({ nucleo: n.id, erro: (e as Error).message });
      }
    }

    // Dispara avaliação de alertas
    try {
      await supabase.functions.invoke("weather-alertas", { body: {} });
    } catch (_) { /* silencioso */ }

    return new Response(JSON.stringify({ ok: true, processados: nucleos.length, duracao_ms: Date.now() - startedAt, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("weather-sync", err);
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
