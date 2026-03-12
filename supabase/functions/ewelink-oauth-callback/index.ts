import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // contains integrado_id

    if (!code) {
      return new Response(buildHtmlResponse(false, "Missing authorization code"), {
        headers: { "Content-Type": "text/html" },
      });
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
      const regionUrl = `https://${region}-apia.coolkit.cc`;
      const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
      const ts = Math.floor(Date.now() / 1000);

      const signPayload = `${appId}_${ts}_${nonce}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(appSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signPayload));
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
          body: JSON.stringify({
            code,
            redirectUrl: callbackUrl,
            grantType: "authorization_code",
          }),
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
        resolvedRegion = tokenData.region || region;
        console.log(`[oauth-callback] Token obtained from region ${resolvedRegion}`);
        break;
      } catch (e) {
        lastErrors.push(`${region}: fetch error - ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }

    if (!tokenData) {
      console.error("[oauth-callback] All regions failed:", lastErrors);
    }

    if (!tokenData) {
      return new Response(buildHtmlResponse(false, "Falha ao trocar código por token"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const integradoId = state;
    if (!integradoId) {
      return new Response(buildHtmlResponse(false, "Missing state (integrado_id)"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const now = new Date();
    const atExpiry = new Date(now.getTime() + (tokenData.atExpiredTime || 86400) * 1000);
    const rtExpiry = new Date(now.getTime() + (tokenData.rtExpiredTime || 5184000) * 1000);

    const { error: dbError } = await supabase
      .from("ewelink_tokens")
      .upsert({
        integrado_id: integradoId,
        access_token: tokenData.at,
        refresh_token: tokenData.rt,
        at_expired_at: atExpiry.toISOString(),
        rt_expired_at: rtExpiry.toISOString(),
        region: resolvedRegion,
      }, { onConflict: "integrado_id" });

    if (dbError) {
      console.error("DB error storing tokens:", dbError);
      return new Response(buildHtmlResponse(false, `Erro ao salvar: ${dbError.message}`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    console.log(`eWeLink OAuth: tokens stored for integrado ${integradoId}, region ${resolvedRegion}`);

    return new Response(buildHtmlResponse(true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(buildHtmlResponse(false, error instanceof Error ? error.message : "Erro interno"), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function buildHtmlResponse(success: boolean, errorMsg?: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>eWeLink OAuth</title></head>
<body>
<p>${success ? "Conectado com sucesso! Fechando..." : `Erro: ${errorMsg}`}</p>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "ewelink-oauth-complete", success: ${success} }, "*");
  }
  setTimeout(function() { window.close(); }, 1500);
</script>
</body>
</html>`;
}
