import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Thermometer, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useIntegradoId } from '@/hooks/useIntegradoId';

interface Props {
  galpaoId: string;
  dataAlojamento: string;
  linhagem?: string;
  sexo?: string;
}

interface DiaTemperatura {
  dia: number;
  data: string;
  tempMin: number;
  tempMax: number;
  horarioMin: string;
  horarioMax: string;
  faixaMin?: number;
  faixaMax?: number;
  dentroFaixa: boolean | null;
}

interface RegraTemp {
  dia_inicio: number;
  dia_fim: number;
  temp_min_c: number;
  temp_max_c: number;
}

export function HistoricoTemperaturaLote({ galpaoId, dataAlojamento, linhagem, sexo }: Props) {
  const [dados, setDados] = useState<DiaTemperatura[]>([]);
  const [loading, setLoading] = useState(true);
  const { integradoId } = useIntegradoId();

  useEffect(() => {
    if (galpaoId && dataAlojamento) fetchData();
  }, [galpaoId, dataAlojamento, integradoId]);

  const fetchData = async () => {
    setLoading(true);

    // 1. Buscar dispositivos do galpão
    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id')
      .eq('galpao_id', galpaoId)
      .eq('ativo', true);

    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    const deviceIds = devices.map(d => d.id);

    // 2. Buscar regras de temperatura
    let regras: RegraTemp[] = [];
    if (integradoId) {
      const { data: regrasData } = await supabase
        .from('regras_temperatura_lote')
        .select('dia_inicio, dia_fim, temp_min_c, temp_max_c')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('dia_inicio');
      if (regrasData) regras = regrasData.map(r => ({
        dia_inicio: Number(r.dia_inicio),
        dia_fim: Number(r.dia_fim),
        temp_min_c: Number(r.temp_min_c),
        temp_max_c: Number(r.temp_max_c),
      }));
    }

    // 3. Buscar leituras (paginar para evitar limite de 1000)
    let allLeituras: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data: leituras } = await supabase
        .from('leituras_sensores')
        .select('temperatura_c, created_at')
        .in('dispositivo_id', deviceIds)
        .gte('created_at', dataAlojamento)
        .not('temperatura_c', 'is', null)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!leituras || leituras.length === 0) break;
      allLeituras = [...allLeituras, ...leituras];
      if (leituras.length < pageSize) break;
      page++;
    }

    if (allLeituras.length === 0) {
      setLoading(false);
      return;
    }

    // 4. Agrupar por dia
    const porDia: Record<string, { temps: { temp: number; ts: string }[] }> = {};
    allLeituras.forEach(l => {
      const dateStr = l.created_at.substring(0, 10); // YYYY-MM-DD
      if (!porDia[dateStr]) porDia[dateStr] = { temps: [] };
      porDia[dateStr].temps.push({ temp: Number(l.temperatura_c), ts: l.created_at });
    });

    // 5. Calcular min/max por dia
    const alojDate = new Date(dataAlojamento + 'T00:00:00');
    const resultado: DiaTemperatura[] = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, { temps }]) => {
        const currentDate = new Date(dateStr + 'T00:00:00');
        const dia = Math.floor((currentDate.getTime() - alojDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        let minTemp = Infinity, maxTemp = -Infinity;
        let minTs = '', maxTs = '';
        temps.forEach(({ temp, ts }) => {
          if (temp < minTemp) { minTemp = temp; minTs = ts; }
          if (temp > maxTemp) { maxTemp = temp; maxTs = ts; }
        });

        // Buscar faixa ideal para este dia
        const regra = regras.find(r => dia >= r.dia_inicio && dia <= r.dia_fim);
        const faixaMin = regra?.temp_min_c;
        const faixaMax = regra?.temp_max_c;

        let dentroFaixa: boolean | null = null;
        if (faixaMin !== undefined && faixaMax !== undefined) {
          dentroFaixa = minTemp >= faixaMin && maxTemp <= faixaMax;
        }

        return {
          dia,
          data: dateStr,
          tempMin: Number(minTemp.toFixed(1)),
          tempMax: Number(maxTemp.toFixed(1)),
          horarioMin: minTs,
          horarioMax: maxTs,
          faixaMin,
          faixaMax,
          dentroFaixa,
        };
      });

    setDados(resultado);
    setLoading(false);
  };

  if (loading || dados.length === 0) return null;

  // Dados para o gráfico
  const chartData = dados.map(d => ({
    dia: `D${d.dia}`,
    diaNum: d.dia,
    min: d.tempMin,
    max: d.tempMax,
    faixaMin: d.faixaMin,
    faixaMax: d.faixaMax,
  }));

  // Calcular range global da faixa ideal para ReferenceArea
  const faixaMinGlobal = Math.min(...dados.filter(d => d.faixaMin != null).map(d => d.faixaMin!));
  const faixaMaxGlobal = Math.max(...dados.filter(d => d.faixaMax != null).map(d => d.faixaMax!));
  const hasFaixa = dados.some(d => d.faixaMin != null);

  const diasForaFaixa = dados.filter(d => d.dentroFaixa === false).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-primary" />
            Histórico de Temperatura
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {dados.length} dias monitorados
            </Badge>
            {diasForaFaixa > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                {diasForaFaixa} dia{diasForaFaixa > 1 ? 's' : ''} fora da faixa
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gráfico */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                label={{ value: '°C', position: 'insideLeft', offset: 10, style: { fontSize: 11 } }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}°C`,
                  name === 'max' ? 'Máxima' : name === 'min' ? 'Mínima' : name === 'faixaMax' ? 'Faixa Máx' : 'Faixa Mín',
                ]}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'max' ? 'Máxima' : value === 'min' ? 'Mínima' : value === 'faixaMax' ? 'Faixa Máx' : 'Faixa Mín'
                }
              />
              {hasFaixa && (
                <>
                  <Line type="stepAfter" dataKey="faixaMax" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                  <Line type="stepAfter" dataKey="faixaMin" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                </>
              )}
              <Line type="monotone" dataKey="max" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="min" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <div className="overflow-auto max-h-80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Dia</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Mín (°C)</TableHead>
                <TableHead className="text-xs">Horário Mín</TableHead>
                <TableHead className="text-xs">Máx (°C)</TableHead>
                <TableHead className="text-xs">Horário Máx</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...dados].reverse().map((d) => (
                <TableRow key={d.data}>
                  <TableCell className="text-xs font-medium">D{d.dia}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(d.data + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-primary">
                    {d.tempMin.toFixed(1)}°C
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(d.horarioMin), 'HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-destructive">
                    {d.tempMax.toFixed(1)}°C
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(d.horarioMax), 'HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-center">
                    {d.dentroFaixa === null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : d.dentroFaixa ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
