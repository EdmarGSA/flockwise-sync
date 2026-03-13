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

// ── Token helpers ──────────────────────────────────────────────

async function getMasterToken(supabase: any): Promise<TokenRecord | null> {
  const { data } = await supabase
    .from("ewelink_tokens")
    .select("*")
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

  const regionUrl = token.region === "cn"
    ? "https://cn-apia.coolkit.cn"
    : `https://${token.region}-apia.coolkit.cc`;
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const body = { rt: token.refresh_token };
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
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

function regionUrl(region: string) {
  return region === "cn" ? "https://cn-apia.coolkit.cn" : `https://${region}-apia.coolkit.cc`;
}

async function getEwelinkFamilies(
  accessToken: string, appId: string, region: string
): Promise<{ familyid: string; name: string }[]> {
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const res = await fetch(`${regionUrl(region)}/v2/family`, {
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
  const families = data.data?.familyList || [];
  console.log(`eWeLink families: ${families.length} →`, families.map((f: any) => `${f.name}(${f.familyid})`).join(", "));
  return families;
}

async function getEwelinkDevices(
  accessToken: string, appId: string, region: string, familyId?: string
): Promise<EwelinkDevice[]> {
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  let url = `${regionUrl(region)}/v2/device/thing?num=0`;
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
  console.log(`eWeLink devices (family=${familyId || "default"}): ${text.substring(0, 500)}`);
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`eWeLink devices returned invalid JSON (status ${res.status})`);
  }
  if (data.error !== 0) throw new Error(`eWeLink get devices failed: ${JSON.stringify(data)}`);
  return data.data?.thingList || [];
}

/** Fetch devices, falling back to iterating all families if default list is empty */
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
  console.log("No devices found across any family");
  return [];
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
      return new Response(
        JSON.stringify({ error: "Credenciais eWeLink não configuradas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // ── config (legacy) ──
    if (action === "config") {
      return new Response(
        JSON.stringify({ appId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── check-connection: returns whether a master token exists ──
    if (action === "check-connection") {
      const token = await getMasterToken(supabase);
      const connected = token ? new Date(token.rt_expired_at) > new Date() : false;
      return new Response(
        JSON.stringify({ connected }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── oauth-url: generate signed OAuth URL (admin-only, no integrado_id required) ──
    if (action === "oauth-url") {
      const seq = Date.now().toString();
      const signPayload = `${appId}_${seq}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(appSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signPayload));
      const authorization = btoa(String.fromCharCode(...new Uint8Array(sig)));

      const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
      const redirectUrl = `${supabaseUrl}/functions/v1/ewelink-oauth-callback`;

      // Use integradoId if provided, otherwise use a placeholder for master token
      const stateIntegradoId = integradoId || "master";
      const statePayload = returnUrl
        ? JSON.stringify({ integradoId: stateIntegradoId, returnUrl })
        : stateIntegradoId;
      const state = encodeURIComponent(statePayload);

      const oauthUrl = `https://c2ccdn.coolkit.cc/oauth/index.html?clientId=${appId}&seq=${seq}&authorization=${encodeURIComponent(authorization)}&redirectUrl=${encodeURIComponent(redirectUrl)}&grantType=authorization_code&state=${state}&nonce=${nonce}&showQRCode=false`;

      return new Response(
        JSON.stringify({ url: oauthUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── For list-devices and sync, use master token ──
    const masterToken = await getMasterToken(supabase);
    if (!masterToken) {
      return new Response(
        JSON.stringify({
          error: "NOT_CONNECTED",
          message: "Conta eWeLink mestre não conectada. Peça ao administrador para conectar.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(supabase, masterToken, appId, appSecret);
    } catch (err) {
      if (err instanceof Error && err.message === "REAUTH_REQUIRED") {
        await supabase.from("ewelink_tokens").delete().eq("id", masterToken.id);
        return new Response(
          JSON.stringify({
            error: "REAUTH_REQUIRED",
            message: "Token mestre expirado. Peça ao administrador para reconectar a conta eWeLink.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw err;
    }

    const region = masterToken.region || "us";

    // ── list-devices: return all devices from master account for selection ──
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

      return new Response(
        JSON.stringify({ devices: sensorDevices }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── sync: use master token, cross-reference DB devices ──
    if (action === "sync") {
      const ewelinkDevices = await getAllEwelinkDevices(accessToken, appId, region);
      const deviceMap = new Map<string, EwelinkDevice["itemData"]["params"]>();
      for (const d of ewelinkDevices) {
        deviceMap.set(d.itemData.deviceid, d.itemData.params);
      }

      // Fetch DB devices — optionally filter by integrado_id
      let query = supabase.from("dispositivos_iot").select("*").eq("ativo", true);
      if (integradoId) query = query.eq("integrado_id", integradoId);
      const { data: dbDevices, error: dbError } = await query;
      if (dbError) throw new Error(`DB error: ${dbError.message}`);

      console.log(`Sync: ${ewelinkDevices.length} API devices, ${dbDevices?.length || 0} DB devices`);

      const readings = [];
      for (const dev of dbDevices || []) {
        const params = deviceMap.get(dev.device_id_ewelink);
        if (!params) {
          console.log(`Device ${dev.nome} (${dev.device_id_ewelink}) not found in eWeLink API`);
          continue;
        }

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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use action=oauth-url, check-connection, list-devices ou sync" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Erro no sync-sensors:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
