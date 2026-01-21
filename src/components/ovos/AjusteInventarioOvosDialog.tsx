import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AjusteInventarioOvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estoqueItem: {
    id: string;
    lote_interno: string;
    quantidade_atual: number;
    tipo_ovo: string;
    classificacao_peso: string;
  } | null;
  integradoId: string;
  onSuccess: () => void;
}

const MOTIVOS_AJUSTE = [
  { value: 'quebra', label: 'Quebra', tipo: 'negativo' },
  { value: 'perda', label: 'Perda/Avaria', tipo: 'negativo' },
  { value: 'vencimento', label: 'Vencimento', tipo: 'negativo' },
  { value: 'furto', label: 'Furto/Extravio', tipo: 'negativo' },
  { value: 'correcao_positiva', label: 'Correção (+)', tipo: 'positivo' },
  { value: 'correcao_negativa', label: 'Correção (-)', tipo: 'negativo' },
  { value: 'conferencia', label: 'Conferência Física', tipo: 'neutro' },
];

export default function AjusteInventarioOvosDialog({
  open,
  onOpenChange,
  estoqueItem,
  integradoId,
  onSuccess,
}: AjusteInventarioOvosDialogProps) {
  const [saving, setSaving] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [quantidade, setQuantidade] = useState(0);
  const [observacao, setObservacao] = useState('');

  const motivoInfo = MOTIVOS_AJUSTE.find(m => m.value === motivo);
  const isPositivo = motivoInfo?.tipo === 'positivo' || (motivoInfo?.tipo === 'neutro' && quantidade > 0);
  
  const novoSaldo = estoqueItem 
    ? (isPositivo ? estoqueItem.quantidade_atual + Math.abs(quantidade) : estoqueItem.quantidade_atual - Math.abs(quantidade))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estoqueItem || !motivo || quantidade === 0) return;

    setSaving(true);
    try {
      const quantidadeAjuste = isPositivo ? Math.abs(quantidade) : -Math.abs(quantidade);
      const novaQuantidade = estoqueItem.quantidade_atual + quantidadeAjuste;

      if (novaQuantidade < 0) {
        toast.error('Quantidade de ajuste maior que o estoque disponível');
        setSaving(false);
        return;
      }

      // Atualizar estoque
      const { error: updateError } = await supabase
        .from('estoque_ovos')
        .update({
          quantidade_atual: novaQuantidade,
          ...(novaQuantidade === 0 ? { ativo: false } : {}),
        })
        .eq('id', estoqueItem.id);

      if (updateError) throw updateError;

      // Registrar no kardex
      const tipoMovimento = isPositivo ? 'ajuste_positivo' : 'ajuste_negativo';
      const { error: kardexError } = await supabase
        .from('kardex_ovos')
        .insert({
          integrado_id: integradoId,
          estoque_ovo_id: estoqueItem.id,
          tipo_movimento: tipoMovimento,
          quantidade: Math.abs(quantidade),
          saldo_anterior: estoqueItem.quantidade_atual,
          saldo_atual: novaQuantidade,
          documento_ref: `AJUSTE-${motivo.toUpperCase()}`,
          observacao: `${motivoInfo?.label || motivo}${observacao ? ': ' + observacao : ''}`,
        });

      if (kardexError) throw kardexError;

      toast.success(`Ajuste de ${Math.abs(quantidade)} unidades registrado com sucesso`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error('Erro ao registrar ajuste: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMotivo('');
    setQuantidade(0);
    setObservacao('');
  };

  if (!estoqueItem) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de Inventário</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Lote</div>
          <div className="font-medium">{estoqueItem.lote_interno}</div>
          <div className="text-sm text-muted-foreground mt-2">Estoque Atual</div>
          <div className="text-xl font-bold">{estoqueItem.quantidade_atual.toLocaleString()} unidades</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo do Ajuste *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_AJUSTE.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              value={quantidade || ''}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
              placeholder="Quantidade a ajustar"
              min={1}
              max={motivoInfo?.tipo === 'negativo' ? estoqueItem.quantidade_atual : undefined}
            />
            {motivoInfo && (
              <p className="text-xs text-muted-foreground">
                {motivoInfo.tipo === 'positivo' && 'Este motivo adiciona quantidade ao estoque'}
                {motivoInfo.tipo === 'negativo' && 'Este motivo remove quantidade do estoque'}
                {motivoInfo.tipo === 'neutro' && 'Digite valor positivo para adicionar ou negativo para remover'}
              </p>
            )}
          </div>

          {motivo && quantidade !== 0 && (
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Anterior:</span>
                <span>{estoqueItem.quantidade_atual.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ajuste:</span>
                <span className={isPositivo ? 'text-green-600' : 'text-red-600'}>
                  {isPositivo ? '+' : '-'}{Math.abs(quantidade).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t mt-2">
                <span>Novo Saldo:</span>
                <span className={novoSaldo < 0 ? 'text-red-600' : ''}>{novoSaldo.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva detalhes do ajuste..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saving || !motivo || quantidade === 0 || novoSaldo < 0}
            >
              {saving ? 'Salvando...' : 'Confirmar Ajuste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
