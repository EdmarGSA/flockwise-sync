// Auto-cortina: decide posição (%) das cortinas baseada em temperatura,
// estágio de ventilação, idade do lote e vento externo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { removerOutliersIQR, zonasAtivasPara } from "../_shared/agregarLeituras.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function mean(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();
  const decisoes: any[] = [];

  try {
    const { data: programas, error } = await supabase
      .from("programa_cortina_inteligente")
      .select("*")
      .eq("ativo", true);
    if (error) throw error;

    for (const prog of programas ?? []) {
      const reason: string[] = [];

      // Lote ativo no galpão
      const { data: lote } = await supabase
        .from("lotes")
        .select("id, data_alojamento, integrado_id")
        .eq("galpao_id", prog.galpao_id)
        .eq("status", "alojado")
        .maybeSingle();

      // Última leitura ambiente
      const { data: leitura } = await supabase
        .from("leituras_sensores")
        .select("temperatura_c, umidade_pct, created_at")
        .eq("galpao_id", prog.galpao_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Estágio de ventilação atual
      const { data: estagio } = await supabase
        .from("estagio_ventilacao_estado")
        .select("estagio_atual, velocidade_estimada_ms")
        .eq("galpao_id", prog.galpao_id)
        .maybeSingle();

      // Vento externo (se considerado)
      let ventoMs: number | null = null;
      if (prog.considerar_vento_externo) {
        const { data: clima } = await supabase
          .from("clima_atual_nucleo")
          .select("vento_ms")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        ventoMs = (clima as any)?.vento_ms ?? null;
      }

      // Faixa idade — cortina_pos_min/max
      let faixaMin: number | null = null;
      let faixaMax: number | null = null;
      if (lote?.data_alojamento) {
        const idadeDias =
          Math.floor((Date.now() - new Date(lote.data_alojamento).getTime()) / 86_400_000) + 1;
        const { data: regra } = await supabase
          .from("regras_temperatura_lote")
          .select("cortina_pos_min_pct, cortina_pos_max_pct")
          .eq("integrado_id", lote.integrado_id)
          .lte("dia_inicio", idadeDias)
          .gte("dia_fim", idadeDias)
          .maybeSingle();
        if (regra) {
          faixaMin = regra.cortina_pos_min_pct;
          faixaMax = regra.cortina_pos_max_pct;
          reason.push(`idade=${idadeDias}d, faixa cortina ${faixaMin ?? "—"}-${faixaMax ?? "—"}%`);
        }
      }

      // Posição-alvo por estágio
      const offsetByEstagio: Record<string, number> = {
        min: prog.offset_estagio_min_pct,
        transicao: prog.offset_estagio_transicao_pct,
        tunel: prog.offset_estagio_tunel_pct,
        heat_stress: prog.offset_estagio_heat_stress_pct,
      };
      const estagioAtual = estagio?.estagio_atual ?? "min";
      let alvo = offsetByEstagio[estagioAtual] ?? prog.offset_estagio_min_pct;
      reason.push(`estágio=${estagioAtual} → base ${alvo}%`);

      // Vento externo: limita abertura para proteger ave
      if (ventoMs != null && ventoMs >= (prog.vento_externo_max_ms ?? 8)) {
        const limite = 30;
        if (alvo > limite) {
          reason.push(`vento ${ventoMs}m/s ≥ ${prog.vento_externo_max_ms} → limita ${limite}%`);
          alvo = limite;
        }
      }

      // Limites do programa + faixa idade
      const minEfetivo = Math.max(prog.posicao_min_pct, faixaMin ?? 0);
      const maxEfetivo = Math.min(prog.posicao_max_pct, faixaMax ?? 100);
      alvo = clamp(alvo, minEfetivo, maxEfetivo);

      // Estado anterior
      const { data: estado } = await supabase
        .from("cortina_estado_atual")
        .select("posicao_atual_pct, ultima_movimentacao_em")
        .eq("galpao_id", prog.galpao_id)
        .maybeSingle();

      const atual = estado?.posicao_atual_pct ?? 0;
      const delta = alvo - atual;

      // Velocidade máxima de movimento (rampa anti-choque)
      const minutosDesdeUltima = estado?.ultima_movimentacao_em
        ? (Date.now() - new Date(estado.ultima_movimentacao_em).getTime()) / 60000
        : 5;
      const maxStep =
        delta > 0
          ? prog.velocidade_abertura_pct_min * Math.max(1, minutosDesdeUltima)
          : prog.velocidade_fechamento_pct_min * Math.max(1, minutosDesdeUltima);
      const proximaPos = clamp(atual + Math.sign(delta) * Math.min(Math.abs(delta), maxStep), 0, 100);

      reason.push(`atual ${atual}% → alvo ${alvo}% (passo ${Math.round(proximaPos - atual)}%)`);

      // Persiste estado
      await supabase
        .from("cortina_estado_atual")
        .upsert({
          galpao_id: prog.galpao_id,
          integrado_id: prog.integrado_id,
          posicao_atual_pct: Math.round(proximaPos),
          posicao_alvo_pct: Math.round(alvo),
          ultima_movimentacao_em: proximaPos !== atual ? new Date().toISOString() : estado?.ultima_movimentacao_em,
          ultimo_motivo: reason.join(" | "),
          reason_chain: reason,
          updated_at: new Date().toISOString(),
        });

      // Comanda canais com suporte_posicionamento
      if (Math.round(proximaPos) !== atual) {
        await supabase
          .from("canais_dispositivo")
          .update({ posicao_atual_pct: Math.round(proximaPos) })
          .eq("galpao_id", prog.galpao_id)
          .eq("funcao_automacao", "cortina")
          .eq("suporta_posicionamento", true);
      }

      // Auditoria (best-effort)
      try {
        await supabase.from("log_decisao_clima").insert({
          integrado_id: prog.integrado_id,
          galpao_id: prog.galpao_id,
          lote_id: lote?.id ?? null,
          funcao_automacao: "cortina",
          estado_decidido: `${Math.round(proximaPos)}%`,
          temp_lida: leitura?.temperatura_c ?? null,
          umidade_lida: leitura?.umidade_pct ?? null,
          reason_chain: reason,
        });
      } catch (_) { /* tabela pode não existir em todos ambientes */ }

      decisoes.push({ galpao_id: prog.galpao_id, alvo, proximaPos, reason });
    }

    return new Response(
      JSON.stringify({ ok: true, decisoes, ms: Date.now() - startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
