import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { idadeDias, naoAutenticado, ok, erro, supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_lotes",
  title: "Listar lotes",
  description:
    "Lista os lotes da organização do usuário (aves de corte e postura) com galpão, núcleo, idade em dias, quantidade alojada e status.",
  inputSchema: {
    status: z
      .enum(["ativo", "encerrado", "todos"])
      .optional()
      .describe("Filtro de status. Padrão: ativo."),
    limite: z.number().int().optional().describe("Máximo de lotes retornados (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return naoAutenticado();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("lotes")
      .select(
        "id, status, quantidade_aves, data_alojamento, data_prevista_saida, linhagem, sexo, galpoes(nome), nucleos(nome, cidade, estado)",
      )
      .order("data_alojamento", { ascending: false })
      .limit(Math.min(Math.max(limite ?? 25, 1), 100));

    const filtro = status ?? "ativo";
    if (filtro === "ativo") query = query.eq("status", "ativo");
    else if (filtro === "encerrado") query = query.neq("status", "ativo");

    const { data, error } = await query;
    if (error) return erro(error.message);

    const lotes = (data ?? []).map((l: any) => ({
      id: l.id,
      status: l.status,
      galpao: l.galpoes?.nome ?? null,
      nucleo: l.nucleos?.nome ?? null,
      cidade: l.nucleos ? `${l.nucleos.cidade}/${l.nucleos.estado}` : null,
      aves_alojadas: l.quantidade_aves,
      idade_dias: idadeDias(l.data_alojamento),
      linhagem: l.linhagem,
      sexo: l.sexo,
      data_alojamento: l.data_alojamento,
      data_prevista_saida: l.data_prevista_saida,
    }));

    if (lotes.length === 0) return ok("Nenhum lote encontrado com esse filtro.", { lotes });

    const linhas = lotes.map(
      (l) =>
        `• ${l.galpao ?? "?"} (${l.nucleo ?? "?"}) — ${l.aves_alojadas} aves, ${l.idade_dias ?? "?"} dias, ${l.status} [id: ${l.id}]`,
    );
    return ok(linhas.join("\n"), { lotes });
  },
});
