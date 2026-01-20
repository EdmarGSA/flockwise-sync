import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Truck, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FaturamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
  integradoId: string;
  onSuccess: () => void;
}

export default function FaturamentoDialog({ open, onOpenChange, pedido, integradoId, onSuccess }: FaturamentoDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    numero_nfe: '',
    data_faturamento: format(new Date(), 'yyyy-MM-dd')
  });

  const handleFaturar = async () => {
    if (!formData.numero_nfe) {
      toast.error('Informe o número da NF-e');
      return;
    }

    setSaving(true);
    try {
      // Update order status to faturado
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          status: 'faturado',
          faturado_por: integradoId,
          data_faturamento: new Date().toISOString(),
          numero_nfe: formData.numero_nfe
        })
        .eq('id', pedido.id);

      if (pedidoError) throw pedidoError;

      // Update accounts receivable from 'previsao' to 'pendente'
      const { error: crError } = await supabase
        .from('contas_receber')
        .update({
          status: 'pendente',
          numero_documento: formData.numero_nfe
        })
        .eq('pedido_id', pedido.id);

      if (crError) throw crError;

      // === PRIORIDADE 1: BAIXA DEFINITIVA DE ESTOQUE DE OVOS ===
      // Buscar itens de ovos do pedido
      const { data: pedidoItensOvos } = await supabase
        .from('pedido_itens_ovos')
        .select('id')
        .eq('pedido_id', pedido.id);

      if (pedidoItensOvos && pedidoItensOvos.length > 0) {
        // Para cada item de ovo, buscar as reservas
        for (const itemOvo of pedidoItensOvos) {
          const { data: reservas } = await supabase
            .from('reserva_estoque_ovos')
            .select('*, estoque_ovos:estoque_ovo_id(id, quantidade_atual, quantidade_reservada, lote_interno)')
            .eq('pedido_item_ovo_id', itemOvo.id);

          // Para cada reserva, baixar do estoque definitivamente
          for (const reserva of reservas || []) {
            if (!reserva.estoque_ovos) continue;
            
            const estoqueAtual = reserva.estoque_ovos.quantidade_atual || 0;
            const quantidadeReservada = reserva.quantidade_reservada || 0;
            const novoSaldo = estoqueAtual - quantidadeReservada;

            // Atualizar estoque_ovos (quantidade_atual e zerar reserva)
            const { error: updateError } = await supabase
              .from('estoque_ovos')
              .update({ 
                quantidade_atual: Math.max(0, novoSaldo),
                quantidade_reservada: Math.max(0, (reserva.estoque_ovos.quantidade_reservada || 0) - quantidadeReservada)
              })
              .eq('id', reserva.estoque_ovo_id);

            if (updateError) {
              console.error('Erro ao atualizar estoque:', updateError);
              continue;
            }

            // Registrar no kardex_ovos
            await supabase
              .from('kardex_ovos')
              .insert({
                integrado_id: integradoId,
                estoque_ovo_id: reserva.estoque_ovo_id,
                pedido_id: pedido.id,
                tipo_movimento: 'saida_venda',
                quantidade: quantidadeReservada,
                saldo_anterior: estoqueAtual,
                saldo_atual: Math.max(0, novoSaldo),
                documento_ref: `NF-e ${formData.numero_nfe}`,
                observacao: `Venda pedido #${pedido.numero_pedido} - Lote ${reserva.estoque_ovos.lote_interno}`,
              });
          }
        }
      }

      toast.success(`Pedido #${pedido.numero_pedido} faturado com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error invoicing order:', error);
      toast.error('Erro ao faturar pedido');
    } finally {
      setSaving(false);
    }
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Faturar Pedido #{pedido.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">
                  {pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Invoice Data */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Número da NF-e *
              </Label>
              <Input
                value={formData.numero_nfe}
                onChange={(e) => setFormData({ ...formData, numero_nfe: e.target.value })}
                placeholder="Ex: 000123456"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de Faturamento
              </Label>
              <Input
                type="date"
                value={formData.data_faturamento}
                onChange={(e) => setFormData({ ...formData, data_faturamento: e.target.value })}
              />
            </div>
          </div>

          <Card className="bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-green-600">
                Ao faturar, a conta a receber será atualizada para status "Pendente" 
                e ficará disponível para conciliação bancária.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleFaturar} disabled={saving}>
            {saving ? 'Faturando...' : 'Confirmar Faturamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
