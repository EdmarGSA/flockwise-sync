import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Thermometer, Droplets, Wifi, WifiOff, Power, Loader2, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useDeviceControl } from '@/hooks/useDeviceControl';

interface Props {
  galpaoId: string;
  idadeDias?: number;
}

interface DispositivoComLeitura {
  id: string;
  nome: string;
  device_id_ewelink: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  online: boolean;
  created_at: string | null;
  switchState: string | null;
  autoControlEnabled: boolean;
  automacao_ativa: boolean;
  funcao_automacao: string;
}

interface RegraTemperatura {
  temp_min_c: number;
  temp_max_c: number;
  umidade_min_pct: number | null;
  umidade_max_pct: number | null;
}

export function TemperaturaUmidadeCard({ galpaoId, idadeDias }: Props) {
  const [dispositivos, setDispositivos] = useState<DispositivoComLeitura[]>([]);
  const [loading, setLoading] = useState(true);
  const [regraAtual, setRegraAtual] = useState<RegraTemperatura | null>(null);
  const { integradoId } = useIntegradoId();

  const { toggleDevice, isControlling, fetchDeviceStatus } = useDeviceControl({
    integradoId,
    onSuccess: () => fetchData(),
  });

  useEffect(() => {
    fetchData();
  }, [galpaoId]);

  useEffect(() => {
    if (integradoId && idadeDias) {
      fetchRegra();
    }
  }, [integradoId, idadeDias]);

  const fetchRegra = async () => {
    if (!integradoId || !idadeDias) return;
    const { data } = await supabase
      .from('regras_temperatura_lote')
      .select('temp_min_c, temp_max_c, umidade_min_pct, umidade_max_pct')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .lte('dia_inicio', idadeDias)
      .gte('dia_fim', idadeDias)
      .limit(1)
      .maybeSingle();
    if (data) setRegraAtual(data as RegraTemperatura);
  };

  const fetchData = async () => {
    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id, nome, device_id_ewelink, automacao_ativa, funcao_automacao')
      .eq('galpao_id', galpaoId)
      .eq('ativo', true);

    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    const results = await Promise.all(
      devices.map(async (device: any) => {
        const [readingResult, statusResult] = await Promise.all([
          supabase
            .from('leituras_sensores')
            .select('temperatura_c, umidade_pct, online, created_at')
            .eq('dispositivo_id', device.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          integradoId ? fetchDeviceStatus(device.device_id_ewelink) : Promise.resolve(null),
        ]);

        const reading = readingResult.data;

        return {
          id: device.id,
          nome: device.nome,
          device_id_ewelink: device.device_id_ewelink,
          temperatura_c: reading?.temperatura_c ?? null,
          umidade_pct: reading?.umidade_pct ?? null,
          online: reading?.online ?? false,
          created_at: reading?.created_at ?? null,
          switchState: statusResult?.switch ?? null,
          autoControlEnabled: statusResult?.autoControlEnabled === 1,
          automacao_ativa: device.automacao_ativa ?? false,
          funcao_automacao: device.funcao_automacao ?? 'nenhuma',
        };
      })
    );

    setDispositivos(results);
    setLoading(false);
  };

  if (loading || dispositivos.length === 0) return null;

  const hasAutomacao = dispositivos.some(d => d.automacao_ativa && d.funcao_automacao !== 'nenhuma');

  const getTempColor = (temp: number | null) => {
    if (temp === null) return 'text-muted-foreground';
    if (regraAtual) {
      if (temp >= Number(regraAtual.temp_min_c) && temp <= Number(regraAtual.temp_max_c)) return 'text-emerald-600';
      const margin = 2;
      if (temp >= Number(regraAtual.temp_min_c) - margin && temp <= Number(regraAtual.temp_max_c) + margin) return 'text-amber-500';
      return 'text-destructive';
    }
    if (temp >= 20 && temp <= 28) return 'text-emerald-600';
    if (temp >= 15 && temp <= 35) return 'text-amber-500';
    return 'text-destructive';
  };

  const getHumColor = (hum: number | null) => {
    if (hum === null) return 'text-muted-foreground';
    if (hum >= 50 && hum <= 70) return 'text-emerald-600';
    if (hum >= 40 && hum <= 80) return 'text-amber-500';
    return 'text-destructive';
  };

  return (
    <>
      {/* Ideal range indicator */}
      {regraAtual && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1">
            <Thermometer className="w-3 h-3" />
            Faixa ideal: {Number(regraAtual.temp_min_c)}–{Number(regraAtual.temp_max_c)}°C
          </Badge>
          {hasAutomacao && (
            <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/30" variant="outline">
              <Zap className="w-3 h-3" />
              Automação ativa
            </Badge>
          )}
        </div>
      )}

      {dispositivos.map((d) => (
        <Card key={d.id} className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Thermometer className="w-4 h-4" />
                <span>{d.nome}</span>
                {d.automacao_ativa && d.funcao_automacao !== 'nenhuma' && (
                  <Badge variant="outline" className="text-xs text-primary border-primary/30 gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    {d.funcao_automacao === 'aquecimento' ? 'Aquec.' : 'Vent.'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {d.switchState !== null && (
                  <div className="flex items-center gap-1.5">
                    {d.autoControlEnabled && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 mr-1">Auto</Badge>
                    )}
                    {isControlling(d.device_id_ewelink) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Power className={`w-3.5 h-3.5 ${d.switchState === 'on' ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <Switch
                      checked={d.switchState === 'on'}
                      disabled={isControlling(d.device_id_ewelink) || !d.online}
                      onCheckedChange={() =>
                        toggleDevice(d.device_id_ewelink, d.switchState)
                      }
                    />
                  </div>
                )}
                {d.online ? (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 gap-1 text-xs">
                    <Wifi className="w-3 h-3" /> Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive/30 gap-1 text-xs">
                    <WifiOff className="w-3 h-3" /> Offline
                  </Badge>
                )}
              </div>
            </div>

            {d.created_at ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Thermometer className={`w-5 h-5 ${getTempColor(d.temperatura_c)}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Temperatura</p>
                      <p className={`text-lg font-bold ${getTempColor(d.temperatura_c)}`}>
                        {d.temperatura_c !== null ? `${d.temperatura_c.toFixed(1)}°C` : '--'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className={`w-5 h-5 ${getHumColor(d.umidade_pct)}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Umidade</p>
                      <p className={`text-lg font-bold ${getHumColor(d.umidade_pct)}`}>
                        {d.umidade_pct !== null ? `${d.umidade_pct.toFixed(0)}%` : '--'}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Atualizado {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma leitura registrada ainda.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
