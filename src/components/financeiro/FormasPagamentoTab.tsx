import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, ChevronRight, Trash2, Edit2, X, Check, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface FormasPagamentoTabProps {
  userId: string;
}

interface FormaPagamento {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
}

interface PrazoPagamento {
  id: string;
  forma_pagamento_id: string;
  nome: string;
  dias_parcelas: number[];
  quantidade_parcelas: number;
  ativo: boolean;
  padrao: boolean;
}

const FormasPagamentoTab = ({ userId }: FormasPagamentoTabProps) => {
  const queryClient = useQueryClient();
  const [expandedForma, setExpandedForma] = useState<string | null>(null);
  const [showNovaForma, setShowNovaForma] = useState(false);
  const [novaPrazoFormaId, setNovaPrazoFormaId] = useState<string | null>(null);
  const [editingForma, setEditingForma] = useState<string | null>(null);
  const [editingPrazo, setEditingPrazo] = useState<string | null>(null);

  // Form states
  const [novaFormaNome, setNovaFormaNome] = useState("");
  const [novaFormaCodigo, setNovaFormaCodigo] = useState("");
  const [novoPrazoNome, setNovoPrazoNome] = useState("");
  const [novoPrazoDias, setNovoPrazoDias] = useState("");

  // Fetch formas de pagamento
  const { data: formas = [], isLoading: loadingFormas } = useQuery({
    queryKey: ["formas_pagamento", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("*")
        .eq("integrado_id", userId)
        .order("nome");
      if (error) throw error;
      return data as FormaPagamento[];
    },
  });

  // Fetch prazos de pagamento
  const { data: prazos = [], isLoading: loadingPrazos } = useQuery({
    queryKey: ["prazos_pagamento", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prazos_pagamento")
        .select("*")
        .eq("integrado_id", userId)
        .order("nome");
      if (error) throw error;
      return data as PrazoPagamento[];
    },
  });

  // Mutations
  const addFormaMutation = useMutation({
    mutationFn: async (forma: { nome: string; codigo: string }) => {
      const { error } = await supabase.from("formas_pagamento").insert({
        integrado_id: userId,
        nome: forma.nome,
        codigo: forma.codigo.toLowerCase().replace(/\s+/g, "_"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
      setShowNovaForma(false);
      setNovaFormaNome("");
      setNovaFormaCodigo("");
      toast.success("Forma de pagamento criada!");
    },
    onError: () => toast.error("Erro ao criar forma de pagamento"),
  });

  const updateFormaMutation = useMutation({
    mutationFn: async ({ id, nome, ativo }: { id: string; nome: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("formas_pagamento")
        .update({ nome, ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
      setEditingForma(null);
      toast.success("Forma atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteFormaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formas_pagamento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
      toast.success("Forma removida!");
    },
    onError: () => toast.error("Erro ao remover (pode haver prazos vinculados)"),
  });

  const addPrazoMutation = useMutation({
    mutationFn: async (prazo: { forma_pagamento_id: string; nome: string; dias_parcelas: number[] }) => {
      const { error } = await supabase.from("prazos_pagamento").insert({
        integrado_id: userId,
        forma_pagamento_id: prazo.forma_pagamento_id,
        nome: prazo.nome,
        dias_parcelas: prazo.dias_parcelas,
        quantidade_parcelas: prazo.dias_parcelas.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazos_pagamento"] });
      setNovaPrazoFormaId(null);
      setNovoPrazoNome("");
      setNovoPrazoDias("");
      toast.success("Prazo criado!");
    },
    onError: () => toast.error("Erro ao criar prazo"),
  });

  const updatePrazoMutation = useMutation({
    mutationFn: async ({ id, ativo, padrao }: { id: string; ativo?: boolean; padrao?: boolean }) => {
      const { error } = await supabase
        .from("prazos_pagamento")
        .update({ ativo, padrao })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazos_pagamento"] });
      toast.success("Prazo atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deletePrazoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prazos_pagamento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazos_pagamento"] });
      toast.success("Prazo removido!");
    },
    onError: () => toast.error("Erro ao remover prazo"),
  });

  const parseDias = (diasStr: string): number[] => {
    if (!diasStr.trim()) return [0];
    return diasStr.split("/").map((d) => parseInt(d.trim())).filter((n) => !isNaN(n));
  };

  const formatDias = (dias: number[]): string => {
    if (dias.length === 1 && dias[0] === 0) return "À Vista";
    return dias.join("/") + " dias";
  };

  const getPrazosForForma = (formaId: string) => {
    return prazos.filter((p) => p.forma_pagamento_id === formaId);
  };

  if (loadingFormas || loadingPrazos) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Formas e Prazos de Pagamento
        </CardTitle>
        <Button onClick={() => setShowNovaForma(true)} disabled={showNovaForma}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Forma
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form para nova forma */}
        {showNovaForma && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Boleto, PIX, Dinheiro"
                    value={novaFormaNome}
                    onChange={(e) => {
                      setNovaFormaNome(e.target.value);
                      setNovaFormaCodigo(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                    }}
                  />
                </div>
                <div>
                  <Label>Código</Label>
                  <Input
                    placeholder="boleto"
                    value={novaFormaCodigo}
                    onChange={(e) => setNovaFormaCodigo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => addFormaMutation.mutate({ nome: novaFormaNome, codigo: novaFormaCodigo })}
                  disabled={!novaFormaNome || addFormaMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowNovaForma(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de formas */}
        {formas.length === 0 && !showNovaForma ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma forma de pagamento cadastrada. Clique em "Nova Forma" para começar.
          </div>
        ) : (
          <div className="space-y-2">
            {formas.map((forma) => (
              <Collapsible
                key={forma.id}
                open={expandedForma === forma.id}
                onOpenChange={(open) => setExpandedForma(open ? forma.id : null)}
              >
                <Card className={!forma.ativo ? "opacity-60" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedForma === forma.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{forma.nome}</span>
                          <Badge variant="outline" className="text-xs">
                            {forma.codigo}
                          </Badge>
                          {!forma.ativo && <Badge variant="secondary">Inativo</Badge>}
                          <Badge variant="secondary" className="text-xs">
                            {getPrazosForForma(forma.id).length} prazos
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={forma.ativo}
                            onCheckedChange={(checked) =>
                              updateFormaMutation.mutate({ id: forma.id, nome: forma.nome, ativo: checked })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFormaMutation.mutate(forma.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {/* Prazos desta forma */}
                      <div className="space-y-2">
                        {getPrazosForForma(forma.id).map((prazo) => (
                          <div
                            key={prazo.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              !prazo.ativo ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{prazo.nome}</span>
                              <Badge variant="outline">{formatDias(prazo.dias_parcelas)}</Badge>
                              {prazo.quantidade_parcelas > 1 && (
                                <Badge>{prazo.quantidade_parcelas}x</Badge>
                              )}
                              {prazo.padrao && <Badge variant="default">Padrão</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updatePrazoMutation.mutate({
                                    id: prazo.id,
                                    padrao: !prazo.padrao,
                                  })
                                }
                              >
                                {prazo.padrao ? "Remover padrão" : "Definir padrão"}
                              </Button>
                              <Switch
                                checked={prazo.ativo}
                                onCheckedChange={(checked) =>
                                  updatePrazoMutation.mutate({ id: prazo.id, ativo: checked })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePrazoMutation.mutate(prazo.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Form para novo prazo */}
                      {novaPrazoFormaId === forma.id ? (
                        <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Nome do Prazo</Label>
                              <Input
                                placeholder="Ex: À Vista, 7/14/21"
                                value={novoPrazoNome}
                                onChange={(e) => setNovoPrazoNome(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Dias (separados por /)</Label>
                              <Input
                                placeholder="0 para à vista, ou 7/14/21"
                                value={novoPrazoDias}
                                onChange={(e) => setNovoPrazoDias(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Use 0 para à vista. Para parcelado: 7/14/21
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                addPrazoMutation.mutate({
                                  forma_pagamento_id: forma.id,
                                  nome: novoPrazoNome,
                                  dias_parcelas: parseDias(novoPrazoDias),
                                })
                              }
                              disabled={!novoPrazoNome || addPrazoMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Salvar Prazo
                            </Button>
                            <Button variant="outline" onClick={() => setNovaPrazoFormaId(null)}>
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setNovaPrazoFormaId(forma.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Prazo
                        </Button>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FormasPagamentoTab;
