import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface EstoqueOvo {
  id: string;
  lote_interno: string;
  tipo_ovo: string;
  classificacao_peso: string;
  quantidade_atual: number;
  quantidade_reservada: number;
}

interface DescarteOvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
}

const DESTINOS = [
  { value: 'industria', label: 'Indústria (processamento)' },
  { value: 'compostagem', label: 'Compostagem' },
  { value: 'doacao', label: 'Doação' },
  { value: 'descarte_sanitario', label: 'Descarte Sanitário' },
  { value: 'reciclagem_animal', label: 'Reciclagem Animal (ração)' },
  { value: 'outro', label: 'Outro' },
];

export default function DescarteOvosDialog({ open, onOpenChange, integradoId, onSuccess }: DescarteOvosDialogProps) {
  const [lotes, setLotes] = useState<EstoqueOvo[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    estoque_ovo_id: '',
    quantidade: 0,
    destino: '',
    motivo: '',
    observacao: '',
  });

  useEffect(() => {
    if (open) fetchLotes();
  }, [open]);

  const fetchLotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estoque_ovos')
        .select('id, lote_interno, tipo_ovo, classificacao_peso, quantidade_atual, quantidade_reservada')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .gt('quantidade_atual', 0)
        .order('data_producao', { ascending: true });

      if (error) throw error;
      setLotes(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar lotes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedLote = lotes.find(l => l.id === form.estoque_ovo_id);
  const maxQtd = selectedLote ? selectedLote.quantidade_atual - selectedLote.quantidade_reservada : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.estoque_ovo_id || !form.quantidade || !form.destino) return;
    if (form.quantidade > maxQtd) {
      toast.error('Quantidade excede o disponível');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Reduce stock
      const { error: updateError } = await supabase
        .from('estoque_ovos')
        .update({ quantidade_atual: selectedLote!.quantidade_atual - form.quantidade })
        .eq('id', form.estoque_ovo_id);

      if (updateError) throw updateError;

      // 2. Kardex entry
      await supabase.from('kardex_ovos').insert({
        integrado_id: integradoId,
        estoque_ovo_id: form.estoque_ovo_id,
        tipo_movimento: 'saida_descarte',
        quantidade: form.quantidade,
        saldo_anterior: selectedLote!.quantidade_atual,
        saldo_atual: selectedLote!.quantidade_atual - form.quantidade,
        documento_ref: selectedLote!.lote_interno,
        observacao: `Descarte - Destino: ${DESTINOS.find(d => d.value === form.destino)?.label || form.destino}${form.motivo ? ` | Motivo: ${form.motivo}` : ''}`,
      });

      // 3. Descarte record
      await supabase.from('descarte_ovos' as any).insert({
        integrado_id: integradoId,
        estoque_ovo_id: form.estoque_ovo_id,
        quantidade: form.quantidade,
        destino: form.destino,
        motivo: form.motivo || null,
        observacao: form.observacao || null,
      });

      toast.success('Descarte registrado com sucesso!');
      onOpenChange(false);
      setForm({ estoque_ovo_id: '', quantidade: 0, destino: '', motivo: '', observacao: '' });
      onSuccess();
    } catch (err: any) {
      toast.error('Erro ao registrar descarte: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Descarte de Ovos
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Lote de Estoque *</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground py-2">Carregando...</div>
            ) : (
              <Select value={form.estoque_ovo_id} onValueChange={(v) => setForm(prev => ({ ...prev, estoque_ovo_id: v, quantidade: 0 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map(lote => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.lote_interno} — {(lote.quantidade_atual - lote.quantidade_reservada).toLocaleString()} disp.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                value={form.quantidade || ''}
                onChange={(e) => setForm(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                min={1}
                max={maxQtd}
                required
              />
              {selectedLote && (
                <p className="text-xs text-muted-foreground">Máximo: {maxQtd.toLocaleString()}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Destino *</Label>
              <Select value={form.destino} onValueChange={(v) => setForm(prev => ({ ...prev, destino: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINOS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input
              value={form.motivo}
              onChange={(e) => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ex: ovos trincados, vencidos..."
            />
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={form.observacao}
              onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder="Observações adicionais"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting || !form.estoque_ovo_id || !form.quantidade || !form.destino}
            >
              {submitting ? 'Registrando...' : 'Confirmar Descarte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
