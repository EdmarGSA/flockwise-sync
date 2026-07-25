import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { naoAutenticado, ok, erro, supabaseForUser } from "../supabase";

export default defineTool({
  name: "registrar_mortalidade",
  title: "Registrar mortalidade",
  description:
    "Registra a mortalidade do dia de um lote, com quantidade por motivo e peso médio opcional das aves (kg). Cria ou reutiliza o registro da data informada.",
  inputSchema: {
    lote_id: z.string().describe("UUID do lote."),
    data: z
      .string()
      .optional()
      .describe("Data do registro no formato AAAA-MM-DD. Padrão: hoje."),
    itens: z
      .array(
        z.object({
          motivo: z
            .string()
            .describe(
              "Motivo da baixa conforme cadastro do sistema (ex.: morte_natural, eliminacao, refugo).",
            ),
          quantidade: z.number().int().describe("Quantidade de aves (inteiro positivo)."),
          peso_kg: z
            .number()
            .optional()
            .describe("Peso médio em KG das aves desse motivo (opcional, melhora a análise)."),
        }),
      )
      .describe("Itens de mortalidade. Informe ao menos um."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async ({ lote_id, data, itens }, ctx) => {
    if (!ctx.isAuthenticated()) return naoAutenticado();
    if (!itens?.length) return erro("Informe ao menos um item de mortalidade.");
    if (itens.some((i) => !Number.isInteger(i.quantidade) || i.quantidade <= 0))
      return erro("Cada item precisa de quantidade inteira maior que zero.");

    const supabase = supabaseForUser(ctx);
    const dataRegistro = data ?? new Date().toISOString().slice(0, 10);

    const { data: lote, error: eLote } = await supabase
      .from("lotes")
      .select("id, integrado_id, status")
      .eq("id", lote_id)
      .maybeSingle();
    if (eLote) return erro(eLote.message);
    if (!lote) return erro("Lote não encontrado ou sem permissão de acesso.");
    if ((lote as any).status !== "ativo") return erro("O lote não está ativo.");

    let registroId: string | null = null;
    const { data: existente } = await supabase
      .from("mortalidade")
      .select("id")
      .eq("lote_id", lote_id)
      .eq("data_registro", dataRegistro)
      .maybeSingle();

    if (existente) {
      registroId = (existente as any).id;
    } else {
      const { data: criado, error: eIns } = await supabase
        .from("mortalidade")
        .insert({
          lote_id,
          integrado_id: (lote as any).integrado_id,
          data_registro: dataRegistro,
        })
        .select("id")
        .maybeSingle();
      if (eIns) return erro(eIns.message);
      registroId = (criado as any)?.id ?? null;
    }

    if (!registroId) return erro("Não foi possível criar o registro de mortalidade.");

    const { error: eItens } = await supabase.from("mortalidade_itens").insert(
      itens.map((i) => ({
        mortalidade_id: registroId,
        motivo: i.motivo as any,
        quantidade: i.quantidade,
        peso_kg: i.peso_kg ?? null,
      })),
    );
    if (eItens) return erro(eItens.message);

    const total = itens.reduce((s, i) => s + i.quantidade, 0);
    return ok(`Mortalidade registrada em ${dataRegistro}: ${total} ave(s).`, {
      mortalidade_id: registroId,
      data_registro: dataRegistro,
      total,
    });
  },
});
