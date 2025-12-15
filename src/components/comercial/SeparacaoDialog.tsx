import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SeparacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
  integradoId: string;
  onSuccess: () => void;
}

interface ItemSeparacao {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  quantidade_separada: number;
  unidade_medida: string;
  estoque_disponivel: number;
  lote_producao_id: string;
}

export default function SeparacaoDialog({ open, onOpenChange, pedido, integradoId, onSuccess }: SeparacaoDialogProps) {
  const [itens, setItens] = useState<ItemSeparacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && pedido) {
      fetchItens();
    }
  }, [open, pedido]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      // Get order items
      const { data: pedidoItens, error: itensError } = await supabase
        .from('pedido_itens')
        .select(`
          *,
          produto:produtos(nome, estoque_atual, unidade_medida)
        `)
        .eq('pedido_id', pedido.id);

      if (itensError) throw itensError;

      // Map items with stock info
      const itensMapped: ItemSeparacao[] = (pedidoItens || []).map(item => ({
        id: item.id,
        produto_id: item.produto_id,
        produto_nome: item.produto?.nome || '',
        quantidade: item.quantidade,
        quantidade_separada: item.quantidade,
        unidade_medida: item.unidade_medida,
        estoque_disponivel: item.produto?.estoque_atual || 0,
        lote_producao_id: ''
      }));

      setItens(itensMapped);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Erro ao carregar itens do pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantidadeChange = (index: number, value: number) => {
    const newItens = [...itens];
    newItens[index].quantidade_separada = Math.min(value, newItens[index].quantidade);
    setItens(newItens);
  };

  const handleConfirmarSeparacao = async () => {
    // Validate that all items have been separated
    const itemsWithIssues = itens.filter(item => 
      item.quantidade_separada > item.estoque_disponivel
    );

    if (itemsWithIssues.length > 0) {
      toast.error('Alguns itens excedem o estoque disponível');
      return;
    }

    setSaving(true);
    try {
      // Create separation records
      const separacaoRecords = itens.map(item => ({
        pedido_id: pedido.id,
        pedido_item_id: item.id,
        produto_id: item.produto_id,
        quantidade_separada: item.quantidade_separada,
        lote_producao_id: item.lote_producao_id || null,
        separado_por: integradoId
      }));

      const { error: separacaoError } = await supabase
        .from('separacao_pedidos')
        .insert(separacaoRecords);

      if (separacaoError) throw separacaoError;

      // Create kardex entries for stock deduction
      for (const item of itens) {
        // Get current stock
        const { data: produto } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', item.produto_id)
          .single();

        const saldoAnterior = produto?.estoque_atual || 0;
        const novoSaldo = saldoAnterior - item.quantidade_separada;

        // Insert kardex movement
        const { error: kardexError } = await supabase
          .from('kardex')
          .insert({
            integrado_id: integradoId,
            produto_id: item.produto_id,
            tipo_movimento: 'saida_venda',
            quantidade: item.quantidade_separada,
            saldo_anterior: saldoAnterior,
            saldo_atual: novoSaldo,
            documento_ref: `Pedido #${pedido.numero_pedido}`,
            observacao: `Separação do pedido de venda #${pedido.numero_pedido}`
          });

        if (kardexError) throw kardexError;

        // Update product stock
        const { error: updateError } = await supabase
          .from('produtos')
          .update({ estoque_atual: novoSaldo })
          .eq('id', item.produto_id);

        if (updateError) throw updateError;
      }

      // Update order status
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ status: 'em_separacao' })
        .eq('id', pedido.id);

      if (pedidoError) throw pedidoError;

      toast.success('Separação confirmada! Estoque atualizado.');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming separation:', error);
      toast.error('Erro ao confirmar separação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Separação - Pedido #{pedido?.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-600">
                Confirme as quantidades separadas para cada item. O estoque será debitado automaticamente.
              </p>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd Pedido</TableHead>
                  <TableHead className="text-right">Estoque Disp.</TableHead>
                  <TableHead className="text-right">Qtd Separar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item, index) => {
                  const estoqueOk = item.quantidade_separada <= item.estoque_disponivel;
                  const qtdOk = item.quantidade_separada === item.quantidade;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.produto_nome}</TableCell>
                      <TableCell className="text-right">
                        {item.quantidade} {item.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.estoque_disponivel < item.quantidade ? 'text-amber-600' : ''}>
                          {item.estoque_disponivel} {item.unidade_medida}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={item.quantidade}
                          step="0.01"
                          value={item.quantidade_separada}
                          onChange={(e) => handleQuantidadeChange(index, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        {!estoqueOk ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Sem estoque
                          </Badge>
                        ) : qtdOk ? (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Parcial</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarSeparacao} 
            disabled={saving || itens.some(i => i.quantidade_separada > i.estoque_disponivel)}
          >
            {saving ? 'Processando...' : 'Confirmar Separação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
