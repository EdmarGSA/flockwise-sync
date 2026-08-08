// Shared authentication/authorization guard for privileged edge functions.
// These functions deploy with verify_jwt = false, so the JWT MUST be validated in code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  userId: string;
  email: string | null;
  roles: string[];
}

export function unauthorized(corsHeaders: Record<string, string>, message = "Não autorizado") {
  return new Response(JSON.stringify({ success: false, error: message, message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, message = "Permissão insuficiente") {
  return new Response(JSON.stringify({ success: false, error: message, message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Validates the caller's bearer token and loads their roles.
 * Returns null when the token is missing/invalid.
 */
export async function authenticate(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const client = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    roles: (roleRows ?? []).map((r: { role: string }) => r.role),
  };
}

export function hasAnyRole(auth: AuthResult, roles: string[]): boolean {
  return auth.roles.some((r) => roles.includes(r));
}
