import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EwelinkDevice {
  itemType: number;
  itemData: {
    deviceid: string;
    name: string;
    params: {
      currentTemperature?: string;
      currentHumidity?: string;
      online?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

interface TokenRecord {
  id: string;
  integrado_id: string;
  access_token: string;
  refresh_token: string;
  at_expired_at: string;
  rt_expired_at: string;
  region: string;
}

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

// ── Token helpers ──────────────────────────────────────────────

async function getTokenForIntegrado(supabase: any, integradoId: string): Promise<TokenRecord | null> {
  const { data } = await supabase
    .from("ewelink_tokens")
    .select("*")
    .eq("integrado_id", integradoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as TokenRecord | null;
}

async function refreshAccessToken(
  supabase: any,
  token: TokenRecord,
  appId: string,
  appSecret: string
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

  await supabase
    .from("ewelink_tokens")
    .update({
      access_token: data.data.at,
      refresh_token: data.data.rt,
      at_expired_at: newAtExpiry.toISOString(),
      rt_expired_at: newRtExpiry.toISOString(),
    })
    .eq("id", token.id);

  console.log("eWeLink token refreshed successfully");
  return data.data.at;
}

// ── eWeLink API helpers ────────────────────────────────────────

function getRegionUrl(region: string) {
  return region === "cn" ? "https://cn-apia.coolkit.cn" : `https://${region}-apia.coolkit.cc`;
}

async function getEwelinkFamilies(
  accessToken: string, appId: string, region: string
): Promise<{ familyid: string; name: string }[]> {
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const res = await fetch(`${getRegionUrl(region)}/v2/family`, {
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json();
  if (data.error !== 0) {
    console.error("getEwelinkFamilies error:", data);
    return [];
  }
  return data.data?.familyList || [];
}

async function getEwelinkDevices(
  accessToken: string, appId: string, region: string, familyId?: string
): Promise<EwelinkDevice[]> {
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  let url = `${getRegionUrl(region)}/v2/device/thing?num=0`;
  if (familyId) url += `&familyid=${familyId}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`eWeLink devices returned invalid JSON (status ${res.status})`);
  }
  if (data.error !== 0) throw new Error(`eWeLink get devices failed: ${JSON.stringify(data)}`);
  return data.data?.thingList || [];
}

async function getAllEwelinkDevices(
  accessToken: string, appId: string, region: string
): Promise<EwelinkDevice[]> {
  let devices = await getEwelinkDevices(accessToken, appId, region);
  if (devices.length > 0) return devices;

  console.log("Default family returned 0 devices, trying all families…");
  const families = await getEwelinkFamilies(accessToken, appId, region);
  for (const fam of families) {
    devices = await getEwelinkDevices(accessToken, appId, region, fam.familyid);
    if (devices.length > 0) {
      console.log(`Found ${devices.length} devices in family "${fam.name}"`);
      return devices;
    }
  }
  return [];
}

// ── OAuth URL generator ────────────────────────────────────────

async function generateOAuthUrl(
  appId: string,
  appSecret: string,
  redirectUrl: string,
  state: string,
): Promise<string> {
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const seq = Date.now().toString();

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${appId}_${seq}`));
  const authorization = btoa(String.fromCharCode(...new Uint8Array(sig)));

  const params = new URLSearchParams({
    clientId: appId,
    redirectUrl,
    grantType: "authorization_code",
    state,
    nonce,
    seq,
    authorization,
  });

  return `https://c2ccdn.coolkit.cc/oauth/index.html?${params.toString()}`;
}

// ── JSON response helper ───────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Main handler ───────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const appId = Deno.env.get("EWELINK_APP_ID");
    const appSecret = Deno.env.get("EWELINK_APP_SECRET");

    if (!appId || !appSecret) {
      return jsonResponse({ error: "Credenciais eWeLink não configuradas." }, 400);
    }

    // Parse action + params from query string or body
    const url = new URL(req.url);
    let action = url.searchParams.get("action") || "sync";
    let integradoId = url.searchParams.get("integrado_id");
    let returnUrl: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.action) action = body.action;
        if (body?.integrado_id) integradoId = body.integrado_id;
        if (body?.returnUrl) returnUrl = body.returnUrl;
      } catch { /* no body */ }
    }

    // ── oauth-url: generate eWeLink OAuth authorization URL ──
    if (action === "oauth-url") {
      if (!integradoId) return jsonResponse({ error: "integrado_id é obrigatório" }, 400);

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const callbackUrl = `${supabaseUrl}/functions/v1/ewelink-oauth-callback`;

      const state = JSON.stringify({ integradoId, returnUrl });
      const oauthUrl = await generateOAuthUrl(appId, appSecret, callbackUrl, state);

      console.log(`OAuth URL generated for integrado ${integradoId}`);
      return jsonResponse({ url: oauthUrl });
    }

    // ── check-connection: check if integrado has a valid token ──
    if (action === "check-connection") {
      if (!integradoId) {
        return jsonResponse({ connected: false });
      }
      const token = await getTokenForIntegrado(supabase, integradoId);
      const connected = token ? new Date(token.rt_expired_at) > new Date() : false;
      return jsonResponse({ connected });
    }

    // ── For list-devices, sync: require integrado_id and their token ──
    if (!integradoId) {
      return jsonResponse({ error: "integrado_id é obrigatório" }, 400);
    }

    const token = await getTokenForIntegrado(supabase, integradoId);
    if (!token) {
      return jsonResponse({
        error: "NOT_CONNECTED",
        message: "Conta eWeLink não conectada. Informe email e senha para conectar.",
      }, 401);
    }

    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(supabase, token, appId, appSecret);
    } catch (err) {
      if (err instanceof Error && err.message === "REAUTH_REQUIRED") {
        await supabase.from("ewelink_tokens").delete().eq("id", token.id);
        return jsonResponse({
          error: "REAUTH_REQUIRED",
          message: "Token expirado. Reconecte sua conta eWeLink clicando em 'Conectar'.",
        }, 401);
      }
      throw err;
    }

    const region = token.region || "us";

    // ── list-devices ──
    if (action === "list-devices") {
      const devices = await getAllEwelinkDevices(accessToken, appId, region);
      const sensorDevices = devices
        .filter((d) => d.itemType === 1 || d.itemType === 2)
        .map((d) => ({
          deviceId: d.itemData.deviceid,
          name: d.itemData.name,
          online: d.itemData.params?.online ?? false,
          temperatura: d.itemData.params?.currentTemperature
            ? parseFloat(d.itemData.params.currentTemperature) : null,
          umidade: d.itemData.params?.currentHumidity
            ? parseFloat(d.itemData.params.currentHumidity) : null,
        }));

      return jsonResponse({ devices: sensorDevices });
    }

    // ── sync ──
    if (action === "sync") {
      const ewelinkDevices = await getAllEwelinkDevices(accessToken, appId, region);
      const deviceMap = new Map<string, EwelinkDevice["itemData"]["params"]>();
      for (const d of ewelinkDevices) {
        deviceMap.set(d.itemData.deviceid, d.itemData.params);
      }

      const { data: dbDevices, error: dbError } = await supabase
        .from("dispositivos_iot")
        .select("*")
        .eq("integrado_id", integradoId)
        .eq("ativo", true);
      if (dbError) throw new Error(`DB error: ${dbError.message}`);

      console.log(`Sync: ${ewelinkDevices.length} API devices, ${dbDevices?.length || 0} DB devices`);

      const readings = [];
      for (const dev of dbDevices || []) {
        const params = deviceMap.get(dev.device_id_ewelink);
        if (!params) continue;

        const temp = params.currentTemperature ? parseFloat(params.currentTemperature) : null;
        const hum = params.currentHumidity ? parseFloat(params.currentHumidity) : null;
        const online = params.online ?? false;

        const { error: insertErr } = await supabase.from("leituras_sensores").insert({
          dispositivo_id: dev.id,
          temperatura_c: temp,
          umidade_pct: hum,
          online,
          raw_data: params as Record<string, unknown>,
        });

        if (!insertErr) {
          readings.push({ device: dev.nome, temp, hum, online });
        }

        await supabase
          .from("dispositivos_iot")
          .update({ ultimo_sync: new Date().toISOString() })
          .eq("id", dev.id);
      }

      return jsonResponse({ message: "Sync concluído", leituras: readings.length, detalhes: readings });
    }

    return jsonResponse({ error: "Ação inválida. Use action=oauth-url, check-connection, list-devices ou sync" }, 400);
  } catch (error) {
    console.error("Erro no sync-sensors:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
