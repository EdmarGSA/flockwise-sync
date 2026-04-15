import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Skull, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calcularIdadeNaData } from '@/lib/utils';
import type { LoteAnalytics } from '@/hooks/useLoteAnalytics';
import MortalidadeSemanaDetalheDialog from '@/components/lotes/MortalidadeSemanaDetalheDialog';

interface GestorMortalidadeSemanalProps {
  analytics: LoteAnalytics[];
  integradoId: string;
  loading: boolean;
}

interface MortalidadeMediaRef {
  linhagem: string;
  sexo: string;
  mortalidade_7_dias: number | null;
  mortalidade_14_dias: number | null;
  mortalidade_21_dias: number | null;
  mortalidade_28_dias: number | null;
  mortalidade_35_dias: number | null;
  mortalidade_42_dias: number | null;
  mortalidade_acima_42_dias: number | null;
}

interface SemanaData {
  semana: number;
  diaInicio: number;
  diaFim: number;
  mortes: number;
  mortesNatural: number;
  mortesEliminado: number;
  percentual: number;
  metaRef: number;
  status: 'ok' | 'atencao' | 'critico';
}

interface LoteSemanalData {
  loteId: string;
  label: string;
  linhagem: string;
  sexo: string;
  avesAlojadas: number;
  dataAlojamento: string;
  idadeDias: number;
  semanas: SemanaData[];
  totalMortes: number;
  totalPercent: number;
  mortesNatural: number;
  mortesEliminado: number;
}

// Returns the weekly ref value from mortalidade_media for a given week number
function getRefSemana(ref: MortalidadeMediaRef | undefined, semana: number): number {
  if (!ref) return 0;
  const map: Record<number, number | null> = {
    1: ref.mortalidade_7_dias,
    2: ref.mortalidade_14_dias,
    3: ref.mortalidade_21_dias,
    4: ref.mortalidade_28_dias,
    5: ref.mortalidade_35_dias,
    6: ref.mortalidade_42_dias,
  };
  if (semana > 6) return ref.mortalidade_acima_42_dias || 0.8;
  return map[semana] ?? 0;
}

function classifyStatus(percentual: number, metaRef: number): 'ok' | 'atencao' | 'critico' {
  if (metaRef <= 0) return 'ok';
  if (percentual <= metaRef) return 'ok';
  if (percentual <= metaRef * 1.5) return 'atencao';
  return 'critico';
}

const statusColors: Record<string, string> = {
  ok: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
  atencao: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  critico: 'bg-destructive/20 text-destructive border-destructive/30',
};

const dotColors: Record<string, string> = {
  ok: 'bg-green-500',
  atencao: 'bg-yellow-500',
  critico: 'bg-destructive',
};

export function GestorMortalidadeSemanal({ analytics, integradoId, loading }: GestorMortalidadeSemanalProps) {
  const [mortalidadeRefs, setMortalidadeRefs] = useState<MortalidadeMediaRef[]>([]);
  const [mortalidadeRaw, setMortalidadeRaw] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    loteId: string;
    semana: number;
    diaInicio: number;
    diaFim: number;
    dataAlojamento: string;
    metaSemana: number;
    quantidadeAlojada: number;
  } | null>(null);

  useEffect(() => {
    if (!integradoId || analytics.length === 0) {
      setLoadingData(false);
      return;
    }
    fetchData();
  }, [integradoId, analytics]);

  const fetchData = async () => {
    setLoadingData(true);
    const loteIds = analytics.map(a => a.loteId);

    const [refRes, mortRes] = await Promise.all([
      supabase
        .from('mortalidade_media')
        .select('linhagem, sexo, mortalidade_7_dias, mortalidade_14_dias, mortalidade_21_dias, mortalidade_28_dias, mortalidade_35_dias, mortalidade_42_dias, mortalidade_acima_42_dias')
        .eq('integrado_id', integradoId),
      supabase
        .from('mortalidade')
        .select('lote_id, data_registro, mortalidade_itens(motivo, quantidade)')
        .in('lote_id', loteIds),
    ]);

    setMortalidadeRefs(refRes.data || []);
    setMortalidadeRaw(mortRes.data || []);
    setLoadingData(false);
  };

  const lotesData = useMemo<LoteSemanalData[]>(() => {
    if (analytics.length === 0) return [];

    return analytics.map(lote => {
      const ref = mortalidadeRefs.find(
        r => r.linhagem === lote.linhagem && r.sexo === lote.sexo
      ) || mortalidadeRefs[0]; // fallback to first ref

      const mortLote = mortalidadeRaw.filter(m => m.lote_id === lote.loteId);
      const maxSemana = Math.max(1, lote.semana);
      const semanas: SemanaData[] = [];
      let totalMortes = 0;
      let totalNatural = 0;
      let totalEliminado = 0;

      // We need the data_alojamento - get it from analytics
      // analytics doesn't have dataAlojamento directly, compute from idadeDias
      const hoje = new Date();
      const dataAloj = new Date(hoje);
      dataAloj.setDate(dataAloj.getDate() - (lote.idadeDias - 1));
      const dataAlojStr = dataAloj.toISOString().split('T')[0];

      for (let s = 1; s <= maxSemana; s++) {
        const diaInicio = (s - 1) * 7 + 1;
        const diaFim = s * 7;
        let mortes = 0;
        let natural = 0;
        let eliminado = 0;

        mortLote.forEach((m: any) => {
          const diaCalc = calcularIdadeNaData(dataAlojStr, m.data_registro);
          if (diaCalc >= diaInicio && diaCalc <= diaFim) {
            m.mortalidade_itens?.forEach((item: any) => {
              const qty = item.quantidade || 0;
              mortes += qty;
              if (item.motivo === 'natural') natural += qty;
              else eliminado += qty;
            });
          }
        });

        totalMortes += mortes;
        totalNatural += natural;
        totalEliminado += eliminado;

        const percentual = lote.avesAlojadas > 0 ? (mortes / lote.avesAlojadas) * 100 : 0;
        const metaRef = getRefSemana(ref, s);
        const status = classifyStatus(percentual, metaRef);

        semanas.push({ semana: s, diaInicio, diaFim, mortes, mortesNatural: natural, mortesEliminado: eliminado, percentual, metaRef, status });
      }

      return {
        loteId: lote.loteId,
        label: `${lote.nucleoNome}/${lote.galpaoNome}`,
        linhagem: lote.linhagem,
        sexo: lote.sexo,
        avesAlojadas: lote.avesAlojadas,
        dataAlojamento: dataAlojStr,
        idadeDias: lote.idadeDias,
        semanas,
        totalMortes,
        totalPercent: lote.avesAlojadas > 0 ? (totalMortes / lote.avesAlojadas) * 100 : 0,
        mortesNatural: totalNatural,
        mortesEliminado: totalEliminado,
      };
    }).sort((a, b) => b.totalPercent - a.totalPercent);
  }, [analytics, mortalidadeRefs, mortalidadeRaw]);

  // Determine max weeks across all lots
  const maxSemanas = useMemo(() => {
    return Math.max(1, ...lotesData.map(l => l.semanas.length));
  }, [lotesData]);

  if (loading || loadingData) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Skull className="w-5 h-5" />Mortalidade Semanal</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  if (lotesData.length === 0) return null;

  const handleCellClick = (lote: LoteSemanalData, sem: SemanaData) => {
    setSelectedCell({
      loteId: lote.loteId,
      semana: sem.semana,
      diaInicio: sem.diaInicio,
      diaFim: sem.diaFim,
      dataAlojamento: lote.dataAlojamento,
      metaSemana: sem.metaRef,
      quantidadeAlojada: lote.avesAlojadas,
    });
  };

  // Totals row
  const totalGeral = lotesData.reduce((s, l) => s + l.totalMortes, 0);
  const totalNatural = lotesData.reduce((s, l) => s + l.mortesNatural, 0);
  const totalEliminado = lotesData.reduce((s, l) => s + l.mortesEliminado, 0);
  const naturalPercent = totalGeral > 0 ? (totalNatural / totalGeral) * 100 : 0;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Skull className="w-5 h-5" />
              Mortalidade Semanal Consolidada
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${dotColors.ok}`} /> ≤ Meta</span>
              <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${dotColors.atencao}`} /> Atenção</span>
              <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${dotColors.critico}`} /> Crítico</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px] sticky left-0 bg-background z-10">Lote</TableHead>
                  {Array.from({ length: maxSemanas }, (_, i) => (
                    <TableHead key={i} className="text-center min-w-[70px]">S{i + 1}</TableHead>
                  ))}
                  <TableHead className="text-center min-w-[80px]">Acum.</TableHead>
                  <TableHead className="text-center min-w-[120px]">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesData.map(lote => (
                  <TableRow key={lote.loteId}>
                    <TableCell className="font-medium text-xs sticky left-0 bg-background z-10">
                      <div className="truncate max-w-[140px]">{lote.label}</div>
                      <span className="text-[10px] text-muted-foreground">Dia {lote.idadeDias}</span>
                    </TableCell>
                    {Array.from({ length: maxSemanas }, (_, i) => {
                      const sem = lote.semanas[i];
                      if (!sem || sem.mortes === 0 && i + 1 > lote.semana) {
                        return <TableCell key={i} className="text-center text-muted-foreground text-xs">—</TableCell>;
                      }
                      return (
                        <TableCell key={i} className="text-center p-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCellClick(lote, sem)}
                                className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium border cursor-pointer transition-colors hover:opacity-80 ${statusColors[sem.status]}`}
                              >
                                {sem.percentual.toFixed(2)}%
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p><strong>S{sem.semana}</strong> — {sem.mortes} aves</p>
                              <p>Meta: {sem.metaRef.toFixed(2)}%</p>
                              <p>Natural: {sem.mortesNatural} | Elim: {sem.mortesEliminado}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                    {/* Acumulado */}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          lote.totalPercent > 3 ? 'border-destructive text-destructive' :
                          lote.totalPercent > 2 ? 'border-yellow-500 text-yellow-600' :
                          'border-green-500 text-green-600'
                        }`}
                      >
                        {lote.totalPercent.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    {/* Motivo bar */}
                    <TableCell className="p-2">
                      {lote.totalMortes > 0 ? (
                        <div className="flex items-center gap-1">
                          <div className="flex h-3 w-full rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full"
                              style={{ width: `${(lote.mortesNatural / lote.totalMortes) * 100}%` }}
                            />
                            <div
                              className="bg-orange-500 h-full"
                              style={{ width: `${(lote.mortesEliminado / lote.totalMortes) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
            <span>Total: <strong className="text-foreground">{totalGeral.toLocaleString('pt-BR')}</strong> aves</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Natural: {naturalPercent.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Eliminado: {(100 - naturalPercent).toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCell && (
        <MortalidadeSemanaDetalheDialog
          open={!!selectedCell}
          onOpenChange={(open) => !open && setSelectedCell(null)}
          loteId={selectedCell.loteId}
          semana={selectedCell.semana}
          diaInicio={selectedCell.diaInicio}
          diaFim={selectedCell.diaFim}
          dataAlojamento={selectedCell.dataAlojamento}
          metaSemana={selectedCell.metaSemana}
          quantidadeAlojada={selectedCell.quantidadeAlojada}
        />
      )}
    </TooltipProvider>
  );
}
