import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Check, CheckCircle, Lock, Shield, Package } from 'lucide-react';
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
  produtos: {
    id: string;
    nome: string;
    sku: string;
    unidade_medida: string;
  };
}

interface Divergencia {
  id: string;
  tipo: 'quantidade' | 'preco' | 'condicao_pagamento';
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

  useEffect(() => {
    if (open) {
      analisarDivergencias();
    }
  }, [open, itens]);

  const analisarDivergencias = () => {
    const divs: Divergencia[] = [];
    let divIndex = 0;

    itens.forEach(item => {
      const referencia = item.quantidade_nfe > 0 ? item.quantidade_nfe : item.quantidade_oc;
      
      // Quantity divergence (Physical vs Reference)
      if (referencia > 0 && item.quantidade_fisica !== referencia) {
        const diferenca = item.quantidade_fisica - referencia;
        const percentual = (diferenca / referencia) * 100;
        
        if (Math.abs(percentual) > 0.5) {
          divs.push({
            id: `qty-${divIndex++}`,
            tipo: 'quantidade',
            descricao: diferenca < 0 
              ? `Faltam ${Math.abs(diferenca).toFixed(2)} ${item.produtos.unidade_medida}`
              : `Excesso de ${diferenca.toFixed(2)} ${item.produtos.unidade_medida}`,
            itemId: item.id,
            produtoNome: item.produtos.nome,
            valorOc: item.quantidade_oc,
            valorNfe: item.quantidade_nfe,
            valorFisico: item.quantidade_fisica,
            percentualDiferenca: percentual,
            critico: Math.abs(percentual) > 5,
            aceita: false
          });
        }
      }

      // Price divergence (NF-e vs OC)
      if (item.preco_oc > 0 && item.preco_nfe > 0 && item.preco_nfe !== item.preco_oc) {
        const diferenca = item.preco_nfe - item.preco_oc;
        const percentual = (diferenca / item.preco_oc) * 100;
        
        if (Math.abs(percentual) > 0.5) {
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
            critico: diferenca > 0 && percentual > 5, // Only critical if price increased significantly
            aceita: false
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
    // Check if there are critical divergences that need authorization
    if (hasDivergenciasCriticasNaoAceitas()) {
      toast.error('Existem divergências críticas que precisam ser aceitas');
      return;
    }

    if (hasDivergenciasNaoAceitas()) {
      // Has non-critical divergences that were not accepted - needs manager auth
      setShowAutorizacao(true);
      return;
    }

    // All accepted or no divergences - finalize directly
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
          tipo: d.tipo,
          descricao: `${d.produtoNome}: ${d.descricao}`,
          valor_oc: d.valorOc,
          valor_nfe: d.valorNfe,
          valor_fisico: d.valorFisico || null,
          percentual_diferenca: d.percentualDiferenca,
          status: d.aceita ? 'aceita_com_autorizacao' : 'aberta',
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

      // Create kardex entries for each item (with quarantine status)
      for (const item of itens) {
        if (item.quantidade_fisica > 0) {
          // Get current stock
          const { data: produto, error: prodError } = await supabase
            .from('produtos')
            .select('estoque_atual')
            .eq('id', item.produto_id)
            .single();

          if (prodError) throw prodError;

          const saldoAnterior = produto?.estoque_atual || 0;
          const saldoAtual = saldoAnterior + item.quantidade_fisica;

          // Insert kardex entry with quarantine
          const { error: kardexError } = await supabase
            .from('kardex')
            .insert({
              integrado_id: integradoId,
              produto_id: item.produto_id,
              tipo_movimento: 'entrada',
              quantidade: item.quantidade_fisica,
              saldo_anterior: saldoAnterior,
              saldo_atual: saldoAtual,
              custo_unitario: item.preco_nfe || item.preco_oc,
              documento_ref: `NF-e ${recebimento?.numero_nfe || 'S/N'}`,
              observacao: `Recebimento - Lote: ${item.lote_fornecedor || 'N/A'}`,
              lote_fornecedor: item.lote_fornecedor || null,
              status_quarentena: 'quarentena',
              recebimento_id: recebimentoId
            });

          if (kardexError) throw kardexError;

          // Update product stock
          const { error: stockError } = await supabase
            .from('produtos')
            .update({ estoque_atual: saldoAtual })
            .eq('id', item.produto_id);

          if (stockError) throw stockError;
        }
      }

      // Update contas_pagar if linked to OC
      if (recebimento?.ordem_compra_id) {
        // Remove forecast entry (previsto)
        await supabase
          .from('contas_pagar')
          .delete()
          .eq('ordem_compra_id', recebimento.ordem_compra_id)
          .eq('status', 'previsto');

        // Get OC info for new entry
        const { data: oc } = await supabase
          .from('ordens_compra')
          .select('parceiro_id, data_vencimento, prazo_pagamento_dias')
          .eq('id', recebimento.ordem_compra_id)
          .single();

        if (oc) {
          // Create exact entry based on NF-e value
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
              </div>
              <Button variant="outline" size="sm" onClick={aceitarTodas}>
                <Check className="w-4 h-4 mr-2" />
                Aceitar Todas
              </Button>
            </div>

            <div className="space-y-3">
              {divergencias.map((div) => (
                <Card 
                  key={div.id} 
                  className={`${div.critico ? 'border-destructive/50' : 'border-yellow-500/50'} ${div.aceita ? 'opacity-60' : ''}`}
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
                            {div.critico && (
                              <Badge variant="destructive">
                                <Lock className="w-3 h-3 mr-1" />
                                Crítico
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{div.produtoNome}</p>
                          <p className="text-sm text-muted-foreground">{div.descricao}</p>
                          
                          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                            {div.tipo === 'quantidade' ? (
                              <>
                                <div>
                                  <span className="text-muted-foreground">OC: </span>
                                  <span className="font-medium">{div.valorOc}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">NF-e: </span>
                                  <span className="font-medium">{div.valorNfe}</span>
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

            {hasDivergenciasNaoAceitas() && (
              <Card className="border-yellow-500/50 bg-yellow-50/10">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-700">Autorização Necessária</p>
                      <p className="text-sm text-muted-foreground">
                        Aceitar divergências não marcadas requer autorização de um gerente (usuário admin).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button onClick={handleFinalizar} disabled={loading}>
            {loading ? 'Finalizando...' : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Finalizar Recebimento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
