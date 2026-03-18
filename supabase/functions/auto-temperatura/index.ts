import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── HMAC helper ────────────────────────────────────────────────
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

    // 1. Find all active batches with housing date
    const { data: lotes, error: lotesErr } = await supabase
      .from("lotes")
      .select("id, integrado_id, galpao_id, data_alojamento")
      .eq("status", "alojado")
      .not("data_alojamento", "is", null)
      .not("galpao_id", "is", null);

    if (lotesErr) throw new Error(`Lotes query error: ${lotesErr.message}`);
    if (!lotes || lotes.length === 0) {
      return jsonResponse({ message: "Nenhum lote alojado encontrado", actions: 0 });
    }

    console.log(`auto-temperatura: ${lotes.length} lotes alojados encontrados`);

    // Group lotes by integrado_id for token efficiency
    const lotesByIntegrado = new Map<string, typeof lotes>();
    for (const lote of lotes) {
      const arr = lotesByIntegrado.get(lote.integrado_id) || [];
      arr.push(lote);
      lotesByIntegrado.set(lote.integrado_id, arr);
    }

    let totalActions = 0;

    for (const [integradoId, integradoLotes] of lotesByIntegrado) {
      // Get eWeLink token for this integrado
      const { data: tokenData } = await supabase
        .from("ewelink_tokens")
        .select("*")
        .eq("integrado_id", integradoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokenData) {
        console.log(`auto-temperatura: no token for integrado ${integradoId}, skipping`);
        continue;
      }

      let accessToken: string;
      try {
        accessToken = await refreshAccessToken(supabase, tokenData, appId, appSecret);
      } catch (err) {
        console.error(`auto-temperatura: token refresh failed for ${integradoId}:`, err);
        continue;
      }

      const region = tokenData.region || "us";

      // Get temperature rules for this integrado
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

      // Get automation-enabled devices for this integrado
      const { data: devices } = await supabase
        .from("dispositivos_iot")
        .select("id, device_id_ewelink, galpao_id, funcao_automacao")
        .eq("integrado_id", integradoId)
        .eq("ativo", true)
        .eq("automacao_ativa", true)
        .neq("funcao_automacao", "nenhuma");

      if (!devices || devices.length === 0) continue;

      for (const lote of integradoLotes) {
        const ageDays = Math.floor(
          (Date.now() - new Date(lote.data_alojamento).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        // Find applicable rule
        const regra = regras.find(r => ageDays >= r.dia_inicio && ageDays <= r.dia_fim);
        if (!regra) {
          console.log(`auto-temperatura: no rule for age ${ageDays}d on lote ${lote.id}`);
          continue;
        }

        // Get devices linked to this lot's galpao
        const galpaoDevices = devices.filter(d => d.galpao_id === lote.galpao_id);
        if (galpaoDevices.length === 0) continue;

        // Get latest temperature reading from any sensor in this galpao
        const sensorDeviceIds = galpaoDevices.map(d => d.id);
        // Also check all devices in the galpao (including sensors that aren't automation-enabled)
        const { data: allGalpaoDevices } = await supabase
          .from("dispositivos_iot")
          .select("id")
          .eq("galpao_id", lote.galpao_id)
          .eq("ativo", true);

        const allDeviceIds = (allGalpaoDevices || []).map(d => d.id);
        if (allDeviceIds.length === 0) continue;

        const { data: leitura } = await supabase
          .from("leituras_sensores")
          .select("temperatura_c, created_at")
          .in("dispositivo_id", allDeviceIds)
          .not("temperatura_c", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!leitura || leitura.temperatura_c === null) {
          console.log(`auto-temperatura: no reading for galpao of lote ${lote.id}`);
          continue;
        }

        // Check if reading is recent (< 15 min)
        const readingAge = Date.now() - new Date(leitura.created_at).getTime();
        if (readingAge > 15 * 60 * 1000) {
          console.log(`auto-temperatura: reading too old (${Math.round(readingAge / 60000)}min) for lote ${lote.id}`);
          continue;
        }

        const temp = Number(leitura.temperatura_c);

        for (const device of galpaoDevices) {
          let desiredState: "on" | "off" | null = null;
          let acao = "";

          if (device.funcao_automacao === "aquecimento") {
            if (temp < Number(regra.temp_min_c)) {
              desiredState = "on";
              acao = `ligar_aquecimento (temp ${temp}°C < min ${regra.temp_min_c}°C)`;
            } else if (temp >= Number(regra.temp_min_c)) {
              desiredState = "off";
              acao = `desligar_aquecimento (temp ${temp}°C >= min ${regra.temp_min_c}°C)`;
            }
          } else if (device.funcao_automacao === "ventilacao") {
            if (temp > Number(regra.temp_max_c)) {
              desiredState = "on";
              acao = `ligar_ventilacao (temp ${temp}°C > max ${regra.temp_max_c}°C)`;
            } else if (temp <= Number(regra.temp_max_c)) {
              desiredState = "off";
              acao = `desligar_ventilacao (temp ${temp}°C <= max ${regra.temp_max_c}°C)`;
            }
          }

          if (desiredState === null) continue;

          // Check current state to avoid redundant commands
          try {
            const statusResult = await getDeviceStatus(accessToken, appId, region, device.device_id_ewelink);
            const currentState = statusResult?.data?.params?.switch;

            if (currentState === desiredState) {
              console.log(`auto-temperatura: device ${device.device_id_ewelink} already ${desiredState}, skipping`);
              continue;
            }
          } catch {
            // If we can't check status, proceed with command anyway
          }

          // Send command
          console.log(`auto-temperatura: ${acao} → device ${device.device_id_ewelink}`);
          const result = await controlDevice(accessToken, appId, region, device.device_id_ewelink, { switch: desiredState });

          const resultado = result.error === 0 ? "sucesso" : `erro: ${result.msg || result.error}`;

          // Log the action
          await supabase.from("log_automacao_temperatura").insert({
            dispositivo_id: device.id,
            lote_id: lote.id,
            temperatura_lida: temp,
            temp_min_regra: regra.temp_min_c,
            temp_max_regra: regra.temp_max_c,
            acao,
            resultado,
          });

          totalActions++;
        }
      }
    }

    console.log(`auto-temperatura: completed with ${totalActions} actions`);
    return jsonResponse({ message: "Automação executada", actions: totalActions });

  } catch (error) {
    console.error("auto-temperatura error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
