import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { calcularITH, naoAutenticado, ok, erro, supabaseForUser } from "../supabase";

export default defineTool({
  name: "ambiencia_lote",
  title: "Ambiência do lote",
  description:
    "Leituras mais recentes de temperatura, umidade e ITH dos sensores IoT do galpão do lote, com estado de cada dispositivo (online/offline).",
  inputSchema: {
    lote_id: z.string().describe("UUID do lote (obtido em listar_lotes)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ lote_id }, ctx) => {
    if (!ctx.isAuthenticated()) return naoAutenticado();
    const supabase = supabaseForUser(ctx);

    const { data: lote, error: eLote } = await supabase
      .from("lotes")
      .select("id, galpao_id, galpoes(nome)")
      .eq("id", lote_id)
      .maybeSingle();
    if (eLote) return erro(eLote.message);
    if (!lote) return erro("Lote não encontrado ou sem permissão de acesso.");

    const { data: dispositivos, error: eDisp } = await supabase
      .from("dispositivos_iot")
      .select("id, nome, driver, ativo, ultimo_sync")
      .eq("galpao_id", (lote as any).galpao_id);
    if (eDisp) return erro(eDisp.message);

    const ids = (dispositivos ?? []).map((d: any) => d.id);
    if (ids.length === 0)
      return ok("Nenhum dispositivo IoT vinculado ao galpão deste lote.", { dispositivos: [] });

    const { data: leituras, error: eLeit } = await supabase
      .from("leituras_sensores")
      .select("dispositivo_id, lido_em, temperatura_c, umidade_pct, co2_ppm, nh3_ppm, lux")
      .in("dispositivo_id", ids)
      .order("lido_em", { ascending: false })
      .limit(200);
    if (eLeit) return erro(eLeit.message);

    const ultimaPorDispositivo = new Map<string, any>();
    for (const l of leituras ?? []) {
      if (!ultimaPorDispositivo.has((l as any).dispositivo_id)) {
        ultimaPorDispositivo.set((l as any).dispositivo_id, l);
      }
    }

    const agora = Date.now();
    const itens = (dispositivos ?? []).map((d: any) => {
      const l = ultimaPorDispositivo.get(d.id);
      const syncMs = d.ultimo_sync ? new Date(d.ultimo_sync).getTime() : 0;
      const online = !!d.ativo && syncMs > 0 && agora - syncMs < 10 * 60_000;
      const temp = l?.temperatura_c ?? null;
      const ur = l?.umidade_pct ?? null;
      return {
        dispositivo: d.nome,
        driver: d.driver,
        online,
        lido_em: l?.lido_em ?? null,
        temperatura_c: temp,
        umidade_pct: ur,
        ith: temp != null && ur != null ? calcularITH(temp, ur) : null,
        co2_ppm: l?.co2_ppm ?? null,
        nh3_ppm: l?.nh3_ppm ?? null,
        lux: l?.lux ?? null,
      };
    });

    const texto = [
      `Galpão ${(lote as any).galpoes?.nome ?? "?"} — ${itens.length} dispositivo(s)`,
      ...itens.map(
        (i) =>
          `• ${i.dispositivo} [${i.online ? "ONLINE" : "OFFLINE"}] ${i.temperatura_c ?? "-"}°C · ${i.umidade_pct ?? "-"}% UR · ITH ${i.ith ?? "-"} (${i.lido_em ?? "sem leitura"})`,
      ),
    ].join("\n");

    return ok(texto, { galpao: (lote as any).galpoes?.nome ?? null, dispositivos: itens });
  },
});
