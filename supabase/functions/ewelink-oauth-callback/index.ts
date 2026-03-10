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
    const redirectUrl = url.searchParams.get("redirectUrl") || url.searchParams.get("redirect_url");

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    const appId = Deno.env.get("EWELINK_APP_ID")!;
    const appSecret = Deno.env.get("EWELINK_APP_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // The actual redirect URL used during the OAuth flow (this function's URL)
    const callbackUrl = `${supabaseUrl}/functions/v1/ewelink-oauth-callback`;

    // Exchange code for tokens - try multiple regions
    const regions = ["us", "eu", "as"];
    let tokenData: any = null;
    let resolvedRegion = "us";

    for (const region of regions) {
      const regionUrl = `https://${region}-apia.coolkit.cc`;
      const nonce = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
      const ts = Math.floor(Date.now() / 1000);

      // HMAC sign
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
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.log(`${region}: invalid JSON`);
          continue;
        }

        if (data.error === 10004) {
          // Wrong region
          continue;
        }

        if (data.error !== 0) {
          console.log(`${region}: error ${data.error} - ${data.msg}`);
          continue;
        }

        tokenData = data.data;
        resolvedRegion = tokenData.region || region;
        break;
      } catch (err) {
        console.log(`${region}: ${err}`);
        continue;
      }
    }

    if (!tokenData) {
      // Redirect back with error
      const appUrl = redirectUrl || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/configuracoes/dispositivos-iot`;
      return Response.redirect(`${appUrl}?ewelink_error=token_exchange_failed`, 302);
    }

    // Store tokens in DB using service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse state to get integrado_id
    const integradoId = state;
    if (!integradoId) {
      return new Response("Missing state (integrado_id)", { status: 400 });
    }

    // Calculate expiration timestamps
    const now = new Date();
    const atExpiry = new Date(now.getTime() + (tokenData.atExpiredTime || 86400) * 1000);
    const rtExpiry = new Date(now.getTime() + (tokenData.rtExpiredTime || 5184000) * 1000);

    // Upsert token
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
      return new Response(`DB error: ${dbError.message}`, { status: 500 });
    }

    console.log(`eWeLink OAuth: tokens stored for integrado ${integradoId}, region ${resolvedRegion}`);

    // Redirect back to the app
    const appBaseUrl = Deno.env.get("APP_URL") || "https://flockwise-sync.lovable.app";
    return Response.redirect(`${appBaseUrl}/configuracoes/dispositivos-iot?ewelink_connected=true`, 302);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
