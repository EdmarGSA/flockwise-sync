import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_BYTES = 10 * 1024 * 1024;

const SCHEMA = {
  type: 'object',
  properties: {
    lote_integradora: { type: ['string', 'null'] },
    abatedouro: { type: ['string', 'null'] },
    data_abate: { type: ['string', 'null'] },
    hora_media_abate: { type: ['string', 'null'] },
    idade_abate: { type: ['number', 'string', 'null'] },
    tipo_produto: { type: ['string', 'null'] },
    tecnico_responsavel: { type: ['string', 'null'] },
    aves_alojadas: { type: ['number', 'string', 'null'] },
    aves_abatidas: { type: ['number', 'string', 'null'] },
    peso_total_kg: { type: ['number', 'string', 'null'] },
    peso_medio_kg: { type: ['number', 'string', 'null'] },
    peso_projetado_kg: { type: ['number', 'string', 'null'] },
    consumo_total_racao_kg: { type: ['number', 'string', 'null'] },
    conversao_prevista: { type: ['number', 'string', 'null'] },
    conversao_real: { type: ['number', 'string', 'null'] },
    conversao_ajustada: { type: ['number', 'string', 'null'] },
    viabilidade_percentual: { type: ['number', 'string', 'null'] },
    mortalidade_prevista: { type: ['number', 'string', 'null'] },
    mortalidade_real: { type: ['number', 'string', 'null'] },
    pc_condenacao_previsto: { type: ['number', 'string', 'null'] },
    pc_condenacao_real: { type: ['number', 'string', 'null'] },
    pc_calo_pata_previsto: { type: ['number', 'string', 'null'] },
    pc_calo_pata_real: { type: ['number', 'string', 'null'] },
    aves_condenadas_total: { type: ['number', 'string', 'null'] },
    aves_condenadas_parcial: { type: ['number', 'string', 'null'] },
    calo_pata_quantidade: { type: ['number', 'string', 'null'] },
    preco_kg_frango: { type: ['number', 'string', 'null'] },
    valor_racao: { type: ['number', 'string', 'null'] },
    percentual_basico: { type: ['number', 'string', 'null'] },
    aval_conversao: { type: ['number', 'string', 'null'] },
    aval_condenacao: { type: ['number', 'string', 'null'] },
    aval_calo_pata: { type: ['number', 'string', 'null'] },
    aval_checklist: { type: ['number', 'string', 'null'] },
    resultado_bruto_pc: { type: ['number', 'string', 'null'] },
    resultado_bruto_valor: { type: ['number', 'string', 'null'] },
    valor_total_depositar: { type: ['number', 'string', 'null'] },
    cargas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          abatedouro: { type: ['string', 'null'] },
          data_abate: { type: ['string', 'null'] },
          quantidade: { type: ['number', 'string', 'null'] },
          peso_total_kg: { type: ['number', 'string', 'null'] },
          nota_produtor: { type: ['string', 'null'] },
        },
      },
    },
    condenacoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: ['string', 'null'] },
          codigo: { type: ['string', 'null'] },
          descricao: { type: ['string', 'null'] },
          quantidade: { type: ['number', 'string', 'null'] },
        },
      },
    },
    descontos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          descricao: { type: ['string', 'null'] },
          debito: { type: ['number', 'string', 'null'] },
          credito: { type: ['number', 'string', 'null'] },
        },
      },
    },
    origem_pintos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lote_matriz: { type: ['string', 'null'] },
          idade_matriz: { type: ['number', 'string', 'null'] },
          linhagem: { type: ['string', 'null'] },
          incubatorio: { type: ['string', 'null'] },
          peso_pinto_g: { type: ['number', 'string', 'null'] },
          quantidade: { type: ['number', 'string', 'null'] },
        },
      },
    },
    confianca: { type: ['object', 'null'], additionalProperties: { type: 'string' } },
    observacoes: { type: ['string', 'null'] },
  },
};

const PROMPT = `Você é um extrator de dados de RIPI (Relatório de Informações da Produção Integrada) de frigoríficos de frango de corte no Brasil (Seara, BRF, Aurora, JBS e similares).

Leia o documento em anexo e devolva SOMENTE os campos do esquema JSON, transcrevendo os valores exatamente como aparecem no documento (pode manter o formato brasileiro 1.234,5678 — a conversão é feita depois).

Regras:
- Nunca invente valores. Campo ausente ou ilegível => null.
- Pesos sempre em quilogramas; converte de toneladas se necessário.
- "cargas" = cada carregamento/carga de abate com nota do produtor.
- "condenacoes" = causas SIF, tipo "FT" para condenação total e "FP" para parcial.
- "descontos" = cada linha do bloco de Valores (débitos positivos, créditos positivos no campo credito).
- Em "confianca" informe, para cada campo preenchido, "alta", "media" ou "baixa" conforme a nitidez da leitura.
- Em "observacoes" registre qualquer bloco relevante que não coube no esquema.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) return json({ error: 'Não autenticado' }, 401);

    const body = await req.json().catch(() => null);
    const fileBase64: string | undefined = body?.fileBase64;
    const filename: string = typeof body?.filename === 'string' ? body.filename : 'ripi.pdf';
    const loteId: string | undefined = body?.loteId;
    const mimeType: string = typeof body?.mimeType === 'string' ? body.mimeType : 'application/pdf';

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return json({ error: 'Arquivo não enviado' }, 400);
    }
    if (mimeType !== 'application/pdf') {
      return json({ error: 'Envie um arquivo PDF' }, 400);
    }
    const approxBytes = Math.floor((fileBase64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return json({ error: 'PDF acima de 10 MB' }, 400);
    }
    if (!loteId || typeof loteId !== 'string') {
      return json({ error: 'Lote não informado' }, 400);
    }

    // O RLS garante que o lote pertence à organização do usuário
    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .select('id')
      .eq('id', loteId)
      .maybeSingle();
    if (loteError || !lote) return json({ error: 'Lote não encontrado nesta organização' }, 403);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'IA indisponível' }, 500);

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': apiKey },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'file',
                file: { filename, file_data: `data:${mimeType};base64,${fileBase64}` },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'ripi', schema: SCHEMA },
        },
      }),
    });

    if (aiResp.status === 429) return json({ error: 'Limite de uso da IA atingido. Tente novamente em instantes.' }, 429);
    if (aiResp.status === 402) return json({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }, 402);
    if (!aiResp.ok) {
      const detail = await aiResp.text();
      console.error('Erro do gateway de IA', aiResp.status, detail);
      return json({ error: 'Não foi possível ler o PDF' }, 502);
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? '';
    let dados: unknown;
    try {
      dados = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: 'Resposta da IA em formato inesperado' }, 502);
      dados = JSON.parse(match[0]);
    }

    return json({ dados });
  } catch (e) {
    console.error('importar-ripi falhou', e);
    return json({ error: 'Erro inesperado ao processar o PDF' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
