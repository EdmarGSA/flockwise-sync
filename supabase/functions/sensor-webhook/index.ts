import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

// Assinatura HMAC-SHA256 do corpo bruto, enviada em `x-signature` (hex, com ou sem prefixo sha256=)
async function assinaturaValida(rawBody: string, header: string | null): Promise<boolean> {
  const secret = Deno.env.get("SENSOR_WEBHOOK_SECRET");
  if (!secret) return false;
  if (!header) return false;
  const recebida = header.replace(/^sha256=/i, "").trim().toLowerCase();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const esperada = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (esperada.length !== recebida.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ recebida.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.text();
    if (!(await assinaturaValida(rawBody, req.headers.get("x-signature")))) {
      return new Response(
        JSON.stringify({ error: "Assinatura inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // eWeLink webhook payload structure
    const deviceId = body.deviceid || body.device_id;
    const params = body.params || {};

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: "deviceid é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find registered device
    const { data: device, error: devErr } = await supabase
      .from("dispositivos_iot")
      .select("id, nome, galpao_id")
      .eq("device_id_ewelink", deviceId)
      .eq("ativo", true)
      .maybeSingle();

    if (devErr || !device) {
      return new Response(
        JSON.stringify({ message: "Dispositivo não registrado, ignorando" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const num = (v: unknown) => (v == null || v === "" ? null : parseFloat(String(v)));
    const temp = num(params.currentTemperature ?? params.temperature);
    const hum = num(params.currentHumidity ?? params.humidity);
    const nh3 = num(params.nh3 ?? params.nh3_ppm ?? params.ammonia);
    const co2 = num(params.co2 ?? params.co2_ppm);
    const velAr = num(params.wind ?? params.velocidade_ar_ms ?? params.air_speed);
    const pressao = num(params.pressao ?? params.pressao_estatica_pa ?? params.static_pressure);
    const lux = num(params.lux ?? params.brightness);
    const online = params.online ?? true;

    // Insert reading
    const { error: insertErr } = await supabase.from("leituras_sensores").insert({
      dispositivo_id: device.id,
      temperatura_c: temp,
      umidade_pct: hum,
      nh3_ppm: nh3,
      co2_ppm: co2,
      velocidade_ar_ms: velAr,
      pressao_estatica_pa: pressao,
      lux,
      online,
      raw_data: params,
    });

    if (insertErr) {
      throw new Error(`Insert error: ${insertErr.message}`);
    }

    // Update ultimo_sync
    await supabase
      .from("dispositivos_iot")
      .update({ ultimo_sync: new Date().toISOString() })
      .eq("id", device.id);

    return new Response(
      JSON.stringify({ message: "Leitura registrada", device: device.nome, temp, hum }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no sensor-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
