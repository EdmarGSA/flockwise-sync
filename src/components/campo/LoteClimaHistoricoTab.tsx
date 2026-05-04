import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Cloud, Thermometer, Droplets, AlertTriangle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  loteId: string;
  nucleoId: string;
  dataAlojamento: string | null;
}

const SEV_VARIANT: Record<string, 'destructive' | 'default' | 'secondary'> = {
  critico: 'destructive', alto: 'destructive', atencao: 'default', medio: 'default', baixo: 'secondary',
};

export function LoteClimaHistoricoTab({ loteId, nucleoId, dataAlojamento }: Props) {
  const [loading, setLoading] = useState(true);
  const [hist3h, setHist3h] = useState<any[]>([]);
  const [hist3hPrev, setHist3hPrev] = useState<any[]>([]);
  const [diario, setDiario] = useState<any[]>([]);
  const [diarioPrev, setDiarioPrev] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | 'ciclo'>('7d');
  const [comparar, setComparar] = useState(false);

  useEffect(() => {
    if (!nucleoId) return;
    fetchData();
  }, [nucleoId, loteId, range, comparar]);

  const fetchData = async () => {
    setLoading(true);
    const agora = new Date();
    const inicioDate = (() => {
      if (range === 'ciclo' && dataAlojamento) return new Date(dataAlojamento);
      const d = new Date();
      d.setDate(d.getDate() - (range === '7d' ? 7 : 30));
      return d;
    })();
    const inicio = inicioDate.toISOString();
    const durMs = agora.getTime() - inicioDate.getTime();
    const prevFimDate = new Date(inicioDate.getTime());
    const prevIniDate = new Date(inicioDate.getTime() - durMs);
    const prevIni = prevIniDate.toISOString();
    const prevFim = prevFimDate.toISOString();

    const calls: any[] = [
      supabase.from('weather_historico_3h').select('*').eq('nucleo_id', nucleoId)
        .gte('ts_3h', inicio).order('ts_3h', { ascending: true }).limit(500),
      supabase.from('weather_lote_diario').select('*').eq('lote_id', loteId)
        .gte('data', inicio.slice(0, 10)).order('data', { ascending: true }).limit(120),
      supabase.from('alertas_climaticos').select('*').eq('nucleo_id', nucleoId)
        .gte('horario_evento', inicio).order('horario_evento', { ascending: false }).limit(100),
    ];
    if (comparar) {
      calls.push(
        supabase.from('weather_historico_3h').select('*').eq('nucleo_id', nucleoId)
          .gte('ts_3h', prevIni).lt('ts_3h', prevFim).order('ts_3h', { ascending: true }).limit(500),
        supabase.from('weather_lote_diario').select('*').eq('lote_id', loteId)
          .gte('data', prevIni.slice(0, 10)).lt('data', prevFim.slice(0, 10)).order('data', { ascending: true }).limit(120),
      );
    }
    const res = await Promise.all(calls);
    setHist3h(res[0].data ?? []);
    setDiario(res[1].data ?? []);
    setAlertas(res[2].data ?? []);
    setHist3hPrev(comparar ? (res[3]?.data ?? []) : []);
    setDiarioPrev(comparar ? (res[4]?.data ?? []) : []);
    setLoading(false);
  };

  const serie3h = useMemo(() => {
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
    // alinha por índice (posição relativa no período)
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

  const serieDiario = useMemo(() => {
    const cur = diario.map(r => ({
      data: format(parseISO(r.data), 'dd/MM', { locale: ptBR }),
      idade: r.idade_dias,
      temp_min: r.temp_min != null ? Number(r.temp_min) : null,
      temp_med: r.temp_med != null ? Number(r.temp_med) : null,
      temp_max: r.temp_max != null ? Number(r.temp_max) : null,
      ur_med: r.ur_med != null ? Number(r.ur_med) : null,
      horas_calor: r.horas_calor || 0,
      horas_frio: r.horas_frio || 0,
      horas_ith_alto: r.horas_ith_alto || 0,
      horas_fora_conforto: (r.horas_calor || 0) + (r.horas_frio || 0) + (r.horas_ith_alto || 0),
      conforto_pct: r.dentro_conforto_pct != null ? Number(r.dentro_conforto_pct) : null,
    }));
    if (!comparar) return cur;
    const len = Math.max(cur.length, diarioPrev.length);
    const out: any[] = [];
    for (let i = 0; i < len; i++) {
      const c = cur[i];
      const p = diarioPrev[i];
      const prevHoras = p ? (p.horas_calor || 0) + (p.horas_frio || 0) + (p.horas_ith_alto || 0) : null;
      out.push({
        data: c?.data ?? (p ? format(parseISO(p.data), 'dd/MM', { locale: ptBR }) : `#${i}`),
        horas_calor: c?.horas_calor ?? 0,
        horas_frio: c?.horas_frio ?? 0,
        horas_ith_alto: c?.horas_ith_alto ?? 0,
        horas_fora_conforto: c?.horas_fora_conforto ?? 0,
        horas_fora_prev: prevHoras,
      });
    }
    return out;
  }, [diario, diarioPrev, comparar]);

  const resumo = useMemo(() => {
    if (diario.length === 0) return null;
    const sum = diario.reduce((a: any, r: any) => ({
      calor: a.calor + (r.horas_calor || 0),
      frio: a.frio + (r.horas_frio || 0),
      ith: a.ith + (r.horas_ith_alto || 0),
      conf: a.conf + (Number(r.dentro_conforto_pct) || 0),
      n: a.n + (r.dentro_conforto_pct != null ? 1 : 0),
    }), { calor: 0, frio: 0, ith: 0, conf: 0, n: 0 });
    return {
      horasCalor: sum.calor,
      horasFrio: sum.frio,
      horasITH: sum.ith,
      confortoPct: sum.n > 0 ? (sum.conf / sum.n) : null,
    };
  }, [diario]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Cloud className="h-4 w-4 text-primary" />
          Histórico climático do ciclo
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch id="comp-prev" checked={comparar} onCheckedChange={setComparar} />
            <Label htmlFor="comp-prev" className="text-xs cursor-pointer">Comparar com período anterior</Label>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs h-6">7 dias</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs h-6">30 dias</TabsTrigger>
              <TabsTrigger value="ciclo" className="text-xs h-6" disabled={!dataAlojamento}>Ciclo todo</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {comparar && (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Linhas tracejadas representam o período imediatamente anterior de mesma duração.
        </p>
      )}

      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card><CardContent className="py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Conforto médio</p>
            <p className="text-xl font-bold text-chart-2">{resumo.confortoPct != null ? `${resumo.confortoPct.toFixed(0)}%` : '-'}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Horas calor</p>
            <p className="text-xl font-bold text-orange-500">{resumo.horasCalor}h</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Horas frio</p>
            <p className="text-xl font-bold text-blue-500">{resumo.horasFrio}h</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Horas ITH alto</p>
            <p className="text-xl font-bold text-destructive">{resumo.horasITH}h</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-orange-500" /> Temperatura (°C) — leituras 3h
        </CardTitle></CardHeader>
        <CardContent>
          {serie3h.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={serie3h}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={32} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'calor', fontSize: 9 }} />
                <ReferenceLine y={18} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'frio', fontSize: 9 }} />
                <Line type="monotone" dataKey="temp_max" stroke="#f97316" dot={false} name="Máx" />
                <Line type="monotone" dataKey="temp_med" stroke="#eab308" dot={false} name="Média" strokeWidth={2} />
                <Line type="monotone" dataKey="temp_min" stroke="#3b82f6" dot={false} name="Mín" />
                {comparar && <Line type="monotone" dataKey="temp_max_prev" stroke="#f97316" dot={false} name="Máx (anterior)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                {comparar && <Line type="monotone" dataKey="temp_med_prev" stroke="#eab308" dot={false} name="Média (anterior)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                {comparar && <Line type="monotone" dataKey="temp_min_prev" stroke="#3b82f6" dot={false} name="Mín (anterior)" strokeDasharray="4 4" strokeOpacity={0.6} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" /> Umidade Relativa & ITH
        </CardTitle></CardHeader>
        <CardContent>
          {serie3h.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={serie3h}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="ur" tick={{ fontSize: 10 }} domain={[0, 100]} />
                <YAxis yAxisId="ith" orientation="right" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="ith" y={78} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'ITH crítico', fontSize: 9 }} />
                <Line yAxisId="ur" type="monotone" dataKey="ur_med" stroke="#3b82f6" dot={false} name="UR %" />
                <Line yAxisId="ith" type="monotone" dataKey="ith_med" stroke="#a855f7" dot={false} name="ITH méd" />
                <Line yAxisId="ith" type="monotone" dataKey="ith_max" stroke="#dc2626" dot={false} name="ITH máx" strokeDasharray="3 3" />
                {comparar && <Line yAxisId="ur" type="monotone" dataKey="ur_med_prev" stroke="#3b82f6" dot={false} name="UR % (anterior)" strokeDasharray="4 4" strokeOpacity={0.6} />}
                {comparar && <Line yAxisId="ith" type="monotone" dataKey="ith_med_prev" stroke="#a855f7" dot={false} name="ITH méd (anterior)" strokeDasharray="4 4" strokeOpacity={0.6} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {serieDiario.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estresse térmico diário (h fora de conforto)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={serieDiario}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="horas_calor" stackId="s" fill="#f97316" name="Calor" />
                <Bar dataKey="horas_frio" stackId="s" fill="#3b82f6" name="Frio" />
                <Bar dataKey="horas_ith_alto" stackId="s" fill="#dc2626" name="ITH alto" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" /> Eventos de alerta no período ({alertas.length})
        </CardTitle></CardHeader>
        <CardContent>
          {alertas.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum alerta climático no período selecionado.</p>
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {alertas.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-2 rounded border bg-background/60 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={SEV_VARIANT[a.severidade] || 'secondary'} className="text-[10px] h-4">{a.severidade}</Badge>
                      <span className="text-xs font-medium">{a.titulo}</span>
                      {a.reconhecido_em && <Badge variant="outline" className="text-[10px] h-4">reconhecido</Badge>}
                    </div>
                    {a.mensagem && <p className="text-[11px] text-muted-foreground mt-0.5">{a.mensagem}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(parseISO(a.horario_evento), "dd/MM HH:mm", { locale: ptBR })}
                      {a.horario_acao && ` · ação: ${format(parseISO(a.horario_acao), 'dd/MM HH:mm', { locale: ptBR })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
