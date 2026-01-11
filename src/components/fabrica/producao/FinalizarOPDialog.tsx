import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Factory, Loader2, Package, DollarSign, Info } from 'lucide-react';
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

interface InsumoConsumido {
  id: string;
  insumo_id: string;
  nome: string;
  quantidade: number;
  unidade_medida: string;
  custo_unitario: number;
  custo_total: number;
}

interface FinalizarOPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
  integradoId: string;
  onSuccess: () => void;
}

export default function FinalizarOPDialog({
  open,
  onOpenChange,
  ordem,
  integradoId,
  onSuccess
}: FinalizarOPDialogProps) {
  const [insumos, setInsumos] = useState<InsumoConsumido[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && ordem) {
      fetchInsumos();
    }
  }, [open, ordem]);

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
          unidade_medida,
          custo_unitario,
          custo_total,
          insumo:produtos!ordens_producao_itens_insumo_id_fkey(nome)
        `)
        .eq('ordem_producao_id', ordem.id);

      if (error) throw error;

      setInsumos((data || []).map(item => {
        const insumoData = item.insumo as any;
        const quantidade = Number(item.quantidade_necessaria);
        const custoUnit = Number(item.custo_unitario) || 0;
        
        return {
          id: item.id,
          insumo_id: item.insumo_id,
          nome: insumoData?.nome || '-',
          quantidade: quantidade,
          unidade_medida: item.unidade_medida,
          custo_unitario: custoUnit,
          custo_total: quantidade * custoUnit
        };
      }));
    } catch (error) {
      console.error('Erro ao buscar insumos:', error);
      toast.error('Erro ao carregar insumos da OP');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from already adjusted quantities
  const custoTotalReal = insumos.reduce((sum, i) => sum + i.custo_total, 0);
  const quantidadeProduzida = ordem?.quantidade_planejada || 0;
  const custoPorKgReal = quantidadeProduzida > 0 ? custoTotalReal / quantidadeProduzida : 0;

  const handleFinalizar = async () => {
    if (!ordem) return;

    setSaving(true);

    try {
      // 1. Update production order status to finalized
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

      // 2. Update each item with utilized quantity
      for (const insumo of insumos) {
        await supabase
          .from('ordens_producao_itens')
          .update({ 
            quantidade_utilizada: insumo.quantidade
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
        const saldoAtual = saldoAnterior - insumo.quantidade;

        await supabase
          .from('kardex')
          .insert({
            integrado_id: integradoId,
            produto_id: insumo.insumo_id,
            tipo_movimento: 'saida',
            quantidade: insumo.quantidade,
            saldo_anterior: saldoAnterior,
            saldo_atual: saldoAtual,
            documento_ref: `OP #${ordem.numero_op}`,
            observacao: `Consumo para produção de ${ordem.produto?.nome} - Lote: ${ordem.lote_producao || 'N/A'}`,
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
          observacao: `Produção finalizada - Lote: ${ordem.lote_producao || 'N/A'}`,
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
            lote_producao: ordem.lote_producao,
            insumos_consumidos: insumos.map(i => ({
              id: i.insumo_id,
              nome: i.nome,
              quantidade: i.quantidade,
              custo: i.custo_total
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          {/* Info Notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Info className="w-4 h-4" />
            <span>Esta ação irá confirmar a produção e movimentar o estoque conforme as quantidades ajustadas no início da produção.</span>
          </div>

          {/* Production Summary - Read Only */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Quantidade a Produzir</Label>
                  <p className="text-2xl font-bold">
                    {quantidadeProduzida.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem?.produto?.unidade_medida || 'kg'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Lote de Produção</Label>
                  <p className="text-xl font-bold text-primary">
                    {ordem?.lote_producao || 'Não definido'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary - Read Only */}
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Custo Total</span>
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

          {/* Ingredients to be consumed - Read Only */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Insumos a Consumir (somente leitura)
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
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map(insumo => (
                    <TableRow key={insumo.id}>
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell className="text-right">
                        {insumo.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        R$ {insumo.custo_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {insumo.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            disabled={saving || quantidadeProduzida <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Confirmar Finalização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
