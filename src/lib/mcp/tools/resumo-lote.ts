import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { idadeDias, naoAutenticado, ok, erro, supabaseForUser } from "../supabase";

export default defineTool({
  name: "resumo_lote",
  title: "Resumo zootécnico do lote",
  description:
    "Retorna o resumo de um lote: aves vivas, mortalidade acumulada (%), última pesagem (peso médio e conversão alimentar) e nível de silo mais recente.",
  inputSchema: {
    lote_id: z.string().describe("UUID do lote (obtido em listar_lotes)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ lote_id }, ctx) => {
    if (!ctx.isAuthenticated()) return naoAutenticado();
    const supabase = supabaseForUser(ctx);

    const { data: lote, error: eLote } = await supabase
      .from("lotes")
      .select(
        "id, status, quantidade_aves, data_alojamento, linhagem, sexo, galpoes(nome), nucleos(nome)",
      )
      .eq("id", lote_id)
      .maybeSingle();
    if (eLote) return erro(eLote.message);
    if (!lote) return erro("Lote não encontrado ou sem permissão de acesso.");

    const { data: registros, error: eMort } = await supabase
      .from("mortalidade")
      .select("id, data_registro, mortalidade_itens(quantidade, motivo, peso_kg)")
      .eq("lote_id", lote_id);
    if (eMort) return erro(eMort.message);

    let mortasTotal = 0;
    const porMotivo: Record<string, number> = {};
    for (const r of (registros ?? []) as any[]) {
      for (const it of r.mortalidade_itens ?? []) {
        mortasTotal += it.quantidade ?? 0;
        porMotivo[it.motivo] = (porMotivo[it.motivo] ?? 0) + (it.quantidade ?? 0);
      }
    }

    const { data: pesagens } = await supabase
      .from("pesagens")
      .select("data_pesagem, conversao_alimentar, consumo_real_kg, nivel_silo_kg")
      .eq("lote_id", lote_id)
      .order("data_pesagem", { ascending: false })
      .limit(1);
    const ultimaPesagem = (pesagens ?? [])[0] ?? null;

    const alojadas = (lote as any).quantidade_aves ?? 0;
    const vivas = Math.max(0, alojadas - mortasTotal);
    const mortalidadePct = alojadas > 0 ? Number(((mortasTotal / alojadas) * 100).toFixed(2)) : 0;

    const resumo = {
      lote_id,
      galpao: (lote as any).galpoes?.nome ?? null,
      nucleo: (lote as any).nucleos?.nome ?? null,
      status: (lote as any).status,
      idade_dias: idadeDias((lote as any).data_alojamento),
      aves_alojadas: alojadas,
      aves_vivas: vivas,
      mortalidade_acumulada: mortasTotal,
      mortalidade_pct: mortalidadePct,
      mortalidade_por_motivo: porMotivo,
      ultima_pesagem: ultimaPesagem,
    };

    const texto = [
      `Lote ${resumo.galpao ?? "?"} (${resumo.nucleo ?? "?"}) — ${resumo.status}`,
      `Idade: ${resumo.idade_dias ?? "?"} dias`,
      `Aves: ${vivas} vivas de ${alojadas} alojadas (mortalidade ${mortalidadePct}%)`,
      ultimaPesagem
        ? `Última pesagem ${ultimaPesagem.data_pesagem}: CA ${ultimaPesagem.conversao_alimentar ?? "-"}, consumo ${ultimaPesagem.consumo_real_kg ?? "-"} kg, silo ${ultimaPesagem.nivel_silo_kg ?? "-"} kg`
        : "Sem pesagens registradas.",
    ].join("\n");

    return ok(texto, { resumo });
  },
});
