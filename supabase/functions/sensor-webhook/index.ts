import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

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
