import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";

export interface PlanoRow {
  id: string;
  codigo: "starter" | "profissional" | "integradora" | "enterprise";
  nome: string;
  descricao: string | null;
  preco_base_brl: number;
  preco_galpao_adicional_brl: number;
  setup_fee_brl: number;
  limite_galpoes: number | null;
  limite_usuarios: number | null;
  inclui_iot: boolean;
  inclui_financeiro: boolean;
  inclui_veterinario: boolean;
  inclui_erp_sync: boolean;
  inclui_multi_nucleos: boolean;
  publico: boolean;
  ordem: number;
}

export interface AddonRow {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_brl: number;
  unidade: string;
  preco_excedente_brl: number | null;
  cota_inclusa: number | null;
  categoria: string;
  ordem: number;
}

export interface AssinaturaRow {
  id: string;
  integrado_id: string;
  plano_id: string;
  ciclo: "mensal" | "anual";
  status: "trial" | "ativa" | "atrasada" | "cancelada" | "suspensa";
  galpoes_contratados: number;
  iniciada_em: string;
  trial_termina_em: string | null;
  vence_em: string | null;
}

export interface AssinaturaCompleta {
  assinatura: AssinaturaRow | null;
  plano: PlanoRow | null;
  addons: { addon: AddonRow; quantidade: number; ativo: boolean }[];
  temIA: boolean;
}

export function useAssinatura() {
  const { integradoId } = useIntegradoId();

  return useQuery<AssinaturaCompleta>({
    queryKey: ["assinatura", integradoId],
    enabled: !!integradoId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: assinatura } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("integrado_id", integradoId!)
        .maybeSingle();

      if (!assinatura) {
        return { assinatura: null, plano: null, addons: [], temIA: false };
      }

      const [{ data: plano }, { data: addonsRows }] = await Promise.all([
        supabase.from("planos").select("*").eq("id", assinatura.plano_id).single(),
        supabase
          .from("assinaturas_addons")
          .select("quantidade, ativo, addon:planos_addons(*)")
          .eq("assinatura_id", assinatura.id),
      ]);

      const addons = (addonsRows ?? []).map((r: any) => ({
        addon: r.addon as AddonRow,
        quantidade: r.quantidade,
        ativo: r.ativo,
      }));

      const temIA = addons.some(
        (a) => a.ativo && (a.addon.codigo === "ia_insights" || a.addon.codigo === "ia_ilimitado"),
      );

      return {
        assinatura: assinatura as AssinaturaRow,
        plano: plano as PlanoRow,
        addons,
        temIA,
      };
    },
  });
}

/** Atalho: a organização tem o add-on de IA ativo? */
export function useIAEnabled(): { enabled: boolean; loading: boolean } {
  const { data, isLoading } = useAssinatura();
  return { enabled: !!data?.temIA, loading: isLoading };
}
