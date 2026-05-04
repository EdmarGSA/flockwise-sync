import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Thermometer, Droplets, Wifi, WifiOff, Power, Loader2, Zap, Lightbulb, Sun, Moon, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useDeviceControl } from '@/hooks/useDeviceControl';

interface Props {
  galpaoId: string;
  idadeDias?: number;
  loteId?: string;
  programaIluminacaoId?: string | null;
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
  ultimo_sync: string | null;
  intensidade_atual: number | null;
  suporta_dimer: boolean;
}

interface RegraTemperatura {
  temp_min_c: number;
  temp_max_c: number;
  umidade_min_pct: number | null;
  umidade_max_pct: number | null;
}

interface FaixaIluminacao {
  horas_luz: number;
  intensidade_pct: number;
  blocos: any;
}

export function TemperaturaUmidadeCard({ galpaoId, idadeDias, programaIluminacaoId }: Props) {
  const [dispositivos, setDispositivos] = useState<DispositivoComLeitura[]>([]);
  const [loading, setLoading] = useState(true);
  const [regraAtual, setRegraAtual] = useState<RegraTemperatura | null>(null);
  const [faixaIluminacao, setFaixaIluminacao] = useState<FaixaIluminacao | null>(null);
  const { integradoId } = useIntegradoId();

  const { toggleDevice, isControlling, fetchDeviceStatus } = useDeviceControl({
    integradoId,
    onSuccess: () => fetchData(),
  });

  useEffect(() => {
    fetchData();
  }, [galpaoId]);

  useEffect(() => {
    if (integradoId && idadeDias) fetchRegra();
  }, [integradoId, idadeDias]);

  useEffect(() => {
    if (programaIluminacaoId && idadeDias) fetchFaixaIluminacao();
    else setFaixaIluminacao(null);
  }, [programaIluminacaoId, idadeDias]);

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

  const fetchFaixaIluminacao = async () => {
    if (!programaIluminacaoId || !idadeDias) return;
    const { data } = await supabase
      .from('programa_iluminacao_faixa')
      .select('horas_luz, intensidade_pct, blocos')
      .eq('programa_id', programaIluminacaoId)
      .lte('dia_inicio', idadeDias)
      .gte('dia_fim', idadeDias)
      .limit(1)
      .maybeSingle();
    if (data) setFaixaIluminacao(data as FaixaIluminacao);
  };

  const fetchData = async () => {
    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id, nome, device_id_ewelink, automacao_ativa, funcao_automacao, ultimo_sync')
      .eq('galpao_id', galpaoId)
      .eq('ativo', true);

    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    // Buscar canais (intensidade/dimer) em batch
    const devIds = devices.map((d: any) => d.id);
    const { data: canais } = await supabase
      .from('canais_dispositivo')
      .select('dispositivo_id, intensidade_atual, suporta_dimer, funcao_automacao, tipo_equipamento')
      .in('dispositivo_id', devIds);
    const canaisMap = new Map<string, { intensidade: number | null; dimer: boolean; isIluminacao: boolean }>();
    (canais ?? []).forEach((c: any) => {
      const canalIlum = c.funcao_automacao === 'iluminacao' || c.tipo_equipamento === 'iluminacao';
      const cur = canaisMap.get(c.dispositivo_id);
      if (!cur) {
        canaisMap.set(c.dispositivo_id, {
          intensidade: c.intensidade_atual,
          dimer: !!c.suporta_dimer,
          isIluminacao: canalIlum,
        });
      } else if (canalIlum && !cur.isIluminacao) {
        canaisMap.set(c.dispositivo_id, { ...cur, isIluminacao: true });
      }
    });

    const results = await Promise.all(
      devices.map(async (device: any) => {
        const canal = canaisMap.get(device.id);
        const isIluminacao = device.funcao_automacao === 'iluminacao' || !!canal?.isIluminacao;
        const [readingResult, statusResult] = await Promise.all([
          isIluminacao
            ? Promise.resolve({ data: null })
            : supabase
                .from('leituras_sensores')
                .select('temperatura_c, umidade_pct, online, created_at')
                .eq('dispositivo_id', device.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
          integradoId ? fetchDeviceStatus(device.device_id_ewelink) : Promise.resolve(null),
        ]);
        const reading: any = readingResult?.data;

        return {
          id: device.id,
          nome: device.nome,
          device_id_ewelink: device.device_id_ewelink,
          temperatura_c: reading?.temperatura_c ?? null,
          umidade_pct: reading?.umidade_pct ?? null,
          online: reading?.online ?? !!device.ultimo_sync,
          created_at: reading?.created_at ?? null,
          switchState: statusResult?.switch ?? null,
          autoControlEnabled: statusResult?.autoControlEnabled === 1,
          automacao_ativa: device.automacao_ativa ?? false,
          funcao_automacao: isIluminacao ? 'iluminacao' : (device.funcao_automacao ?? 'nenhuma'),
          ultimo_sync: device.ultimo_sync ?? null,
          intensidade_atual: canal?.intensidade ?? null,
          suporta_dimer: canal?.dimer ?? false,
        };
      })
    );

    setDispositivos(results);
    setLoading(false);
  };

  if (loading || dispositivos.length === 0) return null;

  const climaticos = dispositivos.filter((d) => d.funcao_automacao !== 'iluminacao');
  const iluminacao = dispositivos.filter((d) => d.funcao_automacao === 'iluminacao');
  const hasAutomacao = climaticos.some((d) => d.automacao_ativa && d.funcao_automacao !== 'nenhuma');

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
      {regraAtual && climaticos.length > 0 && (
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

      {climaticos.map((d) => (
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
                      onCheckedChange={() => toggleDevice(d.device_id_ewelink, d.switchState)}
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

      {iluminacao.map((d) => (
        <IluminacaoMiniCard
          key={d.id}
          dispositivo={d}
          faixa={faixaIluminacao}
          isControlling={isControlling(d.device_id_ewelink)}
          onToggle={() => toggleDevice(d.device_id_ewelink, d.switchState)}
        />
      ))}
    </>
  );
}

function IluminacaoMiniCard({
  dispositivo: d,
  faixa,
  isControlling,
  onToggle,
}: {
  dispositivo: DispositivoComLeitura;
  faixa: FaixaIluminacao | null;
  isControlling: boolean;
  onToggle: () => void;
}) {
  const ligado = d.switchState === 'on';
  const blocos: any[] = Array.isArray(faixa?.blocos) ? (faixa!.blocos as any[]) : [];
  const primeiroBloco = blocos[0];

  return (
    <Card className="mb-4 border-amber-200/40 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ligado ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
              <Lightbulb className={`w-4 h-4 ${ligado ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">{d.nome}</p>
              <p className="text-[11px] text-muted-foreground">Iluminação</p>
            </div>
            {d.automacao_ativa && (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30 gap-0.5">
                <Zap className="w-2.5 h-2.5" /> Auto
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {d.switchState !== null && (
              <div className="flex items-center gap-1.5">
                {isControlling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Power className={`w-3.5 h-3.5 ${ligado ? 'text-amber-500' : 'text-muted-foreground'}`} />
                )}
                <Switch
                  checked={ligado}
                  disabled={isControlling || !d.online}
                  onCheckedChange={onToggle}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            {ligado ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="text-[11px] text-muted-foreground">Estado</p>
              <p className="text-sm font-semibold">{ligado ? 'Ligado' : 'Desligado'}</p>
            </div>
          </div>

          {d.suporta_dimer && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center">
                <span className="text-[9px] font-bold text-amber-600">%</span>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Intensidade</p>
                <p className="text-sm font-semibold">
                  {d.intensidade_atual !== null ? `${d.intensidade_atual}%` : '--'}
                </p>
              </div>
            </div>
          )}

          {faixa && (
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-[11px] text-muted-foreground">Programa hoje</p>
                <p className="text-sm font-semibold">{Number(faixa.horas_luz)}h luz</p>
              </div>
            </div>
          )}
        </div>

        {primeiroBloco && (
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <Sun className="w-3 h-3" />
            Acende {primeiroBloco.acender} · Apaga {primeiroBloco.apagar}
            {primeiroBloco.intensidade_pct ? ` · ${primeiroBloco.intensidade_pct}%` : ''}
          </p>
        )}

        {d.ultimo_sync && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Última sincronização {formatDistanceToNow(new Date(d.ultimo_sync), { addSuffix: true, locale: ptBR })}
          </p>
        )}

        {!faixa && d.automacao_ativa && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Sem programa de iluminação vinculado para a idade atual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
