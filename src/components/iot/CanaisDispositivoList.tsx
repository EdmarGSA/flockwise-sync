import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Power, Loader2, Fan, Droplets, Lightbulb, Flame, Blinds, Bell, HelpCircle } from 'lucide-react';
import { useDeviceControl } from '@/hooks/useDeviceControl';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TipoEquipamento = 'ventilador' | 'nebulizador' | 'iluminacao' | 'aquecimento' | 'cortina' | 'alarme' | 'outro';

interface Canal {
  id: string;
  canal_numero: number;
  nome: string;
  tipo_equipamento: TipoEquipamento;
  estado_atual: string | null;
  ativo: boolean;
  automacao_ativa: boolean;
  ultimo_comando_em: string | null;
}

interface Props {
  dispositivoId: string;
  integradoId: string | null;
  driver: string;
  online: boolean;
}

const ICONS: Record<TipoEquipamento, typeof Fan> = {
  ventilador: Fan,
  nebulizador: Droplets,
  iluminacao: Lightbulb,
  aquecimento: Flame,
  cortina: Blinds,
  alarme: Bell,
  outro: HelpCircle,
};

export function CanaisDispositivoList({ dispositivoId, integradoId, driver, online }: Props) {
  const [canais, setCanais] = useState<Canal[]>([]);
  const [loading, setLoading] = useState(true);

  const { toggleDevice, isControlling } = useDeviceControl({
    integradoId,
    onSuccess: () => fetchCanais(),
  });

  const fetchCanais = async () => {
    const { data } = await supabase
      .from('canais_dispositivo')
      .select('id, canal_numero, nome, tipo_equipamento, estado_atual, ativo, automacao_ativa, ultimo_comando_em')
      .eq('dispositivo_id', dispositivoId)
      .eq('ativo', true)
      .order('canal_numero');
    setCanais((data || []) as Canal[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCanais();

    // Realtime: refletir mudanças vindas da telemetria do ESP32
    const channel = supabase
      .channel(`canais-dev-${dispositivoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'canais_dispositivo', filter: `dispositivo_id=eq.${dispositivoId}` },
        () => fetchCanais(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispositivoId]);

  if (loading) {
    return (
      <div className="py-3 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (canais.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Nenhum canal configurado. Clique no ícone <span className="font-medium">⚙</span> para gerenciar canais.
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      {canais.map((c) => {
        const Icon = ICONS[c.tipo_equipamento] || HelpCircle;
        const isOn = c.estado_atual === 'on';
        const busy = isControlling('', c.id);
        return (
          <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/20">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">CH{c.canal_numero}</Badge>
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{c.nome}</p>
                {c.ultimo_comando_em && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.ultimo_comando_em), { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {c.automacao_ativa && (
                <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 px-1 py-0">Auto</Badge>
              )}
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Power className={`w-3.5 h-3.5 ${isOn ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              <Switch
                checked={isOn}
                disabled={busy || !online}
                onCheckedChange={() =>
                  toggleDevice('', c.estado_atual, { driver: driver as 'ewelink' | 'esp32_http', canalId: c.id })
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
