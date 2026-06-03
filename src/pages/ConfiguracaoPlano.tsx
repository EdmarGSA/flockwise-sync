import { useMemo } from "react";
import { useAssinatura, type PlanoRow } from "@/hooks/useAssinatura";
import { useAIUsage } from "@/hooks/useAIUsage";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Check, X, Zap, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

function PlanoCard({
  plano,
  atual,
}: {
  plano: PlanoRow;
  atual: boolean;
}) {
  const features = [
    plano.inclui_iot && "IoT + automação climática",
    plano.inclui_financeiro && "Módulo financeiro",
    plano.inclui_veterinario && "Módulo veterinário",
    plano.inclui_erp_sync && "ERP Sync (fornecedores)",
    plano.inclui_multi_nucleos && "Multi-núcleos",
    plano.limite_galpoes
      ? `Até ${plano.limite_galpoes} galpões`
      : "Galpões ilimitados",
    plano.limite_usuarios
      ? `Até ${plano.limite_usuarios} usuários`
      : "Usuários ilimitados",
  ].filter(Boolean) as string[];

  return (
    <Card className={atual ? "border-primary shadow-md" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plano.nome}</CardTitle>
          {atual && <Badge>Seu plano</Badge>}
        </div>
        <CardDescription>{plano.descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-3xl font-bold">{brl(plano.preco_base_brl)}</div>
          <div className="text-sm text-muted-foreground">/ mês (base)</div>
          {plano.preco_galpao_adicional_brl > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              + {brl(plano.preco_galpao_adicional_brl)} por galpão adicional
            </div>
          )}
          {plano.setup_fee_brl > 0 && (
            <div className="text-xs text-muted-foreground">
              Setup único: {brl(plano.setup_fee_brl)}
            </div>
          )}
        </div>
        <Separator />
        <ul className="space-y-1.5 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ConfiguracaoPlano() {
  const { data: assinaturaData, isLoading: loadingAssin } = useAssinatura();
  const { data: uso, isLoading: loadingUso } = useAIUsage(30);
  const { integradoId } = useIntegradoId();

  const { data: planos } = useQuery<PlanoRow[]>({
    queryKey: ["planos-catalogo"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("planos")
        .select("*")
        .eq("ativo", true)
        .eq("publico", true)
        .order("ordem");
      return (data as PlanoRow[]) ?? [];
    },
  });

  const { data: addons } = useQuery({
    queryKey: ["addons-catalogo"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("planos_addons")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      return data ?? [];
    },
  });

  // Conta galpões ativos para mostrar projeção de custo
  const { data: galpoesAtivos } = useQuery({
    queryKey: ["galpoes-ativos-count", integradoId],
    enabled: !!integradoId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("galpoes")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true);
      return count ?? 0;
    },
  });

  const projecaoMensal = useMemo(() => {
    if (!assinaturaData?.plano) return null;
    const p = assinaturaData.plano;
    const inclusos = 0; // simplificação: cobramos todos como adicionais sobre o base
    const adicionais = Math.max(0, (galpoesAtivos ?? 0) - inclusos);
    const base = p.preco_base_brl;
    const galpoes = adicionais * p.preco_galpao_adicional_brl;
    const addonsCusto = (assinaturaData.addons ?? [])
      .filter((a) => a.ativo)
      .reduce((sum, a) => sum + a.addon.preco_brl * a.quantidade, 0);
    return { base, galpoes, addonsCusto, total: base + galpoes + addonsCusto };
  }, [assinaturaData, galpoesAtivos]);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">Plano e cobrança</h1>
        <p className="text-muted-foreground">
          Acompanhe seu plano, add-ons e uso de IA do período.
        </p>
      </div>

      {/* Status do plano + projeção */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Plano atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAssin ? (
              <Skeleton className="h-12 w-32" />
            ) : assinaturaData?.plano ? (
              <>
                <div className="text-2xl font-bold">{assinaturaData.plano.nome}</div>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {assinaturaData.assinatura?.status}
                </Badge>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhuma assinatura ativa — fale com nosso comercial.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Galpões ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{galpoesAtivos ?? "—"}</div>
            {projecaoMensal && (
              <div className="text-xs text-muted-foreground mt-1">
                Base {brl(projecaoMensal.base)} + galpões {brl(projecaoMensal.galpoes)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mensalidade estimada</CardTitle>
          </CardHeader>
          <CardContent>
            {projecaoMensal ? (
              <>
                <div className="text-2xl font-bold">{brl(projecaoMensal.total)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Add-ons: {brl(projecaoMensal.addonsCusto)}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> IA Insights
          </CardTitle>
          <CardDescription>
            {assinaturaData?.temIA
              ? "Add-on de IA ativo nesta conta."
              : "Add-on de IA inativo — relatórios narrativos e briefing diagnóstico estão desativados."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">Chamadas (30d)</div>
              <div className="text-xl font-semibold">
                {loadingUso ? <Skeleton className="h-7 w-16" /> : uso?.totalChamadas ?? 0}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Tokens consumidos</div>
              <div className="text-xl font-semibold">
                {((uso?.totalTokensIn ?? 0) + (uso?.totalTokensOut ?? 0)).toLocaleString("pt-BR")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Custo estimado</div>
              <div className="text-xl font-semibold">{brl(uso?.totalCustoBRL ?? 0)}</div>
            </div>
          </div>
          {uso?.ultimas && uso.ultimas.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Últimas chamadas</div>
                {uso.ultimas.slice(0, 8).map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate">
                      <code className="text-foreground">{u.funcao}</code>
                      <span className="text-muted-foreground"> · {u.modelo}</span>
                      {u.cached && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          cache
                        </Badge>
                      )}
                    </span>
                    <span className="font-mono">{brl(u.custo_brl)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Catálogo de planos */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">Planos disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {planos?.map((p) => (
            <PlanoCard
              key={p.id}
              plano={p}
              atual={assinaturaData?.plano?.id === p.id}
            />
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">Add-ons</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(addons ?? []).map((a: any) => {
            const ativo = assinaturaData?.addons.some(
              (x) => x.ativo && x.addon.codigo === a.codigo,
            );
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {a.categoria === "ia" && <Zap className="h-4 w-4 text-primary" />}
                      {a.nome}
                    </CardTitle>
                    {ativo ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">{a.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{brl(a.preco_brl)}</span>
                    <span className="text-xs text-muted-foreground">/ {a.unidade}</span>
                  </div>
                  {a.cota_inclusa && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Inclui {a.cota_inclusa} unidades — extras a{" "}
                      {brl(a.preco_excedente_brl ?? 0)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground flex items-center gap-2">
          <X className="h-4 w-4" />
          Para alterar plano ou contratar add-ons, fale com nosso comercial.
        </CardContent>
      </Card>
    </div>
  );
}
