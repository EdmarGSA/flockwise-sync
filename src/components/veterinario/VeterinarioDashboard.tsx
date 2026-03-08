import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLoteAnalytics, LoteAnalytics, AnalyticsSummary } from '@/hooks/useLoteAnalytics';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Bird, Skull, TrendingDown, AlertTriangle, Pill, Activity, Scale } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
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

  useEffect(() => {
    if (integradoId) {
      fetchAnalytics(integradoId);
    }
  }, [integradoId, fetchAnalytics]);

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
