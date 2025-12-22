import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Factory, Loader2, Package, DollarSign, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrdemProducao {
  id: string;
  numero_op: number;
  produto_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  custo_total_estimado?: number;
  lote_producao?: string;
  produto?: {
    nome: string;
    unidade_medida: string;
  };
}

interface InsumoUtilizado {
  id: string;
  insumo_id: string;
  nome: string;
  quantidade_necessaria: number;
  quantidade_utilizada: number;
  unidade_medida: string;
  custo_unitario: number;
  custo_total: number;
  variacao_percentual: number;
  status: 'ok' | 'alerta' | 'critico';
}

interface FinalizarOPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
  integradoId: string;
  onSuccess: () => void;
}

const TOLERANCIA_PADRAO = 1; // 1% de tolerância

export default function FinalizarOPDialog({
  open,
  onOpenChange,
  ordem,
  integradoId,
  onSuccess
}: FinalizarOPDialogProps) {
  const [quantidadeProduzida, setQuantidadeProduzida] = useState(0);
  const [insumos, setInsumos] = useState<InsumoUtilizado[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tolerancia, setTolerancia] = useState(TOLERANCIA_PADRAO);
  const [proporcionalidadeAtiva, setProporcionalidadeAtiva] = useState(true);

  useEffect(() => {
    if (open && ordem) {
      setQuantidadeProduzida(ordem.quantidade_planejada);
      fetchConfiguracao();
      fetchInsumos();
    }
  }, [open, ordem]);

  const fetchConfiguracao = async () => {
    try {
      const { data } = await supabase
        .from('config_producao')
        .select('tolerancia_insumo_percentual')
        .eq('integrado_id', integradoId)
        .maybeSingle();
      
      if (data) {
        setTolerancia(Number(data.tolerancia_insumo_percentual) || TOLERANCIA_PADRAO);
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
    }
  };

  const fetchInsumos = async () => {
    if (!ordem) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ordens_producao_itens')
        .select(`
          id,
          insumo_id,
          quantidade_necessaria,
          quantidade_utilizada,
          unidade_medida,
          custo_unitario,
          custo_total,
          insumo:produtos!ordens_producao_itens_insumo_id_fkey(nome, custo_unitario, custo_medio)
        `)
        .eq('ordem_producao_id', ordem.id);

      if (error) throw error;

      setInsumos((data || []).map(item => {
        const insumoData = item.insumo as any;
        const custoUnit = Number(item.custo_unitario) > 0 
          ? Number(item.custo_unitario)
          : (Number(insumoData?.custo_medio) > 0 ? Number(insumoData.custo_medio) : Number(insumoData?.custo_unitario) || 0);
        
        const qtdNecessaria = Number(item.quantidade_necessaria);
        
        return {
          id: item.id,
          insumo_id: item.insumo_id,
          nome: insumoData?.nome || '-',
          quantidade_necessaria: qtdNecessaria,
          quantidade_utilizada: qtdNecessaria, // Default to required
          unidade_medida: item.unidade_medida,
          custo_unitario: custoUnit,
          custo_total: qtdNecessaria * custoUnit,
          variacao_percentual: 0,
          status: 'ok' as const
        };
      }));
    } catch (error) {
      console.error('Erro ao buscar insumos:', error);
      toast.error('Erro ao carregar insumos da OP');
    } finally {
      setLoading(false);
    }
  };

  const calcularVariacao = (utilizado: number, necessario: number): number => {
    if (necessario === 0) return 0;
    return ((utilizado - necessario) / necessario) * 100;
  };

  const getStatus = (variacao: number): 'ok' | 'alerta' | 'critico' => {
    const absVariacao = Math.abs(variacao);
    if (absVariacao <= tolerancia) return 'ok';
    if (absVariacao <= tolerancia * 2) return 'alerta';
    return 'critico';
  };

  const updateInsumoQuantidade = (id: string, quantidade: number) => {
    setInsumos(prev => {
      const updated = prev.map(i => {
        if (i.id === id) {
          const variacao = calcularVariacao(quantidade, i.quantidade_necessaria);
          return { 
            ...i, 
            quantidade_utilizada: quantidade, 
            custo_total: quantidade * i.custo_unitario,
            variacao_percentual: variacao,
            status: getStatus(variacao)
          };
        }
        return i;
      });

      // Se proporcionalidade ativa, ajustar quantidade produzida
      if (proporcionalidadeAtiva) {
        const insumoAlterado = updated.find(i => i.id === id);
        if (insumoAlterado && ordem) {
          const proporcao = insumoAlterado.quantidade_necessaria > 0 
            ? quantidade / insumoAlterado.quantidade_necessaria 
            : 1;
          
          // Média ponderada de todas as proporções
          const proporcoes = updated.map(i => 
            i.quantidade_necessaria > 0 ? i.quantidade_utilizada / i.quantidade_necessaria : 1
          );
          const proporcaoMedia = proporcoes.reduce((a, b) => a + b, 0) / proporcoes.length;
          
          const novaQtdProduzida = Math.round(ordem.quantidade_planejada * proporcaoMedia);
          setQuantidadeProduzida(novaQtdProduzida);
        }
      }

      return updated;
    });
  };

  // Calculate real cost based on utilized quantities
  const custoTotalReal = insumos.reduce((sum, i) => sum + (i.quantidade_utilizada * i.custo_unitario), 0);
  const custoPorKgReal = quantidadeProduzida > 0 ? custoTotalReal / quantidadeProduzida : 0;

  const hasVariacaoCritica = insumos.some(i => i.status === 'critico');
  const hasVariacaoAlerta = insumos.some(i => i.status === 'alerta');

  const handleFinalizar = async () => {
    if (!ordem) return;
    
    if (hasVariacaoCritica) {
      toast.error(`Variação acima de ${tolerancia * 2}% não permitida. Ajuste as quantidades.`);
      return;
    }

    setSaving(true);

    try {
      // 1. Update production order with real cost
      const { error: opError } = await supabase
        .from('ordens_producao')
        .update({
          status: 'finalizada',
          quantidade_produzida: quantidadeProduzida,
          data_finalizacao: new Date().toISOString(),
          custo_total_real: custoTotalReal,
          custo_por_kg: custoPorKgReal
        })
        .eq('id', ordem.id);

      if (opError) throw opError;

      // 2. Update each item with utilized quantity and cost
      for (const insumo of insumos) {
        await supabase
          .from('ordens_producao_itens')
          .update({ 
            quantidade_utilizada: insumo.quantidade_utilizada,
            custo_total: insumo.quantidade_utilizada * insumo.custo_unitario
          })
          .eq('id', insumo.id);
      }

      // 3. Register ingredient exits in kardex
      for (const insumo of insumos) {
        const { data: produto } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', insumo.insumo_id)
          .single();

        const saldoAnterior = produto?.estoque_atual || 0;
        const saldoAtual = saldoAnterior - insumo.quantidade_utilizada;

        await supabase
          .from('kardex')
          .insert({
            integrado_id: integradoId,
            produto_id: insumo.insumo_id,
            tipo_movimento: 'saida',
            quantidade: insumo.quantidade_utilizada,
            saldo_anterior: saldoAnterior,
            saldo_atual: saldoAtual,
            documento_ref: `OP #${ordem.numero_op}`,
            observacao: `Consumo para produção de ${ordem.produto?.nome}`,
            criado_por: integradoId
          });

        await supabase
          .from('produtos')
          .update({ estoque_atual: saldoAtual })
          .eq('id', insumo.insumo_id);
      }

      // 4. Register finished product entry in kardex
      const { data: produtoFinal } = await supabase
        .from('produtos')
        .select('estoque_atual')
        .eq('id', ordem.produto_id)
        .single();

      const saldoAnteriorFinal = produtoFinal?.estoque_atual || 0;
      const saldoAtualFinal = saldoAnteriorFinal + quantidadeProduzida;

      await supabase
        .from('kardex')
        .insert({
          integrado_id: integradoId,
          produto_id: ordem.produto_id,
          tipo_movimento: 'entrada',
          quantidade: quantidadeProduzida,
          saldo_anterior: saldoAnteriorFinal,
          saldo_atual: saldoAtualFinal,
          documento_ref: `OP #${ordem.numero_op}`,
          observacao: `Produção finalizada`,
          criado_por: integradoId
        });

      await supabase
        .from('produtos')
        .update({ estoque_atual: saldoAtualFinal })
        .eq('id', ordem.produto_id);

      // 5. Register production log
      await supabase
        .from('producao_logs')
        .insert({
          ordem_producao_id: ordem.id,
          tipo_evento: 'finalizacao',
          quantidade: quantidadeProduzida,
          origem: 'manual',
          dados_adicionais: { 
            custo_total_real: custoTotalReal,
            custo_por_kg: custoPorKgReal,
            insumos_utilizados: insumos.map(i => ({
              id: i.insumo_id,
              nome: i.nome,
              quantidade: i.quantidade_utilizada,
              variacao: i.variacao_percentual
            }))
          }
        });

      toast.success(`OP #${ordem.numero_op} finalizada com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao finalizar OP:', error);
      toast.error('Erro ao finalizar ordem de produção');
    } finally {
      setSaving(false);
    }
  };

  const getVariacaoBadge = (insumo: InsumoUtilizado) => {
    const { variacao_percentual, status } = insumo;
    const prefix = variacao_percentual >= 0 ? '+' : '';
    
    if (status === 'ok') {
      return (
        <Badge variant="default" className="bg-green-600">
          {prefix}{variacao_percentual.toFixed(1)}%
        </Badge>
      );
    }
    if (status === 'alerta') {
      return (
        <Badge variant="secondary" className="bg-amber-500 text-white">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {prefix}{variacao_percentual.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {prefix}{variacao_percentual.toFixed(1)}%
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            Finalizar Produção - OP #{ordem?.numero_op}
          </DialogTitle>
          <DialogDescription>
            {ordem?.produto?.nome}
            {ordem?.lote_producao && (
              <Badge variant="outline" className="ml-2">Lote: {ordem.lote_producao}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tolerance Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Info className="w-4 h-4" />
            <span>Tolerância de variação: <strong>±{tolerancia}%</strong> | Alerta: <strong>±{tolerancia * 2}%</strong></span>
          </div>

          {/* Production Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade Planejada</Label>
                  <p className="text-lg font-bold">
                    {ordem?.quantidade_planejada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem?.produto?.unidade_medida || 'kg'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qtdProduzida">Quantidade Produzida</Label>
                  <Input
                    id="qtdProduzida"
                    type="number"
                    value={quantidadeProduzida}
                    onChange={(e) => setQuantidadeProduzida(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Estimado</Label>
                  <p className="text-lg font-bold text-muted-foreground">
                    R$ {(ordem?.custo_total_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Proporcionalidade 
                    <button 
                      type="button"
                      className={`w-8 h-4 rounded-full transition-colors ${proporcionalidadeAtiva ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      onClick={() => setProporcionalidadeAtiva(!proporcionalidadeAtiva)}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${proporcionalidadeAtiva ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {proporcionalidadeAtiva ? 'Qtd. produzida ajusta automático' : 'Ajuste manual'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real Cost Summary */}
          <Card className={hasVariacaoCritica ? "bg-red-500/10 border-red-500/30" : hasVariacaoAlerta ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Custo Total Real</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {custoTotalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Custo por kg</span>
                  <p className="text-xl font-bold text-amber-500">
                    R$ {custoPorKgReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Used */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Insumos Utilizados
              {hasVariacaoCritica && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Variação Crítica
                </Badge>
              )}
              {!hasVariacaoCritica && hasVariacaoAlerta && (
                <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Atenção
                </Badge>
              )}
            </Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : insumos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum insumo registrado para esta OP
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Qtd. Prevista</TableHead>
                    <TableHead className="text-right">Qtd. Utilizada</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map(insumo => (
                    <TableRow key={insumo.id} className={insumo.status === 'critico' ? 'bg-destructive/5' : insumo.status === 'alerta' ? 'bg-amber-500/5' : ''}>
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell className="text-right">
                        {insumo.quantidade_necessaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={insumo.quantidade_utilizada}
                          onChange={(e) => updateInsumoQuantidade(insumo.id, Number(e.target.value))}
                          className="w-28 text-right ml-auto"
                          min={0}
                          step={0.01}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {getVariacaoBadge(insumo)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(insumo.quantidade_utilizada * insumo.custo_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleFinalizar}
            disabled={saving || quantidadeProduzida <= 0 || hasVariacaoCritica}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Finalizar Produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
