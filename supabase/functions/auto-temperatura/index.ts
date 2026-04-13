import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function syncTimersForDevice(
  supabase: any, accessToken: string, appId: string, region: string,
  device: any, loteId: string, integradoId: string, ageDays: number
) {
  // Check if timers need resync (age band changed)
  const { data: existingTimer } = await supabase
    .from("timers_seguranca_iot")
    .select("idade_lote_dias")
    .eq("dispositivo_id", device.id)
    .eq("sincronizado", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousAge = existingTimer?.idade_lote_dias ?? null;
  const faixaAtual = getFaixaIdade(ageDays);
  const faixaAnterior = previousAge !== null ? getFaixaIdade(previousAge) : null;

  if (faixaAtual === faixaAnterior) return false; // No resync needed

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

  // Clean old timers for this device
  await supabase.from("timers_seguranca_iot").delete().eq("dispositivo_id", device.id);

  // Insert new timer records
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
    });
  }

  console.log(`timers: ${success ? 'synced' : 'FAILED'} for device ${device.device_id_ewelink} (age ${ageDays}, band ${faixaAtual})`);
  return success;
}


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
      .select("id, integrado_id, galpao_id, data_alojamento")
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

    for (const [integradoId, integradoLotes] of lotesByIntegrado) {
      const { data: tokenData } = await supabase
        .from("ewelink_tokens")
        .select("*")
        .eq("integrado_id", integradoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get temperature rules (needed for alerts even without token)
      const { data: regras } = await supabase
        .from("regras_temperatura_lote")
        .select("*")
        .eq("integrado_id", integradoId)
        .eq("ativo", true)
        .order("dia_inicio", { ascending: true });

      if (!regras || regras.length === 0) {
        console.log(`auto-temperatura: no rules for integrado ${integradoId}, skipping`);
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

      // Get automation-enabled devices
      const { data: devices } = await supabase
        .from("dispositivos_iot")
        .select("id, device_id_ewelink, galpao_id, funcao_automacao, automacao_ativa")
        .eq("integrado_id", integradoId)
        .eq("ativo", true);

      const automationDevices = (devices || []).filter(
        (d: any) => d.automacao_ativa && d.funcao_automacao !== "nenhuma"
      );

      for (const lote of integradoLotes) {
        const ageDays = Math.floor(
          (Date.now() - new Date(lote.data_alojamento).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        const regra = regras.find((r: any) => ageDays >= r.dia_inicio && ageDays <= r.dia_fim);
        if (!regra) continue;

        // Get all devices in this galpao for reading
        const allGalpaoDeviceIds = (devices || [])
          .filter((d: any) => d.galpao_id === lote.galpao_id)
          .map((d: any) => d.id);

        if (allGalpaoDeviceIds.length === 0) continue;

        const { data: leitura } = await supabase
          .from("leituras_sensores")
          .select("temperatura_c, created_at")
          .in("dispositivo_id", allGalpaoDeviceIds)
          .not("temperatura_c", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!leitura || leitura.temperatura_c === null) continue;

        const readingAge = Date.now() - new Date(leitura.created_at).getTime();
        if (readingAge > 15 * 60 * 1000) continue;

        const temp = Number(leitura.temperatura_c);
        const tempMin = Number(regra.temp_min_c);
        const tempMax = Number(regra.temp_max_c);

        // ── Manage alerts (works even without eWeLink token) ──
        await manageAlerts(supabase, integradoId, lote.id, lote.galpao_id, temp, tempMin, tempMax);
        totalAlerts++;

        // ── Device automation (requires eWeLink token) ──
        if (!accessToken) continue;

        const galpaoDevices = automationDevices.filter((d: any) => d.galpao_id === lote.galpao_id);
        if (galpaoDevices.length === 0) continue;

        for (const device of galpaoDevices) {
          let desiredState: "on" | "off" | null = null;
          let acao = "";

          if (device.funcao_automacao === "aquecimento") {
            if (temp < tempMin) {
              desiredState = "on";
              acao = `ligar_aquecimento (temp ${temp}°C < min ${tempMin}°C)`;
            } else {
              desiredState = "off";
              acao = `desligar_aquecimento (temp ${temp}°C >= min ${tempMin}°C)`;
            }
          } else if (device.funcao_automacao === "ventilacao") {
            if (temp > tempMax) {
              desiredState = "on";
              acao = `ligar_ventilacao (temp ${temp}°C > max ${tempMax}°C)`;
            } else {
              desiredState = "off";
              acao = `desligar_ventilacao (temp ${temp}°C <= max ${tempMax}°C)`;
            }
          }

          if (desiredState === null) continue;

          try {
            const statusResult = await getDeviceStatus(accessToken, appId, region, device.device_id_ewelink);
            const currentState = statusResult?.data?.params?.switch;
            if (currentState === desiredState) continue;
          } catch { /* proceed */ }

          console.log(`auto-temperatura: ${acao} → device ${device.device_id_ewelink}`);
          const result = await controlDevice(accessToken, appId, region, device.device_id_ewelink, { switch: desiredState });
          const resultado = result.error === 0 ? "sucesso" : `erro: ${result.msg || result.error}`;

          await supabase.from("log_automacao_temperatura").insert({
            dispositivo_id: device.id,
            lote_id: lote.id,
            temperatura_lida: temp,
            temp_min_regra: tempMin,
            temp_max_regra: tempMax,
            acao,
            resultado,
          });

          totalActions++;
        }
      }
    }

    console.log(`auto-temperatura: completed with ${totalActions} actions, ${totalAlerts} alert checks`);
    return jsonResponse({ message: "Automação executada", actions: totalActions, alerts: totalAlerts });

  } catch (error) {
    console.error("auto-temperatura error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
