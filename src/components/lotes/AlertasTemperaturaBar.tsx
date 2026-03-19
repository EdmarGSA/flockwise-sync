import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Thermometer, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertaTemperatura {
  id: string;
  tipo: string;
  temperatura_lida: number;
  temp_min_regra: number;
  temp_max_regra: number;
  duracao_minutos: number;
  primeira_leitura_fora: string;
  galpao_id: string;
  lote_id: string;
  notificado: boolean;
  galpao_nome?: string;
}

export function AlertasTemperaturaBar() {
  const [alertas, setAlertas] = useState<AlertaTemperatura[]>([]);
  const { integradoId } = useIntegradoId();

  useEffect(() => {
    if (!integradoId) return;
    fetchAlertas();

    // Realtime subscription
    const channel = supabase
      .channel('alertas-temp')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alertas_temperatura',
        },
        () => fetchAlertas()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [integradoId]);

  const fetchAlertas = async () => {
    if (!integradoId) return;

    const { data } = await supabase
      .from('alertas_temperatura')
      .select('*')
      .eq('integrado_id', integradoId)
      .eq('resolvido', false)
      .order('duracao_minutos', { ascending: false });

    if (!data || data.length === 0) {
      setAlertas([]);
      return;
    }

    // Enrich with galpao names
    const galpaoIds = [...new Set(data.map((a: any) => a.galpao_id))];
    const { data: galpoes } = await supabase
      .from('galpoes')
      .select('id, nome')
      .in('id', galpaoIds);

    const galpaoMap = new Map((galpoes || []).map((g: any) => [g.id, g.nome]));

    setAlertas(
      data.map((a: any) => ({
        ...a,
        galpao_nome: galpaoMap.get(a.galpao_id) || 'Galpão',
      }))
    );
  };

  const handleDismiss = async (id: string) => {
    await supabase
      .from('alertas_temperatura')
      .update({ resolvido: true, resolvido_em: new Date().toISOString() })
      .eq('id', id);
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  if (alertas.length === 0) return null;

  const criticalAlerts = alertas.filter(a => a.duracao_minutos >= 10);
  const warningAlerts = alertas.filter(a => a.duracao_minutos < 10);

  return (
    <div className="space-y-2 mb-4">
      {criticalAlerts.map((alerta) => (
        <Card key={alerta.id} className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    {alerta.galpao_nome}: {alerta.tipo === 'temp_baixa' ? 'Temperatura baixa' : 'Temperatura alta'} — {Number(alerta.temperatura_lida).toFixed(1)}°C
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                      <Clock className="w-3 h-3 mr-0.5" />
                      {alerta.duracao_minutos} min fora da faixa
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Faixa ideal: {Number(alerta.temp_min_regra)}–{Number(alerta.temp_max_regra)}°C
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDismiss(alerta.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {warningAlerts.length > 0 && (
        <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {warningAlerts.length} galpão(ões) com temperatura fora da faixa (monitorando...):
                {' '}
                {warningAlerts.map(a => `${a.galpao_nome} ${Number(a.temperatura_lida).toFixed(1)}°C`).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
