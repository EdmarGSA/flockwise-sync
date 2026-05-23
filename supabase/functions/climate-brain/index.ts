// climate-brain — coordenador climático integrado.
// Fase 3: override por galpão + modo sombra (sempre computa as duas decisões).
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

interface AgregadoCtx {
  tempC: number;
  urPct: number;
  ithVal: number;
  sensoresUsados: number;
  sensoresTotal: number;
  zonas: string[];
}

function agregar(
  leituras: any[],
  devsTodos: any[],
  zonasAtivas: string[],
  percentis: boolean,
): AgregadoCtx | null {
  const devsFiltrados = percentis
    ? devsTodos.filter((d: any) => zonasAtivas.includes((d.zona ?? "geral") as any))
    : devsTodos;
  if (devsFiltrados.length === 0) return null;
  const devIds = new Set(devsFiltrados.map((d: any) => d.id));
  const lFilt = leituras.filter((l: any) => devIds.has(l.dispositivo_id));
  const tempsRaw = lFilt.map((l: any) => Number(l.temperatura_c)).filter((n) => !isNaN(n));
  const ursRaw = lFilt.map((l: any) => Number(l.umidade_pct)).filter((n) => !isNaN(n));
  if (!tempsRaw.length) return null;

  let tempC: number, urPct: number;
  if (percentis) {
    const tempsFilt = removerOutliersIQR(tempsRaw);
    const ursFilt = ursRaw.length ? removerOutliersIQR(ursRaw) : [];
    const pesoPorDev = new Map<string, number>(
      devsFiltrados.map((d: any) => [d.id, Number(d.peso_amostragem ?? 1)])
    );
    let somaT = 0, pesoT = 0, somaU = 0, pesoU = 0;
    for (const l of lFilt) {
      const w = pesoPorDev.get(l.dispositivo_id) ?? 1;
      const t = Number(l.temperatura_c);
      const u = Number(l.umidade_pct);
      if (!isNaN(t) && tempsFilt.includes(t)) { somaT += t * w; pesoT += w; }
      if (!isNaN(u) && ursFilt.includes(u)) { somaU += u * w; pesoU += w; }
    }
    tempC = pesoT > 0 ? somaT / pesoT : tempsFilt.reduce((a, b) => a + b, 0) / tempsFilt.length;
    urPct = pesoU > 0 ? somaU / pesoU
          : (ursFilt.length ? ursFilt.reduce((a, b) => a + b, 0) / ursFilt.length : 60);
  } else {
    tempC = tempsRaw.reduce((a, b) => a + b, 0) / tempsRaw.length;
    urPct = ursRaw.length ? ursRaw.reduce((a, b) => a + b, 0) / ursRaw.length : 60;
  }
  return {
    tempC, urPct, ithVal: ith(tempC, urPct),
    sensoresUsados: devsFiltrados.length, sensoresTotal: devsTodos.length,
    zonas: zonasAtivas,
  };
}

function decidir(ctx: AgregadoCtx, tempAlvo: number, urMax: number,
                 deadband: number, ithVermelho: number, tempMaxAlarme: number,
                 idadeDias: number) {
  const { tempC, urPct, ithVal } = ctx;
  let modo: "AQUECIMENTO" | "CONFORTO" | "ALERTA_CALOR" | "EMERGENCIA";
  let acaoNeb: "ligar" | "desligar" | "manter" = "manter";
  let motivo = "";
  if (ithVal >= ithVermelho || tempC >= tempMaxAlarme) {
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
  return { modo, acaoNeb, motivo };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

    // Curva alvo
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
      .select("offset_temp_aprendido_c")
      .eq("galpao_id", lote.galpao_id)
      .maybeSingle();
    const offsetTemp = Number(aprendizado?.offset_temp_aprendido_c ?? 0);

    let tempAlvo = Number(curvaPonto.temp_alvo_c) + offsetTemp;
    const urMax = Number(curvaPonto.ur_max_pct ?? 70);
    const ithVermelho = Number(curvaPonto.ith_alarme_vermelho ?? 78);
    const tempMaxAlarme = Number(curvaPonto.temp_max_alarme_c);

    // Histerese org
    const { data: hist } = await supabase
      .from("config_histerese_organizacao")
      .select("deadband_temp_c, protege_pintinho_ate_dias")
      .eq("integrado_id", lote.integrado_id)
      .maybeSingle();
    const deadband = Number(hist?.deadband_temp_c ?? 0.5);

    // Override por galpão > flag da org > false
    const { data: galpaoRow } = await supabase
      .from("galpoes")
      .select("usar_percentis_automacao")
      .eq("id", lote.galpao_id)
      .maybeSingle();
    const { data: cfgZonas } = await supabase
      .from("config_zonas_galpao")
      .select("dias_fim_pinteiro, usar_percentis_automacao, min_minutos_sustentado")
      .eq("integrado_id", lote.integrado_id)
      .maybeSingle();
    const percentisAtivo: boolean = (galpaoRow?.usar_percentis_automacao
      ?? cfgZonas?.usar_percentis_automacao ?? false) as boolean;
    const fontePercentis = galpaoRow?.usar_percentis_automacao != null ? "galpao"
                         : cfgZonas?.usar_percentis_automacao != null ? "org" : "default";
    const diasFimPinteiro = Number(lote.dias_fim_pinteiro ?? cfgZonas?.dias_fim_pinteiro ?? 14);
    const zonasAtivas = zonasAtivasPara(idadeDias, null, diasFimPinteiro);

    // Dispositivos + leituras 15 min
    const { data: devs } = await supabase
      .from("dispositivos_iot")
      .select("id, zona, peso_amostragem")
      .eq("galpao_id", lote.galpao_id)
      .eq("ativo", true);
    const devsTodos = devs ?? [];
    if (devsTodos.length === 0) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_dispositivos" });
      continue;
    }
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: leituras } = await supabase
      .from("leituras_sensores")
      .select("temperatura_c, umidade_pct, dispositivo_id")
      .in("dispositivo_id", devsTodos.map((d: any) => d.id))
      .gte("lido_em", since)
      .order("lido_em", { ascending: false })
      .limit(400);
    if (!leituras || leituras.length === 0) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_leituras" });
      continue;
    }

    // Computa AMBAS as decisões (real + sombra)
    const ctxOn = agregar(leituras, devsTodos, zonasAtivas, true);
    const ctxOff = agregar(leituras, devsTodos, zonasAtivas, false);
    const ctxReal = percentisAtivo ? ctxOn : ctxOff;
    const ctxSombra = percentisAtivo ? ctxOff : ctxOn;
    if (!ctxReal) {
      resultados.push({ galpao: lote.galpao_id, skip: "sem_leituras_validas" });
      continue;
    }

    const dReal = decidir(ctxReal, tempAlvo, urMax, deadband, ithVermelho, tempMaxAlarme, idadeDias);
    const dSombra = ctxSombra ? decidir(ctxSombra, tempAlvo, urMax, deadband, ithVermelho, tempMaxAlarme, idadeDias) : null;

    // Estado de ventilação
    const { data: estagio } = await supabase
      .from("estagio_ventilacao_estado")
      .select("estagio_atual, cfm_total_ativo")
      .eq("galpao_id", lote.galpao_id)
      .maybeSingle();
    const ventPct = estagio?.estagio_atual === "tunel" || estagio?.estagio_atual === "heat_stress"
      ? 100 : estagio?.estagio_atual === "transicao" ? 60 : 25;

    // Brooding duty
    let trocaArDuty: number | null = null;
    if (dReal.modo === "AQUECIMENTO") {
      const { data: progVent } = await supabase
        .from("programa_ventilacao_galpao")
        .select("troca_ar_brooding_ativa, troca_ar_brooding_max_pct")
        .eq("galpao_id", lote.galpao_id)
        .maybeSingle();
      if (progVent?.troca_ar_brooding_ativa) {
        const ratio = Math.min(1, idadeDias / 14);
        trocaArDuty = Math.max(5,
          Math.round(5 + ratio * ((progVent.troca_ar_brooding_max_pct ?? 25) - 5)));
      }
    }

    decisoesNeb.push({
      galpao_id: lote.galpao_id,
      integrado_id: lote.integrado_id,
      acao: dReal.acaoNeb,
      motivo: dReal.motivo,
      temp_c: ctxReal.tempC,
      ur_pct: ctxReal.urPct,
      idade_dias: idadeDias,
      ventilacao_pct: ventPct,
    });

    const zonasReason = `zonas=${ctxReal.zonas.join(",")}, sensores=${ctxReal.sensoresUsados}/${ctxReal.sensoresTotal}, percentis=${percentisAtivo ? "on" : "off"}, fonte=${fontePercentis}`;
    const divergente = !!dSombra && dSombra.modo !== dReal.modo;
    const deltaT = ctxSombra ? Math.abs(ctxSombra.tempC - ctxReal.tempC) : 0;

    await supabase.from("log_decisao_clima").insert({
      integrado_id: lote.integrado_id,
      galpao_id: lote.galpao_id,
      lote_id: lote.id,
      funcao_automacao: "climate_brain",
      estado_decidido: dReal.modo,
      modo_dominante: dReal.modo,
      offset_aprendido_aplicado_c: offsetTemp,
      temp_lida: ctxReal.tempC,
      ur_lida: ctxReal.urPct,
      ith_calc: ctxReal.ithVal,
      setpoint_alvo: tempAlvo,
      reason_chain: [dReal.motivo, zonasReason, ...(trocaArDuty ? [`troca_ar_duty=${trocaArDuty}%`] : [])],
      decisao_sombra: dSombra ? {
        percentis: !percentisAtivo,
        modo: dSombra.modo,
        acao_neb: dSombra.acaoNeb,
        temp_c: ctxSombra!.tempC,
        ur_pct: ctxSombra!.urPct,
        ith: ctxSombra!.ithVal,
        sensores: `${ctxSombra!.sensoresUsados}/${ctxSombra!.sensoresTotal}`,
        divergente,
        delta_temp_c: Number(deltaT.toFixed(2)),
        motivo: dSombra.motivo,
      } : null,
    });

    resultados.push({ galpao: lote.galpao_id, modo: dReal.modo, tempC: ctxReal.tempC,
                      tempAlvo, ventPct, acaoNeb: dReal.acaoNeb, trocaArDuty,
                      sombra: dSombra?.modo, divergente });
    } catch (e: any) {
      console.error("climate-brain loop error", lote.galpao_id, e?.message);
      resultados.push({ galpao: lote.galpao_id, error: e?.message ?? String(e) });
    }
  }

  await Promise.all([
    callFn("auto-ventilacao", {}),
    callFn("auto-cortina", {}),
    decisoesNeb.length > 0 ? callFn("auto-nebulizacao", { decisoes: decisoesNeb }) : Promise.resolve(),
  ]);

  return new Response(JSON.stringify({ ok: true, processados: resultados.length, resultados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
