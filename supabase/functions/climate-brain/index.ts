// climate-brain — coordenador climático integrado.
// Roda 1x/min. Para cada galpão com lote ativo:
//   1. Lê leituras agregadas, idade, curva alvo, perfil aprendido.
//   2. Resolve modo dominante: AQUECIMENTO | CONFORTO | ALERTA_CALOR | EMERGENCIA.
//   3. Aplica decisões em ventilação (estágio + duty cycle brooding) e nebulização.
//   4. Loga em log_decisao_clima com modo_dominante e offset aplicado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { removerOutliersIQR, zonasAtivasPara } from "../_shared/agregarLeituras.ts";

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
    .select("id, integrado_id, galpao_id, data_alojamento, linhagem, sexo, dias_fim_pinteiro")
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
    try {

    const idadeDias = Math.max(1, Math.floor(
      (Date.now() - new Date(lote.data_alojamento).getTime()) / 86400000) + 1);

    // Curva alvo — escolhe curva por integrado_id + linhagem (ou pública como fallback)
    let curvaId: string | null = null;
    const { data: curvas } = await supabase
      .from("curva_climatica_referencia")
      .select("id, integrado_id, linhagem, publica")
      .or(`integrado_id.eq.${lote.integrado_id},publica.eq.true`);
    if (curvas && curvas.length) {
      const exata = curvas.find((c: any) => c.integrado_id === lote.integrado_id && c.linhagem === lote.linhagem);
      const linhagem = curvas.find((c: any) => c.linhagem === lote.linhagem);
      const own = curvas.find((c: any) => c.integrado_id === lote.integrado_id);
      curvaId = (exata ?? linhagem ?? own ?? curvas[0]).id;
    }
    const { data: curvaPonto } = curvaId ? await supabase
      .from("curva_climatica_ponto")
      .select("temp_alvo_c, temp_min_alarme_c, temp_max_alarme_c, ur_max_pct, ith_alarme_vermelho, vazao_min_m3h_por_kg")
      .eq("curva_id", curvaId)
      .eq("dia_idade", idadeDias)
      .maybeSingle() : { data: null };

    if (!curvaPonto) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_curva" });
      await supabase.from("log_decisao_clima").insert({
        integrado_id: lote.integrado_id, galpao_id: lote.galpao_id, lote_id: lote.id,
        funcao_automacao: "climate_brain", estado_decidido: "skip",
        reason_chain: [`sem_curva (idade=${idadeDias}d, curvaId=${curvaId ?? "nenhuma"})`],
      });
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

    // Config de zonas / métricas robustas (Fase 2 atrás de flag)
    const { data: cfgZonas } = await supabase
      .from("config_zonas_galpao")
      .select("dias_fim_pinteiro, usar_percentis_automacao, min_minutos_sustentado")
      .eq("integrado_id", lote.integrado_id)
      .maybeSingle();
    const usarPercentis = !!cfgZonas?.usar_percentis_automacao;
    const diasFimPinteiro = Number(lote.dias_fim_pinteiro ?? cfgZonas?.dias_fim_pinteiro ?? 14);
    const zonasAtivas = zonasAtivasPara(idadeDias, null, diasFimPinteiro);

    // Leituras 15 min — busca dispositivos do galpão e filtra por dispositivo_id + lido_em
    const { data: devs } = await supabase
      .from("dispositivos_iot")
      .select("id, zona, peso_amostragem")
      .eq("galpao_id", lote.galpao_id)
      .eq("ativo", true);
    const devsTodos = devs ?? [];
    const devsFiltrados = usarPercentis
      ? devsTodos.filter((d: any) => zonasAtivas.includes((d.zona ?? "geral") as any))
      : devsTodos;
    const devIds = devsFiltrados.map((d: any) => d.id);
    if (devIds.length === 0) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_dispositivos" });
      await supabase.from("log_decisao_clima").insert({
        integrado_id: lote.integrado_id, galpao_id: lote.galpao_id, lote_id: lote.id,
        funcao_automacao: "climate_brain", estado_decidido: "skip",
        reason_chain: [`sem_dispositivos ativos (zonas=${zonasAtivas.join(",")}, total=${devsTodos.length})`],
      });
      continue;
    }
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: leituras } = await supabase
      .from("leituras_sensores")
      .select("temperatura_c, umidade_pct, dispositivo_id")
      .in("dispositivo_id", devIds)
      .gte("lido_em", since)
      .order("lido_em", { ascending: false })
      .limit(200);

    if (!leituras || leituras.length === 0) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_leituras" });
      await supabase.from("log_decisao_clima").insert({
        integrado_id: lote.integrado_id, galpao_id: lote.galpao_id, lote_id: lote.id,
        funcao_automacao: "climate_brain", estado_decidido: "skip",
        reason_chain: [`sem_leituras nos últimos 15 min (devs=${devIds.length})`],
      });
      continue;
    }
    const tempsRaw = leituras.map((l: any) => Number(l.temperatura_c)).filter((n) => !isNaN(n));
    const ursRaw = leituras.map((l: any) => Number(l.umidade_pct)).filter((n) => !isNaN(n));
    if (!tempsRaw.length) continue;

    let tempC: number;
    let urPct: number;
    if (usarPercentis) {
      // Descarta picos curtos via IQR e pondera por peso_amostragem
      const tempsFilt = removerOutliersIQR(tempsRaw);
      const ursFilt = ursRaw.length ? removerOutliersIQR(ursRaw) : [];
      const pesoPorDev = new Map<string, number>(
        devsFiltrados.map((d: any) => [d.id, Number(d.peso_amostragem ?? 1)])
      );
      let somaT = 0, pesoT = 0, somaU = 0, pesoU = 0;
      for (const l of leituras as any[]) {
        const w = pesoPorDev.get(l.dispositivo_id) ?? 1;
        const t = Number(l.temperatura_c);
        const u = Number(l.umidade_pct);
        if (!isNaN(t) && tempsFilt.includes(t)) { somaT += t * w; pesoT += w; }
        if (!isNaN(u) && ursFilt.includes(u)) { somaU += u * w; pesoU += w; }
      }
      tempC = pesoT > 0 ? somaT / pesoT : tempsFilt.reduce((a, b) => a + b, 0) / tempsFilt.length;
      urPct = pesoU > 0 ? somaU / pesoU : (ursFilt.length ? ursFilt.reduce((a, b) => a + b, 0) / ursFilt.length : 60);
    } else {
      tempC = tempsRaw.reduce((a, b) => a + b, 0) / tempsRaw.length;
      urPct = ursRaw.length ? ursRaw.reduce((a, b) => a + b, 0) / ursRaw.length : 60;
    }
    const ithVal = ith(tempC, urPct);
    const zonasReason = `zonas=${zonasAtivas.join(",")}, sensores=${devsFiltrados.length}/${devsTodos.length}, percentis=${usarPercentis ? "on" : "off"}`;

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
      reason_chain: [motivo, zonasReason, ...(trocaArDuty ? [`troca_ar_duty=${trocaArDuty}%`] : [])],
    });

    resultados.push({ galpao: lote.galpao_id, modo, tempC, tempAlvo, ventPct, acaoNeb, trocaArDuty });
    } catch (e: any) {
      console.error("climate-brain loop error", lote.galpao_id, e?.message);
      resultados.push({ galpao: lote.galpao_id, error: e?.message ?? String(e) });
    }
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
