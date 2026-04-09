import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NFeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface NFeData {
  numero: string;
  serie: string;
  chave: string;
  cnpj_emitente: string;
  razao_social_emitente: string;
  data_emissao: string;
  valor_total: number;
  valor_frete: number;
  itens: NFeItem[];
}

function parseNFeXml(xmlText: string): NFeData | null {
  try {
    // Extract key fields using regex (Deno edge functions don't have full DOM parser)
    const getTag = (tag: string, xml: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };

    const getTagInBlock = (tag: string, block: string): string => {
      const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return match ? match[1].trim() : '';
    };

    // infNFe block
    const infNFeMatch = xmlText.match(/<infNFe[^>]*Id="NFe(\d{44})"[^>]*>/);
    const chave = infNFeMatch ? infNFeMatch[1] : '';

    // ide block
    const ideMatch = xmlText.match(/<ide>([\s\S]*?)<\/ide>/);
    const ideBlock = ideMatch ? ideMatch[1] : '';
    const numero = getTagInBlock('nNF', ideBlock);
    const serie = getTagInBlock('serie', ideBlock);
    const dhEmi = getTagInBlock('dhEmi', ideBlock) || getTagInBlock('dEmi', ideBlock);

    // emit block
    const emitMatch = xmlText.match(/<emit>([\s\S]*?)<\/emit>/);
    const emitBlock = emitMatch ? emitMatch[1] : '';
    const cnpj_emitente = getTagInBlock('CNPJ', emitBlock);
    const razao_social_emitente = getTagInBlock('xNome', emitBlock);

    // total block
    const totalMatch = xmlText.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/);
    const totalBlock = totalMatch ? totalMatch[1] : '';
    const valor_total = parseFloat(getTagInBlock('vNF', totalBlock)) || 0;
    const valor_frete = parseFloat(getTagInBlock('vFrete', totalBlock)) || 0;

    // items (det blocks)
    const itens: NFeItem[] = [];
    const detRegex = /<det\s[^>]*>([\s\S]*?)<\/det>/g;
    let detMatch;
    while ((detMatch = detRegex.exec(xmlText)) !== null) {
      const detBlock = detMatch[1];
      const prodMatch = detBlock.match(/<prod>([\s\S]*?)<\/prod>/);
      if (prodMatch) {
        const prodBlock = prodMatch[1];
        itens.push({
          codigo: getTagInBlock('cProd', prodBlock),
          descricao: getTagInBlock('xProd', prodBlock),
          ncm: getTagInBlock('NCM', prodBlock),
          cfop: getTagInBlock('CFOP', prodBlock),
          unidade: getTagInBlock('uCom', prodBlock),
          quantidade: parseFloat(getTagInBlock('qCom', prodBlock)) || 0,
          valor_unitario: parseFloat(getTagInBlock('vUnCom', prodBlock)) || 0,
          valor_total: parseFloat(getTagInBlock('vProd', prodBlock)) || 0,
        });
      }
    }

    if (!numero && !chave) return null;

    return {
      numero,
      serie,
      chave,
      cnpj_emitente,
      razao_social_emitente,
      data_emissao: dhEmi ? dhEmi.substring(0, 10) : '',
      valor_total,
      valor_frete,
      itens,
    };
  } catch (e) {
    console.error('Erro ao parsear XML:', e);
    return null;
  }
}

async function fetchGmailEmails(email: string, appPassword: string): Promise<Array<{ messageId: string; xmlContent: string }>> {
  const results: Array<{ messageId: string; xmlContent: string }> = [];

  // Use Gmail IMAP via fetch (basic auth with app password)
  // Gmail API REST approach using basic search
  const authHeader = btoa(`${email}:${appPassword}`);
  
  // Search for unread emails with XML attachments using Gmail API
  // Since we can't use IMAP directly, we use Gmail REST API
  const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  
  // First, list unread messages
  const searchResponse = await fetch(
    `${baseUrl}/messages?q=has:attachment+filename:xml+is:unread&maxResults=10`,
    {
      headers: { Authorization: `Bearer ${appPassword}` },
    }
  );

  if (!searchResponse.ok) {
    // If OAuth token doesn't work, try with basic IMAP simulation
    console.error('Gmail API error:', searchResponse.status, await searchResponse.text());
    return results;
  }

  const searchData = await searchResponse.json();
  const messages = searchData.messages || [];

  for (const msg of messages) {
    try {
      // Get full message
      const msgResponse = await fetch(
        `${baseUrl}/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${appPassword}` } }
      );

      if (!msgResponse.ok) continue;
      const msgData = await msgResponse.json();

      // Find XML attachments in parts
      const parts = msgData.payload?.parts || [];
      for (const part of parts) {
        if (part.filename && part.filename.toLowerCase().endsWith('.xml') && part.body?.attachmentId) {
          // Download attachment
          const attResponse = await fetch(
            `${baseUrl}/messages/${msg.id}/attachments/${part.body.attachmentId}`,
            { headers: { Authorization: `Bearer ${appPassword}` } }
          );

          if (!attResponse.ok) continue;
          const attData = await attResponse.json();

          // Decode base64url
          const base64 = attData.data.replace(/-/g, '+').replace(/_/g, '/');
          const xmlContent = atob(base64);

          results.push({ messageId: msg.id, xmlContent });
        }
      }

      // Mark as read
      await fetch(
        `${baseUrl}/messages/${msg.id}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${appPassword}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
        }
      );
    } catch (e) {
      console.error(`Erro ao processar mensagem ${msg.id}:`, e);
    }
  }

  return results;
}

async function tryMatchSolicitacao(
  supabaseAdmin: ReturnType<typeof createClient>,
  integradoId: string,
  nfe: NFeData
): Promise<string | null> {
  // Try to match with pending solicitacoes_racao by CNPJ and date proximity
  const { data: solicitacoes } = await supabaseAdmin
    .from('solicitacoes_racao')
    .select('id, lote_id, tipo_racao, quantidade_solicitada_kg, data_prevista_entrega, status')
    .eq('integrado_id', integradoId)
    .in('status', ['confirmado', 'enviado'])
    .order('data_prevista_entrega', { ascending: true });

  if (!solicitacoes || solicitacoes.length === 0) return null;

  // Simple heuristic: find solicitacao with closest quantity match
  const totalQtdNfe = nfe.itens.reduce((sum, item) => sum + item.quantidade, 0);

  let bestMatch: { id: string; diff: number } | null = null;
  for (const sol of solicitacoes) {
    const diff = Math.abs(sol.quantidade_solicitada_kg - totalQtdNfe);
    const percentDiff = diff / sol.quantidade_solicitada_kg;
    if (percentDiff < 0.15 && (!bestMatch || diff < bestMatch.diff)) {
      bestMatch = { id: sol.id, diff };
    }
  }

  return bestMatch?.id || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailToken = Deno.env.get('GMAIL_APP_TOKEN');

    if (!gmailEmail || !gmailToken) {
      return new Response(
        JSON.stringify({ error: 'Gmail credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Determine which integrado_id to use
    // Check request body for integrado_id, or fetch from config
    let integradoId: string | null = null;
    try {
      const body = await req.json();
      integradoId = body.integrado_id || null;
    } catch {
      // No body, try to find from profiles
    }

    if (!integradoId) {
      // Get first active integrado (for single-tenant setups)
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('integrado_id')
        .not('integrado_id', 'is', null)
        .limit(1);

      integradoId = profiles?.[0]?.integrado_id || null;
    }

    if (!integradoId) {
      return new Response(
        JSON.stringify({ error: 'No integrado_id found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch emails with XML attachments
    console.log(`Buscando e-mails em ${gmailEmail}...`);
    const emails = await fetchGmailEmails(gmailEmail, gmailToken);
    console.log(`Encontrados ${emails.length} e-mails com XML`);

    let processed = 0;
    let errors = 0;

    for (const { messageId, xmlContent } of emails) {
      try {
        // Check if already processed
        const { data: existing } = await supabaseAdmin
          .from('nfe_racao_recebidas')
          .select('id')
          .eq('email_message_id', messageId)
          .maybeSingle();

        if (existing) {
          console.log(`E-mail ${messageId} já processado, pulando`);
          continue;
        }

        // Parse NF-e XML
        const nfe = parseNFeXml(xmlContent);
        if (!nfe) {
          console.warn(`XML do e-mail ${messageId} não é NF-e válida`);
          await supabaseAdmin.from('nfe_racao_recebidas').insert({
            integrado_id: integradoId,
            email_message_id: messageId,
            status: 'erro',
            erro_mensagem: 'XML não reconhecido como NF-e válida',
            xml_raw: xmlContent.substring(0, 50000), // limit storage
          });
          errors++;
          continue;
        }

        // Check for duplicate by chave_nfe
        if (nfe.chave) {
          const { data: dupChave } = await supabaseAdmin
            .from('nfe_racao_recebidas')
            .select('id')
            .eq('chave_nfe', nfe.chave)
            .maybeSingle();

          if (dupChave) {
            console.log(`NF-e chave ${nfe.chave} já existe, pulando`);
            continue;
          }
        }

        // Try to match with solicitacao
        const solicitacaoId = await tryMatchSolicitacao(supabaseAdmin, integradoId, nfe);

        // Get lote_id from solicitacao if matched
        let loteId: string | null = null;
        if (solicitacaoId) {
          const { data: sol } = await supabaseAdmin
            .from('solicitacoes_racao')
            .select('lote_id')
            .eq('id', solicitacaoId)
            .maybeSingle();
          loteId = sol?.lote_id || null;
        }

        // Insert NF-e record
        await supabaseAdmin.from('nfe_racao_recebidas').insert({
          integrado_id: integradoId,
          numero_nfe: nfe.numero,
          serie: nfe.serie,
          chave_nfe: nfe.chave,
          cnpj_fornecedor: nfe.cnpj_emitente,
          razao_social_fornecedor: nfe.razao_social_emitente,
          data_emissao: nfe.data_emissao || null,
          valor_total: nfe.valor_total,
          valor_frete: nfe.valor_frete,
          xml_raw: xmlContent.substring(0, 100000),
          itens: nfe.itens,
          status: 'pendente_revisao',
          solicitacao_racao_id: solicitacaoId,
          lote_id: loteId,
          email_message_id: messageId,
        });

        processed++;
        console.log(`NF-e ${nfe.numero} processada com sucesso`);
      } catch (e) {
        console.error(`Erro ao processar e-mail ${messageId}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emails_found: emails.length,
        processed,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Erro geral:', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
