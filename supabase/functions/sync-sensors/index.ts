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

async function refreshAccessToken(
  supabase: any,
  token: TokenRecord,
  appId: string,
  appSecret: string
): Promise<string> {
  const now = new Date();
  const atExpiry = new Date(token.at_expired_at);

  // Token still valid
  if (now < atExpiry) {
    return token.access_token;
  }

  // Check if refresh token is still valid
  const rtExpiry = new Date(token.rt_expired_at);
  if (now >= rtExpiry) {
    throw new Error("REAUTH_REQUIRED");
  }

  // Refresh the token
  const regionUrl = token.region === "cn" ? "https://cn-apia.coolkit.cn" : `https://${token.region}-apia.coolkit.cc`;
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const body = { rt: token.refresh_token };
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(body)));
  const sign = btoa(String.fromCharCode(...new Uint8Array(sig)));

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
  if (data.error !== 0) {
    throw new Error(`Token refresh failed: ${data.msg || data.error}`);
  }

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

async function getEwelinkDevices(accessToken: string, appId: string, region: string): Promise<EwelinkDevice[]> {
  const regionUrl = region === "cn" ? "https://cn-apia.coolkit.cn" : `https://${region}-apia.coolkit.cc`;
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);

  const res = await fetch(`${regionUrl}/v2/device/thing?num=0`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await res.text();
  console.log("eWeLink GET /v2/device/thing response:", text.substring(0, 500));
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`eWeLink devices returned invalid JSON (status ${res.status})`);
  }
  if (data.error !== 0) {
    throw new Error(`eWeLink get devices failed: ${JSON.stringify(data)}`);
  }

  console.log(`eWeLink returned ${data.data?.thingList?.length || 0} devices`);
  return data.data?.thingList || [];
}

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
      return new Response(
        JSON.stringify({ error: "Credenciais eWeLink não configuradas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    let action = url.searchParams.get("action") || "sync";
    let integradoId = url.searchParams.get("integrado_id");
    let returnUrl: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.action) action = body.action;
        if (body?.integrado_id) integradoId = body.integrado_id;
        if (body?.return_url) returnUrl = body.return_url;
      } catch { /* no body */ }
    }

    // Return public App ID for OAuth flow (legacy)
    if (action === "config") {
      return new Response(
        JSON.stringify({ appId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed OAuth URL (backend-only, keeps APP_SECRET safe)
    if (action === "oauth-url") {
      if (!integradoId) {
        return new Response(
          JSON.stringify({ error: "integrado_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const seq = Date.now().toString();
      const signPayload = `${appId}_${seq}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(appSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signPayload));
      const authorization = btoa(String.fromCharCode(...new Uint8Array(sig)));

      const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const redirectUrl = `${supabaseUrl}/functions/v1/ewelink-oauth-callback`;

      const statePayload = returnUrl
        ? JSON.stringify({ integradoId, returnUrl })
        : integradoId;
      const state = encodeURIComponent(statePayload);

      const oauthUrl = `https://c2ccdn.coolkit.cc/oauth/index.html?clientId=${appId}&seq=${seq}&authorization=${encodeURIComponent(authorization)}&redirectUrl=${encodeURIComponent(redirectUrl)}&grantType=authorization_code&state=${state}&nonce=${nonce}&showQRCode=false`;

      return new Response(
        JSON.stringify({ url: oauthUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!integradoId) {
      return new Response(
        JSON.stringify({ error: "integrado_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stored OAuth token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("ewelink_tokens")
      .select("*")
      .eq("integrado_id", integradoId)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ error: "NOT_CONNECTED", message: "Conta eWeLink não conectada. Clique em 'Conectar eWeLink' primeiro." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get valid access token (auto-refresh if needed)
    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(supabase, tokenRecord as TokenRecord, appId, appSecret);
    } catch (err) {
      if (err instanceof Error && err.message === "REAUTH_REQUIRED") {
        // Delete expired token
        await supabase.from("ewelink_tokens").delete().eq("id", tokenRecord.id);
        return new Response(
          JSON.stringify({ error: "REAUTH_REQUIRED", message: "Token expirado. Reconecte sua conta eWeLink." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }

    const region = tokenRecord.region || "us";

    if (action === "list-devices") {
      const devices = await getEwelinkDevices(accessToken, appId, region);
      const sensorDevices = devices
        .filter((d) => d.itemType === 1 || d.itemType === 2)
        .map((d) => ({
          deviceId: d.itemData.deviceid,
          name: d.itemData.name,
          online: d.itemData.params?.online ?? false,
          temperatura: d.itemData.params?.currentTemperature ? parseFloat(d.itemData.params.currentTemperature) : null,
          umidade: d.itemData.params?.currentHumidity ? parseFloat(d.itemData.params.currentHumidity) : null,
        }));

      return new Response(
        JSON.stringify({ devices: sensorDevices }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync") {
      const ewelinkDevices = await getEwelinkDevices(accessToken, appId, region);
      const deviceMap = new Map<string, EwelinkDevice["itemData"]["params"]>();
      for (const d of ewelinkDevices) {
        deviceMap.set(d.itemData.deviceid, d.itemData.params);
      }

      const { data: dbDevices, error: dbError } = await supabase
        .from("dispositivos_iot")
        .select("*")
        .eq("ativo", true)
        .eq("integrado_id", integradoId);

      if (dbError) throw new Error(`DB error: ${dbError.message}`);

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

      return new Response(
        JSON.stringify({ message: "Sync concluído", leituras: readings.length, detalhes: readings }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use action=oauth-url, list-devices ou sync" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no sync-sensors:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
