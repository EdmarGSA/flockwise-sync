import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfigQA {
  integrado_id: string;
  nh3_amarelo_ppm: number;
  nh3_vermelho_ppm: number;
  co2_amarelo_ppm: number;
  co2_vermelho_ppm: number;
  pressao_min_pa: number;
  pressao_max_pa: number;
  cooldown_minutos: number;
  ativo: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: configs } = await supabase
      .from("config_alertas_qualidade_ar")
      .select("*")
      .eq("ativo", true);

    if (!configs?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let alertasCriados = 0;
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    for (const cfg of configs as ConfigQA[]) {
      // Buscar dispositivos da organização com leituras recentes
      const { data: devices } = await supabase
        .from("dispositivos_iot")
        .select("id, galpao_id, integrado_id")
        .eq("integrado_id", cfg.integrado_id)
        .eq("ativo", true);

      if (!devices?.length) continue;

      for (const dev of devices) {
        const { data: leituras } = await supabase
          .from("leituras_sensores")
          .select("nh3_ppm, co2_ppm, pressao_estatica_pa, created_at")
          .eq("dispositivo_id", dev.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!leituras?.length) continue;

        const avg = (key: keyof typeof leituras[0]) => {
          const vals = leituras.map((l) => Number(l[key])).filter((v) => Number.isFinite(v));
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };

        const nh3 = avg("nh3_ppm");
        const co2 = avg("co2_ppm");
        const pa = avg("pressao_estatica_pa");

        // Lote ativo
        const { data: lote } = await supabase
          .from("lotes")
          .select("id")
          .eq("galpao_id", dev.galpao_id)
          .eq("status", "alojado")
          .maybeSingle();

        const checkAndInsert = async (
          tipo: string,
          valor: number,
          limite: number,
          severidade: "aviso" | "critico",
        ) => {
          // Cooldown check
          const cooldownSince = new Date(Date.now() - cfg.cooldown_minutos * 60 * 1000).toISOString();
          const { count } = await supabase
            .from("alertas_qualidade_ar")
            .select("*", { count: "exact", head: true })
            .eq("dispositivo_id", dev.id)
            .eq("tipo", tipo)
            .gte("created_at", cooldownSince);
          if ((count ?? 0) > 0) return;

          await supabase.from("alertas_qualidade_ar").insert({
            integrado_id: cfg.integrado_id,
            galpao_id: dev.galpao_id,
            lote_id: lote?.id ?? null,
            dispositivo_id: dev.id,
            tipo,
            valor_lido: valor,
            limite_configurado: limite,
            severidade,
          });
          alertasCriados++;
        };

        if (nh3 != null) {
          if (nh3 >= cfg.nh3_vermelho_ppm) await checkAndInsert("nh3_vermelho", nh3, cfg.nh3_vermelho_ppm, "critico");
          else if (nh3 >= cfg.nh3_amarelo_ppm) await checkAndInsert("nh3_amarelo", nh3, cfg.nh3_amarelo_ppm, "aviso");
        }
        if (co2 != null) {
          if (co2 >= cfg.co2_vermelho_ppm) await checkAndInsert("co2_vermelho", co2, cfg.co2_vermelho_ppm, "critico");
          else if (co2 >= cfg.co2_amarelo_ppm) await checkAndInsert("co2_amarelo", co2, cfg.co2_amarelo_ppm, "aviso");
        }
        if (pa != null) {
          if (pa < cfg.pressao_min_pa) await checkAndInsert("pressao_baixa", pa, cfg.pressao_min_pa, "aviso");
          else if (pa > cfg.pressao_max_pa) await checkAndInsert("pressao_alta", pa, cfg.pressao_max_pa, "aviso");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, alertas: alertasCriados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-qualidade-ar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
