// climate-brain — coordenador climático integrado.
// Roda 1x/min. Para cada galpão com lote ativo:
//   1. Lê leituras agregadas, idade, curva alvo, perfil aprendido.
//   2. Resolve modo dominante: AQUECIMENTO | CONFORTO | ALERTA_CALOR | EMERGENCIA.
//   3. Aplica decisões em ventilação (estágio + duty cycle brooding) e nebulização.
//   4. Loga em log_decisao_clima com modo_dominante e offset aplicado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ith(t: number, ur: number) {
  return t - (0.55 - 0.0055 * ur) * (t - 14.5);
}

async function callFn(name: string, body: any) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Busca todos os lotes alojados
  const { data: lotes, error } = await supabase
    .from("lotes")
    .select("id, integrado_id, galpao_id, data_alojamento")
    .eq("status", "alojado");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const decisoesNeb: any[] = [];
  const resultados: any[] = [];

  for (const lote of lotes ?? []) {
    if (!lote.galpao_id || !lote.data_alojamento) continue;

    const idadeDias = Math.max(1, Math.floor(
      (Date.now() - new Date(lote.data_alojamento).getTime()) / 86400000) + 1);

    // Curva alvo (busca a curva ativa da org via galpao->nucleo etc — usa o ponto da idade)
    const { data: curvaPonto } = await supabase
      .from("curva_climatica_ponto")
      .select("temp_alvo_c, temp_min_alarme_c, temp_max_alarme_c, ur_max_pct, ith_alarme_vermelho, vazao_min_m3h_por_kg")
      .eq("dia_idade", idadeDias)
      .limit(1)
      .maybeSingle();

    if (!curvaPonto) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_curva" });
      continue;
    }

    // Perfil aprendido
    const { data: aprendizado } = await supabase
      .from("aprendizado_galpao")
      .select("offset_temp_aprendido_c, offset_ur_aprendido_pct")
      .eq("galpao_id", lote.galpao_id)
      .maybeSingle();
    const offsetTemp = Number(aprendizado?.offset_temp_aprendido_c ?? 0);

    const tempAlvo = Number(curvaPonto.temp_alvo_c) + offsetTemp;
    const urMax = Number(curvaPonto.ur_max_pct ?? 70);
    const ithVermelho = Number(curvaPonto.ith_alarme_vermelho ?? 78);

    // Histerese org
    const { data: hist } = await supabase
      .from("config_histerese_organizacao")
      .select("deadband_temp_c, protege_pintinho_ate_dias")
      .eq("integrado_id", lote.integrado_id)
      .maybeSingle();
    const deadband = Number(hist?.deadband_temp_c ?? 0.5);
    const pintinhoAteDias = Number(hist?.protege_pintinho_ate_dias ?? 7);

    // Leituras 5 min
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: leituras } = await supabase
      .from("leituras_sensores")
      .select("temperatura_c, umidade_pct")
      .eq("integrado_id", lote.integrado_id)
      .gte("criado_em", since)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (!leituras || leituras.length === 0) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_leituras" });
      continue;
    }
    const temps = leituras.map((l: any) => Number(l.temperatura_c)).filter((n) => !isNaN(n));
    const urs = leituras.map((l: any) => Number(l.umidade_pct)).filter((n) => !isNaN(n));
    if (!temps.length) continue;
    const tempC = temps.reduce((a, b) => a + b, 0) / temps.length;
    const urPct = urs.length ? urs.reduce((a, b) => a + b, 0) / urs.length : 60;
    const ithVal = ith(tempC, urPct);

    // Estado de ventilação atual (proxy de capacidade ativada)
    const { data: estagio } = await supabase
      .from("estagio_ventilacao_estado")
      .select("estagio_atual, cfm_total_ativo")
      .eq("galpao_id", lote.galpao_id)
      .maybeSingle();
    const ventPct = estagio?.estagio_atual === "tunel" || estagio?.estagio_atual === "heat_stress"
      ? 100 : estagio?.estagio_atual === "transicao" ? 60 : 25;

    // ── Resolve modo dominante ─────────────────────────────
    let modo: "AQUECIMENTO" | "CONFORTO" | "ALERTA_CALOR" | "EMERGENCIA";
    let acaoNeb: "ligar" | "desligar" | "manter" = "manter";
    let motivo = "";

    if (ithVal >= ithVermelho || tempC >= Number(curvaPonto.temp_max_alarme_c)) {
      modo = "EMERGENCIA";
      acaoNeb = urPct < urMax - 5 ? "ligar" : "desligar";
      motivo = `EMERGÊNCIA: T=${tempC.toFixed(1)}°C ITH=${ithVal.toFixed(1)} (vermelho=${ithVermelho})`;
    } else if (tempC > tempAlvo + deadband * 2) {
      modo = "ALERTA_CALOR";
      acaoNeb = urPct < urMax ? "ligar" : "desligar";
      motivo = `Calor: T=${tempC.toFixed(1)}°C alvo=${tempAlvo.toFixed(1)}°C UR=${urPct.toFixed(0)}%`;
    } else if (tempC < tempAlvo - deadband && idadeDias <= 14) {
      modo = "AQUECIMENTO";
      acaoNeb = "desligar";
      motivo = `Aquecimento: T=${tempC.toFixed(1)}°C alvo=${tempAlvo.toFixed(1)}°C idade=${idadeDias}d`;
    } else {
      modo = "CONFORTO";
      acaoNeb = "desligar";
      motivo = `Conforto: T=${tempC.toFixed(1)}°C alvo=${tempAlvo.toFixed(1)}°C`;
    }

    // ── Troca de ar brooding ───────────────────────────────
    let trocaArDuty: number | null = null;
    if (modo === "AQUECIMENTO") {
      const { data: progVent } = await supabase
        .from("programa_ventilacao_galpao")
        .select("troca_ar_brooding_ativa, troca_ar_brooding_max_pct")
        .eq("galpao_id", lote.galpao_id)
        .maybeSingle();
      if (progVent?.troca_ar_brooding_ativa) {
        // Duty proporcional à idade (5% no dia 1 → max% no dia 14)
        const ratio = Math.min(1, idadeDias / 14);
        trocaArDuty = Math.max(5,
          Math.round(5 + ratio * ((progVent.troca_ar_brooding_max_pct ?? 25) - 5)));
      }
    }

    decisoesNeb.push({
      galpao_id: lote.galpao_id,
      integrado_id: lote.integrado_id,
      acao: acaoNeb,
      motivo,
      temp_c: tempC,
      ur_pct: urPct,
      idade_dias: idadeDias,
      ventilacao_pct: ventPct,
    });

    // Log do brain
    await supabase.from("log_decisao_clima").insert({
      integrado_id: lote.integrado_id,
      galpao_id: lote.galpao_id,
      lote_id: lote.id,
      funcao_automacao: "climate_brain",
      estado_decidido: modo,
      modo_dominante: modo,
      offset_aprendido_aplicado_c: offsetTemp,
      temp_lida: tempC,
      ur_lida: urPct,
      ith_calc: ithVal,
      setpoint_alvo: tempAlvo,
      reason_chain: [motivo, ...(trocaArDuty ? [`troca_ar_duty=${trocaArDuty}%`] : [])],
    });

    resultados.push({ galpao: lote.galpao_id, modo, tempC, tempAlvo, ventPct, acaoNeb, trocaArDuty });
  }

  // Dispara executores
  await Promise.all([
    callFn("auto-ventilacao", {}),
    callFn("auto-cortina", {}),
    decisoesNeb.length > 0 ? callFn("auto-nebulizacao", { decisoes: decisoesNeb }) : Promise.resolve(),
  ]);

  return new Response(JSON.stringify({ ok: true, processados: resultados.length, resultados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
