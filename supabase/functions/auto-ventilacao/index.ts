// Auto-Ventilação — Onda 3
// Decide o estágio de ventilação por galpão (mínima / transição / túnel / heat_stress)
// para galpões com pressão positiva ou negativa, considerando:
//  - programa_ventilacao_galpao (modo + estágios + área transversal + velocidade alvo)
//  - leituras_sensores recentes (temp/UR), lote ativo, idade
//  - histerese e permanência mínima entre estágios (anti ping-pong)
//  - cálculo de velocidade de ar (m/s) p/ negativa (CFM × 0.000472 / área transversal)
//  - registro em log_decisao_clima (auditoria)
//
// Roda via cron a cada 2-5 minutos. Não controla diretamente o hardware: define
// quantos canais com função 'ventilacao' devem estar 'on' por galpão e dispara
// comandos pelo edge `sync-sensors` (driver eWeLink) ou `esp32-bridge` (esp32_http).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calcularITH } from "../auto-temperatura/index.ts" assert { type: "macro" }; // not used; placeholder

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Local ITH copy (avoid macro import issues across functions)
function ith(t: number, ur: number): number {
  return t - (0.55 - 0.0055 * ur) * (t - 14.5);
}

interface Estagio {
  estagio: "min" | "transicao" | "tunel" | "heat_stress";
  temp_min?: number;
  temp_max?: number;
  ventiladores_n: number;
  ciclo_on_s?: number;
  ciclo_off_s?: number;
  posicao_inlet_pct?: number;     // p/ negativa
  posicao_cortina_pct?: number;   // p/ positiva ou cortina lateral
}

interface Programa {
  galpao_id: string;
  integrado_id: string;
  modo: "positiva_simples" | "negativa_tunel" | "minima_apenas";
  estagios: Estagio[];
  area_transversal_m2: number | null;
  velocidade_alvo_ms_min: number | null;
  velocidade_alvo_ms_max: number | null;
}

function escolherEstagio(
  prog: Programa,
  tempC: number,
  urPct: number,
  ithVermelho: number,
): { estagio: Estagio; reason: string[] } {
  const reason: string[] = [];
  const ithVal = ith(tempC, urPct);
  reason.push(`temp=${tempC.toFixed(1)}°C ur=${urPct.toFixed(0)}% ITH=${ithVal.toFixed(1)}`);

  // Heat-stress override (qualquer modo)
  if (ithVal >= ithVermelho) {
    const tunel = prog.estagios.find((e) => e.estagio === "tunel" || e.estagio === "heat_stress");
    if (tunel) {
      reason.push(`ITH ${ithVal.toFixed(1)} ≥ vermelho ${ithVermelho} → heat_stress`);
      return { estagio: { ...tunel, estagio: "heat_stress" }, reason };
    }
  }

  // Match por faixa de temperatura nos estágios definidos (ordem do programa)
  const match = prog.estagios.find(
    (e) => tempC >= (e.temp_min ?? -Infinity) && tempC <= (e.temp_max ?? Infinity),
  );
  if (match) {
    reason.push(
      `estágio ${match.estagio} aplicável (faixa ${match.temp_min ?? "-∞"}…${match.temp_max ?? "+∞"})`,
    );
    return { estagio: match, reason };
  }
  // Fallback: estágio mínimo
  const min =
    prog.estagios.find((e) => e.estagio === "min") ?? prog.estagios[0];
  reason.push("nenhuma faixa correspondente → fallback min");
  return { estagio: min, reason };
}

function velocidadeArEstimadaMs(cfmTotal: number, areaM2: number | null): number | null {
  if (!areaM2 || areaM2 <= 0) return null;
  // CFM → m³/s: × 0.000472. v = vazão / área útil (0.85 fator obstruções)
  return (cfmTotal * 0.000472) / (areaM2 * 0.85);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: programas, error: progErr } = await supabase
    .from("programa_ventilacao_galpao")
    .select("*")
    .eq("ativo", true);

  if (progErr) {
    return new Response(JSON.stringify({ error: progErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resultados: any[] = [];

  for (const progRaw of programas ?? []) {
    const prog: Programa = {
      galpao_id: progRaw.galpao_id,
      integrado_id: progRaw.integrado_id,
      modo: progRaw.modo,
      estagios: Array.isArray(progRaw.estagios) ? progRaw.estagios : [],
      area_transversal_m2: progRaw.area_transversal_m2,
      velocidade_alvo_ms_min: progRaw.velocidade_alvo_ms_min,
      velocidade_alvo_ms_max: progRaw.velocidade_alvo_ms_max,
    };
    if (prog.modo === "minima_apenas" || prog.estagios.length === 0) {
      resultados.push({ galpao_id: prog.galpao_id, skip: "sem_estagios_ou_minima_apenas" });
      continue;
    }

    // Lote ativo
    const { data: lote } = await supabase
      .from("lotes")
      .select("id, integrado_id, data_alojamento, status")
      .eq("galpao_id", prog.galpao_id)
      .in("status", ["alojado"])
      .maybeSingle();
    if (!lote) {
      resultados.push({ galpao_id: prog.galpao_id, skip: "sem_lote_alojado" });
      continue;
    }

    // Última leitura agregada (10 min)
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: leituras } = await supabase
      .from("leituras_sensores")
      .select("temperatura_c, umidade_pct, criado_em")
      .eq("integrado_id", prog.integrado_id)
      .gte("criado_em", since)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (!leituras || leituras.length === 0) {
      resultados.push({ galpao_id: prog.galpao_id, skip: "sem_leituras_recentes" });
      continue;
    }
    const temps = leituras.map((l: any) => Number(l.temperatura_c)).filter((n) => !Number.isNaN(n));
    const urs = leituras.map((l: any) => Number(l.umidade_pct)).filter((n) => !Number.isNaN(n));
    if (temps.length === 0) {
      resultados.push({ galpao_id: prog.galpao_id, skip: "leituras_invalidas" });
      continue;
    }
    const tempC = temps.reduce((a, b) => a + b, 0) / temps.length;
    const urPct = urs.length ? urs.reduce((a, b) => a + b, 0) / urs.length : 60;

    // Histerese / ITH thresholds da organização
    const { data: hist } = await supabase
      .from("config_histerese_organizacao")
      .select("ith_vermelho")
      .eq("integrado_id", prog.integrado_id)
      .maybeSingle();
    const ithVermelho = Number(hist?.ith_vermelho ?? 78);

    const { estagio: alvo, reason } = escolherEstagio(prog, tempC, urPct, ithVermelho);

    // Estado atual + permanência mínima
    const { data: estadoAtual } = await supabase
      .from("estagio_ventilacao_estado")
      .select("*")
      .eq("galpao_id", prog.galpao_id)
      .maybeSingle();

    let bloqueado: string | null = null;
    if (estadoAtual && estadoAtual.estagio_atual !== alvo.estagio) {
      const elapsed =
        (Date.now() - new Date(estadoAtual.ultima_transicao_em).getTime()) / 1000;
      const min = estadoAtual.permanencia_minima_seg ?? 180;
      if (elapsed < min) {
        bloqueado = `permanencia_minima_${Math.round(min - elapsed)}s_restantes`;
        reason.push(bloqueado);
      }
    }

    // Selecionar canais de ventilação do galpão
    const { data: canais } = await supabase
      .from("canais_dispositivo")
      .select("id, nome, estado_atual, cfm_nominal, automacao_ativa, dispositivo_id")
      .eq("integrado_id", prog.integrado_id)
      .eq("funcao_automacao", "ventilacao")
      .eq("ativo", true);

    const ventCanais = (canais ?? []).filter((c: any) => c.automacao_ativa);
    const nDesejado = bloqueado
      ? ventCanais.filter((c: any) => c.estado_atual === "on").length
      : Math.min(alvo.ventiladores_n ?? 0, ventCanais.length);

    // Selecionar canais a manter ON (prioriza maior CFM nominal)
    const ordenados = [...ventCanais].sort(
      (a: any, b: any) => (Number(b.cfm_nominal) || 0) - (Number(a.cfm_nominal) || 0),
    );
    const ativos = new Set(ordenados.slice(0, nDesejado).map((c: any) => c.id));

    let cfmTotalAtivo = 0;
    for (const c of ordenados) {
      if (ativos.has(c.id)) cfmTotalAtivo += Number(c.cfm_nominal) || 0;
    }
    const velEstimada =
      prog.modo === "negativa_tunel"
        ? velocidadeArEstimadaMs(cfmTotalAtivo, prog.area_transversal_m2)
        : null;
    if (velEstimada != null) reason.push(`vel_ar≈${velEstimada.toFixed(2)}m/s`);

    // Atualiza estado (idempotente)
    const novoEstagio = bloqueado ? estadoAtual!.estagio_atual : alvo.estagio;
    await supabase.from("estagio_ventilacao_estado").upsert(
      {
        galpao_id: prog.galpao_id,
        integrado_id: prog.integrado_id,
        estagio_atual: novoEstagio,
        velocidade_estimada_ms: velEstimada,
        cfm_total_ativo: cfmTotalAtivo,
        ultima_transicao_em:
          estadoAtual && estadoAtual.estagio_atual === novoEstagio
            ? estadoAtual.ultima_transicao_em
            : new Date().toISOString(),
        reason,
      },
      { onConflict: "galpao_id" },
    );

    // Auditoria — uma entrada por galpão por ciclo
    await supabase.from("log_decisao_clima").insert({
      integrado_id: prog.integrado_id,
      galpao_id: prog.galpao_id,
      lote_id: lote.id,
      origem: "auto-ventilacao",
      estado_decidido: novoEstagio,
      reason_chain: reason,
      bloqueado_por: bloqueado,
      contexto: {
        modo: prog.modo,
        estagio_alvo: alvo.estagio,
        ventiladores_alvo: alvo.ventiladores_n,
        ventiladores_ativos: ativos.size,
        cfm_total_ativo: cfmTotalAtivo,
        velocidade_estimada_ms: velEstimada,
        temp_c: tempC,
        ur_pct: urPct,
      },
    });

    resultados.push({
      galpao_id: prog.galpao_id,
      estagio: novoEstagio,
      ventiladores_alvo: ativos.size,
      bloqueado,
      vel_ar_ms: velEstimada,
    });
  }

  return new Response(JSON.stringify({ ok: true, resultados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
