import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse state to extract integradoId and optional returnUrl
  function parseState(state: string | null): { integradoId: string | null; returnUrl: string | null } {
    if (!state) return { integradoId: null, returnUrl: null };
    try {
      const parsed = JSON.parse(decodeURIComponent(state));
      return { integradoId: parsed.integradoId || null, returnUrl: parsed.returnUrl || null };
    } catch {
      // Fallback: state is a raw UUID
      return { integradoId: state, returnUrl: null };
    }
  }

  function buildRedirectOrHtml(success: boolean, returnUrl: string | null, errorMsg?: string): Response {
    if (returnUrl) {
      const sep = returnUrl.includes("?") ? "&" : "?";
      const target = success
        ? `${returnUrl}${sep}ewelink_connected=true`
        : `${returnUrl}${sep}ewelink_error=${encodeURIComponent(errorMsg || "Erro desconhecido")}`;
      return Response.redirect(target, 302);
    }
    // Fallback: postMessage for popup context
    return new Response(
      `<!DOCTYPE html><html><head><title>eWeLink OAuth</title></head><body>
<p>${success ? "Conectado com sucesso! Fechando..." : `Erro: ${errorMsg}`}</p>
<script>
if(window.opener){window.opener.postMessage({type:"ewelink-oauth-complete",success:${success}},"*");}
setTimeout(function(){window.close();},1500);
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const { integradoId, returnUrl } = parseState(stateRaw);

    if (!code) {
      return buildRedirectOrHtml(false, returnUrl, "Missing authorization code");
    }

    if (!integradoId) {
      return buildRedirectOrHtml(false, returnUrl, "Missing state (integrado_id)");
    }

    const appId = Deno.env.get("EWELINK_APP_ID")!;
    const appSecret = Deno.env.get("EWELINK_APP_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callbackUrl = `${supabaseUrl}/functions/v1/ewelink-oauth-callback`;

    // Exchange code for tokens - try multiple regions
    const regions = ["us", "eu", "as", "cn"];
    let tokenData: any = null;
    let resolvedRegion = "us";
    const lastErrors: string[] = [];

    for (const region of regions) {
      const regionUrl = region === "cn" ? "https://cn-apia.coolkit.cn" : `https://${region}-apia.coolkit.cc`;
      const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
      const tokenBody = {
        code,
        redirectUrl: callbackUrl,
        grantType: "authorization_code",
      };

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(appSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(tokenBody)));
      const sign = btoa(String.fromCharCode(...new Uint8Array(sig)));

      try {
        console.log(`[oauth-callback] Trying region ${region}...`);
        const res = await fetch(`${regionUrl}/v2/user/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CK-Appid": appId,
            "X-CK-Nonce": nonce,
            Authorization: `Sign ${sign}`,
          },
          body: JSON.stringify(tokenBody),
        });

        const text = await res.text();
        console.log(`[oauth-callback] Region ${region} response (${res.status}): ${text.substring(0, 500)}`);
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          lastErrors.push(`${region}: invalid JSON`);
          continue;
        }

        if (data.error === 10004) {
          lastErrors.push(`${region}: wrong region (10004)`);
          continue;
        }
        if (data.error !== 0) {
          lastErrors.push(`${region}: error ${data.error} - ${data.msg || JSON.stringify(data)}`);
          continue;
        }

        tokenData = data.data;
        resolvedRegion = data.data.region || region;
        console.log(`[oauth-callback] Token obtained from region ${resolvedRegion}`);
        break;
      } catch (e) {
        lastErrors.push(`${region}: fetch error - ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }

    if (!tokenData) {
      console.error("[oauth-callback] All regions failed:", lastErrors);
      return buildRedirectOrHtml(false, returnUrl, "Falha ao trocar código por token");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Token exchange returns: accessToken, refreshToken, atExpiredTime (ms timestamp), rtExpiredTime (ms timestamp)
    const atExpiry = new Date(tokenData.atExpiredTime);
    const rtExpiry = new Date(tokenData.rtExpiredTime);

    const { error: dbError } = await supabase
      .from("ewelink_tokens")
      .upsert({
        integrado_id: integradoId,
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        at_expired_at: atExpiry.toISOString(),
        rt_expired_at: rtExpiry.toISOString(),
        region: resolvedRegion,
      }, { onConflict: "integrado_id" });

    if (dbError) {
      console.error("DB error storing tokens:", dbError);
      return buildRedirectOrHtml(false, returnUrl, `Erro ao salvar: ${dbError.message}`);
    }

    console.log(`eWeLink OAuth: tokens stored for integrado ${integradoId}, region ${resolvedRegion}`);

    return buildRedirectOrHtml(true, returnUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    // Try to extract returnUrl from state for error redirect
    try {
      const url = new URL(req.url);
      const { returnUrl } = parseState(url.searchParams.get("state"));
      return buildRedirectOrHtml(false, returnUrl, error instanceof Error ? error.message : "Erro interno");
    } catch {
      return new Response("Erro interno", { status: 500 });
    }
  }
});

// Helper to parse state outside try block (hoisted)
function parseState(state: string | null): { integradoId: string | null; returnUrl: string | null } {
  if (!state) return { integradoId: null, returnUrl: null };
  try {
    const parsed = JSON.parse(decodeURIComponent(state));
    return { integradoId: parsed.integradoId || null, returnUrl: parsed.returnUrl || null };
  } catch {
    return { integradoId: state, returnUrl: null };
  }
}
