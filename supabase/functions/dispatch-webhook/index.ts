import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  evento: string;
  fornecedor_global_id: string;
  dados: Record<string, unknown>;
}

interface WebhookConfig {
  id: string;
  url: string;
  secret: string | null;
  tentativas_max: number;
  timeout_ms: number;
  headers: Record<string, string>;
}

// Gera assinatura HMAC-SHA256
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Envia webhook com retry
async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>,
  tentativa: number = 1
): Promise<{ success: boolean; statusCode?: number; error?: string; duracao_ms: number }> {
  const payloadStr = JSON.stringify(payload);
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": payload.evento,
      "X-Webhook-Timestamp": new Date().toISOString(),
      ...config.headers,
    };

    // Adicionar assinatura se secret configurado
    if (config.secret) {
      headers["X-Webhook-Signature"] = await generateSignature(payloadStr, config.secret);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duracao_ms = Date.now() - startTime;

    // Registrar log
    await supabase.from("webhooks_log").insert({
      webhook_id: config.id,
      fornecedor_global_id: payload.fornecedor_global_id,
      evento: payload.evento,
      payload: payload.dados,
      tentativa,
      status_code: response.status,
      resposta: await response.text().catch(() => null),
      duracao_ms,
    });

    if (response.ok) {
      return { success: true, statusCode: response.status, duracao_ms };
    }

    // Retry se não foi sucesso e ainda há tentativas
    if (tentativa < config.tentativas_max) {
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, tentativa - 1) * 1000));
      return sendWebhook(config, payload, supabase, tentativa + 1);
    }

    return { success: false, statusCode: response.status, error: `HTTP ${response.status}`, duracao_ms };
  } catch (error) {
    const duracao_ms = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Registrar erro no log
    await supabase.from("webhooks_log").insert({
      webhook_id: config.id,
      fornecedor_global_id: payload.fornecedor_global_id,
      evento: payload.evento,
      payload: payload.dados,
      tentativa,
      erro: errorMsg,
      duracao_ms,
    });

    // Retry se ainda há tentativas
    if (tentativa < config.tentativas_max) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, tentativa - 1) * 1000));
      return sendWebhook(config, payload, supabase, tentativa + 1);
    }

    return { success: false, error: errorMsg, duracao_ms };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: WebhookPayload = await req.json();
    const { evento, fornecedor_global_id, dados } = body;

    if (!evento || !fornecedor_global_id || !dados) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: evento, fornecedor_global_id, dados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar webhooks ativos para este evento e fornecedor
    const { data: webhooks, error: webhooksError } = await supabase
      .from("webhooks_fornecedor")
      .select("id, url, secret, tentativas_max, timeout_ms, headers")
      .eq("fornecedor_global_id", fornecedor_global_id)
      .eq("evento", evento)
      .eq("ativo", true);

    if (webhooksError) {
      console.error("Erro ao buscar webhooks:", webhooksError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum webhook configurado para este evento", enviados: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Disparar todos os webhooks em paralelo
    const results = await Promise.all(
      webhooks.map((wh) =>
        sendWebhook(
          wh as WebhookConfig,
          { evento, fornecedor_global_id, dados },
          supabase
        )
      )
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Webhooks disparados`,
        total: webhooks.length,
        sucesso: successCount,
        falha: failedCount,
        detalhes: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no dispatch-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
