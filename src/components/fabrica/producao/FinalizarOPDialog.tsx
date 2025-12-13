import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Factory, Loader2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrdemProducao {
  id: string;
  numero_op: number;
  produto_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
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
  const [quantidadeProduzida, setQuantidadeProduzida] = useState(0);
  const [insumos, setInsumos] = useState<InsumoUtilizado[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && ordem) {
      setQuantidadeProduzida(ordem.quantidade_planejada);
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
          quantidade_utilizada,
          unidade_medida,
          insumo:produtos!ordens_producao_itens_insumo_id_fkey(nome)
        `)
        .eq('ordem_producao_id', ordem.id);

      if (error) throw error;

      setInsumos((data || []).map(item => ({
        id: item.id,
        insumo_id: item.insumo_id,
        nome: (item.insumo as any)?.nome || '-',
        quantidade_necessaria: item.quantidade_necessaria,
        quantidade_utilizada: item.quantidade_necessaria, // Default to required
        unidade_medida: item.unidade_medida
      })));
    } catch (error) {
      console.error('Erro ao buscar insumos:', error);
      toast.error('Erro ao carregar insumos da OP');
    } finally {
      setLoading(false);
    }
  };

  const updateInsumoQuantidade = (id: string, quantidade: number) => {
    setInsumos(prev => prev.map(i => 
      i.id === id ? { ...i, quantidade_utilizada: quantidade } : i
    ));
  };

  const handleFinalizar = async () => {
    if (!ordem) return;
    setSaving(true);

    try {
      // 1. Update production order
      const { error: opError } = await supabase
        .from('ordens_producao')
        .update({
          status: 'finalizada',
          quantidade_produzida: quantidadeProduzida,
          data_finalizacao: new Date().toISOString()
        })
        .eq('id', ordem.id);

      if (opError) throw opError;

      // 2. Update each item with utilized quantity
      for (const insumo of insumos) {
        await supabase
          .from('ordens_producao_itens')
          .update({ quantidade_utilizada: insumo.quantidade_utilizada })
          .eq('id', insumo.id);
      }

      // 3. Register ingredient exits in kardex
      for (const insumo of insumos) {
        // Get current stock
        const { data: produto } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', insumo.insumo_id)
          .single();

        const saldoAnterior = produto?.estoque_atual || 0;
        const saldoAtual = saldoAnterior - insumo.quantidade_utilizada;

        // Register exit
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

        // Update stock
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

      // Update final product stock
      await supabase
        .from('produtos')
        .update({ estoque_atual: saldoAtualFinal })
        .eq('id', ordem.produto_id);

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            Finalizar Produção - OP #{ordem?.numero_op}
          </DialogTitle>
          <DialogDescription>
            {ordem?.produto?.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Production Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Used */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Insumos Utilizados
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map(insumo => (
                    <TableRow key={insumo.id}>
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell className="text-right">
                        {insumo.quantidade_necessaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={insumo.quantidade_utilizada}
                          onChange={(e) => updateInsumoQuantidade(insumo.id, Number(e.target.value))}
                          className="w-32 text-right ml-auto"
                          min={0}
                          step={0.01}
                        />
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
            Finalizar Produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
