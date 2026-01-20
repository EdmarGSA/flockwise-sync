import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, AlertTriangle, CheckCircle, Egg } from 'lucide-react';
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

interface ItemSeparacaoOvo {
  id: string;
  produto_ovo_id: string;
  produto_nome: string;
  quantidade: number;
  quantidade_unidades: number;
  quantidade_separada: number;
  estoque_disponivel: number;
  reservas_fifo: ReservaFIFO[];
}

interface ReservaFIFO {
  estoque_ovo_id: string;
  lote_interno: string;
  data_producao: string;
  data_validade: string;
  quantidade_disponivel: number;
  quantidade_reservar: number;
}

export default function SeparacaoDialog({ open, onOpenChange, pedido, integradoId, onSuccess }: SeparacaoDialogProps) {
  const [itens, setItens] = useState<ItemSeparacao[]>([]);
  const [itensOvos, setItensOvos] = useState<ItemSeparacaoOvo[]>([]);
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
      // Get regular order items
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

      // Get egg order items
      const { data: pedidoItensOvos, error: ovosError } = await supabase
        .from('pedido_itens_ovos')
        .select(`
          *,
          produto_ovo:produtos_ovos(nome, tipo_ovo, classificacao_peso)
        `)
        .eq('pedido_id', pedido.id);

      if (ovosError) throw ovosError;

      // For each egg item, fetch FIFO stock availability
      const itensOvosMapped: ItemSeparacaoOvo[] = [];

      for (const item of pedidoItensOvos || []) {
        // Get available stock sorted by production date (FIFO)
        // PRIORIDADE 2: Filtrar ovos bloqueados por carência sanitária
        const { data: estoqueDisponivel } = await supabase
          .from('estoque_ovos')
          .select('id, lote_interno, data_producao, data_validade, quantidade_atual, quantidade_reservada, tipo_ovo, classificacao_peso, bloqueado_carencia')
          .eq('integrado_id', integradoId)
          .eq('tipo_ovo', item.produto_ovo?.tipo_ovo)
          .eq('classificacao_peso', item.produto_ovo?.classificacao_peso)
          .eq('ativo', true)
          .eq('bloqueado_carencia', false) // Não incluir ovos em carência sanitária
          .gt('quantidade_atual', 0)
          .order('data_producao', { ascending: true });

        // Calculate FIFO allocation
        let quantidadeRestante = item.quantidade_unidades;
        const reservas: ReservaFIFO[] = [];
        let totalDisponivel = 0;

        for (const estoque of estoqueDisponivel || []) {
          const disponivel = (estoque.quantidade_atual || 0) - (estoque.quantidade_reservada || 0);
          totalDisponivel += disponivel;

          if (disponivel > 0 && quantidadeRestante > 0) {
            const quantidadeReservar = Math.min(disponivel, quantidadeRestante);
            reservas.push({
              estoque_ovo_id: estoque.id,
              lote_interno: estoque.lote_interno,
              data_producao: estoque.data_producao,
              data_validade: estoque.data_validade,
              quantidade_disponivel: disponivel,
              quantidade_reservar: quantidadeReservar,
            });
            quantidadeRestante -= quantidadeReservar;
          }
        }

        itensOvosMapped.push({
          id: item.id,
          produto_ovo_id: item.produto_ovo_id,
          produto_nome: item.produto_ovo?.nome || '',
          quantidade: item.quantidade,
          quantidade_unidades: item.quantidade_unidades,
          quantidade_separada: item.quantidade_unidades - quantidadeRestante,
          estoque_disponivel: totalDisponivel,
          reservas_fifo: reservas,
        });
      }

      setItensOvos(itensOvosMapped);
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

    const ovosWithIssues = itensOvos.filter(item =>
      item.quantidade_separada < item.quantidade_unidades
    );

    if (itemsWithIssues.length > 0) {
      toast.error('Alguns itens excedem o estoque disponível');
      return;
    }

    if (ovosWithIssues.length > 0) {
      toast.warning('Alguns ovos não têm estoque suficiente. Deseja continuar com separação parcial?');
    }

    setSaving(true);
    try {
      // Create separation records for regular items
      if (itens.length > 0) {
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
          if (!item.produto_id) continue;
          
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
      }

      // Process egg reservations (FIFO)
      for (const itemOvo of itensOvos) {
        for (const reserva of itemOvo.reservas_fifo) {
          // Create reservation record
          const { error: reservaError } = await supabase
            .from('reserva_estoque_ovos')
            .insert({
              estoque_ovo_id: reserva.estoque_ovo_id,
              pedido_item_ovo_id: itemOvo.id,
              quantidade_reservada: reserva.quantidade_reservar,
              lote_interno: reserva.lote_interno,
              data_producao: reserva.data_producao,
              data_validade: reserva.data_validade,
            });

          if (reservaError) throw reservaError;

          // Update reserved quantity in estoque_ovos
          const { data: estoqueAtual } = await supabase
            .from('estoque_ovos')
            .select('quantidade_reservada')
            .eq('id', reserva.estoque_ovo_id)
            .single();

          const novaReserva = (estoqueAtual?.quantidade_reservada || 0) + reserva.quantidade_reservar;

          const { error: updateError } = await supabase
            .from('estoque_ovos')
            .update({ quantidade_reservada: novaReserva })
            .eq('id', reserva.estoque_ovo_id);

          if (updateError) throw updateError;
        }
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

  const hasItems = itens.length > 0 || itensOvos.length > 0;
  const hasStockIssues = itens.some(i => i.quantidade_separada > i.estoque_disponivel) ||
                          itensOvos.some(i => i.quantidade_separada < i.quantidade_unidades);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <>
              {/* Regular Items */}
              {itens.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Produtos
                  </h4>
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
                </div>
              )}

              {/* Egg Items */}
              {itensOvos.length > 0 && (
                <div>
                  {itens.length > 0 && <Separator className="my-4" />}
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Egg className="w-4 h-4 text-amber-600" />
                    Ovos (Alocação FIFO)
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd Pedido</TableHead>
                        <TableHead className="text-right">Unidades</TableHead>
                        <TableHead className="text-right">Estoque Disp.</TableHead>
                        <TableHead>Alocação FIFO</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensOvos.map((item) => {
                        const estoqueOk = item.quantidade_separada >= item.quantidade_unidades;

                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell className="text-right">
                              {item.quantidade}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantidade_unidades} UN
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={item.estoque_disponivel < item.quantidade_unidades ? 'text-amber-600' : ''}>
                                {item.estoque_disponivel} UN
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {item.reservas_fifo.length > 0 ? (
                                  item.reservas_fifo.map((reserva, idx) => (
                                    <div key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                      <span className="font-mono">{reserva.lote_interno}</span>
                                      <span className="mx-1">→</span>
                                      <span className="font-medium">{reserva.quantidade_reservar} UN</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sem lotes disponíveis</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {estoqueOk ? (
                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  OK
                                </Badge>
                              ) : item.quantidade_separada > 0 ? (
                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  Parcial ({item.quantidade_separada}/{item.quantidade_unidades})
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  Sem estoque
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!hasItems && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum item para separar neste pedido.
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarSeparacao} 
            disabled={saving || !hasItems || itens.some(i => i.quantidade_separada > i.estoque_disponivel)}
          >
            {saving ? 'Processando...' : 'Confirmar Separação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
