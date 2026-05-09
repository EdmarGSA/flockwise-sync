// auto-nebulizacao — driver de nebulização inteligente.
// Acionado pelo climate-brain com decisão {ligar, deligar} por galpão.
// Respeita: UR off, ciclo on/off, cooldown, idade mínima, ventilação mínima.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrainDecision {
  galpao_id: string;
  integrado_id: string;
  acao: "ligar" | "desligar" | "manter";
  motivo: string;
  temp_c: number;
  ur_pct: number;
  idade_dias: number;
  ventilacao_pct: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: { decisoes?: BrainDecision[] } = {};
  try { payload = await req.json(); } catch { /* GET healthcheck */ }
  const decisoes = payload.decisoes ?? [];

  const aplicadas: any[] = [];

  for (const d of decisoes) {
    const { data: prog } = await supabase
      .from("programa_nebulizacao_galpao")
      .select("*")
      .eq("galpao_id", d.galpao_id)
      .maybeSingle();
    if (!prog || !prog.ativo) {
      aplicadas.push({ galpao_id: d.galpao_id, skip: "sem_programa_ativo" }); continue;
    }

    // Guard rails
    if (d.idade_dias < (prog.idade_minima_dias ?? 14)) {
      aplicadas.push({ galpao_id: d.galpao_id, skip: "pinteiro_protegido" }); continue;
    }
    if (d.ur_pct >= (prog.ur_max_pct ?? 75)) {
      aplicadas.push({ galpao_id: d.galpao_id, skip: "ur_alta" }); continue;
    }
    if (d.ventilacao_pct < (prog.ventilacao_min_pct ?? 70) && d.acao === "ligar") {
      aplicadas.push({ galpao_id: d.galpao_id, skip: "ventilacao_insuficiente" }); continue;
    }

    // Cooldown
    if (prog.ultimo_acionamento_em && d.acao === "ligar") {
      const elapsed = (Date.now() - new Date(prog.ultimo_acionamento_em).getTime()) / 1000;
      if (prog.ultimo_estado === "off" && elapsed < (prog.cooldown_seg ?? 120)) {
        aplicadas.push({ galpao_id: d.galpao_id, skip: `cooldown_${Math.round((prog.cooldown_seg - elapsed))}s` });
        continue;
      }
    }

    // Selecionar canais com função "nebulizacao" do galpão
    const { data: canais } = await supabase
      .from("canais_dispositivo")
      .select("id, dispositivo_id, estado_atual, automacao_ativa")
      .eq("integrado_id", d.integrado_id)
      .eq("funcao_automacao", "nebulizacao")
      .eq("ativo", true);

    const ativos = (canais ?? []).filter((c: any) => c.automacao_ativa);
    if (ativos.length === 0) {
      aplicadas.push({ galpao_id: d.galpao_id, skip: "sem_canais" }); continue;
    }

    const novoEstado = d.acao === "ligar" ? "on" : "off";

    // Atualiza programa (idempotente)
    await supabase
      .from("programa_nebulizacao_galpao")
      .update({
        ultimo_acionamento_em: new Date().toISOString(),
        ultimo_estado: novoEstado,
      })
      .eq("galpao_id", d.galpao_id);

    // Log decisão
    await supabase.from("log_decisao_clima").insert({
      integrado_id: d.integrado_id,
      galpao_id: d.galpao_id,
      funcao_automacao: "nebulizacao",
      estado_decidido: novoEstado,
      temp_lida: d.temp_c,
      ur_lida: d.ur_pct,
      modo_dominante: "nebulizacao",
      reason_chain: [d.motivo, `ciclo ${prog.ciclo_on_seg}s/${prog.ciclo_off_seg}s`],
    });

    aplicadas.push({ galpao_id: d.galpao_id, novo_estado: novoEstado, canais: ativos.length });
  }

  return new Response(JSON.stringify({ ok: true, aplicadas }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
