import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Thermometer, Droplets, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  galpaoId: string;
}

interface DispositivoComLeitura {
  id: string;
  nome: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  online: boolean;
  created_at: string | null;
}

export function TemperaturaUmidadeCard({ galpaoId }: Props) {
  const [dispositivos, setDispositivos] = useState<DispositivoComLeitura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [galpaoId]);

  const fetchData = async () => {
    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id, nome')
      .eq('galpao_id', galpaoId)
      .eq('ativo', true);

    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    const results = await Promise.all(
      devices.map(async (device) => {
        const { data: reading } = await supabase
          .from('leituras_sensores')
          .select('temperatura_c, umidade_pct, online, created_at')
          .eq('dispositivo_id', device.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: device.id,
          nome: device.nome,
          temperatura_c: reading?.temperatura_c ?? null,
          umidade_pct: reading?.umidade_pct ?? null,
          online: reading?.online ?? false,
          created_at: reading?.created_at ?? null,
        };
      })
    );

    setDispositivos(results);
    setLoading(false);
  };

  if (loading || dispositivos.length === 0) return null;

  const getTempColor = (temp: number | null) => {
    if (temp === null) return 'text-muted-foreground';
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
      {dispositivos.map((d) => (
        <Card key={d.id} className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Thermometer className="w-4 h-4" />
                <span>{d.nome}</span>
              </div>
              <div className="flex items-center gap-1.5">
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
