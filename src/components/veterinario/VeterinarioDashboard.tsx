import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLoteAnalytics, LoteAnalytics, AnalyticsSummary } from '@/hooks/useLoteAnalytics';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { supabase } from '@/integrations/supabase/client';
import { Bird, Skull, TrendingDown, AlertTriangle, Pill, Activity, Scale, Lightbulb, ShieldAlert, Thermometer, Beef } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { subWeeks, startOfWeek, endOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MortalidadeLoteInfo } from '@/hooks/useMortalidadeAlerta';
import type { CarenciaLoteInfo } from '@/hooks/useCarenciaAlerta';

interface Props {
  mortalidadeMap: Record<string, MortalidadeLoteInfo>;
  carenciaMap: Record<string, CarenciaLoteInfo>;
}

const STATUS_COLORS = {
  ok: 'hsl(145, 60%, 40%)',
  atencao: 'hsl(35, 95%, 55%)',
  critico: 'hsl(0, 84%, 60%)',
};

export default function VeterinarioDashboard({ mortalidadeMap, carenciaMap }: Props) {
  const { integradoId } = useIntegradoId();
  const { analytics, summary, loading, fetchAnalytics } = useLoteAnalytics();
  const [weeklyMortData, setWeeklyMortData] = useState<{ semana: string; mortes: number; percentual: number }[]>([]);

  const fetchWeeklyMortality = useCallback(async (intId: string) => {
    const now = new Date();
    const sixWeeksAgo = subWeeks(now, 6);

    // Fetch mortality records from the last 6 weeks
    const { data: mortRecords } = await supabase
      .from('mortalidade')
      .select('id, data_registro, lote_id')
      .eq('integrado_id', intId)
      .gte('data_registro', sixWeeksAgo.toISOString().split('T')[0]);

    if (!mortRecords || mortRecords.length === 0) {
      setWeeklyMortData([]);
      return;
    }

    const mortIds = mortRecords.map(m => m.id);
    const { data: mortItens } = await supabase
      .from('mortalidade_itens')
      .select('mortalidade_id, quantidade')
      .in('mortalidade_id', mortIds);

    // Build a map: mortalidade_id -> total quantity
    const qtyByMort: Record<string, number> = {};
    (mortItens || []).forEach(item => {
      qtyByMort[item.mortalidade_id] = (qtyByMort[item.mortalidade_id] || 0) + (item.quantidade || 0);
    });

    // Group by week
    const weekBuckets: Record<string, number> = {};
    for (let w = 5; w >= 0; w--) {
      const weekStart = startOfWeek(subWeeks(now, w), { weekStartsOn: 1 });
      const key = format(weekStart, "dd/MM", { locale: ptBR });
      weekBuckets[key] = 0;
    }

    mortRecords.forEach(rec => {
      const recDate = new Date(rec.data_registro);
      const weekStart = startOfWeek(recDate, { weekStartsOn: 1 });
      const key = format(weekStart, "dd/MM", { locale: ptBR });
      if (key in weekBuckets) {
        weekBuckets[key] += qtyByMort[rec.id] || 0;
      }
    });

    // Fetch total aves for percentage calculation
    const { data: lotesAtivos } = await supabase
      .from('lotes')
      .select('quantidade_aves')
      .eq('integrado_id', intId)
      .eq('status', 'alojado');

    const totalAves = (lotesAtivos || []).reduce((s, l) => s + (l.quantidade_aves || 0), 0);

    const result = Object.entries(weekBuckets).map(([semana, mortes]) => ({
      semana,
      mortes,
      percentual: totalAves > 0 ? Number(((mortes / totalAves) * 100).toFixed(3)) : 0,
    }));

    setWeeklyMortData(result);
  }, []);

  useEffect(() => {
    if (integradoId) {
      fetchAnalytics(integradoId);
      fetchWeeklyMortality(integradoId);
    }
  }, [integradoId, fetchAnalytics, fetchWeeklyMortality]);

  const tratamentosAtivos = Object.values(carenciaMap).reduce(
    (acc, c) => acc + c.tratamentos.length, 0
  );
  const lotesEmCarencia = Object.values(carenciaMap).filter(c => c.emAlerta).length;

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Carregando dashboard...</div>
    );
  }

  if (!analytics.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Nenhum lote ativo para análise</p>
      </div>
    );
  }

  // --- Chart Data ---
  const mortalidadeData = analytics
    .filter(l => l.mortalidadePercent > 0 || true)
    .map(l => ({
      name: `${l.nucleoNome} - ${l.galpaoNome}`.substring(0, 20),
      mortalidade: Number(l.mortalidadePercent.toFixed(2)),
      status: l.status,
    }))
    .sort((a, b) => b.mortalidade - a.mortalidade)
    .slice(0, 15);

  const pesoData = analytics
    .filter(l => l.pesoAtual > 0)
    .map(l => ({
      name: `${l.nucleoNome} - ${l.galpaoNome}`.substring(0, 18),
      real: Number((l.pesoAtual / 1000).toFixed(2)),
      referencia: Number((l.pesoReferencia / 1000).toFixed(2)),
    }))
    .slice(0, 12);

  const scoreDistribution = [
    { name: 'OK', value: summary?.lotesOk || 0, color: STATUS_COLORS.ok },
    { name: 'Atenção', value: summary?.lotesAlerta || 0, color: STATUS_COLORS.atencao },
    { name: 'Crítico', value: summary?.lotesCriticos || 0, color: STATUS_COLORS.critico },
  ].filter(d => d.value > 0);

  const totalAvesVivas = analytics.reduce((s, l) => s + l.avesVivas, 0);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={<Bird className="w-4 h-4" />}
          label="Aves Vivas"
          value={totalAvesVivas.toLocaleString('pt-BR')}
          color="text-primary"
        />
        <KpiCard
          icon={<Skull className="w-4 h-4" />}
          label="Mortalidade Geral"
          value={`${(summary?.mortalidadeMediaGeral || 0).toFixed(2)}%`}
          color="text-destructive"
        />
        <KpiCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="CA Médio"
          value={(summary?.caMediaGeral || 0).toFixed(3)}
          color="text-foreground"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Lotes em Alerta"
          value={`${(summary?.lotesAlerta || 0) + (summary?.lotesCriticos || 0)}`}
          color="text-accent"
          badge={summary?.lotesCriticos ? `${summary.lotesCriticos} críticos` : undefined}
        />
      </div>

      {/* Score Distribution */}
      {scoreDistribution.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-foreground">Score Operacional</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolução Semanal de Mortalidade */}
      {weeklyMortData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Evolução Semanal de Mortalidade (últimas 6 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyMortData} margin={{ left: 0, right: 12, top: 4 }}>
                  <defs>
                    <linearGradient id="mortGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'Mortes' ? `${value} aves` : `${value}%`
                    }
                    labelFormatter={(label) => `Semana de ${label}`}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="mortes"
                    name="Mortes"
                    stroke="hsl(0, 84%, 60%)"
                    fill="url(#mortGradient)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="percentual"
                    name="% do Plantel"
                    stroke="hsl(35, 95%, 55%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mortalidade por Lote */}
      {mortalidadeData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-foreground">Mortalidade por Lote (%)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mortalidadeData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="mortalidade" radius={[0, 4, 4, 0]}>
                    {mortalidadeData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peso Real vs Referência */}
      {pesoData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-foreground">Peso Real vs Referência (kg)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pesoData} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} unit="kg" />
                  <Tooltip formatter={(v: number) => `${v} kg`} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="real" name="Real" fill="hsl(145, 60%, 40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="referencia" name="Referência" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas Inteligentes */}
      <AlertasInteligentes analytics={analytics} mortalidadeMap={mortalidadeMap} carenciaMap={carenciaMap} />

      {/* Tratamentos e Carência */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Pill className="w-4 h-4 text-amber-500" />
            Tratamentos & Carência
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{tratamentosAtivos}</p>
              <p className="text-xs text-muted-foreground">Tratamentos ativos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{lotesEmCarencia}</p>
              <p className="text-xs text-muted-foreground">Lotes em carência</p>
            </div>
          </div>
          {lotesEmCarencia > 0 && (
            <div className="mt-3 space-y-1.5">
              {Object.values(carenciaMap)
                .filter(c => c.emAlerta)
                .flatMap(c => c.tratamentos.map(t => ({ ...t, loteId: c.loteId })))
                .slice(0, 5)
                .map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-3 py-1.5">
                    <span className="text-foreground font-medium truncate">{t.produtoNome}</span>
                    <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0 ml-2">
                      {t.diasRestantes}d restantes
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, color, badge }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  badge?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={color}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {badge && (
          <Badge variant="destructive" className="text-[10px] mt-1">{badge}</Badge>
        )}
      </CardContent>
    </Card>
  );
}

// --- Alertas Inteligentes ---
interface Alerta {
  severity: 'critico' | 'atencao' | 'info';
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  recomendacao: string;
  lote?: string;
}

function gerarAlertas(
  analytics: LoteAnalytics[],
  mortalidadeMap: Record<string, MortalidadeLoteInfo>,
  carenciaMap: Record<string, CarenciaLoteInfo>,
): Alerta[] {
  const alertas: Alerta[] = [];

  for (const lote of analytics) {
    const loteLabel = `${lote.nucleoNome} - ${lote.galpaoNome}`;

    // Mortalidade crítica
    if (lote.status === 'critico' && lote.mortalidadeDesvio > 0) {
      alertas.push({
        severity: 'critico',
        icon: <Skull className="w-4 h-4" />,
        titulo: `Mortalidade crítica: ${lote.mortalidadePercent.toFixed(2)}%`,
        descricao: `${loteLabel} — ${lote.mortalidadeDesvio.toFixed(1)}% acima da meta (idade ${lote.idadeDias}d).`,
        recomendacao: lote.idadeDias <= 7
          ? 'Verificar temperatura de pinteiro, qualidade da água e manejo de recepção. Considerar necropsia imediata.'
          : lote.idadeDias <= 21
          ? 'Avaliar programa vacinal, qualidade de ração e condições ambientais. Solicitar autopsia para diagnóstico.'
          : 'Investigar causas secundárias: cama úmida, ventilação, densidade. Programar visita técnica urgente.',
        lote: loteLabel,
      });
    }

    // Mortalidade atenção
    if (lote.status === 'atencao' && lote.mortalidadeDesvio > 0) {
      alertas.push({
        severity: 'atencao',
        icon: <AlertTriangle className="w-4 h-4" />,
        titulo: `Mortalidade acima da meta: ${lote.mortalidadePercent.toFixed(2)}%`,
        descricao: `${loteLabel} — ${lote.mortalidadeDesvio.toFixed(1)}% acima do limiar OK.`,
        recomendacao: 'Intensificar rondas de observação. Monitorar consumo de água e ração nas próximas 48h.',
        lote: loteLabel,
      });
    }

    // Peso abaixo da referência (>8% abaixo)
    if (lote.pesoAtual > 0 && lote.pesoVsMeta < -8) {
      alertas.push({
        severity: lote.pesoVsMeta < -15 ? 'critico' : 'atencao',
        icon: <Scale className="w-4 h-4" />,
        titulo: `Peso ${Math.abs(lote.pesoVsMeta).toFixed(1)}% abaixo da referência`,
        descricao: `${loteLabel} — Real: ${(lote.pesoAtual / 1000).toFixed(2)}kg vs Ref: ${(lote.pesoReferencia / 1000).toFixed(2)}kg.`,
        recomendacao: lote.pesoVsMeta < -15
          ? 'Revisar formulação de ração, disponibilidade de comedouros e programa de iluminação. Pode indicar problema sanitário subjacente.'
          : 'Avaliar uniformidade do lote com pesagem amostral. Verificar acesso a comedouros e bebedouros.',
        lote: loteLabel,
      });
    }

    // CA elevada (desvio > 0.1)
    if (lote.caAtual > 0 && lote.caDesvio > 0.1) {
      alertas.push({
        severity: lote.caDesvio > 0.2 ? 'critico' : 'atencao',
        icon: <TrendingDown className="w-4 h-4" />,
        titulo: `CA elevada: ${lote.caAtual.toFixed(3)} (+${lote.caDesvio.toFixed(3)})`,
        descricao: `${loteLabel} — Conversão alimentar ${lote.caDesvio.toFixed(3)} acima da meta.`,
        recomendacao: lote.caDesvio > 0.2
          ? 'Investigar desperdício de ração, qualidade dos insumos e possíveis problemas entéricos. Avaliar regulagem de comedouros.'
          : 'Monitorar consumo diário e verificar integridade do sistema de alimentação. Considerar ajuste nutricional.',
        lote: loteLabel,
      });
    }

    // Consumo desviado
    if (Math.abs(lote.consumoDesvioPercent) > 15) {
      const alto = lote.consumoDesvioPercent > 0;
      alertas.push({
        severity: Math.abs(lote.consumoDesvioPercent) > 25 ? 'critico' : 'atencao',
        icon: <Beef className="w-4 h-4" />,
        titulo: `Consumo ${alto ? 'acima' : 'abaixo'} do esperado: ${Math.abs(lote.consumoDesvioPercent).toFixed(1)}%`,
        descricao: `${loteLabel} — Consumo real vs esperado com desvio significativo.`,
        recomendacao: alto
          ? 'Verificar desperdício, temperatura ambiente (estresse térmico) e regulagem de equipamentos.'
          : 'Avaliar saúde intestinal, qualidade da água e possíveis intoxicações. Queda de consumo pode preceder surtos.',
        lote: loteLabel,
      });
    }
  }

  // Carências próximas do vencimento
  Object.values(carenciaMap)
    .filter(c => c.emAlerta)
    .forEach(c => {
      c.tratamentos.forEach(t => {
        if (t.diasRestantes <= 3) {
          alertas.push({
            severity: 'critico',
            icon: <Pill className="w-4 h-4" />,
            titulo: `Carência vencendo em ${t.diasRestantes}d`,
            descricao: `Produto ${t.produtoNome} — período de carência prestes a encerrar.`,
            recomendacao: 'Confirmar que não haverá abate antes do término da carência. Registrar liberação veterinária formal.',
          });
        }
      });
    });

  // Sort: crítico primeiro, depois atenção, depois info
  const order = { critico: 0, atencao: 1, info: 2 };
  alertas.sort((a, b) => order[a.severity] - order[b.severity]);

  return alertas;
}

function AlertasInteligentes({ analytics, mortalidadeMap, carenciaMap }: {
  analytics: LoteAnalytics[];
  mortalidadeMap: Record<string, MortalidadeLoteInfo>;
  carenciaMap: Record<string, CarenciaLoteInfo>;
}) {
  const alertas = gerarAlertas(analytics, mortalidadeMap, carenciaMap);

  if (alertas.length === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Tudo sob controle</p>
            <p className="text-xs text-muted-foreground">Nenhum alerta crítico identificado nos lotes ativos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severityStyles = {
    critico: {
      border: 'border-destructive/40',
      bg: 'bg-destructive/5',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      badge: 'destructive' as const,
      badgeLabel: 'Crítico',
    },
    atencao: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/5',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      badge: 'outline' as const,
      badgeLabel: 'Atenção',
    },
    info: {
      border: 'border-primary/30',
      bg: 'bg-primary/5',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'secondary' as const,
      badgeLabel: 'Info',
    },
  };

  const criticos = alertas.filter(a => a.severity === 'critico').length;
  const atencoes = alertas.filter(a => a.severity === 'atencao').length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Alertas Inteligentes
          </CardTitle>
          <div className="flex gap-1.5">
            {criticos > 0 && (
              <Badge variant="destructive" className="text-[10px]">{criticos} crítico{criticos > 1 ? 's' : ''}</Badge>
            )}
            {atencoes > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                {atencoes} atenção
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        {alertas.slice(0, 8).map((alerta, i) => {
          const style = severityStyles[alerta.severity];
          return (
            <div key={i} className={`rounded-lg border p-3 space-y-1.5 ${style.border} ${style.bg}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-md ${style.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className={style.iconColor}>{alerta.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-foreground">{alerta.titulo}</p>
                    <Badge variant={style.badge} className="text-[9px] px-1.5 py-0">
                      {style.badgeLabel}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{alerta.descricao}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 ml-9">
                <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-primary font-medium leading-relaxed">{alerta.recomendacao}</p>
              </div>
            </div>
          );
        })}
        {alertas.length > 8 && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            +{alertas.length - 8} alertas adicionais
          </p>
        )}
      </CardContent>
    </Card>
  );
}
