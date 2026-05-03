import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { toast } from 'sonner';

const cfgSchema = z.object({
  idade_min_semanas: z.number().int('Use valor inteiro').min(10, 'Idade mínima >= 10 semanas').max(40, 'Idade mínima <= 40 semanas'),
  peso_min_kg: z.number().min(0.5, 'Peso mínimo >= 0,5 kg').max(5, 'Peso mínimo <= 5 kg'),
  horas_inicio: z.number().min(6, 'Horas início >= 6h').max(24, 'Horas início <= 24h'),
  horas_alvo: z.number().min(6, 'Horas alvo >= 6h').max(24, 'Horas alvo <= 24h'),
  ganho_semanal_min: z.number().int('Use minutos inteiros').min(5, 'Ganho semanal >= 5 min').max(120, 'Ganho semanal <= 120 min'),
  intensidade_pct: z.number().int().min(0, 'Intensidade entre 0 e 100').max(100, 'Intensidade entre 0 e 100'),
}).refine((d) => d.horas_inicio < d.horas_alvo, {
  message: 'Horas início deve ser menor que horas alvo',
  path: ['horas_inicio'],
}).refine((d) => (d.horas_alvo - d.horas_inicio) * 60 >= d.ganho_semanal_min, {
  message: 'Ganho semanal maior que a diferença total entre início e alvo',
  path: ['ganho_semanal_min'],
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loteId: string;
  onApplied?: () => void;
}

interface Cfg {
  idade_min_semanas: number;
  peso_min_kg: number;
  horas_inicio: number;
  horas_alvo: number;
  ganho_semanal_min: number;
  intensidade_pct: number;
  auto_aplicar: boolean;
  aplicado_em: string | null;
}

const DEFAULT: Cfg = {
  idade_min_semanas: 17, peso_min_kg: 1.45, horas_inicio: 9, horas_alvo: 16,
  ganho_semanal_min: 30, intensidade_pct: 60, auto_aplicar: false, aplicado_em: null,
};

export function EstimuloPosturaDialog({ open, onOpenChange, loteId, onApplied }: Props) {
  const { integradoId } = useIntegradoId();
  const [cfg, setCfg] = useState<Cfg>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !integradoId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('config_estimulo_postura')
        .select('*')
        .eq('lote_id', loteId)
        .maybeSingle();
      if (data) setCfg({ ...DEFAULT, ...data });
      else setCfg(DEFAULT);
      setLoading(false);
    })();
  }, [open, integradoId, loteId]);

  const validar = (): boolean => {
    const r = cfgSchema.safeParse({
      idade_min_semanas: cfg.idade_min_semanas,
      peso_min_kg: cfg.peso_min_kg,
      horas_inicio: cfg.horas_inicio,
      horas_alvo: cfg.horas_alvo,
      ganho_semanal_min: cfg.ganho_semanal_min,
      intensidade_pct: cfg.intensidade_pct,
    });
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      toast.error(r.error.issues[0].message);
      return false;
    }
    setErrors({});
    return true;
  };

  const salvar = async (): Promise<boolean> => {
    if (!integradoId) return false;
    if (!validar()) return false;
    const payload = { ...cfg, lote_id: loteId, integrado_id: integradoId };
    const { error } = await supabase.from('config_estimulo_postura').upsert(payload, { onConflict: 'lote_id' });
    if (error) { toast.error(error.message); return false; }
    toast.success('Configuração salva');
    return true;
  };

  const aplicar = async () => {
    if (!validar()) return;
    setApplying(true);
    const ok = await salvar();
    if (!ok) { setApplying(false); return; }
    const { error } = await supabase.rpc('aplicar_estimulo_postura', { p_lote_id: loteId });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Estímulo aplicado e programa vinculado ao lote');
    onApplied?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Estímulo de Postura
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Idade mínima (semanas)</Label>
                <Input type="number" value={cfg.idade_min_semanas}
                  onChange={(e) => setCfg({ ...cfg, idade_min_semanas: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Peso mínimo (kg)</Label>
                <Input type="number" step="0.01" value={cfg.peso_min_kg}
                  onChange={(e) => setCfg({ ...cfg, peso_min_kg: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Horas início</Label>
                <Input type="number" step="0.5" value={cfg.horas_inicio}
                  onChange={(e) => setCfg({ ...cfg, horas_inicio: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Horas alvo</Label>
                <Input type="number" step="0.5" value={cfg.horas_alvo}
                  onChange={(e) => setCfg({ ...cfg, horas_alvo: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Ganho semanal (min)</Label>
                <Input type="number" value={cfg.ganho_semanal_min}
                  onChange={(e) => setCfg({ ...cfg, ganho_semanal_min: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Intensidade (%)</Label>
                <Input type="number" value={cfg.intensidade_pct}
                  onChange={(e) => setCfg({ ...cfg, intensidade_pct: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Aplicar automaticamente</Label>
                <p className="text-xs text-muted-foreground">Ao atingir idade + peso mínimos</p>
              </div>
              <Switch checked={cfg.auto_aplicar}
                onCheckedChange={(v) => setCfg({ ...cfg, auto_aplicar: v })} />
            </div>
            {cfg.aplicado_em && (
              <p className="text-xs text-muted-foreground">
                Aplicado em {new Date(cfg.aplicado_em).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={salvar} disabled={loading || applying}>Salvar</Button>
          <Button onClick={aplicar} disabled={loading || applying}>
            {applying && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Aplicar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
