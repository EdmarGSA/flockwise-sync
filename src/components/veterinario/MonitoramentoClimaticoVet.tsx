import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// (Tooltip removido — substituído por Collapsible com detalhamento por sensor)
import { supabase } from '@/integrations/supabase/client';
import {
  Cloud, CloudRain, Thermometer, Droplets, Wind, Sun, AlertTriangle,
  CheckCircle2, WifiOff, RefreshCw, ChevronRight, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useClimaNucleo } from '@/hooks/useClimaNucleo';
import {
  gerarPlanoPrevencao,
  type LeituraGalpao,
  type ContextoConforto,
  type PlanoAcao,
  type SensorGalpao,
} from '@/lib/clima/planoPrevencao';
import { calcularIdadeLote } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip as RcTooltip } from 'recharts';

type SerieSensor = { ts: string; t: number | null; u: number | null };

function SensorSparkline({ data }: { data: SerieSensor[] }) {
  if (!data || data.length < 2) {
    return <div className="text-[10px] text-muted-foreground italic">Sem histórico 24h</div>;
  }
  const formatted = data.map(d => ({
    ts: d.ts,
    label: new Date(d.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    t: d.t,
    u: d.u,
  }));
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis yAxisId="t" hide domain={['dataMin - 1', 'dataMax + 1']} />
          <YAxis yAxisId="u" hide domain={[0, 100]} orientation="right" />
          <RcTooltip
            contentStyle={{ fontSize: 10, padding: '4px 6px' }}
            labelFormatter={(_, p) => (p?.[0]?.payload?.label ?? '')}
            formatter={(v: any, name: string) =>
              name === 't' ? [`${Number(v).toFixed(1)}°C`, 'Temp'] : [`${Number(v).toFixed(0)}%`, 'UR']
            }
          />
          <Line yAxisId="t" type="monotone" dataKey="t" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line yAxisId="u" type="monotone" dataKey="u" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface NucleoData {
  id: string;
  nome: string;
  tipo_producao: string;
  galpoes: Array<{
    id: string;
    nome: string;
    inercia_termica_min: number | null;
    ventilador_quantidade: number | null;
    lote: { id: string; data_alojamento: string | null; quantidade_aves: number } | null;
  }>;
}

const sevColor: Record<PlanoAcao['prioridade'], string> = {
  critica: 'bg-destructive text-destructive-foreground',
  alta: 'bg-orange-500 text-white',
  media: 'bg-amber-500 text-white',
  baixa: 'bg-muted text-muted-foreground',
};

function NucleoClimaCardVet({ nucleo, integradoId }: { nucleo: NucleoData; integradoId: string }) {
  const navigate = useNavigate();
  const { observacao, forecast, alertas, loading, refetch } = useClimaNucleo(nucleo.id);
  const [leituras, setLeituras] = useState<LeituraGalpao[]>([]);
  const [series, setSeries] = useState<Record<string, SerieSensor[]>>({});
  const [conforto, setConforto] = useState<ContextoConforto | null>(null);
  const [override, setOverride] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // idade média do lote ativo principal (primeiro com data_alojamento)
  const loteRef = nucleo.galpoes.find(g => g.lote?.data_alojamento)?.lote ?? null;
  const idadeDias = loteRef?.data_alojamento ? calcularIdadeLote(loteRef.data_alojamento) : null;

  // Buscar conforto + override + leituras
  useEffect(() => {
    let cancel = false;
    (async () => {
      // override
      const { data: ov } = await supabase
        .from('nucleo_alertas_config')
        .select('*')
        .eq('integrado_id', integradoId)
        .or(`nucleo_id.eq.${nucleo.id},nucleo_id.is.null`);
      const overr = ov?.find(c => c.nucleo_id === nucleo.id) ?? ov?.find(c => c.nucleo_id == null) ?? null;
      if (!cancel) setOverride(overr);

      // Regras configuráveis para sensores suspeitos
      const habilitarSusp = (overr as any)?.habilitar_sensor_suspeito ?? true;
      const urBaixa = (overr as any)?.ur_suspeita_baixa_pct ?? 0;
      const urAlta = (overr as any)?.ur_suspeita_alta_pct ?? 100;
      const urDivPp = (overr as any)?.ur_divergencia_pp ?? 20;
      const estagnadoMin = (overr as any)?.sensor_estagnado_min ?? 60;

      // conforto por idade
      if (idadeDias != null) {
        const { data: cf } = await supabase
          .from('conforto_termico_ave')
          .select('*')
          .eq('tipo_producao', nucleo.tipo_producao)
          .lte('idade_dia_inicio', idadeDias)
          .gte('idade_dia_fim', idadeDias)
          .maybeSingle();
        if (!cancel && cf) {
          setConforto({
            temp_min_ok: overr?.temp_min_critico ?? cf.temp_min_ok,
            temp_max_ok: cf.temp_max_ok,
            temp_min_critico: overr?.temp_min_critico ?? cf.temp_min_critico,
            temp_max_critico: overr?.temp_max_critico ?? cf.temp_max_critico,
            ith_max_ok: cf.ith_max_ok,
            ith_max_critico: overr?.ith_max_critico ?? cf.ith_max_critico,
            ur_max_ok: cf.ur_max_ok,
          });
        }
      }

      // leituras IoT por galpão
      const galpaoIds = nucleo.galpoes.map(g => g.id);
      if (galpaoIds.length === 0) return;
      const { data: devices } = await supabase
        .from('dispositivos_iot')
        .select('id, nome, galpao_id')
        .in('galpao_id', galpaoIds)
        .eq('ativo', true);
      const devIds = (devices ?? []).map(d => d.id);
      const devInfo = new Map((devices ?? []).map(d => [d.id, { galpao_id: d.galpao_id, nome: d.nome }]));

      const sensoresPorGalpao = new Map<string, SensorGalpao[]>();
      if (devIds.length) {
        const { data: leits } = await supabase
          .from('leituras_sensores')
          .select('dispositivo_id, temperatura_c, umidade_pct, lido_em')
          .in('dispositivo_id', devIds)
          .order('lido_em', { ascending: false })
          .limit(devIds.length * 10);
        const ultimoPorDev = new Map<string, { temp: number | null; ur: number | null; ts: string }>();
        (leits ?? []).forEach(l => {
          if (ultimoPorDev.has(l.dispositivo_id)) return;
          ultimoPorDev.set(l.dispositivo_id, {
            temp: l.temperatura_c, ur: l.umidade_pct, ts: l.lido_em,
          });
        });
        devIds.forEach(devId => {
          const info = devInfo.get(devId);
          if (!info?.galpao_id) return;
          const r = ultimoPorDev.get(devId);
          const sensor: SensorGalpao = {
            dispositivo_id: devId,
            nome: info.nome,
            temperatura_c: r?.temp ?? null,
            umidade_pct: r?.ur ?? null,
            ultima_leitura: r?.ts ?? null,
          };
          if (!sensoresPorGalpao.has(info.galpao_id)) sensoresPorGalpao.set(info.galpao_id, []);
          sensoresPorGalpao.get(info.galpao_id)!.push(sensor);
        });
      }

      const ls: LeituraGalpao[] = nucleo.galpoes.map(g => {
        const sensores = sensoresPorGalpao.get(g.id) ?? [];
        const tempsValidas = sensores
          .map(s => s.temperatura_c)
          .filter((v): v is number => v != null);
        const temp_max = tempsValidas.length ? Math.max(...tempsValidas) : null;
        const temp_min = tempsValidas.length ? Math.min(...tempsValidas) : null;
        const temp_media = tempsValidas.length
          ? tempsValidas.reduce((a, b) => a + b, 0) / tempsValidas.length
          : null;
        const divergencia = temp_max != null && temp_min != null ? temp_max - temp_min : null;

        // UR: marcar suspeitos por regras configuráveis
        const ursValidas = sensores
          .map(s => s.umidade_pct)
          .filter((v): v is number => v != null);
        let urMedia: number | null = null;
        if (ursValidas.length) {
          const naoExtremas = ursValidas.filter(v => v > urBaixa && v < urAlta);
          const referencia = naoExtremas.length ? naoExtremas : ursValidas;
          const med = referencia.reduce((a, b) => a + b, 0) / referencia.length;
          if (habilitarSusp) {
            sensores.forEach(s => {
              if (s.umidade_pct == null) return;
              const urTravada = s.umidade_pct <= urBaixa || s.umidade_pct >= urAlta;
              if (urTravada && Math.abs(s.umidade_pct - med) >= urDivPp && naoExtremas.length > 0) {
                s.suspeito = true;
                s.motivo_suspeita = `UR travada em ${s.umidade_pct}%`;
              }
              // estagnado
              if (s.ultima_leitura) {
                const ageMin = (Date.now() - new Date(s.ultima_leitura).getTime()) / 60_000;
                if (ageMin > estagnadoMin && !s.suspeito) {
                  s.suspeito = true;
                  s.motivo_suspeita = `Sem variação há ${Math.round(ageMin)}min`;
                }
              }
            });
          }
          urMedia = med;
        }
        const ts = sensores
          .map(s => s.ultima_leitura)
          .filter((v): v is string => !!v)
          .sort()
          .reverse()[0] ?? null;

        const sensores_suspeitos = sensores.filter(s => s.suspeito).length;

        return {
          galpao_id: g.id,
          galpao_nome: g.nome,
          temperatura_c: temp_max,
          temperatura_min_c: temp_min,
          temperatura_media_c: temp_media,
          divergencia_c: divergencia,
          umidade_pct: urMedia,
          ultima_leitura: ts,
          inercia_min: g.inercia_termica_min ?? 60,
          ventilador_qtd: g.ventilador_quantidade ?? 0,
          sensores,
          sensores_suspeitos,
        };
      });
      if (!cancel) setLeituras(ls);
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nucleo.id, integradoId, idadeDias]);

  const plano = useMemo(() => gerarPlanoPrevencao({
    idadeDias,
    conforto,
    leituras,
    forecast: forecast as any,
    observacao,
    regrasSensores: {
      habilitar_sensor_suspeito: (override as any)?.habilitar_sensor_suspeito ?? true,
      sensor_offline_min: (override as any)?.sensor_offline_min ?? 15,
      divergencia_temp_c: Number((override as any)?.divergencia_temp_c ?? 5),
    },
  }), [idadeDias, conforto, leituras, forecast, observacao, override]);

  // severidade global
  const severidade = useMemo<'OK' | 'ATENÇÃO' | 'ALTO'>(() => {
    if (plano.some(p => p.prioridade === 'critica')) return 'ALTO';
    if (alertas.some((a: any) => a.severidade === 'critical')) return 'ALTO';
    if (plano.some(p => p.prioridade === 'alta')) return 'ATENÇÃO';
    if (plano.length) return 'ATENÇÃO';
    return 'OK';
  }, [plano, alertas]);

  const sevBadge = severidade === 'OK'
    ? 'bg-green-500/10 text-green-700 border-green-500/30'
    : severidade === 'ATENÇÃO'
    ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
    : 'bg-destructive/10 text-destructive border-destructive/30';

  const handleSync = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('weather-sync', { body: { nucleo_id: nucleo.id } });
      if (error) throw error;
      await refetch();
      toast.success('Clima sincronizado');
    } catch (e: any) {
      toast.error('Falha ao sincronizar', { description: e.message });
    } finally {
      setRefreshing(false);
    }
  };

  const handleReconhecer = async () => {
    if (!alertas.length) return;
    const { error } = await supabase
      .from('alertas_climaticos')
      .update({ reconhecido_em: new Date().toISOString() })
      .eq('nucleo_id', nucleo.id)
      .is('reconhecido_em', null);
    if (error) toast.error('Erro ao reconhecer'); else { toast.success('Alertas reconhecidos'); refetch(); }
  };

  const tempMinFc = forecast.length ? Math.min(...forecast.map((f: any) => f.temperatura_c).filter((v: any) => v != null)) : null;
  const tempMaxFc = forecast.length ? Math.max(...forecast.map((f: any) => f.temperatura_c).filter((v: any) => v != null)) : null;
  const probChuvaMax = forecast.length ? Math.max(...forecast.map((f: any) => f.prob_chuva_pct ?? 0)) : 0;
  const ventoMaxFc = forecast.length ? Math.max(...forecast.map((f: any) => f.vento_kmh ?? 0)) : 0;

  const offlineMinCfg = (override as any)?.sensor_offline_min ?? 15;
  const divergMinCfg = Number((override as any)?.divergencia_temp_c ?? 5);

  const galpaoStatus = (l: LeituraGalpao) => {
    if (!l.ultima_leitura) return { icon: <WifiOff className="w-4 h-4 text-muted-foreground" />, txt: 'Sem sensor' };
    const age = (Date.now() - new Date(l.ultima_leitura).getTime()) / 60_000;
    if (age > offlineMinCfg) return { icon: <WifiOff className="w-4 h-4 text-destructive" />, txt: `Offline ${Math.round(age)}min` };
    if (!conforto || l.temperatura_c == null) return { icon: <Activity className="w-4 h-4 text-muted-foreground" />, txt: '—' };
    if (l.temperatura_c >= conforto.temp_max_critico || l.temperatura_c <= conforto.temp_min_critico)
      return { icon: <AlertTriangle className="w-4 h-4 text-destructive" />, txt: 'Crítico' };
    if (l.temperatura_c > conforto.temp_max_ok || l.temperatura_c < conforto.temp_min_ok)
      return { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, txt: 'Atenção' };
    return { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, txt: 'Conforto' };
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{nucleo.nome}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nucleo.galpoes.length} galpão(ões){idadeDias != null ? ` • lote ${idadeDias}d` : ''}
            </p>
          </div>
          <Badge variant="outline" className={sevBadge}>{severidade}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Externo */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{observacao?.condicao_texto || 'Externo'}</span>
            </div>
            <span className="text-muted-foreground text-xs">
              {observacao ? new Date(observacao.observado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {observacao?.temperatura_c?.toFixed(1) ?? '—'}°C</div>
            <div className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {observacao?.umidade_pct ?? '—'}%</div>
            <div className="flex items-center gap-1"><Wind className="w-3 h-3" /> {observacao?.vento_kmh ?? '—'} km/h</div>
            <div className="flex items-center gap-1"><CloudRain className="w-3 h-3" /> {observacao?.precipitacao_mm ?? 0} mm</div>
          </div>
          {forecast.length > 0 && (
            <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              24h: {tempMinFc?.toFixed(0)}–{tempMaxFc?.toFixed(0)}°C • chuva {probChuvaMax}% • vento até {ventoMaxFc.toFixed(0)} km/h
            </div>
          )}
        </div>

        {/* Galpões IoT */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Temperatura interna (IoT)
          </div>
          <div className="space-y-1.5">
            {leituras.map(l => {
              const st = galpaoStatus(l);
              const sensores = l.sensores ?? [];
              const hasMulti = sensores.length > 1;
              const divergAlta = (l.divergencia_c ?? 0) >= divergMinCfg;
              const resumo = l.temperatura_min_c != null && l.temperatura_c != null && hasMulti
                ? `${l.temperatura_min_c.toFixed(1)}–${l.temperatura_c.toFixed(1)}°C`
                : (l.temperatura_c != null ? `${l.temperatura_c.toFixed(1)}°C` : '—');
              return (
                <Collapsible key={l.galpao_id} className="rounded-md border bg-card">
                  <CollapsibleTrigger className="w-full flex items-center justify-between text-sm px-2 py-1.5 hover:bg-muted/40">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ChevronDown className="w-3 h-3 shrink-0 transition-transform data-[state=open]:rotate-0 -rotate-90" />
                      <span className="truncate">{l.galpao_nome}</span>
                      {hasMulti && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {sensores.length} sensores
                        </Badge>
                      )}
                      {divergAlta && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/40 text-amber-700 bg-amber-500/10">
                          Δ{l.divergencia_c!.toFixed(1)}°C
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs">
                        {resumo}
                        {l.umidade_pct != null && (
                          <span className="text-muted-foreground"> / {l.umidade_pct.toFixed(0)}%</span>
                        )}
                      </span>
                      {st.icon}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-2 py-1.5 space-y-1 bg-muted/20">
                      {sensores.length === 0 && (
                        <p className="text-[11px] text-muted-foreground italic">Sem sensor cadastrado.</p>
                      )}
                      {sensores.map(s => {
                        const ageMin = s.ultima_leitura
                          ? (Date.now() - new Date(s.ultima_leitura).getTime()) / 60_000
                          : Infinity;
                        const offline = !isFinite(ageMin) || ageMin > offlineMinCfg;
                        return (
                          <div key={s.dispositivo_id} className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {offline ? (
                                <WifiOff className="w-3 h-3 text-destructive shrink-0" />
                              ) : (
                                <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate">{s.nome}</span>
                              {s.suspeito && (
                                <AlertTriangle
                                  className="w-3 h-3 text-amber-500 shrink-0"
                                  aria-label={s.motivo_suspeita}
                                />
                              )}
                            </div>
                            <span className="font-mono text-muted-foreground shrink-0">
                              {s.temperatura_c != null ? `${s.temperatura_c.toFixed(1)}°C` : '—'}
                              {s.umidade_pct != null && (
                                <span className={s.suspeito ? 'text-amber-600' : ''}>
                                  {' / '}{s.umidade_pct.toFixed(0)}%
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                      {conforto && (
                        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          Conforto: {conforto.temp_min_ok}–{conforto.temp_max_ok}°C
                          {l.temperatura_media_c != null && ` • média ${l.temperatura_media_c.toFixed(1)}°C`}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            {leituras.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Sem galpões cadastrados.</p>
            )}
          </div>
        </div>

        {/* Alertas climáticos abertos */}
        {alertas.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Alertas previstos ({alertas.length})
            </div>
            <div className="space-y-1">
              {alertas.slice(0, 3).map((a: any) => (
                <div key={a.id} className="text-xs rounded-md border-l-2 border-l-destructive bg-destructive/5 px-2 py-1.5">
                  <div className="font-medium">{a.titulo}</div>
                  <div className="text-muted-foreground">{a.mensagem}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plano de prevenção */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Plano de prevenção
          </div>
          {plano.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sem ações recomendadas. Condições dentro do esperado.</p>
          ) : (
            <ol className="space-y-1.5">
              {plano.slice(0, 6).map(p => (
                <li key={p.id} className="text-xs rounded-md border bg-card p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${sevColor[p.prioridade]} text-[10px] px-1.5 py-0`}>{p.prioridade.toUpperCase()}</Badge>
                    <span className="font-medium">{p.quando}</span>
                    {p.galpao && <span className="text-muted-foreground">• {p.galpao}</span>}
                  </div>
                  <div className="font-medium">{p.acao}</div>
                  <div className="text-muted-foreground">{p.motivo}</div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={handleSync} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          {alertas.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleReconhecer}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reconhecer
            </Button>
          )}
          {loteRef && (
            <Button size="sm" variant="default" className="ml-auto" onClick={() => navigate(`/veterinario/${loteRef.id}`)}>
              Abrir lote <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MonitoramentoClimaticoVet() {
  const [nucleos, setNucleos] = useState<NucleoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [integradoId, setIntegradoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: lotes } = await supabase
        .from('lotes')
        .select(`
          id, data_alojamento, quantidade_aves, integrado_id,
          galpao:galpoes!inner(
            id, nome, inercia_termica_min, ventilador_quantidade,
            nucleo:nucleos!inner(id, nome, tipo_producao)
          )
        `)
        .in('status', ['alojado', 'previsao']);

      if (!lotes || lotes.length === 0) { setLoading(false); return; }
      setIntegradoId(lotes[0].integrado_id);

      const map = new Map<string, NucleoData>();
      lotes.forEach((l: any) => {
        const g = l.galpao;
        const n = g.nucleo;
        if (!map.has(n.id)) map.set(n.id, { id: n.id, nome: n.nome, tipo_producao: n.tipo_producao, galpoes: [] });
        const nuc = map.get(n.id)!;
        if (!nuc.galpoes.find(x => x.id === g.id)) {
          nuc.galpoes.push({
            id: g.id, nome: g.nome,
            inercia_termica_min: g.inercia_termica_min,
            ventilador_quantidade: g.ventilador_quantidade,
            lote: { id: l.id, data_alojamento: l.data_alojamento, quantidade_aves: l.quantidade_aves },
          });
        }
      });
      setNucleos(Array.from(map.values()));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando monitoramento...</div>;
  if (!nucleos.length) return (
    <div className="text-center py-12 text-muted-foreground">
      <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Nenhum núcleo com lote ativo.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {nucleos.map(n => integradoId && (
        <NucleoClimaCardVet key={n.id} nucleo={n} integradoId={integradoId} />
      ))}
    </div>
  );
}
