// SM-WT (IE Tecnologia) Wi-Fi ingest endpoint
// O sensor envia POST com {serial, temperature, humidity, rssi?, battery?}
// e Header "x-sensor-token: <sensor_wifi_token>".
// É a fonte primária de leitura. O fallback RS485 (via esp32-bridge) só
// grava se essa fonte ficar > 5 min sem chegar (regra na RPC).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sensor-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Payload {
  serial?: string;
  temperature?: number;
  humidity?: number;
  rssi?: number;
  battery?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("x-sensor-token");
    if (!token) return json({ error: "x-sensor-token ausente" }, 401);

    const body = (await req.json()) as Payload;
    if (!body.serial) return json({ error: "serial obrigatório" }, 400);
    if (body.temperature === undefined && body.humidity === undefined) {
      return json({ error: "temperature ou humidity obrigatório" }, 400);
    }

    const { data: device, error } = await supabase
      .from("dispositivos_iot")
      .select("id, integrado_id, sensor_wifi_token, sensor_serial, ativo")
      .eq("sensor_serial", body.serial)
      .maybeSingle();

    if (error || !device) return json({ error: "Sensor não cadastrado" }, 404);
    if (!device.ativo) return json({ error: "Sensor inativo" }, 403);
    if (device.sensor_wifi_token !== token) {
      return json({ error: "Token inválido" }, 401);
    }

    const { data: leituraId, error: rpcErr } = await supabase.rpc(
      "registrar_leitura_sensor_unificada",
      {
        p_dispositivo_id: device.id,
        p_temperatura: body.temperature ?? null,
        p_umidade: body.humidity ?? null,
        p_fonte: "wifi_sensor",
        p_raw: { rssi: body.rssi ?? null, battery: body.battery ?? null },
      },
    );

    if (rpcErr) {
      console.error("RPC erro", rpcErr);
      return json({ error: "Falha ao registrar leitura" }, 500);
    }

    return json({ ok: true, leitura_id: leituraId });
  } catch (err) {
    console.error("sm-wt-ingest erro:", err);
    return json({ error: String(err) }, 500);
  }
});
