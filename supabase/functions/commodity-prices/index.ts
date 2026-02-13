import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache for commodity prices (1h TTL)
let cachedCotacoes: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchCommoditicPrices(): Promise<any[]> {
  const apiKey = Deno.env.get('COMMODITIC_API_KEY');
  if (!apiKey) return [];

  const now = Date.now();
  if (cachedCotacoes && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedCotacoes;
  }

  try {
    const commodities = [
      { symbol: 'CORN', nome: 'Milho', unidade: 'USD/bu' },
      { symbol: 'SOYBEAN_MEAL', nome: 'Farelo de Soja', unidade: 'USD/ton' },
      { symbol: 'SORGHUM', nome: 'Sorgo', unidade: 'USD/ton' },
      { symbol: 'MILLET', nome: 'Milheto', unidade: 'USD/ton' },
    ];

    // Try fetching from Commoditic API
    const response = await fetch(`https://api.commoditic.com/v1/prices?key=${apiKey}&symbols=CORN,SOYBEAN_MEAL,SORGHUM,MILLET`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error('Commoditic API error:', response.status);
      return cachedCotacoes || [];
    }

    const data = await response.json();
    const result = commodities.map(c => {
      const price = data?.prices?.[c.symbol] || data?.[c.symbol];
      return {
        nome: c.nome,
        preco: price?.last || price?.price || null,
        unidade: c.unidade,
        variacao: price?.change_percent || price?.change || null,
        tipo: 'cotacao',
      };
    }).filter(c => c.preco !== null);

    if (result.length > 0) {
      cachedCotacoes = result;
      cacheTimestamp = now;
    }

    return result;
  } catch (error) {
    console.error('Error fetching commodity prices:', error);
    return cachedCotacoes || [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const integradoId = url.searchParams.get('integrado_id');

    if (!integradoId) {
      return new Response(JSON.stringify({ error: 'integrado_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch commodity prices from external API
    const cotacoes = await fetchCommoditicPrices();

    // Fetch last purchase prices for "cereais" group products
    // First find the group IDs matching "cereal" or "cereais"
    const { data: grupos } = await supabase
      .from('grupos_produto')
      .select('id, nome')
      .eq('integrado_id', integradoId)
      .eq('ativo', true);

    const gruposCereais = (grupos || []).filter(g =>
      g.nome.toLowerCase().includes('cereal') || g.nome.toLowerCase().includes('cereais')
    );

    let ultimaCompra: any[] = [];

    if (gruposCereais.length > 0) {
      const grupoIds = gruposCereais.map(g => g.id);

      // Get products in these groups
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, unidade_medida')
        .eq('integrado_id', integradoId)
        .in('grupo_produto_id', grupoIds)
        .eq('ativo', true);

      if (produtos && produtos.length > 0) {
        const produtoIds = produtos.map(p => p.id);

        // Get latest OC items for these products from approved/received orders
        const { data: ocItens } = await supabase
          .from('ordens_compra_itens')
          .select(`
            produto_id,
            preco_unitario,
            unidade_medida,
            ordem_compra_id,
            ordens_compra!inner(status, data_emissao, integrado_id)
          `)
          .in('produto_id', produtoIds)
          .eq('ordens_compra.integrado_id', integradoId)
          .in('ordens_compra.status', ['aprovada', 'recebida'])
          .order('created_at', { ascending: false });

        // Group by product, keep the two most recent
        const itemsByProduct: Record<string, any[]> = {};
        (ocItens || []).forEach(item => {
          if (!itemsByProduct[item.produto_id]) {
            itemsByProduct[item.produto_id] = [];
          }
          if (itemsByProduct[item.produto_id].length < 2) {
            itemsByProduct[item.produto_id].push(item);
          }
        });

        const produtoMap = Object.fromEntries(produtos.map(p => [p.id, p]));

        ultimaCompra = Object.entries(itemsByProduct).map(([produtoId, items]) => {
          const ultimo = Number(items[0].preco_unitario);
          const penultimo = items.length > 1 ? Number(items[1].preco_unitario) : null;
          const variacao = penultimo ? ((ultimo - penultimo) / penultimo) * 100 : null;
          return {
            nome: produtoMap[produtoId]?.nome || 'Produto',
            preco: ultimo,
            unidade: `R$/${items[0].unidade_medida || produtoMap[produtoId]?.unidade_medida || 'kg'}`,
            variacao,
            tipo: 'ultima_compra',
          };
        });
      }
    }

    return new Response(JSON.stringify({ cotacoes, ultimaCompra }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in commodity-prices:', error);
    return new Response(JSON.stringify({ error: 'Internal error', cotacoes: [], ultimaCompra: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
