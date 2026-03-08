import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mortalidade_id, lote_id } = await req.json();
    if (!mortalidade_id || !lote_id) {
      return new Response(JSON.stringify({ error: "mortalidade_id e lote_id obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch mortalidade with items
    const { data: mortalidade } = await supabase
      .from("mortalidade")
      .select("*, mortalidade_itens(*)")
      .eq("id", mortalidade_id)
      .single();

    if (!mortalidade) {
      return new Response(JSON.stringify({ error: "Mortalidade não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch fotos
    const { data: fotos } = await supabase
      .from("mortalidade_fotos")
      .select("url, motivo")
      .eq("mortalidade_id", mortalidade_id);

    // Fetch lote info
    const { data: lote } = await supabase
      .from("lotes")
      .select("*, galpoes(nome), nucleos(nome)")
      .eq("id", lote_id)
      .single();

    // Fetch recent pesagens for GPD
    const { data: pesagens } = await supabase
      .from("pesagens")
      .select("data_pesagem, pesagem_itens(quantidade_aves, peso_bruto_g, peso_tara_g)")
      .eq("lote_id", lote_id)
      .order("data_pesagem", { ascending: false })
      .limit(5);

    // Calculate GPD from pesagens
    let gpdInfo = "Sem pesagens disponíveis";
    if (pesagens && pesagens.length >= 2) {
      const calcPesoMedio = (p: any) => {
        const items = p.pesagem_itens || [];
        if (items.length === 0) return 0;
        const totalPeso = items.reduce((s: number, i: any) => s + (i.peso_bruto_g - i.peso_tara_g), 0);
        const totalAves = items.reduce((s: number, i: any) => s + i.quantidade_aves, 0);
        return totalAves > 0 ? totalPeso / totalAves : 0;
      };
      const ultimo = pesagens[0];
      const anterior = pesagens[1];
      const pesoUltimo = calcPesoMedio(ultimo);
      const pesoAnterior = calcPesoMedio(anterior);
      const diasDiff = Math.max(1, Math.round(
        (new Date(ultimo.data_pesagem).getTime() - new Date(anterior.data_pesagem).getTime()) / 86400000
      ));
      const gpd = (pesoUltimo - pesoAnterior) / diasDiff;
      gpdInfo = `GPD calculado: ${gpd.toFixed(2)} kg/dia. Último peso médio: ${pesoUltimo.toFixed(3)} kg`;
    }

    // Fetch mortality history
    const { data: histMort } = await supabase
      .from("mortalidade")
      .select("data_registro, mortalidade_itens(quantidade, motivo)")
      .eq("lote_id", lote_id)
      .order("data_registro", { ascending: false })
      .limit(10);

    const totalMortHistorico = (histMort || []).reduce((total: number, m: any) => {
      return total + (m.mortalidade_itens || []).reduce((s: number, i: any) => s + (i.quantidade || 0), 0);
    }, 0);

    // Build prompt
    const itensResumo = (mortalidade.mortalidade_itens || [])
      .map((i: any) => `${i.quantidade} aves - ${i.motivo}${i.submotivo ? ` (${i.submotivo})` : ''} - peso: ${i.peso_kg || 'N/I'} kg`)
      .join("\n");

    const contextPrompt = `Você é um veterinário especialista em avicultura. Analise os dados de mortalidade abaixo e retorne uma avaliação técnica.

DADOS DO LOTE:
- Linhagem: ${lote?.linhagem || 'N/I'}
- Sexo: ${lote?.sexo || 'N/I'}
- Aves alojadas: ${lote?.quantidade_aves || 'N/I'}
- Data alojamento: ${lote?.data_alojamento || 'N/I'}
- Núcleo: ${lote?.nucleos?.nome || 'N/I'}
- Galpão: ${lote?.galpoes?.nome || 'N/I'}

REGISTRO DE MORTALIDADE (${mortalidade.data_registro}):
${itensResumo}
- Temperatura ambiente: ${mortalidade.temperatura_c ? mortalidade.temperatura_c + '°C' : 'Não informada'}
- Umidade: ${mortalidade.umidade_pct ? mortalidade.umidade_pct + '%' : 'Não informada'}

DESEMPENHO:
${gpdInfo}

HISTÓRICO DE MORTALIDADE DO LOTE:
Total acumulado: ${totalMortHistorico} aves
Mortalidade acumulada: ${lote?.quantidade_aves ? ((totalMortHistorico / lote.quantidade_aves) * 100).toFixed(2) : 'N/I'}%

${fotos && fotos.length > 0 ? `\nFotos disponíveis: ${fotos.length} fotos de aves mortas foram anexadas.` : 'Nenhuma foto anexada.'}`;

    // Build messages with images
    const userContent: any[] = [{ type: "text", text: contextPrompt }];

    if (fotos && fotos.length > 0) {
      for (const foto of fotos.slice(0, 5)) {
        userContent.push({
          type: "image_url",
          image_url: { url: foto.url },
        });
      }
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "Você é um veterinário avícola especialista. Responda SEMPRE usando a tool fornecida.",
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analise_mortalidade",
              description: "Retorna análise estruturada da mortalidade avícola",
              parameters: {
                type: "object",
                properties: {
                  resumo: { type: "string", description: "Resumo geral da situação em 2-3 frases" },
                  causas_provaveis: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de 2-5 causas prováveis da mortalidade",
                  },
                  classificacao_risco: {
                    type: "string",
                    enum: ["baixo", "moderado", "alto", "critico"],
                    description: "Classificação de risco",
                  },
                  sugestoes_acao: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de 3-5 ações recomendadas",
                  },
                  gpd_avaliacao: {
                    type: "string",
                    description: "Avaliação do ganho de peso diário das aves",
                  },
                },
                required: ["resumo", "causas_provaveis", "classificacao_risco", "sugestoes_acao"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analise_mortalidade" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes (402)." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let analise;
    if (toolCall?.function?.arguments) {
      analise = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: parse from content
      analise = {
        resumo: aiData.choices?.[0]?.message?.content || "Análise inconclusiva",
        causas_provaveis: ["Dados insuficientes para determinar causa"],
        classificacao_risco: "moderado",
        sugestoes_acao: ["Coletar mais dados e fotos para análise futura"],
      };
    }

    // Save to DB
    await supabase
      .from("mortalidade")
      .update({ analise_ia: analise })
      .eq("id", mortalidade_id);

    return new Response(JSON.stringify({ analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analise-mortalidade error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
