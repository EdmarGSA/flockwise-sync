import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { zonasAtivasPara } from "../_shared/agregarLeituras.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSign(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function getRegionUrl(region: string) {
  return region === "cn" ? "https://cn-apia.coolkit.cn" : `https://${region}-apia.coolkit.cc`;
}

async function refreshAccessToken(
  supabase: any, token: any, appId: string, appSecret: string
): Promise<string> {
  const now = new Date();
  if (now < new Date(token.at_expired_at)) return token.access_token;
  if (now >= new Date(token.rt_expired_at)) throw new Error("REAUTH_REQUIRED");

  const regionUrl = getRegionUrl(token.region);
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const body = { rt: token.refresh_token };
  const sign = await hmacSign(appSecret, JSON.stringify(body));

  const res = await fetch(`${regionUrl}/v2/user/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Sign ${sign}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error !== 0) throw new Error(`Token refresh failed: ${data.msg || data.error}`);

  const newAtExpiry = new Date(now.getTime() + (data.data.atExpiredTime || 86400) * 1000);
  const newRtExpiry = new Date(now.getTime() + (data.data.rtExpiredTime || 5184000) * 1000);

  await supabase.from("ewelink_tokens").update({
    access_token: data.data.at,
    refresh_token: data.data.rt,
    at_expired_at: newAtExpiry.toISOString(),
    rt_expired_at: newRtExpiry.toISOString(),
  }).eq("id", token.id);

  return data.data.at;
}

async function controlDevice(
  accessToken: string, appId: string, region: string,
  deviceId: string, params: Record<string, unknown>
): Promise<{ error: number; msg?: string }> {
  const regionUrl = getRegionUrl(region);
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const body = { type: 1, id: deviceId, params };

  const res = await fetch(`${regionUrl}/v2/device/thing/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  return await res.json();
}

async function getDeviceStatus(
  accessToken: string, appId: string, region: string, deviceId: string
): Promise<any> {
  const regionUrl = getRegionUrl(region);
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);

  const res = await fetch(`${regionUrl}/v2/device/thing/status?type=1&id=${deviceId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return await res.json();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Alert management ───────────────────────────────────────────
async function manageAlerts(
  supabase: any,
  integradoId: string,
  loteId: string,
  galpaoId: string,
  temp: number,
  tempMin: number,
  tempMax: number,
) {
  const isOutOfRange = temp < tempMin || temp > tempMax;
  const alertType = temp < tempMin ? "temp_baixa" : "temp_alta";

  // Look for existing open alert for this galpao
  const { data: existingAlert } = await supabase
    .from("alertas_temperatura")
    .select("*")
    .eq("galpao_id", galpaoId)
    .eq("resolvido", false)
    .limit(1)
    .maybeSingle();

  if (isOutOfRange) {
    if (existingAlert) {
      // Update existing alert: update duration and last reading
      const firstTime = new Date(existingAlert.primeira_leitura_fora);
      const duracao = Math.round((Date.now() - firstTime.getTime()) / 60000);

      await supabase.from("alertas_temperatura").update({
        temperatura_lida: temp,
        ultima_leitura_fora: new Date().toISOString(),
        duracao_minutos: duracao,
        tipo: alertType,
        temp_min_regra: tempMin,
        temp_max_regra: tempMax,
        // Mark as notified once 10+ minutes have passed
        notificado: duracao >= 10 ? true : existingAlert.notificado,
      }).eq("id", existingAlert.id);

      if (duracao >= 10 && !existingAlert.notificado) {
        // Create admin notification
        await supabase.from("admin_notifications").insert({
          integrado_id: integradoId,
          tipo: "alerta_temperatura",
          titulo: `⚠️ Temperatura fora da faixa há ${duracao} min`,
          mensagem: `Galpão com temperatura ${temp.toFixed(1)}°C (faixa ideal: ${tempMin}–${tempMax}°C). Alerta ativo há ${duracao} minutos.`,
        });
        console.log(`alert: notification created for galpao ${galpaoId} (${duracao}min out of range)`);
      }
    } else {
      // Create new alert
      await supabase.from("alertas_temperatura").insert({
        integrado_id: integradoId,
        lote_id: loteId,
        galpao_id: galpaoId,
        tipo: alertType,
        temperatura_lida: temp,
        temp_min_regra: tempMin,
        temp_max_regra: tempMax,
        primeira_leitura_fora: new Date().toISOString(),
        ultima_leitura_fora: new Date().toISOString(),
        duracao_minutos: 0,
      });
      console.log(`alert: new alert created for galpao ${galpaoId} (${alertType}, ${temp}°C)`);
    }
  } else {
    // Temperature back to normal — resolve any open alert
    if (existingAlert) {
      await supabase.from("alertas_temperatura").update({
        resolvido: true,
        resolvido_em: new Date().toISOString(),
      }).eq("id", existingAlert.id);
      console.log(`alert: resolved for galpao ${galpaoId} (temp ${temp}°C back in range)`);
    }
  }
}

// ── Timer safety calculation (duplicated from shared lib for edge function context) ──
function calcularTimersParaIdade(idade: number, funcao: string): { tipo: string; hora_inicio: string; hora_fim: string; estado: string; intervalo?: number }[] {
  if (funcao === 'aquecimento') {
    if (idade <= 7) return [{ tipo: 'aquecimento_noturno', hora_inicio: '18:00', hora_fim: '06:00', estado: 'on' }];
    if (idade <= 14) return [{ tipo: 'aquecimento_noturno', hora_inicio: '20:00', hora_fim: '05:00', estado: 'on' }];
    if (idade <= 21) return [{ tipo: 'ciclo_intermitente', hora_inicio: '22:00', hora_fim: '04:00', estado: 'on', intervalo: 30 }];
    return [{ tipo: 'aquecimento_noturno', hora_inicio: '00:00', hora_fim: '23:59', estado: 'off' }];
  }
  if (funcao === 'ventilacao') {
    if (idade <= 14) return [{ tipo: 'ventilacao_diurno', hora_inicio: '00:00', hora_fim: '23:59', estado: 'off' }];
    if (idade <= 21) return [{ tipo: 'ventilacao_diurno', hora_inicio: '11:00', hora_fim: '15:00', estado: 'on' }];
    if (idade <= 28) return [{ tipo: 'ventilacao_diurno', hora_inicio: '10:00', hora_fim: '16:00', estado: 'on' }];
    return [{ tipo: 'ventilacao_diurno', hora_inicio: '09:00', hora_fim: '18:00', estado: 'on' }];
  }
  return [];
}

function getFaixaIdade(idade: number): string {
  if (idade <= 7) return '1-7';
  if (idade <= 14) return '8-14';
  if (idade <= 21) return '15-21';
  if (idade <= 28) return '22-28';
  return '29+';
}

function buildEwelinkTimers(timers: { hora_inicio: string; hora_fim: string; estado: string }[]) {
  const result: any[] = [];
  for (let i = 0; i < timers.length && (i * 2 + 1) <= 7; i++) {
    const t = timers[i];
    const [hOn, mOn] = t.hora_inicio.split(':').map(Number);
    const [hOff, mOff] = t.hora_fim.split(':').map(Number);
    result.push({
      enabled: 1, mId: `safety_on_${i * 2}`, type: 'repeat',
      at: `${mOn} ${hOn} * * 0,1,2,3,4,5,6`,
      do: { switch: t.estado }, coolkit_timer_type: 'repeat',
    });
    const offState = t.estado === 'on' ? 'off' : 'on';
    result.push({
      enabled: 1, mId: `safety_off_${i * 2 + 1}`, type: 'repeat',
      at: `${mOff} ${hOff} * * 0,1,2,3,4,5,6`,
      do: { switch: offState }, coolkit_timer_type: 'repeat',
    });
  }
  return result;
}

function calcSetpointsCurva(
  funcao: string,
  tempMin: number | null,
  tempMax: number | null,
): { temp_liga_c: number | null; temp_desliga_c: number | null } {
  if (tempMin == null || tempMax == null) return { temp_liga_c: null, temp_desliga_c: null };
  if (funcao === 'ventilacao') {
    return { temp_liga_c: +(tempMax + 1).toFixed(2), temp_desliga_c: +(tempMax - 0.5).toFixed(2) };
  }
  if (funcao === 'aquecimento') {
    return { temp_liga_c: +(tempMin - 1).toFixed(2), temp_desliga_c: +(tempMin + 0.5).toFixed(2) };
  }
  return { temp_liga_c: null, temp_desliga_c: null };
}

async function syncTimersForDevice(
  supabase: any, accessToken: string, appId: string, region: string,
  device: any, loteId: string, integradoId: string, ageDays: number,
  setpointsCurva?: { tempMin: number | null; tempMax: number | null },
) {
  // Check if timers need resync (age band changed)
  const { data: existingRows } = await supabase
    .from("timers_seguranca_iot")
    .select("idade_lote_dias, origem_setpoint, modo, temp_liga_c, temp_desliga_c, janela_horaria_inicio, janela_horaria_fim, umidade_max_pct")
    .eq("dispositivo_id", device.id)
    .order("created_at", { ascending: false });

  const hasManual = (existingRows || []).some((r: any) => r.origem_setpoint === 'manual');
  const previousAge = existingRows?.[0]?.idade_lote_dias ?? null;
  const faixaAtual = getFaixaIdade(ageDays);
  const faixaAnterior = previousAge !== null ? getFaixaIdade(previousAge) : null;

  // Se há setpoints manuais, NÃO recalcula — apenas garante que a faixa horária do firmware reflita o que o usuário pediu
  if (hasManual && faixaAtual === faixaAnterior) return false;
  if (faixaAtual === faixaAnterior && !hasManual) return false;

  const timers = calcularTimersParaIdade(ageDays, device.funcao_automacao);
  if (timers.length === 0) return false;

  const ewelinkTimers = buildEwelinkTimers(timers);

  // Send timers to device via eWeLink API
  const regionUrl = getRegionUrl(region);
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const body = { type: 1, id: device.device_id_ewelink, params: { timers: ewelinkTimers } };

  const res = await fetch(`${regionUrl}/v2/device/thing/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  const success = result.error === 0;

  // Preserva linhas manuais; remove só as automáticas
  await supabase
    .from("timers_seguranca_iot")
    .delete()
    .eq("dispositivo_id", device.id)
    .eq("origem_setpoint", "curva");

  // Insert new timer records (origem=curva) com setpoints sugeridos da curva
  const setpoints = calcSetpointsCurva(
    device.funcao_automacao,
    setpointsCurva?.tempMin ?? null,
    setpointsCurva?.tempMax ?? null,
  );

  for (let i = 0; i < timers.length; i++) {
    await supabase.from("timers_seguranca_iot").insert({
      dispositivo_id: device.id,
      integrado_id: integradoId,
      lote_id: loteId,
      tipo_timer: timers[i].tipo,
      hora_inicio: timers[i].hora_inicio,
      hora_fim: timers[i].hora_fim,
      estado_desejado: timers[i].estado,
      intervalo_minutos: timers[i].intervalo || null,
      idade_lote_dias: ageDays,
      sincronizado: success,
      sincronizado_em: success ? new Date().toISOString() : null,
      timer_index_ewelink: i * 2,
      modo: 'horario',
      temp_liga_c: setpoints.temp_liga_c,
      temp_desliga_c: setpoints.temp_desliga_c,
      origem_setpoint: 'curva',
    });
  }

  console.log(`timers: ${success ? 'synced' : 'FAILED'} for device ${device.device_id_ewelink} (age ${ageDays}, band ${faixaAtual}, hasManual=${hasManual})`);
  return success;
}

// ── Padrão-ouro: motor multi-variável (ITH + histerese + tempo mín on/off + fail-safe) ──

interface HistereseConfig {
  deadband_temp_c: number;
  tempo_min_on_aquecedor_seg: number;
  tempo_min_off_aquecedor_seg: number;
  tempo_min_on_ventilador_seg: number;
  tempo_min_off_ventilador_seg: number;
  tempo_min_on_nebulizador_seg: number;
  tempo_min_off_nebulizador_seg: number;
  ith_amarelo: number;
  ith_vermelho: number;
  modo_seguro_vent_min_pct: number;
  sensor_max_idade_min: number;
  protege_pintinho_ate_dias: number;
}

const DEFAULT_HISTERESE: HistereseConfig = {
  deadband_temp_c: 0.5,
  tempo_min_on_aquecedor_seg: 60,
  tempo_min_off_aquecedor_seg: 300,
  tempo_min_on_ventilador_seg: 120,
  tempo_min_off_ventilador_seg: 60,
  tempo_min_on_nebulizador_seg: 180,
  tempo_min_off_nebulizador_seg: 120,
  ith_amarelo: 74,
  ith_vermelho: 78,
  modo_seguro_vent_min_pct: 30,
  sensor_max_idade_min: 15,
  protege_pintinho_ate_dias: 7,
};

interface PontoCurva {
  dia_idade: number;
  temp_alvo_c: number;
  temp_min_alarme_c: number;
  temp_max_alarme_c: number;
  ur_max_pct: number | null;
  ith_alarme_amarelo: number;
  ith_alarme_vermelho: number;
}

interface DecisaoCanal {
  state: "on" | "off";
  estagio: "normal" | "noturno" | "heat_stress" | "modo_seguro";
  reason: string[];
  bloqueado_por?: "tempo_minimo_on" | "tempo_minimo_off" | "sensor_falho";
}

function calcularITH(t: number, ur: number | null): number | null {
  if (ur == null) return null;
  return +(t - (0.55 - 0.0055 * ur) * (t - 14.5)).toFixed(1);
}

function tempoDesdeUltimoEstado(canal: any, novoEstado: "on" | "off"): number {
  // segundos desde o último ON ou OFF (referente ao estado atual)
  if (novoEstado === "on") {
    if (!canal.ultimo_off_em) return Number.MAX_SAFE_INTEGER;
    return Math.floor((Date.now() - new Date(canal.ultimo_off_em).getTime()) / 1000);
  } else {
    if (!canal.ultimo_on_em) return Number.MAX_SAFE_INTEGER;
    return Math.floor((Date.now() - new Date(canal.ultimo_on_em).getTime()) / 1000);
  }
}

function checaTempoMinimo(
  canal: any, desejado: "on" | "off", funcao: string, hist: HistereseConfig
): "ok" | "tempo_minimo_on" | "tempo_minimo_off" {
  const atual = canal.estado_atual;
  if (atual === desejado || !atual) return "ok"; // sem mudança
  const tempo = tempoDesdeUltimoEstado(canal, atual);
  let minimo = 0;
  if (funcao === "aquecimento") {
    minimo = atual === "on" ? hist.tempo_min_on_aquecedor_seg : hist.tempo_min_off_aquecedor_seg;
  } else if (funcao === "ventilacao") {
    minimo = atual === "on" ? hist.tempo_min_on_ventilador_seg : hist.tempo_min_off_ventilador_seg;
  } else if (funcao === "nebulizacao") {
    minimo = atual === "on" ? hist.tempo_min_on_nebulizador_seg : hist.tempo_min_off_nebulizador_seg;
  }
  if (tempo < minimo) {
    return atual === "on" ? "tempo_minimo_on" : "tempo_minimo_off";
  }
  return "ok";
}

function decideCanalGoldStandard(
  canal: any,
  funcao: string,
  ageDays: number,
  temp: number | null,
  umid: number | null,
  ponto: PontoCurva | null,
  fallback: { tempMin: number; tempMax: number; umidMax: number },
  hist: HistereseConfig,
  sensorIdadeMin: number,
): DecisaoCanal | null {
  const sensorOK = temp != null && sensorIdadeMin <= hist.sensor_max_idade_min;

  // ── FAIL-SAFE: sensor offline ou leitura velha ──
  if (!sensorOK) {
    if (funcao === "aquecimento" && ageDays <= hist.protege_pintinho_ate_dias) {
      // Pintinho: NUNCA desliga aquecedor por falha de sensor
      return { state: "on", estagio: "modo_seguro",
        reason: [`sensor falho/${sensorIdadeMin}min`, `pintinho dia ${ageDays} ≤ ${hist.protege_pintinho_ate_dias}d → mantém aquecedor`],
        bloqueado_por: "sensor_falho" };
    }
    if (funcao === "ventilacao") {
      // Modo seguro: ventilação mínima por timer (mantém estado atual ou liga curto)
      return { state: "on", estagio: "modo_seguro",
        reason: [`sensor falho`, `ventilação mínima de segurança`],
        bloqueado_por: "sensor_falho" };
    }
    return null; // outros canais: não decide
  }

  const t = temp as number;
  const setpoint = ponto?.temp_alvo_c ?? ((fallback.tempMin + fallback.tempMax) / 2);
  const tMaxAlarme = ponto?.temp_max_alarme_c ?? fallback.tempMax;
  const tMinAlarme = ponto?.temp_min_alarme_c ?? fallback.tempMin;
  const ithAmarelo = ponto?.ith_alarme_amarelo ?? hist.ith_amarelo;
  const ithVermelho = ponto?.ith_alarme_vermelho ?? hist.ith_vermelho;
  const urMax = ponto?.ur_max_pct ?? fallback.umidMax;
  const ith = calcularITH(t, umid);
  const reasons: string[] = [`setpoint ${setpoint}°C`, `temp ${t}°C`];
  if (ith != null) reasons.push(`ITH ${ith}`);

  // ── EMERGÊNCIA CALOR (override): ITH ≥ vermelho OU temp >= alarme alto ──
  const heatStress = (ith != null && ith >= ithVermelho) || t >= tMaxAlarme + 1;
  if (heatStress) {
    reasons.push(`HEAT STRESS (ITH≥${ithVermelho} ou temp≥${tMaxAlarme + 1})`);
    if (funcao === "ventilacao") return { state: "on", estagio: "heat_stress", reason: reasons };
    if (funcao === "nebulizacao" && (umid == null || umid < urMax + 5))
      return { state: "on", estagio: "heat_stress", reason: [...reasons, `nebuliza p/ resfriar (UR ${umid}%)`] };
    if (funcao === "aquecimento") return { state: "off", estagio: "heat_stress", reason: reasons };
    if (funcao === "cortina") return { state: "off", estagio: "heat_stress", reason: [...reasons, "abre cortina"] };
  }

  // ── HISTERESE normal por função ──
  switch (funcao) {
    case "aquecimento": {
      // Liga abaixo de setpoint - deadband; desliga acima de setpoint + deadband
      if (t < setpoint - hist.deadband_temp_c) {
        return { state: "on", estagio: "normal", reason: [...reasons, `t<${setpoint - hist.deadband_temp_c} → ligar`] };
      }
      if (t > setpoint + hist.deadband_temp_c) {
        return { state: "off", estagio: "normal", reason: [...reasons, `t>${setpoint + hist.deadband_temp_c} → desligar`] };
      }
      return null; // dentro da banda morta → mantém
    }
    case "ventilacao": {
      if (t > setpoint + hist.deadband_temp_c) {
        return { state: "on", estagio: "normal", reason: [...reasons, `t>${setpoint + hist.deadband_temp_c} → ligar`] };
      }
      if (t < setpoint - hist.deadband_temp_c) {
        return { state: "off", estagio: "normal", reason: [...reasons, `t<${setpoint - hist.deadband_temp_c} → desligar`] };
      }
      return null;
    }
    case "nebulizacao": {
      if (t > setpoint + hist.deadband_temp_c && umid != null && umid < urMax) {
        return { state: "on", estagio: "normal", reason: [...reasons, `quente + UR ${umid}<${urMax}`] };
      }
      return { state: "off", estagio: "normal", reason: [...reasons, `cond. neb. não atendidas`] };
    }
    case "cortina": {
      const hour = new Date().getHours();
      const isNight = hour >= 19 || hour < 6;
      if (t > setpoint + hist.deadband_temp_c)
        return { state: "off", estagio: "normal", reason: [...reasons, "quente → abrir"] };
      if (t < setpoint - hist.deadband_temp_c || isNight)
        return { state: "on", estagio: isNight ? "noturno" : "normal", reason: [...reasons, isNight ? `noite ${hour}h → fechar` : "frio → fechar"] };
      return null;
    }
    default:
      return null;
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const appId = Deno.env.get("EWELINK_APP_ID")!;
    const appSecret = Deno.env.get("EWELINK_APP_SECRET")!;

    if (!appId || !appSecret) {
      return jsonResponse({ error: "Credenciais eWeLink não configuradas" }, 400);
    }

    const { data: lotes, error: lotesErr } = await supabase
     .from("lotes")
      .select("id, integrado_id, galpao_id, data_alojamento, curva_climatica_id, dias_fim_pinteiro")
      .eq("status", "alojado")
      .not("data_alojamento", "is", null)
      .not("galpao_id", "is", null);

    if (lotesErr) throw new Error(`Lotes query error: ${lotesErr.message}`);
    if (!lotes || lotes.length === 0) {
      return jsonResponse({ message: "Nenhum lote alojado encontrado", actions: 0, alerts: 0 });
    }

    console.log(`auto-temperatura: ${lotes.length} lotes alojados encontrados`);

    const lotesByIntegrado = new Map<string, typeof lotes>();
    for (const lote of lotes) {
      const arr = lotesByIntegrado.get(lote.integrado_id) || [];
      arr.push(lote);
      lotesByIntegrado.set(lote.integrado_id, arr);
    }

    let totalActions = 0;
    let totalAlerts = 0;
    let totalOfflineAlerts = 0;
    const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

    for (const [integradoId, integradoLotes] of lotesByIntegrado) {
      const { data: tokenData } = await supabase
        .from("ewelink_tokens")
        .select("*")
        .eq("integrado_id", integradoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback: regras grossas por faixa (usado quando lote não tem curva vinculada)
      const { data: regras } = await supabase
        .from("regras_temperatura_lote")
        .select("*")
        .eq("integrado_id", integradoId)
        .eq("ativo", true)
        .order("dia_inicio", { ascending: true });

      // ── Padrão-ouro: histerese da org ──
      const { data: histRow } = await supabase
        .from("config_histerese_organizacao")
        .select("*")
        .eq("integrado_id", integradoId)
        .maybeSingle();
      const hist: HistereseConfig = { ...DEFAULT_HISTERESE, ...(histRow || {}) };

      // ── Carrega pontos das curvas vinculadas aos lotes ──
      const curvaIds = Array.from(new Set(integradoLotes.map((l: any) => l.curva_climatica_id).filter(Boolean)));
      const pontosByCurva = new Map<string, Map<number, PontoCurva>>();
      if (curvaIds.length > 0) {
        const { data: pts } = await supabase
          .from("curva_climatica_ponto")
          .select("curva_id, dia_idade, temp_alvo_c, temp_min_alarme_c, temp_max_alarme_c, ur_max_pct, ith_alarme_amarelo, ith_alarme_vermelho")
          .in("curva_id", curvaIds);
        for (const p of (pts || [])) {
          const m = pontosByCurva.get(p.curva_id) || new Map<number, PontoCurva>();
          m.set(p.dia_idade, p as PontoCurva);
          pontosByCurva.set(p.curva_id, m);
        }
      }

      if ((!regras || regras.length === 0) && curvaIds.length === 0) {
        console.log(`auto-temperatura: nenhuma regra nem curva para org ${integradoId}, pulando`);
        continue;
      }

      let accessToken: string | null = null;
      let region = "us";

      if (tokenData) {
        try {
          accessToken = await refreshAccessToken(supabase, tokenData, appId, appSecret);
          region = tokenData.region || "us";
        } catch (err) {
          console.error(`auto-temperatura: token refresh failed for ${integradoId}:`, err);
        }
      }

      // Get automation-enabled devices (incl. driver to route correctly)
      const { data: devices } = await supabase
        .from("dispositivos_iot")
        .select("id, device_id_ewelink, galpao_id, funcao_automacao, automacao_ativa, driver")
        .eq("integrado_id", integradoId)
        .eq("ativo", true);

      // eWeLink-only automation: skip ESP32 devices here, they are driven via canais_dispositivo
      const automationDevices = (devices || []).filter(
        (d: any) =>
          d.automacao_ativa &&
          d.funcao_automacao !== "nenhuma" &&
          (d.driver ?? "ewelink") === "ewelink"
      );

      // ── Offline detection for ALL active devices ──
      for (const dev of (devices || [])) {
        const { data: lastReading } = await supabase
          .from("leituras_sensores")
          .select("created_at, online")
          .eq("dispositivo_id", dev.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastReading) continue; // No readings yet, skip

        const readingAge = Date.now() - new Date(lastReading.created_at).getTime();
        const isOffline = readingAge > OFFLINE_THRESHOLD_MS || lastReading.online === false;

        if (isOffline) {
          // Check if we already sent an offline notification in the last hour
          // Dedup: only one offline notification per device every 6 hours
          const { data: recentNotif } = await supabase
            .from("admin_notifications")
            .select("id")
            .eq("integrado_id", integradoId)
            .eq("tipo", "dispositivo_offline")
            .ilike("mensagem", `%${dev.device_id_ewelink}%`)
            .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
            .limit(1)
            .maybeSingle();

          if (!recentNotif) {
            const minutesOffline = Math.round(readingAge / 60000);
            const galpaoName = dev.galpao_id ? `(galpão vinculado)` : `(sem galpão)`;
            
            await supabase.from("admin_notifications").insert({
              integrado_id: integradoId,
              tipo: "dispositivo_offline",
              titulo: `📡 Dispositivo offline há ${minutesOffline} min`,
              mensagem: `O dispositivo "${dev.device_id_ewelink}" está sem comunicação há ${minutesOffline} minutos ${galpaoName}. Verifique a conexão de internet da granja. Os timers de segurança continuam operando localmente.`,
            });
            
            console.log(`offline-alert: device ${dev.device_id_ewelink} offline for ${minutesOffline} min`);
            totalOfflineAlerts++;
          }
        }
      }

      // Load all channels for ESP32-S3 / multi-channel devices in this integrado
      // NOTE: canais com tipo_equipamento='iluminacao' são responsabilidade
      // exclusiva da edge function `auto-iluminacao` (programa de fotoperíodo).
      // Filtrados aqui para evitar conflito de comandos.
      const { data: canais } = await supabase
        .from("canais_dispositivo")
        .select("id, dispositivo_id, canal_numero, tipo_equipamento, funcao_automacao, automacao_ativa, ativo, estado_atual")
        .eq("integrado_id", integradoId)
        .eq("ativo", true)
        .eq("automacao_ativa", true)
        .neq("tipo_equipamento", "iluminacao");

      const canaisByDevice = new Map<string, any[]>();
      for (const c of (canais || [])) {
        const arr = canaisByDevice.get(c.dispositivo_id) || [];
        arr.push(c);
        canaisByDevice.set(c.dispositivo_id, arr);
      }

      for (const lote of integradoLotes) {
        const ageDays = Math.floor(
          (Date.now() - new Date(lote.data_alojamento).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        // ── Curva diária (preferida) com fallback para regras grossas ──
        const pontosLote = lote.curva_climatica_id ? pontosByCurva.get(lote.curva_climatica_id) : null;
        const pontoHoje: PontoCurva | null = pontosLote?.get(ageDays) || null;
        const regra = (regras || []).find((r: any) => ageDays >= r.dia_inicio && ageDays <= r.dia_fim);

        if (!pontoHoje && !regra) {
          console.log(`auto-temperatura: lote ${lote.id} dia ${ageDays} sem curva nem regra, pulando`);
          continue;
        }

        const tempMin = pontoHoje?.temp_min_alarme_c ?? Number(regra!.temp_min_c);
        const tempMax = pontoHoje?.temp_max_alarme_c ?? Number(regra!.temp_max_c);
        const umidMax = pontoHoje?.ur_max_pct ?? (regra?.umidade_max_pct != null ? Number(regra.umidade_max_pct) : 70);

        const allGalpaoDeviceIds = (devices || [])
          .filter((d: any) => d.galpao_id === lote.galpao_id)
          .map((d: any) => d.id);

        if (allGalpaoDeviceIds.length === 0) continue;

        const { data: leitura } = await supabase
          .from("leituras_sensores")
          .select("temperatura_c, umidade_pct, created_at")
          .in("dispositivo_id", allGalpaoDeviceIds)
          .not("temperatura_c", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const temp = leitura?.temperatura_c != null ? Number(leitura.temperatura_c) : null;
        const umid = leitura?.umidade_pct != null ? Number(leitura.umidade_pct) : null;
        const sensorIdadeMin = leitura
          ? Math.floor((Date.now() - new Date(leitura.created_at).getTime()) / 60000)
          : Number.MAX_SAFE_INTEGER;

        if (temp != null && sensorIdadeMin <= hist.sensor_max_idade_min) {
          await manageAlerts(supabase, integradoId, lote.id, lote.galpao_id, temp, tempMin, tempMax);
          totalAlerts++;
        }

        // ── Multi-channel (ESP32) com motor padrão-ouro ──
        for (const dev of (devices || []).filter((d: any) => d.galpao_id === lote.galpao_id)) {
          const devCanais = canaisByDevice.get(dev.id) || [];
          for (const canal of devCanais) {
            const decisao = decideCanalGoldStandard(
              canal, canal.funcao_automacao, ageDays, temp, umid,
              pontoHoje, { tempMin, tempMax, umidMax }, hist, sensorIdadeMin
            );
            if (!decisao) continue;

            const guard = checaTempoMinimo(canal, decisao.state, canal.funcao_automacao, hist);
            if (guard !== "ok") decisao.bloqueado_por = guard;

            await supabase.from("log_decisao_clima").insert({
              integrado_id: integradoId,
              galpao_id: lote.galpao_id,
              lote_id: lote.id,
              canal_id: canal.id,
              dispositivo_id: dev.id,
              funcao_automacao: canal.funcao_automacao,
              estado_decidido: decisao.bloqueado_por ? "mantido" : decisao.state,
              estagio: decisao.estagio,
              temp_lida: temp,
              ur_lida: umid,
              ith_calc: temp != null ? calcularITH(temp, umid) : null,
              setpoint_alvo: pontoHoje?.temp_alvo_c ?? (tempMin + tempMax) / 2,
              reason_chain: decisao.reason,
              bloqueado_por: decisao.bloqueado_por ?? null,
            });

            if (decisao.bloqueado_por) {
              console.log(`hist-block: canal ${canal.id} ${decisao.state} bloqueado por ${decisao.bloqueado_por}`);
              continue;
            }
            if (canal.estado_atual === decisao.state) continue;

            const nowIso = new Date().toISOString();
            const updateFields: Record<string, unknown> = {
              estado_atual: decisao.state,
              ultimo_comando_em: nowIso,
            };
            if (decisao.state === "on") updateFields.ultimo_on_em = nowIso;
            else updateFields.ultimo_off_em = nowIso;
            await supabase.from("canais_dispositivo").update(updateFields).eq("id", canal.id);

            await supabase.from("log_automacao_temperatura").insert({
              dispositivo_id: dev.id,
              lote_id: lote.id,
              temperatura_lida: temp,
              temp_min_regra: tempMin,
              temp_max_regra: tempMax,
              acao: `canal_${canal.canal_numero}_${canal.funcao_automacao}_${decisao.state} [${decisao.estagio}]: ${decisao.reason.join(' | ')}`,
              resultado: "enfileirado",
              tempo_resposta_ms: 0,
            });
            totalActions++;
          }
        }

        // ── Device-level (eWeLink) com motor padrão-ouro ──
        if (!accessToken) continue;
        const galpaoDevices = automationDevices.filter((d: any) => d.galpao_id === lote.galpao_id);
        if (galpaoDevices.length === 0) continue;

        for (const device of galpaoDevices) {
          try {
            await syncTimersForDevice(supabase, accessToken, appId, region, device, lote.id, integradoId, ageDays, { tempMin, tempMax });
          } catch (timerErr) {
            console.error(`auto-temperatura: timer sync failed for device ${device.device_id_ewelink}:`, timerErr);
          }

          const deviceAsCanal = { estado_atual: null, ultimo_on_em: null, ultimo_off_em: null };
          const decisao = decideCanalGoldStandard(
            deviceAsCanal, device.funcao_automacao, ageDays, temp, umid,
            pontoHoje, { tempMin, tempMax, umidMax }, hist, sensorIdadeMin
          );
          if (!decisao) continue;
          const desiredState = decisao.state;
          const acao = `${decisao.state}_${device.funcao_automacao} [${decisao.estagio}]: ${decisao.reason.join(' | ')}`;

          try {
            const statusResult = await getDeviceStatus(accessToken, appId, region, device.device_id_ewelink);
            const currentState = statusResult?.data?.params?.switch;
            if (currentState === desiredState) continue;
          } catch { /* proceed */ }

          console.log(`auto-temperatura: ${acao} → device ${device.device_id_ewelink}`);
          const t0 = Date.now();
          const result = await controlDevice(accessToken, appId, region, device.device_id_ewelink, { switch: desiredState });
          const tempoRespostaMs = Date.now() - t0;
          const resultado = result.error === 0 ? "sucesso" : `erro: ${result.msg || result.error}`;

          await supabase.from("log_automacao_temperatura").insert({
            dispositivo_id: device.id,
            lote_id: lote.id,
            temperatura_lida: temp,
            temp_min_regra: tempMin,
            temp_max_regra: tempMax,
            acao,
            resultado,
            tempo_resposta_ms: tempoRespostaMs,
          });

          totalActions++;
        }
      }
    }

    console.log(`auto-temperatura: completed with ${totalActions} actions, ${totalAlerts} alert checks, ${totalOfflineAlerts} offline alerts`);
    return jsonResponse({ message: "Automação executada", actions: totalActions, alerts: totalAlerts, offlineAlerts: totalOfflineAlerts });

  } catch (error) {
    console.error("auto-temperatura error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
