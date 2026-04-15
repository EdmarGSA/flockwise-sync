import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import {
  Search, ChevronDown, ChevronUp, Skull, Scale, Thermometer, Droplets,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
} from 'lucide-react';

interface Props {
  loteId: string;
  galpaoId?: string;
  dataAlojamento: string | null;
  linhagem: string | null;
  sexo: string;
  quantidadeAves: number;
  idadeDias: number | null;
}

interface DiagData {
  // Mortalidade
  mortAcumulada: number;
  mortPercentual: number;
  mortRef: number;
  tendencia: 'subindo' | 'descendo' | 'estavel';
  ratioElimNat: number;
  totalEliminados: number;
  totalNatural: number;
  // Peso mortalidade vs lote
  pesoMedioMort: number | null;
  pesoMedioLote: number | null;
  discrepanciaPeso: number | null;
  // Ambiente
  diasTempFora: number;
  diasUmidFora: number;
  piorDesvioTemp: number;
  piorDesvioData: string;
  correlacaoAmbMort: number | null; // % aumento mortalidade em dias fora
  totalDiasAnalisados: number;
}

export default function DiagnosticoLoteCard({
  loteId, galpaoId, dataAlojamento, linhagem, sexo, quantidadeAves, idadeDias,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagData | null>(null);
  const { integradoId } = useIntegradoId();

  useEffect(() => {
    if (open && !data && integradoId) fetchDiag();
  }, [open, integradoId]);

  const fetchDiag = async () => {
    if (!integradoId || !dataAlojamento) return;
    setLoading(true);

    try {
      // 1. Mortalidade acumulada + itens
      const { data: mortRecords } = await supabase
        .from('mortalidade')
        .select('id, data_registro, mortalidade_itens(quantidade, motivo, peso_kg)')
        .eq('lote_id', loteId)
        .order('data_registro', { ascending: true });

      let totalMort = 0, totalElim = 0, totalNat = 0;
      let pesoMortTotal = 0, pesoMortCount = 0;
      const dailyMort: Record<string, number> = {};

      (mortRecords || []).forEach(m => {
        let dayTotal = 0;
        (m.mortalidade_itens || []).forEach((i: any) => {
          const qty = i.quantidade || 0;
          dayTotal += qty;
          if (i.motivo === 'eliminado') totalElim += qty;
          else totalNat += qty;
          if (i.peso_kg && i.peso_kg > 0) {
            pesoMortTotal += i.peso_kg * qty;
            pesoMortCount += qty;
          }
        });
        totalMort += dayTotal;
        dailyMort[m.data_registro] = (dailyMort[m.data_registro] || 0) + dayTotal;
      });

      // Tendência
      const sortedDates = Object.keys(dailyMort).sort();
      let tendencia: 'subindo' | 'descendo' | 'estavel' = 'estavel';
      if (sortedDates.length >= 2) {
        const mid = Math.floor(sortedDates.length / 2);
        const avg1 = sortedDates.slice(0, mid).reduce((s, d) => s + dailyMort[d], 0) / mid;
        const avg2 = sortedDates.slice(mid).reduce((s, d) => s + dailyMort[d], 0) / (sortedDates.length - mid);
        const ratio = avg2 / (avg1 || 1);
        if (ratio > 1.3) tendencia = 'subindo';
        else if (ratio < 0.7) tendencia = 'descendo';
      }

      const mortPercentual = quantidadeAves > 0 ? (totalMort / quantidadeAves) * 100 : 0;

      // 2. Mortalidade referência
      const { data: mortMedia } = await supabase
        .from('mortalidade_media')
        .select('*')
        .eq('integrado_id', integradoId)
        .eq('linhagem', linhagem || 'cobb_500')
        .eq('sexo', sexo || 'misto')
        .maybeSingle();

      let mortRef = 0;
      if (mortMedia && idadeDias) {
        if (idadeDias <= 7) mortRef = mortMedia.mortalidade_7_dias || 0;
        else if (idadeDias <= 14) mortRef = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0);
        else if (idadeDias <= 21) mortRef = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0);
        else if (idadeDias <= 28) mortRef = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0) + (mortMedia.mortalidade_28_dias || 0);
        else if (idadeDias <= 35) mortRef = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0) + (mortMedia.mortalidade_28_dias || 0) + (mortMedia.mortalidade_35_dias || 0);
        else mortRef = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0) + (mortMedia.mortalidade_28_dias || 0) + (mortMedia.mortalidade_35_dias || 0) + (mortMedia.mortalidade_42_dias || 0);
      }

      // 3. Última pesagem do lote
      let pesoMedioLote: number | null = null;
      const { data: pesagens } = await supabase
        .from('pesagens')
        .select('pesagem_itens(quantidade_aves, peso_bruto_g, peso_tara_g)')
        .eq('lote_id', loteId)
        .order('data_pesagem', { ascending: false })
        .limit(1);

      if (pesagens && pesagens.length > 0) {
        const items = pesagens[0].pesagem_itens || [];
        const totalPeso = items.reduce((s: number, i: any) => s + ((i.peso_bruto_g || 0) - (i.peso_tara_g || 0)), 0);
        const totalAves = items.reduce((s: number, i: any) => s + (i.quantidade_aves || 0), 0);
        if (totalAves > 0) pesoMedioLote = totalPeso / totalAves; // in grams
      }

      const pesoMedioMort = pesoMortCount > 0 ? (pesoMortTotal / pesoMortCount) * 1000 : null; // kg -> g
      let discrepanciaPeso: number | null = null;
      if (pesoMedioMort && pesoMedioLote && pesoMedioLote > 0) {
        discrepanciaPeso = ((pesoMedioMort - pesoMedioLote) / pesoMedioLote) * 100;
      }

      // 4. Ambiente - últimos 7 dias
      let diasTempFora = 0, diasUmidFora = 0, piorDesvioTemp = 0, piorDesvioData = '';
      let correlacaoAmbMort: number | null = null;
      let totalDiasAnalisados = 0;

      if (galpaoId && dataAlojamento && idadeDias) {
        const { data: devices } = await supabase
          .from('dispositivos_iot')
          .select('id')
          .eq('galpao_id', galpaoId)
          .eq('ativo', true);

        if (devices && devices.length > 0) {
          const deviceIds = devices.map(d => d.id);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: leituras } = await supabase
            .from('leituras_sensores')
            .select('temperatura_c, umidade_pct, created_at')
            .in('dispositivo_id', deviceIds)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

          // Fetch regras temperatura
          const { data: regras } = await supabase
            .from('regras_temperatura_lote')
            .select('dia_inicio, dia_fim, temp_min_c, temp_max_c')
            .eq('integrado_id', integradoId)
            .eq('ativo', true)
            .order('dia_inicio');

          if (leituras && leituras.length > 0) {
            const alojDate = new Date(dataAlojamento + 'T00:00:00');
            // Group by day
            const byDay: Record<string, { temps: number[]; umids: number[]; date: string }> = {};
            leituras.forEach(l => {
              const dateStr = l.created_at.substring(0, 10);
              if (!byDay[dateStr]) byDay[dateStr] = { temps: [], umids: [], date: dateStr };
              if (l.temperatura_c != null) byDay[dateStr].temps.push(Number(l.temperatura_c));
              if (l.umidade_pct != null) byDay[dateStr].umids.push(Number(l.umidade_pct));
            });

            const UMID_MIN = 40, UMID_MAX = 70;
            const diasForaTemp = new Set<string>();
            const diasForaUmid = new Set<string>();

            Object.entries(byDay).forEach(([dateStr, { temps, umids }]) => {
              const currentDate = new Date(dateStr + 'T00:00:00');
              const dia = Math.floor((currentDate.getTime() - alojDate.getTime()) / 86400000) + 1;

              // Find rule for this day
              const regra = (regras || []).find((r: any) => dia >= Number(r.dia_inicio) && dia <= Number(r.dia_fim));
              const faixaMin = regra ? Number(regra.temp_min_c) : faixaTemperaturaPadrao(dia).min;
              const faixaMax = regra ? Number(regra.temp_max_c) : faixaTemperaturaPadrao(dia).max;

              if (temps.length > 0) {
                const minT = Math.min(...temps);
                const maxT = Math.max(...temps);
                if (minT < faixaMin || maxT > faixaMax) {
                  diasForaTemp.add(dateStr);
                  const desvio = Math.max(Math.max(0, maxT - faixaMax), Math.max(0, faixaMin - minT));
                  if (desvio > piorDesvioTemp) {
                    piorDesvioTemp = Number(desvio.toFixed(1));
                    piorDesvioData = dateStr;
                  }
                }
              }
              if (umids.length > 0) {
                const minU = Math.min(...umids);
                const maxU = Math.max(...umids);
                if (minU < UMID_MIN || maxU > UMID_MAX) {
                  diasForaUmid.add(dateStr);
                }
              }
            });

            diasTempFora = diasForaTemp.size;
            diasUmidFora = diasForaUmid.size;
            totalDiasAnalisados = Object.keys(byDay).length;

            // Correlação: mortalidade em dias fora vs dias dentro
            if (diasForaTemp.size > 0 && sortedDates.length > 0) {
              let mortForaDias = 0, mortDentroDias = 0;
              let countFora = 0, countDentro = 0;
              sortedDates.forEach(d => {
                if (diasForaTemp.has(d)) {
                  mortForaDias += dailyMort[d];
                  countFora++;
                } else {
                  mortDentroDias += dailyMort[d];
                  countDentro++;
                }
              });
              const avgFora = countFora > 0 ? mortForaDias / countFora : 0;
              const avgDentro = countDentro > 0 ? mortDentroDias / countDentro : 0;
              if (avgDentro > 0) {
                correlacaoAmbMort = ((avgFora - avgDentro) / avgDentro) * 100;
              }
            }
          }
        }
      }

      setData({
        mortAcumulada: totalMort,
        mortPercentual,
        mortRef,
        tendencia,
        ratioElimNat: totalNat > 0 ? totalElim / totalNat : 0,
        totalEliminados: totalElim,
        totalNatural: totalNat,
        pesoMedioMort,
        pesoMedioLote,
        discrepanciaPeso,
        diasTempFora,
        diasUmidFora,
        piorDesvioTemp,
        piorDesvioData,
        correlacaoAmbMort,
        totalDiasAnalisados,
      });
    } catch (err) {
      console.error('Erro ao buscar diagnóstico:', err);
    } finally {
      setLoading(false);
    }
  };

  const TendenciaIcon = data?.tendencia === 'subindo' ? TrendingUp :
    data?.tendencia === 'descendo' ? TrendingDown : Minus;

  const tendenciaColor = data?.tendencia === 'subindo' ? 'text-destructive' :
    data?.tendencia === 'descendo' ? 'text-emerald-500' : 'text-muted-foreground';

  const mortStatus = data && data.mortRef > 0
    ? data.mortPercentual > data.mortRef * 1.5 ? 'critico'
    : data.mortPercentual > data.mortRef ? 'atencao' : 'ok'
    : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer px-4 py-3 hover:bg-accent/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Search className="w-4 h-4 text-primary" />
                Diagnóstico do Lote
              </CardTitle>
              <div className="flex items-center gap-2">
                {data && mortStatus === 'critico' && (
                  <Badge variant="destructive" className="text-[10px]">Atenção</Badge>
                )}
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando diagnóstico...</p>
            )}

            {data && (
              <>
                {/* Mortalidade Section */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skull className="w-4 h-4 text-destructive" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Mortalidade</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {data.mortPercentual.toFixed(2)}%
                        {mortStatus && (
                          <span className={`ml-1 text-xs ${mortStatus === 'critico' ? 'text-destructive' : mortStatus === 'atencao' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {mortStatus === 'ok' ? '✓' : mortStatus === 'atencao' ? '⚠' : '🔴'}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Acumulada ({data.mortAcumulada} aves)
                        {data.mortRef > 0 && <span> • ref: {data.mortRef.toFixed(2)}%</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <TendenciaIcon className={`w-4 h-4 ${tendenciaColor}`} />
                        <span className={`text-sm font-medium ${tendenciaColor}`}>
                          {data.tendencia === 'subindo' ? 'Subindo' : data.tendencia === 'descendo' ? 'Descendo' : 'Estável'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Elim/Nat: {data.ratioElimNat.toFixed(1)}x
                      </p>
                    </div>
                  </div>
                </div>

                {/* Peso Section */}
                {(data.pesoMedioMort !== null || data.pesoMedioLote !== null) && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Pesagem vs Mortalidade</span>
                    </div>
                    <div className="space-y-1">
                      {data.pesoMedioMort !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Peso médio mortalidade</span>
                          <span className="font-medium text-foreground">{(data.pesoMedioMort / 1000).toFixed(3)} kg</span>
                        </div>
                      )}
                      {data.pesoMedioLote !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Peso médio lote</span>
                          <span className="font-medium text-foreground">{(data.pesoMedioLote / 1000).toFixed(3)} kg</span>
                        </div>
                      )}
                      {data.discrepanciaPeso !== null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discrepância</span>
                          <span className={`font-bold ${Math.abs(data.discrepanciaPeso) > 20 ? 'text-destructive' : Math.abs(data.discrepanciaPeso) > 10 ? 'text-amber-500' : 'text-foreground'}`}>
                            {data.discrepanciaPeso > 0 ? '+' : ''}{data.discrepanciaPeso.toFixed(1)}%
                            {data.discrepanciaPeso < -15 && (
                              <span className="text-[10px] ml-1 font-normal">aves menores morrendo</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ambiente Section */}
                {data.totalDiasAnalisados > 0 && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        Ambiente (últimos {data.totalDiasAnalisados} dias)
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> Temp fora da faixa
                        </span>
                        <span className={`font-bold ${data.diasTempFora >= 3 ? 'text-destructive' : data.diasTempFora >= 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {data.diasTempFora} dia{data.diasTempFora !== 1 ? 's' : ''}
                          {data.diasTempFora >= 3 ? ' 🔴' : data.diasTempFora >= 1 ? ' ⚠' : ' ✓'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Umidade fora da faixa
                        </span>
                        <span className={`font-bold ${data.diasUmidFora >= 3 ? 'text-destructive' : data.diasUmidFora >= 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {data.diasUmidFora} dia{data.diasUmidFora !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {data.piorDesvioTemp > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pior desvio</span>
                          <span className="font-medium text-destructive">
                            +{data.piorDesvioTemp}°C em {new Date(data.piorDesvioData + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {data.correlacaoAmbMort !== null && data.correlacaoAmbMort > 20 && (
                        <div className="bg-destructive/10 rounded p-2 mt-1">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-[11px] text-destructive font-medium">
                              Mortalidade {data.correlacaoAmbMort.toFixed(0)}% maior nos dias com temperatura fora da faixa
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && !data && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Erro ao carregar dados
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function faixaTemperaturaPadrao(dia: number) {
  if (dia <= 3) return { min: 32, max: 34 };
  if (dia <= 7) return { min: 30, max: 32 };
  if (dia <= 14) return { min: 28, max: 30 };
  if (dia <= 21) return { min: 26, max: 28 };
  if (dia <= 28) return { min: 24, max: 26 };
  return { min: 20, max: 26 };
}
