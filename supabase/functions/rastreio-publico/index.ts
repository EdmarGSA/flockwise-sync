// Edge function pública para rastreabilidade de ovos.
// Substitui o acesso anônimo direto às tabelas (que foi removido por segurança).
// Retorna apenas os campos estritamente necessários para a página /rastreio/:lote.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lote = url.searchParams.get("lote")?.trim();

    if (!lote || lote.length < 3 || lote.length > 32 || !/^[A-Za-z0-9-]+$/.test(lote)) {
      return new Response(
        JSON.stringify({ error: "Lote inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cliente com service role — bypassa RLS apenas para retornar campos públicos selecionados
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Buscar estoque pelo lote_interno
    const { data: estoque, error: errEstoque } = await supabase
      .from("estoque_ovos")
      .select(
        "lote_interno, tipo_ovo, classificacao_peso, data_producao, data_validade, integrado_id, lote_producao_id",
      )
      .eq("lote_interno", lote)
      .eq("ativo", true)
      .maybeSingle();

    if (errEstoque) throw errEstoque;
    if (!estoque) {
      return new Response(
        JSON.stringify({ error: "Lote não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Buscar dados do produtor (organizacao) — somente nome e cidade/estado
    const { data: org } = await supabase
      .from("organizacoes")
      .select("razao_social, nome_fantasia, cidade, estado")
      .eq("integrado_id", estoque.integrado_id)
      .maybeSingle();

    // 3. Buscar dados do núcleo/galpão via lote de produção (opcional)
    let nucleo_nome: string | null = null;
    let galpao_nome: string | null = null;

    if (estoque.lote_producao_id) {
      const { data: lote } = await supabase
        .from("lotes")
        .select("galpao_id, galpoes(nome, nucleo_id, nucleos(nome))")
        .eq("id", estoque.lote_producao_id)
        .maybeSingle();

      const galpao: any = (lote as any)?.galpoes;
      galpao_nome = galpao?.nome ?? null;
      nucleo_nome = galpao?.nucleos?.nome ?? null;
    }

    const payload = {
      lote_interno: estoque.lote_interno,
      tipo_ovo: estoque.tipo_ovo,
      classificacao_peso: estoque.classificacao_peso,
      data_producao: estoque.data_producao,
      data_validade: estoque.data_validade,
      nucleo_nome,
      galpao_nome,
      produtor_nome: org?.nome_fantasia || org?.razao_social || null,
      produtor_cidade: org?.cidade ?? null,
      produtor_estado: org?.estado ?? null,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (e: any) {
    console.error("rastreio-publico error:", e);
    return new Response(
      JSON.stringify({ error: "Erro ao consultar rastreabilidade" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
