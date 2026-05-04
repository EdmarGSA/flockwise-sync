import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Sun,
  Thermometer, Droplets, Wind, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  onAbrirDetalhes?: (nucleoId: string) => void;
}

interface NucleoLite { id: string; nome: string; }
interface ForecastRow {
  nucleo_id: string;
  hora_prevista: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  vento_kmh: number | null;
  prob_chuva_pct: number | null;
  precipitacao_mm: number | null;
  ith: number | null;
  condicao_codigo: number | null;
}

const condicaoWMO = (code?: number | null) => {
  if (code === null || code === undefined) return { texto: '—', Icon: Cloud, cor: 'text-muted-foreground' };
  if (code === 0) return { texto: 'Céu limpo', Icon: Sun, cor: 'text-yellow-500' };
  if (code <= 2) return { texto: 'Parcialmente nublado', Icon: CloudSun, cor: 'text-yellow-400' };
  if (code === 3) return { texto: 'Nublado', Icon: Cloud, cor: 'text-gray-500' };
  if (code >= 45 && code <= 48) return { texto: 'Neblina', Icon: CloudFog, cor: 'text-gray-400' };
  if (code >= 51 && code <= 57) return { texto: 'Garoa', Icon: CloudRain, cor: 'text-blue-400' };
  if (code >= 61 && code <= 67) return { texto: 'Chuva', Icon: CloudRain, cor: 'text-blue-500' };
  if (code >= 71 && code <= 77) return { texto: 'Neve', Icon: CloudSnow, cor: 'text-blue-200' };
  if (code >= 80 && code <= 82) return { texto: 'Pancadas', Icon: CloudRain, cor: 'text-blue-600' };
  if (code >= 95) return { texto: 'Tempestade', Icon: CloudLightning, cor: 'text-purple-500' };
  return { texto: 'Variável', Icon: Cloud, cor: 'text-muted-foreground' };
};

export function PrevisaoNucleosBar({ onAbrirDetalhes }: Props) {
  const { integradoId } = useIntegradoId();
  const [nucleos, setNucleos] = useState<NucleoLite[]>([]);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [alertasFuturos, setAlertasFuturos] = useState<Map<string, number>>(new Map());
  const [ultimoSync, setUltimoSync] = useState<Map<string, { quando: string; status: string }>>(new Map());
  const [expandido, setExpandido] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTudo = async () => {
    if (!integradoId) return;
    setLoading(true);

    // 1. Núcleos com lote ativo
    const { data: lotes } = await supabase
      .from('lotes')
      .select('nucleo_id')
      .eq('integrado_id', integradoId)
      .eq('status', 'alojado');
    const nucleoIds = [...new Set((lotes || []).map(l => l.nucleo_id).filter(Boolean))] as string[];

    if (nucleoIds.length === 0) {
      setNucleos([]); setForecast([]); setAlertasFuturos(new Map()); setUltimoSync(new Map());
      setLoading(false);
      return;
    }

    const { data: nucData } = await supabase
      .from('nucleos').select('id, nome').in('id', nucleoIds).order('nome');
    setNucleos(nucData || []);

    const agora = new Date().toISOString();
    const ate72h = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    const [fcRes, alRes, syncRes] = await Promise.all([
      supabase.from('weather_forecast_horario')
        .select('nucleo_id, hora_prevista, temperatura_c, umidade_pct, vento_kmh, prob_chuva_pct, precipitacao_mm, ith, condicao_codigo')
        .in('nucleo_id', nucleoIds)
        .gte('hora_prevista', agora).lte('hora_prevista', ate72h)
        .order('hora_prevista', { ascending: true }),
      supabase.from('alertas_climaticos')
        .select('nucleo_id, horario_evento')
        .in('nucleo_id', nucleoIds)
        .is('reconhecido_em', null)
        .gte('horario_evento', agora),
      supabase.from('weather_sync_log')
        .select('nucleo_id, status, executado_em')
        .in('nucleo_id', nucleoIds)
        .order('executado_em', { ascending: false })
        .limit(nucleoIds.length * 5),
    ]);

    setForecast(fcRes.data || []);

    const alMap = new Map<string, number>();
    (alRes.data || []).forEach(a => alMap.set(a.nucleo_id, (alMap.get(a.nucleo_id) || 0) + 1));
    setAlertasFuturos(alMap);

    const syncMap = new Map<string, { quando: string; status: string }>();
    (syncRes.data || []).forEach(s => {
      if (!syncMap.has(s.nucleo_id)) syncMap.set(s.nucleo_id, { quando: s.executado_em, status: s.status });
    });
    setUltimoSync(syncMap);

    setLoading(false);
  };

  useEffect(() => { fetchTudo(); }, [integradoId]);

  // Refetch quando alertas mudarem
  useEffect(() => {
    if (!integradoId) return;
    const ch = supabase.channel('previsao-bar-alertas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_climaticos' }, () => fetchTudo())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [integradoId]);

  const sincronizarTudo = async () => {
    setSincronizando(true);
    try {
      const { error } = await supabase.functions.invoke('weather-sync', { body: {} });
      if (error) throw error;
      toast.success('Sincronização disparada');
      setTimeout(fetchTudo, 1500);
    } catch (e: any) {
      toast.error('Falha ao sincronizar', { description: e.message });
    } finally {
      setSincronizando(false);
    }
  };

  const resumoPorNucleo = useMemo(() => {
    return nucleos.map(n => {
      const fc = forecast.filter(f => f.nucleo_id === n.id);
      const fc24 = fc.filter(f => new Date(f.hora_prevista).getTime() <= Date.now() + 24 * 3600 * 1000);
      const temps = fc24.map(f => Number(f.temperatura_c)).filter(v => !isNaN(v));
      const tempMin = temps.length ? Math.min(...temps) : null;
      const tempMax = temps.length ? Math.max(...temps) : null;
      const ithMax = fc24.reduce((acc, f) => Math.max(acc, Number(f.ith) || 0), 0) || null;
      const probChuvaMax = fc24.reduce((acc, f) => Math.max(acc, Number(f.prob_chuva_pct) || 0), 0);
      const ventoMax = fc24.reduce((acc, f) => Math.max(acc, Number(f.vento_kmh) || 0), 0);

      // Condição predominante: pega das próximas 6h
      const fc6 = fc.slice(0, 6);
      const codCount = new Map<number, number>();
      fc6.forEach(f => {
        if (f.condicao_codigo != null) codCount.set(f.condicao_codigo, (codCount.get(f.condicao_codigo) || 0) + 1);
      });
      let codPredominante: number | null = null;
      let maxCount = 0;
      codCount.forEach((c, k) => { if (c > maxCount) { maxCount = c; codPredominante = k; } });

      // Pico chuva
      const picoChuva = fc24.reduce<{ pct: number; hora: string | null }>((acc, f) => {
        const pct = Number(f.prob_chuva_pct) || 0;
        if (pct > acc.pct) return { pct, hora: f.hora_prevista };
        return acc;
      }, { pct: 0, hora: null });

      const sync = ultimoSync.get(n.id);
      return {
        ...n,
        tempMin, tempMax, ithMax, probChuvaMax, ventoMax, codPredominante,
        picoChuva,
        alertas: alertasFuturos.get(n.id) || 0,
        temDados: fc24.length > 0,
        sync,
      };
    });
  }, [nucleos, forecast, alertasFuturos, ultimoSync]);

  if (!loading && nucleos.length === 0) return null;

  const visiveis = expandido ? resumoPorNucleo : resumoPorNucleo.slice(0, 4);

  return (
    <Card className="mb-4 border-blue-300/40 bg-blue-50/40 dark:bg-blue-950/10">
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CloudSun className="h-4 w-4 text-blue-600" />
            <span>Previsão 24h por núcleo ({nucleos.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={sincronizarTudo} disabled={sincronizando}>
              <RefreshCw className={`h-3 w-3 mr-1 ${sincronizando ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            {resumoPorNucleo.length > 4 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandido(v => !v)}>
                {expandido ? <><ChevronUp className="h-3 w-3 mr-1" />Recolher</> : <><ChevronDown className="h-3 w-3 mr-1" />Ver todos</>}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground py-2">Carregando previsão...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {visiveis.map(r => {
              const cond = condicaoWMO(r.codPredominante);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onAbrirDetalhes?.(r.id)}
                  className="text-left rounded border bg-background/60 hover:bg-background transition px-2.5 py-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <cond.Icon className={`h-4 w-4 shrink-0 ${cond.cor}`} />
                      <span className="text-xs font-medium truncate">{r.nome}</span>
                    </div>
                    {r.alertas > 0 ? (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{r.alertas}
                      </Badge>
                    ) : r.temDados ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-500/40 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />ok
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">sem dados</Badge>
                    )}
                  </div>

                  {r.temDados ? (
                    <>
                      <div className="text-[11px] text-muted-foreground">{cond.texto}</div>
                      <div className="grid grid-cols-3 gap-1 text-[11px]">
                        <div className="flex items-center gap-1" title="Temperatura mín/máx">
                          <Thermometer className="h-3 w-3 text-orange-500" />
                          <span>{r.tempMin?.toFixed(0)}°/{r.tempMax?.toFixed(0)}°</span>
                        </div>
                        <div className="flex items-center gap-1" title="Probabilidade máxima de chuva">
                          <Droplets className="h-3 w-3 text-blue-500" />
                          <span>{r.probChuvaMax.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1" title="Vento máximo">
                          <Wind className="h-3 w-3 text-cyan-500" />
                          <span>{r.ventoMax.toFixed(0)}km/h</span>
                        </div>
                      </div>
                      {r.ithMax && r.ithMax >= 70 && (
                        <div className="text-[10px] text-orange-600 dark:text-orange-400">
                          ITH máx: {r.ithMax.toFixed(0)} {r.ithMax >= 78 && '⚠ crítico'}
                        </div>
                      )}
                      {r.picoChuva.hora && r.picoChuva.pct >= 50 && (
                        <div className="text-[10px] text-blue-700 dark:text-blue-300">
                          Pico chuva: {r.picoChuva.pct.toFixed(0)}% às {format(parseISO(r.picoChuva.hora), 'HH:mm', { locale: ptBR })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic py-1">
                      Núcleo sem coordenadas ou sem sincronização. Clique em "Sincronizar".
                    </div>
                  )}

                  {r.sync && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      Atualizado {format(parseISO(r.sync.quando), "dd/MM HH:mm", { locale: ptBR })}
                      {r.sync.status === 'erro' && <span className="text-destructive ml-1">· erro</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
