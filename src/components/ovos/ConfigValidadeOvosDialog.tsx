import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings2 } from 'lucide-react';

interface ConfigValidadeOvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
}

interface ConfigValidade {
  dias_validade_padrao: number;
  dias_validade_branco: number | null;
  dias_validade_castanho: number | null;
  dias_validade_vermelho: number | null;
  dias_validade_caipira: number | null;
}

export default function ConfigValidadeOvosDialog({
  open,
  onOpenChange,
  integradoId,
}: ConfigValidadeOvosDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfigValidade>({
    dias_validade_padrao: 30,
    dias_validade_branco: null,
    dias_validade_castanho: null,
    dias_validade_vermelho: null,
    dias_validade_caipira: null,
  });

  useEffect(() => {
    if (open) fetchConfig();
  }, [open, integradoId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('config_validade_ovos' as any)
        .select('*')
        .eq('integrado_id', integradoId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig({
          dias_validade_padrao: (data as any).dias_validade_padrao || 30,
          dias_validade_branco: (data as any).dias_validade_branco,
          dias_validade_castanho: (data as any).dias_validade_castanho,
          dias_validade_vermelho: (data as any).dias_validade_vermelho,
          dias_validade_caipira: (data as any).dias_validade_caipira,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('config_validade_ovos' as any)
        .select('id')
        .eq('integrado_id', integradoId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('config_validade_ovos' as any)
          .update({
            dias_validade_padrao: config.dias_validade_padrao,
            dias_validade_branco: config.dias_validade_branco || null,
            dias_validade_castanho: config.dias_validade_castanho || null,
            dias_validade_vermelho: config.dias_validade_vermelho || null,
            dias_validade_caipira: config.dias_validade_caipira || null,
          } as any)
          .eq('integrado_id', integradoId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('config_validade_ovos' as any)
          .insert({
            integrado_id: integradoId,
            dias_validade_padrao: config.dias_validade_padrao,
            dias_validade_branco: config.dias_validade_branco || null,
            dias_validade_castanho: config.dias_validade_castanho || null,
            dias_validade_vermelho: config.dias_validade_vermelho || null,
            dias_validade_caipira: config.dias_validade_caipira || null,
          } as any);
        if (error) throw error;
      }

      toast.success('Configuração de validade salva!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const TIPOS = [
    { key: 'dias_validade_branco' as const, label: 'Branco' },
    { key: 'dias_validade_castanho' as const, label: 'Castanho' },
    { key: 'dias_validade_vermelho' as const, label: 'Vermelho' },
    { key: 'dias_validade_caipira' as const, label: 'Caipira' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configurar Validade dos Ovos
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure os dias de validade padrão e por tipo de ovo. Ao registrar uma entrada, a data de validade será calculada automaticamente.
            </p>

            <div className="space-y-2">
              <Label className="font-semibold">Validade Padrão (dias)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={config.dias_validade_padrao}
                onChange={(e) => setConfig(prev => ({ ...prev, dias_validade_padrao: parseInt(e.target.value) || 30 }))}
              />
              <p className="text-xs text-muted-foreground">Aplicado quando não há valor específico para o tipo</p>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold text-sm">Validade por Tipo (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-3">Deixe vazio para usar o valor padrão</p>
              <div className="grid grid-cols-2 gap-3">
                {TIPOS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm">{label}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="Padrão"
                      value={config[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        setConfig(prev => ({ ...prev, [key]: val }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
