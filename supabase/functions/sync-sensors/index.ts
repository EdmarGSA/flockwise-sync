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

async function getEwelinkToken(appId: string, appSecret: string): Promise<{ accessToken: string; region: string }> {
  // Step 1: Get nonce
  const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const ts = Math.floor(Date.now() / 1000);

  // Generate HMAC-SHA256 sign
  const signPayload = `${appId}_${ts}_${nonce}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", encoder.encode(signPayload), key);
  const sign = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Step 2: Login to get token
  const loginRes = await fetch("https://apia.coolkit.cc/v2/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      "X-CK-Nonce": nonce,
      Authorization: `Sign ${sign}`,
    },
    body: JSON.stringify({
      lang: "en",
      countryCode: "+55",
      ts,
      nonce,
    }),
  });

  const loginData = await loginRes.json();
  if (loginData.error !== 0) {
    throw new Error(`eWeLink login failed: ${JSON.stringify(loginData)}`);
  }

  return {
    accessToken: loginData.data.at,
    region: loginData.data.region || "us",
  };
}

async function getEwelinkDevices(accessToken: string, appId: string, region: string): Promise<EwelinkDevice[]> {
  const regionUrl = `https://${region}-apia.coolkit.cc`;
  const res = await fetch(`${regionUrl}/v2/device/thing`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-CK-Appid": appId,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (data.error !== 0) {
    throw new Error(`eWeLink get devices failed: ${JSON.stringify(data)}`);
  }

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
        JSON.stringify({ error: "Credenciais eWeLink não configuradas. Configure EWELINK_APP_ID e EWELINK_APP_SECRET." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "sync";
    const integradoId = url.searchParams.get("integrado_id");

    if (action === "list-devices") {
      // List all devices from eWeLink account
      const { accessToken, region } = await getEwelinkToken(appId, appSecret);
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
      // Sync readings for all registered devices
      const { accessToken, region } = await getEwelinkToken(appId, appSecret);
      const ewelinkDevices = await getEwelinkDevices(accessToken, appId, region);

      // Build map: deviceId -> params
      const deviceMap = new Map<string, EwelinkDevice["itemData"]["params"]>();
      for (const d of ewelinkDevices) {
        deviceMap.set(d.itemData.deviceid, d.itemData.params);
      }

      // Get registered devices from DB
      let query = supabase.from("dispositivos_iot").select("*").eq("ativo", true);
      if (integradoId) {
        query = query.eq("integrado_id", integradoId);
      }
      const { data: dbDevices, error: dbError } = await query;

      if (dbError) {
        throw new Error(`DB error: ${dbError.message}`);
      }

      const readings = [];
      for (const dev of dbDevices || []) {
        const params = deviceMap.get(dev.device_id_ewelink);
        if (!params) continue;

        const temp = params.currentTemperature ? parseFloat(params.currentTemperature) : null;
        const hum = params.currentHumidity ? parseFloat(params.currentHumidity) : null;
        const online = params.online ?? false;

        // Insert reading
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

        // Update ultimo_sync
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
      JSON.stringify({ error: "Ação inválida. Use action=list-devices ou action=sync" }),
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
