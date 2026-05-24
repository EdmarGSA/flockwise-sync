// detect-sensor-drift — identifica sensores descalibrados comparando cada
// dispositivo com a mediana dos pares no mesmo galpão (mesma zona).
// Rodar via cron a cada 1h. Eleva severidade progressivamente:
//   ok      -> |Δ| < 1.5°C
//   aviso   -> |Δ| >= 1.5°C em pelo menos 6 buckets
//   critico -> |Δ| >= 2.5°C em pelo menos 6 buckets (marca excluido_agregacao)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mediana } from "../_shared/agregarLeituras.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_HOURS = 6;
const BUCKET_MIN = 15;
const MIN_BUCKETS = 6;
const AVISO_TEMP = 1.5;
const CRIT_TEMP = 2.5;
const AVISO_UR = 8;
const CRIT_UR = 15;

function bucketKey(ts: string): number {
  return Math.floor(new Date(ts).getTime() / (BUCKET_MIN * 60_000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();

  // Galpões com >=3 sensores ativos
  const { data: devs, error: devErr } = await supabase
    .from("dispositivos_iot")
    .select("id, integrado_id, galpao_id, nome, zona, ativo")
    .eq("ativo", true)
    .not("galpao_id", "is", null);
  if (devErr) {
    return new Response(JSON.stringify({ error: devErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Agrupa por galpão+zona
  type Dev = { id: string; integrado_id: string; galpao_id: string; nome: string; zona: string };
  const grupos = new Map<string, Dev[]>();
  for (const d of (devs ?? []) as Dev[]) {
    const k = `${d.galpao_id}|${d.zona ?? "geral"}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(d);
  }

  const resultados: any[] = [];
  const upserts: any[] = [];
  const transicoesCriticas: any[] = [];

  for (const [, group] of grupos) {
    if (group.length < 3) continue; // sem peers suficientes para julgar
    const devIds = group.map((g) => g.id);
    const { data: leituras } = await supabase
      .from("leituras_sensores")
      .select("dispositivo_id, temperatura_c, umidade_pct, lido_em")
      .in("dispositivo_id", devIds)
      .gte("lido_em", since)
      .order("lido_em", { ascending: true })
      .limit(20000);
    if (!leituras || leituras.length === 0) continue;

    // bucket -> dispositivo -> [temps]
    const buckets = new Map<number, Map<string, { t: number[]; u: number[] }>>();
    for (const l of leituras as any[]) {
      const b = bucketKey(l.lido_em);
      if (!buckets.has(b)) buckets.set(b, new Map());
      const m = buckets.get(b)!;
      if (!m.has(l.dispositivo_id)) m.set(l.dispositivo_id, { t: [], u: [] });
      const acc = m.get(l.dispositivo_id)!;
      const t = Number(l.temperatura_c); if (!isNaN(t)) acc.t.push(t);
      const u = Number(l.umidade_pct); if (!isNaN(u)) acc.u.push(u);
    }

    // Para cada dispositivo, soma desvios contra mediana dos pares em cada bucket
    const stats = new Map<string, { somaT: number; somaU: number; nT: number; nU: number; bigT: number; bigU: number }>();
    for (const d of group) stats.set(d.id, { somaT: 0, somaU: 0, nT: 0, nU: 0, bigT: 0, bigU: 0 });

    for (const [, devMap] of buckets) {
      if (devMap.size < 3) continue;
      // mediana do dispositivo (1 valor por bucket)
      const tDev = new Map<string, number>();
      const uDev = new Map<string, number>();
      for (const [did, vals] of devMap) {
        const mt = mediana(vals.t); if (mt != null) tDev.set(did, mt);
        const mu = mediana(vals.u); if (mu != null) uDev.set(did, mu);
      }
      for (const d of group) {
        const tSelf = tDev.get(d.id);
        if (tSelf != null) {
          const peers = [...tDev.entries()].filter(([k]) => k !== d.id).map(([, v]) => v);
          const mp = mediana(peers);
          if (mp != null) {
            const diff = tSelf - mp;
            const s = stats.get(d.id)!;
            s.somaT += diff; s.nT += 1;
            if (Math.abs(diff) >= AVISO_TEMP) s.bigT += 1;
          }
        }
        const uSelf = uDev.get(d.id);
        if (uSelf != null) {
          const peers = [...uDev.entries()].filter(([k]) => k !== d.id).map(([, v]) => v);
          const mp = mediana(peers);
          if (mp != null) {
            const diff = uSelf - mp;
            const s = stats.get(d.id)!;
            s.somaU += diff; s.nU += 1;
            if (Math.abs(diff) >= AVISO_UR) s.bigU += 1;
          }
        }
      }
    }

    // Estado anterior (para detectar transições)
    const { data: prevRows } = await supabase
      .from("sensor_drift_status")
      .select("dispositivo_id, severidade")
      .in("dispositivo_id", devIds);
    const prev = new Map<string, string>((prevRows ?? []).map((r: any) => [r.dispositivo_id, r.severidade]));

    for (const d of group) {
      const s = stats.get(d.id)!;
      if (s.nT < 3) continue;
      const deltaT = s.somaT / s.nT;
      const deltaU = s.nU > 0 ? s.somaU / s.nU : null;
      const absT = Math.abs(deltaT);
      const absU = deltaU == null ? 0 : Math.abs(deltaU);

      let severidade: "ok" | "aviso" | "critico" = "ok";
      let motivos: string[] = [];
      if ((absT >= CRIT_TEMP && s.bigT >= MIN_BUCKETS) || (absU >= CRIT_UR && s.bigU >= MIN_BUCKETS)) {
        severidade = "critico";
      } else if ((absT >= AVISO_TEMP && s.bigT >= MIN_BUCKETS) || (absU >= AVISO_UR && s.bigU >= MIN_BUCKETS)) {
        severidade = "aviso";
      }
      if (absT >= AVISO_TEMP) motivos.push(`ΔT=${deltaT.toFixed(2)}°C vs pares (${s.bigT}/${s.nT} buckets)`);
      if (deltaU != null && absU >= AVISO_UR) motivos.push(`ΔUR=${deltaU.toFixed(1)}% vs pares (${s.bigU}/${s.nU} buckets)`);

      const excluir = severidade === "critico";

      upserts.push({
        dispositivo_id: d.id,
        integrado_id: d.integrado_id,
        galpao_id: d.galpao_id,
        ultimo_check: new Date().toISOString(),
        amostras: s.nT,
        delta_temp_c: Number(deltaT.toFixed(2)),
        delta_ur_pct: deltaU != null ? Number(deltaU.toFixed(2)) : null,
        severidade,
        motivo: motivos.join(" | ") || null,
        excluido_agregacao: excluir,
      });

      const wasSev = prev.get(d.id) ?? "ok";
      if (wasSev !== severidade && (severidade === "aviso" || severidade === "critico")) {
        transicoesCriticas.push({ dev: d, severidade, motivo: motivos.join(" | ") });
      }

      resultados.push({ id: d.id, nome: d.nome, severidade, deltaT, deltaU, amostras: s.nT });
    }
  }

  if (upserts.length > 0) {
    const { error: upErr } = await supabase
      .from("sensor_drift_status")
      .upsert(upserts, { onConflict: "dispositivo_id" });
    if (upErr) console.error("[drift] upsert error:", upErr.message);
  }

  // Notifica transições para alerta/crítico
  for (const t of transicoesCriticas) {
    await supabase.rpc("dispatch_notificacao", {
      p_codigo: "sensor_drift",
      p_integrado_id: t.dev.integrado_id,
      p_titulo: `Sensor ${t.dev.nome} ${t.severidade === "critico" ? "DESCALIBRADO" : "com divergência"}`,
      p_mensagem: t.motivo,
      p_contexto: { dispositivo_id: t.dev.id, galpao_id: t.dev.galpao_id, severidade: t.severidade },
      p_link: `/dispositivos-iot`,
      p_severidade: t.severidade === "critico" ? "critical" : "warning",
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    avaliados: resultados.length,
    transicoes: transicoesCriticas.length,
    resultados,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
