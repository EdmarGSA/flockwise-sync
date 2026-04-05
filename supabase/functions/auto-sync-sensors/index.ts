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

// ── eWeLink helpers ────────────────────────────────────────────

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

  console.log(`auto-sync: token refreshed for integrado ${token.integrado_id}`);
  return data.data.at;
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
  if (data.error !== 0) return [];
  return data.data?.familyList || [];
}

async function getEwelinkDevices(
  accessToken: string, appId: string, region: string, familyId?: string
): Promise<any[]> {
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

  const data = await res.json();
  if (data.error !== 0) return [];
  return data.data?.thingList || [];
}

async function getAllEwelinkDevices(
  accessToken: string, appId: string, region: string
): Promise<any[]> {
  let devices = await getEwelinkDevices(accessToken, appId, region);
  if (devices.length > 0) return devices;

  const families = await getEwelinkFamilies(accessToken, appId, region);
  for (const fam of families) {
    devices = await getEwelinkDevices(accessToken, appId, region, fam.familyid);
    if (devices.length > 0) return devices;
  }
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

    const appId = Deno.env.get("EWELINK_APP_ID")!;
    const appSecret = Deno.env.get("EWELINK_APP_SECRET")!;

    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: "Credenciais eWeLink não configuradas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all distinct integrado_ids with active devices
    const { data: devices, error: devErr } = await supabase
      .from("dispositivos_iot")
      .select("integrado_id")
      .eq("ativo", true);

    if (devErr) throw new Error(`Devices query error: ${devErr.message}`);

    const integradoIds = [...new Set((devices || []).map((d: any) => d.integrado_id))];

    if (integradoIds.length === 0) {
      console.log("auto-sync: no active devices found");
      return new Response(JSON.stringify({ message: "Nenhum dispositivo ativo", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`auto-sync: processing ${integradoIds.length} integrado(s)`);

    let totalReadings = 0;
    let totalErrors = 0;

    for (const integradoId of integradoIds) {
      try {
        // Get token
        const { data: tokenData } = await supabase
          .from("ewelink_tokens")
          .select("*")
          .eq("integrado_id", integradoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!tokenData) {
          console.log(`auto-sync: no token for integrado ${integradoId}, skipping`);
          continue;
        }

        let accessToken: string;
        try {
          accessToken = await refreshAccessToken(supabase, tokenData, appId, appSecret);
        } catch (err) {
          console.error(`auto-sync: token error for ${integradoId}:`, err);
          continue;
        }

        const region = tokenData.region || "us";

        // Get all eWeLink devices
        const ewelinkDevices = await getAllEwelinkDevices(accessToken, appId, region);
        const deviceMap = new Map<string, any>();
        for (const d of ewelinkDevices) {
          deviceMap.set(d.itemData.deviceid, {
            params: d.itemData.params,
            online: d.itemData.online ?? d.itemData.params?.online ?? false,
          });
        }

        // Get DB devices for this integrado
        const { data: dbDevices } = await supabase
          .from("dispositivos_iot")
          .select("id, device_id_ewelink, nome")
          .eq("integrado_id", integradoId)
          .eq("ativo", true);

        let readings = 0;
        for (const dev of dbDevices || []) {
          const entry = deviceMap.get(dev.device_id_ewelink);
          if (!entry) continue;

          const temp = entry.params.currentTemperature ? parseFloat(entry.params.currentTemperature) : null;
          const hum = entry.params.currentHumidity ? parseFloat(entry.params.currentHumidity) : null;
          const online = entry.online;

          const { error: insertErr } = await supabase.from("leituras_sensores").insert({
            dispositivo_id: dev.id,
            temperatura_c: temp,
            umidade_pct: hum,
            online,
            raw_data: entry.params,
          });

          if (!insertErr) readings++;

          await supabase
            .from("dispositivos_iot")
            .update({ ultimo_sync: new Date().toISOString() })
            .eq("id", dev.id);
        }

        totalReadings += readings;
        console.log(`auto-sync: integrado ${integradoId} → ${readings} leituras gravadas`);

      } catch (err) {
        totalErrors++;
        console.error(`auto-sync: error for integrado ${integradoId}:`, err);
      }
    }

    const result = {
      message: "Auto-sync concluído",
      integrados: integradoIds.length,
      leituras: totalReadings,
      erros: totalErrors,
    };

    console.log(`auto-sync: completed — ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("auto-sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
