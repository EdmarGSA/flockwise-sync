import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, WifiOff, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Eventos exibidos neste painel — focados em saúde IoT
const EVENTOS = [
  {
    codigo: 'iot_offline',
    nome: 'Dispositivo IoT offline',
    descricao: 'Notificar quando um sensor/dispositivo parar de enviar leituras.',
    icon: WifiOff,
    severidade: 'warning' as const,
  },
  {
    codigo: 'iot_falha_comando',
    nome: 'Falha de comando',
    descricao: 'Notificar quando um relé/equipamento não responder ao comando enviado.',
    icon: XCircle,
    severidade: 'critical' as const,
  },
];

type Pref = {
  tipo_evento_codigo: string;
  push_ativo: boolean;
};

export function AlertasNotificacaoDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('preferencias_notificacao')
        .select('tipo_evento_codigo, push_ativo')
        .eq('user_id', user.id)
        .in(
          'tipo_evento_codigo',
          EVENTOS.map((e) => e.codigo),
        );
      if (cancelled) return;
      if (error) {
        toast.error('Não foi possível carregar suas preferências');
        setLoading(false);
        return;
      }
      const map: Record<string, boolean> = {};
      EVENTOS.forEach((e) => {
        const found = (data as Pref[] | null)?.find((p) => p.tipo_evento_codigo === e.codigo);
        // Default: ativado (papel padrão recebe). Override só se explicitamente false.
        map[e.codigo] = found ? found.push_ativo : true;
      });
      setPrefs(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const rows = EVENTOS.map((e) => ({
      user_id: user.id,
      tipo_evento_codigo: e.codigo,
      push_ativo: prefs[e.codigo] ?? true,
    }));

    const { error } = await supabase
      .from('preferencias_notificacao')
      .upsert(rows, { onConflict: 'user_id,tipo_evento_codigo' });

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar preferências');
      return;
    }
    toast.success('Preferências de alerta atualizadas');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Alertas do painel Saúde
          </DialogTitle>
          <DialogDescription>
            Escolha quais eventos críticos devem aparecer como notificação push no sistema.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {EVENTOS.map((e) => {
              const Icon = e.icon;
              const ativo = prefs[e.codigo] ?? true;
              return (
                <div
                  key={e.codigo}
                  className="flex items-start justify-between gap-3 border rounded-md p-3 bg-muted/20"
                >
                  <div className="flex gap-3 min-w-0">
                    <div
                      className={`mt-0.5 rounded-md p-2 ${
                        e.severidade === 'critical'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`pref-${e.codigo}`} className="text-sm font-medium">
                          {e.nome}
                        </Label>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            e.severidade === 'critical'
                              ? 'border-destructive/40 text-destructive'
                              : 'border-amber-500/40 text-amber-600'
                          }`}
                        >
                          {e.severidade === 'critical' ? 'crítico' : 'aviso'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{e.descricao}</p>
                    </div>
                  </div>
                  <Switch
                    id={`pref-${e.codigo}`}
                    checked={ativo}
                    onCheckedChange={(v) =>
                      setPrefs((prev) => ({ ...prev, [e.codigo]: v }))
                    }
                  />
                </div>
              );
            })}

            <p className="text-[11px] text-muted-foreground pt-1">
              Por padrão, administradores e integrados recebem todos os alertas. Desative aqui
              para parar de receber notificações deste tipo.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            Salvar preferências
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
