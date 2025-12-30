import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Check, CheckCircle, Lock, Shield, Settings } from 'lucide-react';
import AutorizacaoDivergenciaDialog from './AutorizacaoDivergenciaDialog';

interface ItemConferido {
  id: string;
  produto_id: string;
  quantidade_oc: number;
  quantidade_nfe: number;
  quantidade_fisica: number;
  preco_oc: number;
  preco_nfe: number;
  lote_fornecedor: string;
  unidade_compra: string | null;
  fator_conversao: number | null;
  quantidade_estoque: number | null;
  produtos: {
    id: string;
    nome: string;
    sku: string;
    unidade_medida: string;
  };
}

interface Divergencia {
  id: string;
  tipo: 'quantidade' | 'preco' | 'condicao_pagamento' | 'produto_nao_previsto';
  descricao: string;
  itemId?: string;
  produtoNome?: string;
  valorOc: number;
  valorNfe: number;
  valorFisico?: number;
  percentualDiferenca: number;
  critico: boolean;
  aceita: boolean;
}

interface DivergenciasReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recebimentoId: string;
  integradoId: string;
  itens: ItemConferido[];
  onSuccess: () => void;
}

// Default tolerance settings
const DEFAULT_TOLERANCE = {
  quantidadePercent: 5,
  precoPercent: 5
};

export default function DivergenciasReportDialog({
  open,
  onOpenChange,
  recebimentoId,
  integradoId,
  itens,
  onSuccess
}: DivergenciasReportDialogProps) {
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAutorizacao, setShowAutorizacao] = useState(false);
  const [showToleranceSettings, setShowToleranceSettings] = useState(false);
  
  // Tolerance settings
  const [toleranceQtd, setToleranceQtd] = useState(() => {
    const saved = localStorage.getItem('divergencia_tolerance_qtd');
    return saved ? parseFloat(saved) : DEFAULT_TOLERANCE.quantidadePercent;
  });
  const [tolerancePreco, setTolerancePreco] = useState(() => {
    const saved = localStorage.getItem('divergencia_tolerance_preco');
    return saved ? parseFloat(saved) : DEFAULT_TOLERANCE.precoPercent;
  });

  useEffect(() => {
    if (open) {
      analisarDivergencias();
    }
  }, [open, itens, toleranceQtd, tolerancePreco]);

  const saveToleranceSettings = () => {
    localStorage.setItem('divergencia_tolerance_qtd', toleranceQtd.toString());
    localStorage.setItem('divergencia_tolerance_preco', tolerancePreco.toString());
    setShowToleranceSettings(false);
    toast.success('Tolerâncias salvas');
    analisarDivergencias();
  };

  const analisarDivergencias = () => {
    const divs: Divergencia[] = [];
    let divIndex = 0;

    itens.forEach(item => {
      const referencia = item.quantidade_nfe > 0 ? item.quantidade_nfe : item.quantidade_oc;
      
      // Check for "produto não previsto" - has physical qty but no OC or NF-e reference
      if (item.quantidade_fisica > 0 && item.quantidade_oc === 0 && item.quantidade_nfe === 0) {
        divs.push({
          id: `extra-${divIndex++}`,
          tipo: 'produto_nao_previsto',
          descricao: `Produto não previsto na OC/NF-e - Recebido ${item.quantidade_fisica} ${item.unidade_compra || item.produtos.unidade_medida}`,
          itemId: item.id,
          produtoNome: item.produtos.nome,
          valorOc: 0,
          valorNfe: 0,
          valorFisico: item.quantidade_fisica,
          percentualDiferenca: 100,
          critico: true,
          aceita: false
        });
        return;
      }
      
      // Quantity divergence (Physical vs Reference)
      if (referencia > 0 && item.quantidade_fisica !== referencia) {
        const diferenca = item.quantidade_fisica - referencia;
        const percentual = (diferenca / referencia) * 100;
        const unidade = item.unidade_compra || item.produtos.unidade_medida;
        
        if (Math.abs(percentual) > 0.5) {
          const isCritical = Math.abs(percentual) > toleranceQtd;
          divs.push({
            id: `qty-${divIndex++}`,
            tipo: 'quantidade',
            descricao: diferenca < 0 
              ? `Faltam ${Math.abs(diferenca).toFixed(2)} ${unidade}`
              : `Excesso de ${diferenca.toFixed(2)} ${unidade}`,
            itemId: item.id,
            produtoNome: item.produtos.nome,
            valorOc: item.quantidade_oc,
            valorNfe: item.quantidade_nfe,
            valorFisico: item.quantidade_fisica,
            percentualDiferenca: percentual,
            critico: isCritical,
            aceita: !isCritical // Auto-accept if within tolerance
          });
        }
      }

      // Price divergence (NF-e vs OC)
      if (item.preco_oc > 0 && item.preco_nfe > 0 && item.preco_nfe !== item.preco_oc) {
        const diferenca = item.preco_nfe - item.preco_oc;
        const percentual = (diferenca / item.preco_oc) * 100;
        
        if (Math.abs(percentual) > 0.5) {
          const isCritical = diferenca > 0 && percentual > tolerancePreco;
          divs.push({
            id: `price-${divIndex++}`,
            tipo: 'preco',
            descricao: diferenca > 0 
              ? `Preço NF-e ${percentual.toFixed(1)}% maior que OC`
              : `Preço NF-e ${Math.abs(percentual).toFixed(1)}% menor que OC`,
            itemId: item.id,
            produtoNome: item.produtos.nome,
            valorOc: item.preco_oc,
            valorNfe: item.preco_nfe,
            percentualDiferenca: percentual,
            critico: isCritical,
            aceita: !isCritical
          });
        }
      }
    });

    setDivergencias(divs);
  };

  const toggleAceitarDivergencia = (divId: string) => {
    setDivergencias(prev => prev.map(d => 
      d.id === divId ? { ...d, aceita: !d.aceita } : d
    ));
  };

  const aceitarTodas = () => {
    setDivergencias(prev => prev.map(d => ({ ...d, aceita: true })));
  };

  const hasDivergenciasCriticasNaoAceitas = () => {
    return divergencias.some(d => d.critico && !d.aceita);
  };

  const hasDivergenciasNaoAceitas = () => {
    return divergencias.some(d => !d.aceita);
  };

  const handleFinalizar = async () => {
    if (hasDivergenciasCriticasNaoAceitas()) {
      toast.error('Existem divergências críticas que precisam ser aceitas');
      return;
    }

    if (hasDivergenciasNaoAceitas()) {
      setShowAutorizacao(true);
      return;
    }

    await finalizarRecebimento();
  };

  const finalizarRecebimento = async (autorizadoPor?: string, justificativa?: string) => {
    setLoading(true);

    try {
      // Save divergences to database
      if (divergencias.length > 0) {
        const divergenciasToInsert = divergencias.map(d => ({
          recebimento_id: recebimentoId,
          recebimento_item_id: d.itemId || null,
          tipo: d.tipo as 'quantidade' | 'preco' | 'condicao_pagamento' | 'produto_nao_previsto',
          descricao: `${d.produtoNome}: ${d.descricao}`,
          valor_oc: d.valorOc,
          valor_nfe: d.valorNfe,
          valor_fisico: d.valorFisico || null,
          percentual_diferenca: d.percentualDiferenca,
          status: (d.aceita ? 'aceita_com_autorizacao' : 'aberta') as 'aberta' | 'em_negociacao' | 'resolvida' | 'aceita_com_autorizacao',
          aceita: d.aceita
        }));

        const { error: divError } = await supabase
          .from('divergencias_recebimento')
          .insert(divergenciasToInsert);

        if (divError) throw divError;
      }

      // Update recebimento status
      const updateData: any = {
        status: 'finalizado'
      };

      if (autorizadoPor) {
        updateData.autorizado_por = autorizadoPor;
        updateData.data_autorizacao = new Date().toISOString();
        updateData.justificativa_autorizacao = justificativa;
      }

      const { error: recError } = await supabase
        .from('recebimentos_mercadoria')
        .update(updateData)
        .eq('id', recebimentoId);

      if (recError) throw recError;

      // Get recebimento data for kardex entry
      const { data: recebimento, error: fetchError } = await supabase
        .from('recebimentos_mercadoria')
        .select('ordem_compra_id, numero_nfe, valor_nfe')
        .eq('id', recebimentoId)
        .single();

      if (fetchError) throw fetchError;

      // Create kardex entries for each item (with quarantine status based on product setting)
      for (const item of itens) {
        const fatorConversao = item.fator_conversao || 1;
        const quantidadeEstoque = item.quantidade_fisica * fatorConversao;
        
        if (quantidadeEstoque > 0) {
          const { data: produto, error: prodError } = await supabase
            .from('produtos')
            .select('estoque_atual, custo_medio, requer_quarentena')
            .eq('id', item.produto_id)
            .single();

          if (prodError) throw prodError;

          const saldoAnterior = produto?.estoque_atual || 0;
          const saldoAtual = saldoAnterior + quantidadeEstoque;
          const requerQuarentena = produto?.requer_quarentena ?? true;
          
          // Calcular custo médio ponderado
          const custoUnitario = item.preco_nfe || item.preco_oc || 0;
          const custoMedioAtual = produto?.custo_medio || 0;
          let novoCustoMedio = custoMedioAtual;
          
          if (custoUnitario > 0) {
            if (saldoAnterior > 0 && custoMedioAtual > 0) {
              // Custo médio ponderado: (estoque * custo_atual + entrada * custo_entrada) / (estoque + entrada)
              novoCustoMedio = ((saldoAnterior * custoMedioAtual) + (quantidadeEstoque * custoUnitario)) / saldoAtual;
            } else {
              // Primeira entrada ou custo anterior zerado
              novoCustoMedio = custoUnitario;
            }
          }

          const { error: kardexError } = await supabase
            .from('kardex')
            .insert({
              integrado_id: integradoId,
              produto_id: item.produto_id,
              tipo_movimento: 'entrada',
              quantidade: quantidadeEstoque,
              saldo_anterior: saldoAnterior,
              saldo_atual: saldoAtual,
              custo_unitario: custoUnitario,
              documento_ref: `NF-e ${recebimento?.numero_nfe || 'S/N'}`,
              observacao: `Recebimento - ${item.quantidade_fisica} ${item.unidade_compra || item.produtos.unidade_medida} (${quantidadeEstoque} ${item.produtos.unidade_medida}) - Lote: ${item.lote_fornecedor || 'N/A'}`,
              lote_fornecedor: item.lote_fornecedor || null,
              status_quarentena: requerQuarentena ? 'quarentena' : null,
              recebimento_id: recebimentoId
            });

          if (kardexError) throw kardexError;

          const { error: stockError } = await supabase
            .from('produtos')
            .update({ 
              estoque_atual: saldoAtual,
              custo_medio: novoCustoMedio 
            })
            .eq('id', item.produto_id);

          if (stockError) throw stockError;
        }
      }

      // Update contas_pagar if linked to OC
      if (recebimento?.ordem_compra_id) {
        await supabase
          .from('contas_pagar')
          .delete()
          .eq('ordem_compra_id', recebimento.ordem_compra_id)
          .eq('status', 'previsto');

        const { data: oc } = await supabase
          .from('ordens_compra')
          .select('parceiro_id, data_vencimento, prazo_pagamento_dias')
          .eq('id', recebimento.ordem_compra_id)
          .single();

        if (oc) {
          const vencimento = oc.data_vencimento || new Date(Date.now() + (oc.prazo_pagamento_dias || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          await supabase
            .from('contas_pagar')
            .insert({
              integrado_id: integradoId,
              ordem_compra_id: recebimento.ordem_compra_id,
              parceiro_id: oc.parceiro_id,
              descricao: `NF-e ${recebimento.numero_nfe || 'S/N'} - Recebimento`,
              valor: recebimento.valor_nfe,
              data_vencimento: vencimento,
              status: 'pendente',
              categoria: 'compra_mercadoria'
            });
        }

        // Update OC status
        await supabase
          .from('ordens_compra')
          .update({ status: 'recebida' })
          .eq('id', recebimento.ordem_compra_id);
      }

      toast.success('Recebimento finalizado com sucesso! Materiais em quarentena.');
      onSuccess();
    } catch (error) {
      console.error('Erro ao finalizar recebimento:', error);
      toast.error('Erro ao finalizar recebimento');
    } finally {
      setLoading(false);
    }
  };

  const handleAutorizacaoSuccess = (userId: string, justificativa: string) => {
    setShowAutorizacao(false);
    finalizarRecebimento(userId, justificativa);
  };

  if (showAutorizacao) {
    return (
      <AutorizacaoDivergenciaDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) setShowAutorizacao(false);
        }}
        divergencias={divergencias.filter(d => !d.aceita)}
        onSuccess={handleAutorizacaoSuccess}
      />
    );
  }

  const noDivergencias = divergencias.length === 0;
  const divergenciasWithinTolerance = divergencias.filter(d => !d.critico);
  const divergenciasCritical = divergencias.filter(d => d.critico);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {noDivergencias ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            Relatório de Divergências
          </DialogTitle>
          <DialogDescription>
            {noDivergencias 
              ? 'Nenhuma divergência encontrada. O recebimento pode ser finalizado.'
              : 'Analise as divergências identificadas e aceite-as ou solicite correção.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Tolerance settings toggle */}
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowToleranceSettings(!showToleranceSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Tolerâncias
          </Button>
        </div>

        {/* Tolerance settings form */}
        {showToleranceSettings && (
          <Card className="border-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Configurar Tolerâncias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Tolerância Quantidade (%)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={toleranceQtd}
                    onChange={(e) => setToleranceQtd(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Divergências abaixo deste % são aceitas automaticamente
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tolerância Preço (%)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={tolerancePreco}
                    onChange={(e) => setTolerancePreco(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas aumento de preço acima deste % é crítico
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={saveToleranceSettings}>
                  Salvar Tolerâncias
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {noDivergencias ? (
          <Card className="border-green-500/50 bg-green-50/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="w-8 h-8" />
                <div>
                  <p className="font-medium">Conferência OK!</p>
                  <p className="text-sm text-muted-foreground">
                    Todos os itens foram conferidos sem divergências significativas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">{divergencias.length} divergência(s) encontrada(s)</span>
                {divergenciasWithinTolerance.length > 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-500">
                    {divergenciasWithinTolerance.length} dentro da tolerância
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={aceitarTodas}>
                <Check className="w-4 h-4 mr-2" />
                Aceitar Todas
              </Button>
            </div>

            {/* Critical divergences */}
            {divergenciasCritical.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Divergências Críticas ({divergenciasCritical.length})
                </h4>
                <div className="space-y-2">
                  {divergenciasCritical.map((div) => (
                    <Card 
                      key={div.id} 
                      className={`border-destructive/50 ${div.aceita ? 'opacity-60' : ''}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={div.aceita}
                              onCheckedChange={() => toggleAceitarDivergencia(div.id)}
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  div.tipo === 'quantidade' ? 'secondary' : 
                                  div.tipo === 'produto_nao_previsto' ? 'destructive' : 'outline'
                                }>
                                  {div.tipo === 'quantidade' ? 'Quantidade' : 
                                   div.tipo === 'produto_nao_previsto' ? 'Produto Extra' : 'Preço'}
                                </Badge>
                                <Badge variant="destructive">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Crítico
                                </Badge>
                              </div>
                              <p className="font-medium">{div.produtoNome}</p>
                              <p className="text-sm text-muted-foreground">{div.descricao}</p>
                              
                              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                {div.tipo === 'quantidade' || div.tipo === 'produto_nao_previsto' ? (
                                  <>
                                    <div>
                                      <span className="text-muted-foreground">OC: </span>
                                      <span className="font-medium">{div.valorOc || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">NF-e: </span>
                                      <span className="font-medium">{div.valorNfe || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Físico: </span>
                                      <span className="font-medium">{div.valorFisico}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <span className="text-muted-foreground">OC: </span>
                                      <span className="font-medium">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(div.valorOc)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">NF-e: </span>
                                      <span className={`font-medium ${div.percentualDiferenca > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(div.valorNfe)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Diferença: </span>
                                      <span className={`font-medium ${div.percentualDiferenca > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                        {div.percentualDiferenca > 0 ? '+' : ''}{div.percentualDiferenca.toFixed(1)}%
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Non-critical divergences */}
            {divergenciasWithinTolerance.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Dentro da Tolerância ({divergenciasWithinTolerance.length}) - Aceitas automaticamente
                </h4>
                <div className="space-y-2">
                  {divergenciasWithinTolerance.map((div) => (
                    <Card 
                      key={div.id} 
                      className={`border-yellow-500/30 ${div.aceita ? 'opacity-60' : ''}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={div.aceita}
                              onCheckedChange={() => toggleAceitarDivergencia(div.id)}
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={div.tipo === 'quantidade' ? 'secondary' : 'outline'}>
                                  {div.tipo === 'quantidade' ? 'Quantidade' : 'Preço'}
                                </Badge>
                                <Badge variant="outline" className="text-green-600 border-green-500">
                                  Tolerância
                                </Badge>
                              </div>
                              <p className="font-medium">{div.produtoNome}</p>
                              <p className="text-sm text-muted-foreground">{div.descricao}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {hasDivergenciasNaoAceitas() && (
              <Card className="border-yellow-500/50 bg-yellow-50/10">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm">
                      Divergências não aceitas requerem autorização do gerente para finalizar
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleFinalizar} disabled={loading}>
            {loading ? 'Finalizando...' : 'Finalizar Recebimento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
