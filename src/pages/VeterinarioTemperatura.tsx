import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  ChevronDown,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  YAxis,
  XAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RcTooltip,
} from 'recharts';
import { useTemperaturaLote, type LeituraPonto } from '@/hooks/useTemperaturaLote';
import { STATUS_BADGE } from '@/lib/clima/sugestaoTemperatura';
import { cn } from '@/lib/utils';

function MiniSparkline({ data }: { data: LeituraPonto[] }) {
  if (!data || data.length < 2) {
    return <div className="text-[10px] text-muted-foreground italic h-12 flex items-center">Sem histórico 24h</div>;
  }
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis yAxisId="t" hide domain={['dataMin - 1', 'dataMax + 1']} />
          <RcTooltip
            contentStyle={{ fontSize: 10, padding: '4px 6px' }}
            labelFormatter={(_, p) =>
              p?.[0]?.payload?.ts
                ? new Date(p[0].payload.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : ''
            }
            formatter={(v: any) => [`${Number(v).toFixed(1)}°C`, 'Temp']}
          />
          <Line
            yAxisId="t"
            type="monotone"
            dataKey="t"
            stroke="hsl(var(--destructive))"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficoExtendido({
  data,
  setpoint,
}: {
  data: LeituraPonto[];
  setpoint: { temp_alvo_c: number; temp_min_alarme_c: number; temp_max_alarme_c: number } | null;
}) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>;
  }
  const formatted = data.map(d => ({
    ts: d.ts,
    label: new Date(d.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    t: d.t,
    u: d.u,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={40} />
          <YAxis yAxisId="t" tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} width={32} />
          <YAxis yAxisId="u" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} width={28} />
          <RcTooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(v: any, name: string) =>
              name === 't' ? [`${Number(v).toFixed(1)}°C`, 'Temp'] : [`${Number(v).toFixed(0)}%`, 'UR']
            }
          />
          {setpoint && (
            <>
              <ReferenceLine yAxisId="t" y={setpoint.temp_max_alarme_c} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              <ReferenceLine yAxisId="t" y={setpoint.temp_min_alarme_c} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              <ReferenceLine yAxisId="t" y={setpoint.temp_alvo_c} stroke="hsl(var(--primary))" strokeDasharray="2 6" />
            </>
          )}
          <Line yAxisId="t" type="monotone" dataKey="t" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line yAxisId="u" type="monotone" dataKey="u" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SensorCard({
  sensor,
  serie24h,
  setpoint,
  fetchHistorico,
}: {
  sensor: any;
  serie24h: LeituraPonto[];
  setpoint: any;
  fetchHistorico: (id: string, dias: number) => Promise<LeituraPonto[]>;
}) {
  const [periodo, setPeriodo] = useState<1 | 7 | 14>(1);
  const [serie, setSerie] = useState<LeituraPonto[]>(serie24h);
  const [open, setOpen] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (periodo === 1) {
      setSerie(serie24h);
      return;
    }
    setLoadingHist(true);
    fetchHistorico(sensor.id, periodo).then(d => {
      setSerie(d);
      setLoadingHist(false);
    });
  }, [open, periodo, sensor.id, serie24h, fetchHistorico]);

  const ageMin = sensor.ultimoSync
    ? (Date.now() - new Date(sensor.ultimoSync).getTime()) / 60000
    : null;

  return (
    <Card className="bg-card border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-medium text-sm truncate">{sensor.nome}</p>
              {sensor.online ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400 text-[10px] px-1.5 py-0 h-5">
                  <Wifi className="w-3 h-3 mr-1" /> online
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0 h-5">
                  <WifiOff className="w-3 h-3 mr-1" />
                  {ageMin != null ? `${Math.round(ageMin)}min` : 'offline'}
                </Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div>
              <p className="text-muted-foreground">Atual</p>
              <p className="font-semibold text-sm">
                {sensor.ultimaTemp != null ? `${sensor.ultimaTemp.toFixed(1)}°C` : '—'}
                {sensor.ultimaUR != null && (
                  <span className="text-muted-foreground font-normal"> / {sensor.ultimaUR.toFixed(0)}%</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Mín hoje</p>
              <p className="font-semibold text-sm">{sensor.minDiaC != null ? `${sensor.minDiaC.toFixed(1)}°C` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Máx hoje</p>
              <p className="font-semibold text-sm">{sensor.maxDiaC != null ? `${sensor.maxDiaC.toFixed(1)}°C` : '—'}</p>
            </div>
          </div>

          <MiniSparkline data={serie24h} />

          <CollapsibleContent>
            <div className="pt-3 mt-2 border-t border-border space-y-2">
              <div className="flex gap-1">
                {[1, 7, 14].map(p => (
                  <Button
                    key={p}
                    size="sm"
                    variant={periodo === p ? 'default' : 'outline'}
                    onClick={() => setPeriodo(p as 1 | 7 | 14)}
                    className="h-7 text-xs flex-1"
                  >
                    {p === 1 ? '24h' : `${p}d`}
                  </Button>
                ))}
              </div>
              {loadingHist ? (
                <p className="text-xs text-muted-foreground text-center py-8">Carregando…</p>
              ) : (
                <GraficoExtendido data={serie} setpoint={setpoint} />
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

export default function VeterinarioTemperatura() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const {
    loading,
    loteInfo,
    sensores,
    leiturasPorSensor,
    minMaxDia,
    setpointCurva,
    sugestao,
    refetch,
    fetchHistoricoExtendido,
  } = useTemperaturaLote(loteId);

  const statusBadge = STATUS_BADGE[sugestao.status];
  const amplitude = useMemo(
    () => (minMaxDia.min != null && minMaxDia.max != null ? minMaxDia.max - minMaxDia.min : null),
    [minMaxDia]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/veterinario/${loteId}`)} className="-ml-2 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-destructive" />
              Temperatura do Lote
            </h1>
            <p className="text-xs text-muted-foreground">
              {loteInfo?.idadeDias != null ? `${loteInfo.idadeDias} dias` : 'Idade desconhecida'} •{' '}
              {sensores.length} sensor{sensores.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={loading} className="shrink-0">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {loading && !sensores.length ? (
          <p className="text-center text-muted-foreground py-12">Carregando dados…</p>
        ) : !loteInfo?.galpaoId ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Lote sem galpão</AlertTitle>
            <AlertDescription>Este lote não está vinculado a um galpão.</AlertDescription>
          </Alert>
        ) : sensores.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <Thermometer className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="font-medium">Nenhum sensor cadastrado</p>
              <p className="text-sm text-muted-foreground">O galpão deste lote não possui dispositivos IoT.</p>
              <Button onClick={() => navigate('/dispositivos-iot')}>Cadastrar dispositivos</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 1. Cabeçalho de status */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Status atual
                  </CardTitle>
                  <Badge variant="outline" className={statusBadge.className}>
                    {statusBadge.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Média atual</p>
                  <p className="text-2xl font-bold">
                    {minMaxDia.media != null ? `${minMaxDia.media.toFixed(1)}°` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Alvo da curva</p>
                  <p className="text-2xl font-bold text-primary">
                    {setpointCurva ? `${setpointCurva.temp_alvo_c.toFixed(1)}°` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Faixa alarme</p>
                  <p className="text-sm font-semibold pt-1">
                    {setpointCurva
                      ? `${setpointCurva.temp_min_alarme_c.toFixed(1)} – ${setpointCurva.temp_max_alarme_c.toFixed(1)}°`
                      : 'sem curva'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Mín / Máx do dia */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mín/Máx de hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Mín</p>
                    <p className="text-lg font-bold">{minMaxDia.min != null ? `${minMaxDia.min.toFixed(1)}°` : '—'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Máx</p>
                    <p className="text-lg font-bold">{minMaxDia.max != null ? `${minMaxDia.max.toFixed(1)}°` : '—'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Média</p>
                    <p className="text-lg font-bold">{minMaxDia.media != null ? `${minMaxDia.media.toFixed(1)}°` : '—'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Ampl.</p>
                    <p className={cn('text-lg font-bold', amplitude != null && amplitude > 4 && 'text-amber-600 dark:text-amber-400')}>
                      {amplitude != null ? `${amplitude.toFixed(1)}°` : '—'}
                    </p>
                  </div>
                </div>
                {amplitude != null && amplitude > 4 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Oscilação alta hoje
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  Baseado em {minMaxDia.count} leituras desde a meia-noite (SP).
                </p>
              </CardContent>
            </Card>

            {/* 3. Sugestão automática */}
            <Alert
              className={cn(
                'border-l-4',
                sugestao.status === 'CRITICO' && 'border-l-destructive bg-destructive/5',
                sugestao.status === 'ATENCAO' && 'border-l-amber-500 bg-amber-500/5',
                sugestao.status === 'OK' && 'border-l-green-500 bg-green-500/5',
                sugestao.status === 'SEM_DADOS' && 'border-l-muted-foreground bg-muted/20'
              )}
            >
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>{sugestao.titulo}</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{sugestao.mensagem}</p>
                {sugestao.acoes.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-sm">
                    {sugestao.acoes.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>

            {/* 4. Histórico por dispositivo */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 px-1">
                <Droplets className="w-3.5 h-3.5" /> Histórico por sensor
              </h2>
              {sensores.map(s => (
                <SensorCard
                  key={s.id}
                  sensor={s}
                  serie24h={leiturasPorSensor[s.id] ?? []}
                  setpoint={setpointCurva}
                  fetchHistorico={fetchHistoricoExtendido}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
