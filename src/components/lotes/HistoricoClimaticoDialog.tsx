import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine,
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Cloud, Loader2, Thermometer, Droplets, AlertTriangle, CloudRain, Wind, CloudSun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nucleoIdInicial?: string;
  tabInicial?: 'previsao' | 'series' | 'alertas';
}

const SEV_VARIANT: Record<string, 'destructive' | 'default' | 'secondary'> = {
  critico: 'destructive', alto: 'destructive', atencao: 'default', medio: 'default', baixo: 'secondary',
};

export function HistoricoClimaticoDialog({ open, onOpenChange, nucleoIdInicial, tabInicial = 'previsao' }: Props) {
  const { integradoId } = useIntegradoId();
  const [nucleos, setNucleos] = useState<{ id: string; nome: string }[]>([]);
  const [nucleoId, setNucleoId] = useState<string>('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [sevFiltro, setSevFiltro] = useState<string>('todos');
  const [dataIni, setDataIni] = useState<Date>(subDays(new Date(), 7));
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [hist3h, setHist3h] = useState<any[]>([]);
  const [hist3hPrev, setHist3hPrev] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [comparar, setComparar] = useState(false);
  const [forecast, setForecast] = useState<any[]>([]);
  const [conforto, setConforto] = useState<{ temp_min_critico: number; temp_max_critico: number; ith_max_critico: number } | null>(null);
  const [tab, setTab] = useState<string>(tabInicial);

  useEffect(() => {
    if (!open || !integradoId) return;
    (async () => {
      const { data } = await supabase
        .from('nucleos').select('id, nome')
        .eq('integrado_id', integradoId).eq('ativo', true).order('nome');
      const list = data ?? [];
      setNucleos(list);
      if (list.length && !nucleoId) setNucleoId(list[0].id);
    })();
  }, [open, integradoId]);

  useEffect(() => {
    if (!open || !nucleoId) return;
    fetchData();
  }, [open, nucleoId, dataIni, dataFim, comparar]);

  const fetchData = async () => {
    setLoading(true);
    const ini = dataIni.toISOString();
    const fim = new Date(dataFim.getTime() + 86400000).toISOString();
    const durMs = new Date(fim).getTime() - new Date(ini).getTime();
    const prevIni = new Date(new Date(ini).getTime() - durMs).toISOString();
    const prevFim = ini;

    const calls: any[] = [
      supabase.from('weather_historico_3h').select('*')
        .eq('nucleo_id', nucleoId)
        .gte('ts_3h', ini).lte('ts_3h', fim)
        .order('ts_3h', { ascending: true }).limit(800),
      supabase.from('alertas_climaticos').select('*')
        .eq('nucleo_id', nucleoId)
        .gte('horario_evento', ini).lte('horario_evento', fim)
        .order('horario_evento', { ascending: false }).limit(200),
    ];
    if (comparar) {
      calls.push(
        supabase.from('weather_historico_3h').select('*')
          .eq('nucleo_id', nucleoId)
          .gte('ts_3h', prevIni).lt('ts_3h', prevFim)
          .order('ts_3h', { ascending: true }).limit(800),
      );
    }
    const res = await Promise.all(calls);
    setHist3h(res[0].data ?? []);
    const al2 = res[1].data ?? [];
    setAlertas(al2);
    setTipos(Array.from(new Set(al2.map((a: any) => String(a.tipo)))));
    setHist3hPrev(comparar ? (res[2]?.data ?? []) : []);
    setLoading(false);
  };

  const serie = useMemo(() => {
    const cur = hist3h.map(r => ({
      label: format(parseISO(r.ts_3h), 'dd/MM HH:mm', { locale: ptBR }),
      temp_med: r.temp_med != null ? Number(r.temp_med) : null,
      temp_min: r.temp_min != null ? Number(r.temp_min) : null,
      temp_max: r.temp_max != null ? Number(r.temp_max) : null,
      ur_med: r.ur_med != null ? Number(r.ur_med) : null,
      ith_med: r.ith_med != null ? Number(r.ith_med) : null,
      ith_max: r.ith_max != null ? Number(r.ith_max) : null,
    }));
    if (!comparar) return cur;
    const len = Math.max(cur.length, hist3hPrev.length);
    const out: any[] = [];
    for (let i = 0; i < len; i++) {
      const c = cur[i];
      const p = hist3hPrev[i];
      out.push({
        label: c?.label ?? (p ? format(parseISO(p.ts_3h), 'dd/MM HH:mm', { locale: ptBR }) : `#${i}`),
        temp_med: c?.temp_med ?? null,
        temp_min: c?.temp_min ?? null,
        temp_max: c?.temp_max ?? null,
        ur_med: c?.ur_med ?? null,
        ith_med: c?.ith_med ?? null,
        ith_max: c?.ith_max ?? null,
        temp_med_prev: p?.temp_med != null ? Number(p.temp_med) : null,
        temp_max_prev: p?.temp_max != null ? Number(p.temp_max) : null,
        temp_min_prev: p?.temp_min != null ? Number(p.temp_min) : null,
        ur_med_prev: p?.ur_med != null ? Number(p.ur_med) : null,
        ith_med_prev: p?.ith_med != null ? Number(p.ith_med) : null,
      });
    }
    return out;
  }, [hist3h, hist3hPrev, comparar]);

  const alertasFiltrados = useMemo(() =>
    alertas
      .filter(a => tipoFiltro === 'todos' || a.tipo === tipoFiltro)
      .filter(a => sevFiltro === 'todos' || a.severidade === sevFiltro),
    [alertas, tipoFiltro, sevFiltro]);

  const setRangeRapido = (dias: number) => {
    setDataFim(new Date());
    setDataIni(subDays(new Date(), dias));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" /> Histórico Climático por Núcleo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="py-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Núcleo</label>
                  <Select value={nucleoId} onValueChange={setNucleoId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {nucleos.map(n => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">De</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('h-8 w-full justify-start text-xs', !dataIni && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(dataIni, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataIni} onSelect={(d) => d && setDataIni(d)}
                        disabled={(d) => d > new Date() || d > dataFim}
                        initialFocus className={cn('p-3 pointer-events-auto')} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Até</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('h-8 w-full justify-start text-xs', !dataFim && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(dataFim, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataFim} onSelect={(d) => d && setDataFim(d)}
                        disabled={(d) => d > new Date() || d < dataIni}
                        initialFocus className={cn('p-3 pointer-events-auto')} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end gap-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => setRangeRapido(7)}>7d</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => setRangeRapido(30)}>30d</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => setRangeRapido(90)}>90d</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Tipo de alerta</label>
                  <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Severidade</label>
                  <Select value={sevFiltro} onValueChange={setSevFiltro}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Toda severidade</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="baixo">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end col-span-2">
                  <div className="flex items-center gap-2 h-8">
                    <Switch id="comp-prev-dlg" checked={comparar} onCheckedChange={setComparar} />
                    <Label htmlFor="comp-prev-dlg" className="text-xs cursor-pointer">
                      Comparar com período anterior (mesma duração)
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Tabs defaultValue="series">
              <TabsList>
                <TabsTrigger value="series" className="text-xs">Séries</TabsTrigger>
                <TabsTrigger value="alertas" className="text-xs">Alertas ({alertasFiltrados.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="series" className="space-y-4 mt-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" /> Temperatura (°C)
                  </CardTitle></CardHeader>
                  <CardContent>
                    {serie.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={serie}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine y={32} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                          <ReferenceLine y={18} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="temp_max" stroke="#f97316" dot={false} name="Máx" />
                          <Line type="monotone" dataKey="temp_med" stroke="#eab308" dot={false} name="Méd" strokeWidth={2} />
                          <Line type="monotone" dataKey="temp_min" stroke="#3b82f6" dot={false} name="Mín" />
                          {comparar && <Line type="monotone" dataKey="temp_max_prev" stroke="#f97316" dot={false} name="Máx (ant.)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                          {comparar && <Line type="monotone" dataKey="temp_med_prev" stroke="#eab308" dot={false} name="Méd (ant.)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                          {comparar && <Line type="monotone" dataKey="temp_min_prev" stroke="#3b82f6" dot={false} name="Mín (ant.)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" /> UR (%) & ITH
                  </CardTitle></CardHeader>
                  <CardContent>
                    {serie.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center">Sem dados.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={serie}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis yAxisId="ur" tick={{ fontSize: 10 }} domain={[0, 100]} />
                          <YAxis yAxisId="ith" orientation="right" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine yAxisId="ith" y={78} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                          <Line yAxisId="ur" type="monotone" dataKey="ur_med" stroke="#3b82f6" dot={false} name="UR %" />
                          <Line yAxisId="ith" type="monotone" dataKey="ith_med" stroke="#a855f7" dot={false} name="ITH méd" />
                          <Line yAxisId="ith" type="monotone" dataKey="ith_max" stroke="#dc2626" dot={false} name="ITH máx" strokeDasharray="3 3" />
                          {comparar && <Line yAxisId="ur" type="monotone" dataKey="ur_med_prev" stroke="#3b82f6" dot={false} name="UR % (ant.)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                          {comparar && <Line yAxisId="ith" type="monotone" dataKey="ith_med_prev" stroke="#a855f7" dot={false} name="ITH méd (ant.)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alertas" className="mt-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" /> Eventos no período
                  </CardTitle></CardHeader>
                  <CardContent>
                    {alertasFiltrados.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">Nenhum alerta para os filtros selecionados.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                        {alertasFiltrados.map(a => (
                          <div key={a.id} className="rounded border bg-background/60 px-2 py-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={SEV_VARIANT[a.severidade] || 'secondary'} className="text-[10px] h-4">{a.severidade}</Badge>
                              <Badge variant="outline" className="text-[10px] h-4">{a.tipo}</Badge>
                              <span className="text-xs font-medium">{a.titulo}</span>
                              {a.reconhecido_em && <Badge variant="outline" className="text-[10px] h-4">reconhecido</Badge>}
                            </div>
                            {a.mensagem && <p className="text-[11px] text-muted-foreground mt-0.5">{a.mensagem}</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(parseISO(a.horario_evento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              {a.horario_acao && ` · ação sugerida: ${format(parseISO(a.horario_acao), 'dd/MM HH:mm', { locale: ptBR })}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
