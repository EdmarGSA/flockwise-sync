import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Cliente Supabase por requisição, autenticado com o token verificado do
 * chamador MCP. Todas as RLS rodam como o usuário logado.
 * Não faz nenhuma leitura de env no topo do módulo (import-safe).
 */
export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function naoAutenticado() {
  return {
    content: [
      { type: "text" as const, text: "Não autenticado. Conecte-se novamente." },
    ],
    isError: true,
  };
}

export function erro(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function ok(text: string, structuredContent?: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text }], structuredContent };
}

/** Índice de Temperatura e Umidade (ITH / THI). */
export function calcularITH(tempC: number, umidadePct: number): number {
  return Number(
    (
      0.8 * tempC +
      (umidadePct / 100) * (tempC - 14.4) +
      46.4
    ).toFixed(1),
  );
}

/** Idade do lote em dias a partir da data de alojamento. */
export function idadeDias(dataAlojamento: string | null): number | null {
  if (!dataAlojamento) return null;
  const ms = Date.now() - new Date(dataAlojamento).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
