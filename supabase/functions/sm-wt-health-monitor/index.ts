// SM-WT health monitor — roda via cron a cada 5 min.
// Detecta sensores Wi-Fi sem leitura há > 10 min e dispara notificação.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Sensores Wi-Fi cadastrados (têm token)
  const { data: sensores } = await supabase
    .from("dispositivos_iot")
    .select("id, integrado_id, nome, sensor_modelo")
    .eq("ativo", true)
    .not("sensor_wifi_token", "is", null);

  if (!sensores?.length) {
    return new Response(
      JSON.stringify({ ok: true, verificados: 0, alertados: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const alertados: string[] = [];



  for (const s of sensores ?? []) {
    // última leitura Wi-Fi
    const { data: ult } = await supabase
      .from("leituras_sensores")
      .select("created_at")
      .eq("dispositivo_id", s.id)
      .eq("fonte", "wifi_sensor")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const offline = !ult || ult.created_at < cutoff;
    if (!offline) continue;

    // Já alertou na última hora?
    const { data: jaAlertou } = await supabase
      .from("eventos_dispositivo_iot")
      .select("id")
      .eq("dispositivo_id", s.id)
      .eq("tipo", "sensor_wifi_offline")
      .gte("criado_em", new Date(Date.now() - 60 * 60_000).toISOString())
      .limit(1)
      .maybeSingle();
    if (jaAlertou) continue;

    await supabase.from("eventos_dispositivo_iot").insert({
      dispositivo_id: s.id,
      integrado_id: s.integrado_id,
      tipo: "sensor_wifi_offline",
      detalhes: { ultima_leitura: ult?.created_at ?? null, modelo: s.sensor_modelo },
    });
    await supabase.rpc("dispatch_notificacao", {
      p_codigo: "sensor_wifi_offline",
      p_integrado_id: s.integrado_id,
      p_titulo: `Sensor Wi-Fi offline: ${s.nome}`,
      p_mensagem: "Última leitura Wi-Fi há mais de 10 minutos. Fallback RS485 será usado se disponível.",
      p_contexto: { dispositivo_id: s.id },
    });
    alertados.push(s.id);
  }

  return new Response(
    JSON.stringify({ ok: true, verificados: sensores?.length ?? 0, alertados }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
