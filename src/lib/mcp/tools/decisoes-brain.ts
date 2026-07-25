import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { naoAutenticado, ok, erro, supabaseForUser } from "../supabase";

export default defineTool({
  name: "decisoes_brain",
  title: "Decisões recentes do Climate Brain",
  description:
    "Lista as decisões e comandos recentes do Climate Brain (ventilação, aquecimento, cortina, nebulização, iluminação) com status de execução.",
  inputSchema: {
    limite: z.number().int().optional().describe("Máximo de comandos retornados (padrão 20)."),
    status: z
      .enum(["sugerido", "aprovado", "enviado", "confirmado", "falhou", "todos"])
      .optional()
      .describe("Filtro por status do comando. Padrão: todos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limite, status }, ctx) => {
    if (!ctx.isAuthenticated()) return naoAutenticado();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("comando_brain")
      .select("id, funcao, estado_desejado, status, motivo, erro, created_at, enviado_em, galpao_id")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limite ?? 20, 1), 100));

    if (status && status !== "todos") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return erro(error.message);

    const comandos = (data ?? []) as any[];
    if (comandos.length === 0) return ok("Nenhum comando do Brain encontrado.", { comandos });

    const texto = comandos
      .map(
        (c) =>
          `• ${new Date(c.created_at).toLocaleString("pt-BR")} — ${c.funcao} → ${JSON.stringify(c.estado_desejado)} [${c.status}]${c.motivo ? ` · ${c.motivo}` : ""}${c.erro ? ` · erro: ${c.erro}` : ""}`,
      )
      .join("\n");

    return ok(texto, { comandos });
  },
});
