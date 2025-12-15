import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ChevronDown, ChevronRight, Trash2, CreditCard, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CreditoClienteTabProps {
  userId: string;
}

interface Cliente {
  id: string;
  razao_social_nome: string;
  nome_fantasia: string | null;
}

interface CreditoCliente {
  id: string;
  cliente_id: string;
  limite_credito: number;
  ativo: boolean;
  observacoes: string | null;
  cliente?: Cliente;
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
  ativo: boolean;
}

interface CreditoClienteForma {
  id: string;
  credito_cliente_id: string;
  forma_pagamento_id: string;
  prazo_pagamento_id: string | null;
}

const CreditoClienteTab = ({ userId }: CreditoClienteTabProps) => {
  const queryClient = useQueryClient();
  const [expandedCredito, setExpandedCredito] = useState<string | null>(null);
  const [showNovo, setShowNovo] = useState(false);
  const [novoClienteId, setNovoClienteId] = useState("");
  const [novoLimite, setNovoLimite] = useState("");
  const [novoObservacoes, setNovoObservacoes] = useState("");

  // Fetch all clients
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_credito", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros")
        .select("id, razao_social_nome, nome_fantasia")
        .eq("integrado_id", userId)
        .eq("ativo", true)
        .in("tipo_cadastro", ["cliente", "ambos"])
        .order("razao_social_nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  // Fetch credits
  const { data: creditos = [], isLoading } = useQuery({
    queryKey: ["credito_cliente", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credito_cliente")
        .select("*, cliente:parceiros(id, razao_social_nome, nome_fantasia)")
        .eq("integrado_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CreditoCliente[];
    },
  });

  // Fetch formas de pagamento
  const { data: formas = [] } = useQuery({
    queryKey: ["formas_pagamento", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("*")
        .eq("integrado_id", userId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as FormaPagamento[];
    },
  });

  // Fetch prazos de pagamento
  const { data: prazos = [] } = useQuery({
    queryKey: ["prazos_pagamento", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prazos_pagamento")
        .select("*")
        .eq("integrado_id", userId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as PrazoPagamento[];
    },
  });

  // Fetch credit formas
  const { data: creditoFormas = [] } = useQuery({
    queryKey: ["credito_cliente_formas", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credito_cliente_formas")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data as CreditoClienteForma[];
    },
  });

  // Fetch utilized credit per client (sum of open receivables)
  const { data: utilizados = {} } = useQuery({
    queryKey: ["limite_utilizado", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_receber")
        .select("cliente_id, valor, valor_recebido")
        .eq("integrado_id", userId)
        .in("status", ["previsao", "pendente", "parcial"]);
      if (error) throw error;
      
      const utilizadoMap: Record<string, number> = {};
      (data || []).forEach((conta) => {
        if (conta.cliente_id) {
          const valorAberto = (conta.valor || 0) - (conta.valor_recebido || 0);
          utilizadoMap[conta.cliente_id] = (utilizadoMap[conta.cliente_id] || 0) + valorAberto;
        }
      });
      return utilizadoMap;
    },
  });

  // Mutations
  const addCreditoMutation = useMutation({
    mutationFn: async (data: { cliente_id: string; limite_credito: number; observacoes?: string }) => {
      const { error } = await supabase.from("credito_cliente").insert({
        integrado_id: userId,
        cliente_id: data.cliente_id,
        limite_credito: data.limite_credito,
        observacoes: data.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credito_cliente"] });
      setShowNovo(false);
      setNovoClienteId("");
      setNovoLimite("");
      setNovoObservacoes("");
      toast.success("Crédito cadastrado!");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Cliente já possui crédito cadastrado");
      } else {
        toast.error("Erro ao cadastrar crédito");
      }
    },
  });

  const updateCreditoMutation = useMutation({
    mutationFn: async ({ id, limite_credito, ativo }: { id: string; limite_credito?: number; ativo?: boolean }) => {
      const { error } = await supabase
        .from("credito_cliente")
        .update({ limite_credito, ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credito_cliente"] });
      toast.success("Crédito atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteCreditoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credito_cliente").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credito_cliente"] });
      toast.success("Crédito removido!");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const toggleFormaMutation = useMutation({
    mutationFn: async ({ creditoId, formaId, prazoId, isChecked }: { 
      creditoId: string; 
      formaId: string; 
      prazoId: string | null;
      isChecked: boolean 
    }) => {
      if (isChecked) {
        // Add
        const { error } = await supabase.from("credito_cliente_formas").insert({
          credito_cliente_id: creditoId,
          forma_pagamento_id: formaId,
          prazo_pagamento_id: prazoId,
        });
        if (error) throw error;
      } else {
        // Remove
        let query = supabase
          .from("credito_cliente_formas")
          .delete()
          .eq("credito_cliente_id", creditoId)
          .eq("forma_pagamento_id", formaId);
        
        if (prazoId) {
          query = query.eq("prazo_pagamento_id", prazoId);
        } else {
          query = query.is("prazo_pagamento_id", null);
        }
        
        const { error } = await query;
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credito_cliente_formas"] });
    },
    onError: () => toast.error("Erro ao atualizar forma de pagamento"),
  });

  const clientesDisponiveis = clientes.filter(
    (c) => !creditos.some((cr) => cr.cliente_id === c.id)
  );

  const getClienteNome = (cliente?: Cliente) => {
    if (!cliente) return "Cliente não encontrado";
    return cliente.nome_fantasia || cliente.razao_social_nome;
  };

  const getLimiteUtilizado = (clienteId: string) => utilizados[clienteId] || 0;
  const getLimiteDisponivel = (credito: CreditoCliente) => {
    return credito.limite_credito - getLimiteUtilizado(credito.cliente_id);
  };

  const getFormasCredito = (creditoId: string) => {
    return creditoFormas.filter((cf) => cf.credito_cliente_id === creditoId);
  };

  const isFormaChecked = (creditoId: string, formaId: string, prazoId: string | null) => {
    return creditoFormas.some(
      (cf) =>
        cf.credito_cliente_id === creditoId &&
        cf.forma_pagamento_id === formaId &&
        cf.prazo_pagamento_id === prazoId
    );
  };

  const formatDias = (dias: number[]): string => {
    if (dias.length === 1 && dias[0] === 0) return "À Vista";
    return dias.join("/") + " dias";
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Crédito de Clientes
        </CardTitle>
        <Button onClick={() => setShowNovo(true)} disabled={showNovo || clientesDisponiveis.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Crédito
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form para novo crédito */}
        {showNovo && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select value={novoClienteId} onValueChange={setNovoClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesDisponiveis.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {getClienteNome(cliente)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Limite de Crédito (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="10000.00"
                    value={novoLimite}
                    onChange={(e) => setNovoLimite(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    placeholder="Opcional"
                    value={novoObservacoes}
                    onChange={(e) => setNovoObservacoes(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    addCreditoMutation.mutate({
                      cliente_id: novoClienteId,
                      limite_credito: parseFloat(novoLimite) || 0,
                      observacoes: novoObservacoes,
                    })
                  }
                  disabled={!novoClienteId || !novoLimite || addCreditoMutation.isPending}
                >
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowNovo(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de créditos */}
        {creditos.length === 0 && !showNovo ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum crédito cadastrado. Clique em "Novo Crédito" para começar.
          </div>
        ) : (
          <div className="space-y-2">
            {creditos.map((credito) => {
              const utilizado = getLimiteUtilizado(credito.cliente_id);
              const disponivel = getLimiteDisponivel(credito);
              const percentualUtilizado = credito.limite_credito > 0 
                ? (utilizado / credito.limite_credito) * 100 
                : 0;
              const formasCount = getFormasCredito(credito.id).length;

              return (
                <Collapsible
                  key={credito.id}
                  open={expandedCredito === credito.id}
                  onOpenChange={(open) => setExpandedCredito(open ? credito.id : null)}
                >
                  <Card className={!credito.ativo ? "opacity-60" : ""}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedCredito === credito.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{getClienteNome(credito.cliente)}</span>
                            {!credito.ativo && <Badge variant="secondary">Inativo</Badge>}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">Limite: R$ {credito.limite_credito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <div className="flex items-center gap-2">
                                <span className={disponivel < 0 ? "text-destructive font-medium" : "text-green-600"}>
                                  Disponível: R$ {disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {percentualUtilizado > 80 && (
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                            </div>
                            <Badge variant={formasCount > 0 ? "default" : "outline"}>
                              {formasCount} formas
                            </Badge>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={credito.ativo}
                                onCheckedChange={(checked) =>
                                  updateCreditoMutation.mutate({ id: credito.id, ativo: checked })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCreditoMutation.mutate(credito.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {/* Limite edit */}
                        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <Label>Limite de Crédito</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={credito.limite_credito}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                updateCreditoMutation.mutate({ id: credito.id, limite_credito: newValue });
                              }}
                              className="max-w-xs"
                            />
                          </div>
                          <div className="text-sm">
                            <p>Utilizado: <span className="font-medium">R$ {utilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                            <p>Disponível: <span className={disponivel < 0 ? "text-destructive font-bold" : "text-green-600 font-medium"}>
                              R$ {disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span></p>
                          </div>
                        </div>

                        {/* Formas e prazos permitidos */}
                        <div>
                          <Label className="mb-2 block">Formas e Prazos Permitidos</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Marque as formas e prazos que este cliente pode utilizar. Se nenhuma for selecionada, todas estarão disponíveis.
                          </p>
                          <div className="space-y-3">
                            {formas.map((forma) => {
                              const prazosForma = prazos.filter((p) => p.forma_pagamento_id === forma.id);
                              
                              return (
                                <div key={forma.id} className="p-3 border rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="h-4 w-4" />
                                    <span className="font-medium">{forma.nome}</span>
                                  </div>
                                  <div className="ml-6 space-y-1">
                                    {prazosForma.length === 0 ? (
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={isFormaChecked(credito.id, forma.id, null)}
                                          onCheckedChange={(checked) =>
                                            toggleFormaMutation.mutate({
                                              creditoId: credito.id,
                                              formaId: forma.id,
                                              prazoId: null,
                                              isChecked: !!checked,
                                            })
                                          }
                                        />
                                        <span className="text-sm">Permitir {forma.nome}</span>
                                      </div>
                                    ) : (
                                      prazosForma.map((prazo) => (
                                        <div key={prazo.id} className="flex items-center gap-2">
                                          <Checkbox
                                            checked={isFormaChecked(credito.id, forma.id, prazo.id)}
                                            onCheckedChange={(checked) =>
                                              toggleFormaMutation.mutate({
                                                creditoId: credito.id,
                                                formaId: forma.id,
                                                prazoId: prazo.id,
                                                isChecked: !!checked,
                                              })
                                            }
                                          />
                                          <span className="text-sm">{prazo.nome}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {formatDias(prazo.dias_parcelas)}
                                          </Badge>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditoClienteTab;
