import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";

export interface AIUsageSummary {
  totalChamadas: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCustoBRL: number;
  porFuncao: Record<string, { chamadas: number; custoBRL: number }>;
  ultimas: {
    funcao: string;
    modelo: string;
    custo_brl: number;
    cached: boolean;
    created_at: string;
  }[];
}

export function useAIUsage(diasAtras = 30) {
  const { integradoId } = useIntegradoId();

  return useQuery<AIUsageSummary>({
    queryKey: ["ai-usage", integradoId, diasAtras],
    enabled: !!integradoId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - diasAtras * 86400_000).toISOString();
      const { data } = await supabase
        .from("ai_usage_log")
        .select("funcao, modelo, tokens_in, tokens_out, custo_estimado_brl, cached, created_at")
        .eq("integrado_id", integradoId!)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      const rows = data ?? [];
      const porFuncao: AIUsageSummary["porFuncao"] = {};
      let totalCusto = 0,
        totalIn = 0,
        totalOut = 0;

      for (const r of rows) {
        const custo = Number(r.custo_estimado_brl) || 0;
        totalCusto += custo;
        totalIn += r.tokens_in ?? 0;
        totalOut += r.tokens_out ?? 0;
        porFuncao[r.funcao] ??= { chamadas: 0, custoBRL: 0 };
        porFuncao[r.funcao].chamadas += 1;
        porFuncao[r.funcao].custoBRL += custo;
      }

      return {
        totalChamadas: rows.length,
        totalTokensIn: totalIn,
        totalTokensOut: totalOut,
        totalCustoBRL: totalCusto,
        porFuncao,
        ultimas: rows.slice(0, 20).map((r) => ({
          funcao: r.funcao,
          modelo: r.modelo,
          custo_brl: Number(r.custo_estimado_brl) || 0,
          cached: r.cached,
          created_at: r.created_at,
        })),
      };
    },
  });
}
