import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skull, Calendar, AlertTriangle, CheckCircle, Scale, TrendingDown, TrendingUp, Info, Lightbulb } from 'lucide-react';
import { calcularIdadeNaData } from '@/lib/utils';
import {
  classificarIR,
  pesoReferenciaPorDia,
  gerarInsight,
  classificacaoToClasses,
  type PesoRefCtx,
  type PesagemPonto,
  type RefCurvaPonto,
  type ClassificacaoInfo,
  type ClassificacaoIR,
  type ResumoAnalise,
} from '@/lib/utils/analiseMortalidade';

interface MortalidadeSemanaDetalheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  semana: number;
  diaInicio: number;
  diaFim: number;
  dataAlojamento: string;
  metaSemana: number;
  quantidadeAlojada: number;
}

interface MortalidadeItem {
  motivo: string;
  submotivo: string | null;
  quantidade: number;
  pesoMedioKg: number | null; // null quando sem peso informado
}

interface MortalidadeDia {
  dia: number;
  data: string;
  totalMortes: number;
  pesoMedioKg: number | null;
  pesoRefKg: number;
  ir: number | null;
  classificacao: ClassificacaoInfo | null;
  porMotivo: MortalidadeItem[];
}

interface ResumoMotivo {
  motivo: string;
  submotivo: string | null;
  label: string;
  quantidade: number;
  percentual: number;
  pesoMedioKg: number | null;
  pesoRefKg: number | null;
  ir: number | null;
  classificacao: ClassificacaoInfo | null;
}

const MOTIVO_LABELS: Record<string, string> = {
  natural: 'Natural',
  eliminado: 'Eliminado',
};

const SUBMOTIVO_LABELS: Record<string, string> = {
  locomotor: 'Locomotor',
  debilitado: 'Debilitado',
  refugo: 'Refugo',
  outros: 'Outros',
};

const FONTE_LABELS: Record<string, string> = {
  pesagem_real: 'pesagem real do lote',
  curva_linhagem: 'curva da linhagem',
  interpolacao_pintinho: 'estimativa (pintinho)',
  nenhuma: 'sem referência',
};

export default function MortalidadeSemanaDetalheDialog({
  open,
  onOpenChange,
  loteId,
  semana,
  diaInicio,
  diaFim,
  dataAlojamento,
  metaSemana,
  quantidadeAlojada,
}: MortalidadeSemanaDetalheDialogProps) {
  const [loading, setLoading] = useState(true);
  const [mortalidadePorDia, setMortalidadePorDia] = useState<MortalidadeDia[]>([]);
  const [resumoPorMotivo, setResumoPorMotivo] = useState<ResumoMotivo[]>([]);
  const [totalSemana, setTotalSemana] = useState(0);
  const [resumo, setResumo] = useState<ResumoAnalise | null>(null);
  const [fonteRef, setFonteRef] = useState<string>('curva_linhagem');

  useEffect(() => {
    if (open && loteId && dataAlojamento) {
      fetchMortalidadeDetalhada();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loteId, dataAlojamento, diaInicio, diaFim]);

  const fetchMortalidadeDetalhada = async () => {
    setLoading(true);

    try {
      // 1. Buscar lote (linhagem, sexo, peso pintinho)
      const { data: lote } = await supabase
        .from('lotes')
        .select('linhagem, sexo, peso_medio_pintinhos_kg')
        .eq('id', loteId)
        .maybeSingle();

      // 2. Buscar mortalidade + pesagens em paralelo
      const [mortalidadeRes, pesagensRes] = await Promise.all([
        supabase
          .from('mortalidade')
          .select(`
            data_registro,
            mortalidade_itens (
              motivo,
              submotivo,
              quantidade,
              peso_kg
            )
          `)
          .eq('lote_id', loteId),
        supabase
          .from('pesagens')
          .select(`
            data_pesagem,
            pesagem_itens ( quantidade_aves, peso_liquido_kg )
          `)
          .eq('lote_id', loteId),
      ]);

      if (mortalidadeRes.error) {
        console.error('Error fetching mortality:', mortalidadeRes.error);
        setLoading(false);
        return;
      }

      // 3. Reduz pesagens reais → pontos { dia, pesoMedio }
      const pesagensReais: PesagemPonto[] = (pesagensRes.data || [])
        .map((p: any) => {
          const dia = calcularIdadeNaData(dataAlojamento, p.data_pesagem);
          let qtd = 0;
          let pesoTotal = 0;
          (p.pesagem_itens || []).forEach((it: any) => {
            const q = Number(it.quantidade_aves) || 0;
            const pl = Number(it.peso_liquido_kg) || 0;
            qtd += q;
            pesoTotal += pl;
          });
          if (qtd === 0 || pesoTotal === 0) return null;
          return { dia, pesoMedioKg: pesoTotal / qtd };
        })
        .filter((x): x is PesagemPonto => x !== null && x.dia > 0);

      // 4. Buscar curva linhagem
      let curvaLinhagem: RefCurvaPonto[] = [];
      if (lote?.linhagem && lote?.sexo) {
        const { data: ref } = await supabase
          .from('desempenho_aves')
          .select('dia, peso_kg')
          .eq('linhagem', lote.linhagem)
          .eq('sexo', lote.sexo)
          .gte('dia', Math.max(0, diaInicio - 5))
          .lte('dia', diaFim + 5);

        curvaLinhagem = (ref || [])
          .filter((r: any) => r.peso_kg != null)
          .map((r: any) => ({ dia: r.dia, pesoKg: Number(r.peso_kg) }));
      }

      const ctxRef: PesoRefCtx = {
        pesoPintinhoKg: Number(lote?.peso_medio_pintinhos_kg) || 0.042,
        pesagensReais,
        curvaLinhagem,
      };

      // 5. Processar mortalidade por dia
      const porDiaMap: Record<string, {
        dia: number;
        data: string;
        totalMortes: number;
        pesoTotalKg: number;
        avesComPeso: number;
        porMotivoMap: Record<string, MortalidadeItem & { pesoTotalKg: number; avesComPeso: number }>;
      }> = {};

      const motivoAgg: Record<string, {
        motivo: string;
        submotivo: string | null;
        quantidade: number;
        pesoTotalKg: number;
        avesComPeso: number;
        somaPesoRef: number;
        avesParaIR: number;
      }> = {};

      let totalGeral = 0;
      let totalComPeso = 0;
      let totalNatural = 0;
      let totalEliminado = 0;
      let totalNaturalAcimaNormal = 0;
      let totalEliminadoRefugo = 0;
      const porClassificacao: Record<ClassificacaoIR, number> = {
        refugo_severo: 0,
        refugo: 0,
        normal: 0,
        acima: 0,
      };

      (mortalidadeRes.data || []).forEach((m: any) => {
        const dataReg = m.data_registro;
        const diaCalc = calcularIdadeNaData(dataAlojamento, dataReg);
        if (diaCalc < diaInicio || diaCalc > diaFim) return;

        const refDia = pesoReferenciaPorDia(diaCalc, ctxRef);

        if (!porDiaMap[dataReg]) {
          porDiaMap[dataReg] = {
            dia: diaCalc,
            data: dataReg,
            totalMortes: 0,
            pesoTotalKg: 0,
            avesComPeso: 0,
            porMotivoMap: {},
          };
        }
        const diaEntry = porDiaMap[dataReg];

        (m.mortalidade_itens || []).forEach((item: any) => {
          const qtd = Number(item.quantidade) || 0;
          if (qtd === 0) return;
          const pesoTotal = item.peso_kg != null ? Number(item.peso_kg) : null;
          const pesoMedio = pesoTotal != null && pesoTotal > 0 ? pesoTotal / qtd : null;

          totalGeral += qtd;
          diaEntry.totalMortes += qtd;

          if (pesoTotal != null && pesoTotal > 0) {
            totalComPeso += qtd;
            diaEntry.pesoTotalKg += pesoTotal;
            diaEntry.avesComPeso += qtd;
          }

          // Por motivo no dia
          const key = `${item.motivo}|${item.submotivo || ''}`;
          if (!diaEntry.porMotivoMap[key]) {
            diaEntry.porMotivoMap[key] = {
              motivo: item.motivo,
              submotivo: item.submotivo,
              quantidade: 0,
              pesoMedioKg: null,
              pesoTotalKg: 0,
              avesComPeso: 0,
            };
          }
          const dmEntry = diaEntry.porMotivoMap[key];
          dmEntry.quantidade += qtd;
          if (pesoTotal != null && pesoTotal > 0) {
            dmEntry.pesoTotalKg += pesoTotal;
            dmEntry.avesComPeso += qtd;
          }

          // Agregado por motivo (semana)
          if (!motivoAgg[key]) {
            motivoAgg[key] = {
              motivo: item.motivo,
              submotivo: item.submotivo,
              quantidade: 0,
              pesoTotalKg: 0,
              avesComPeso: 0,
              somaPesoRef: 0,
              avesParaIR: 0,
            };
          }
          const mAgg = motivoAgg[key];
          mAgg.quantidade += qtd;
          if (pesoTotal != null && pesoTotal > 0) {
            mAgg.pesoTotalKg += pesoTotal;
            mAgg.avesComPeso += qtd;
            if (refDia.pesoKg > 0) {
              mAgg.somaPesoRef += refDia.pesoKg * qtd;
              mAgg.avesParaIR += qtd;
              // Classificação por ave
              const irItem = pesoMedio! / refDia.pesoKg;
              const c = classificarIR(irItem);
              if (c) porClassificacao[c.key] += qtd;
              if (item.motivo === 'natural' && irItem >= 0.85) totalNaturalAcimaNormal += qtd;
              if (item.motivo === 'eliminado' && irItem <= 0.85) totalEliminadoRefugo += qtd;
            }
          }
          if (item.motivo === 'natural') totalNatural += qtd;
          if (item.motivo === 'eliminado') totalEliminado += qtd;
        });
      });

      // Finalizar mortalidadePorDia
      let pesoRefSemanaTotal = 0;
      let pesoRefSemanaPeso = 0;
      let pesoMortoSemanaTotal = 0;
      let pesoMortoSemanaPeso = 0;
      let primeiraFonte: string | null = null;

      const diasArray: MortalidadeDia[] = Object.values(porDiaMap)
        .sort((a, b) => a.dia - b.dia)
        .map(d => {
          const refDia = pesoReferenciaPorDia(d.dia, ctxRef);
          if (!primeiraFonte && refDia.fonte !== 'nenhuma') primeiraFonte = refDia.fonte;
          const pesoMedio = d.avesComPeso > 0 ? d.pesoTotalKg / d.avesComPeso : null;
          const ir = pesoMedio != null && refDia.pesoKg > 0 ? pesoMedio / refDia.pesoKg : null;

          if (pesoMedio != null && d.avesComPeso > 0) {
            pesoMortoSemanaTotal += d.pesoTotalKg;
            pesoMortoSemanaPeso += d.avesComPeso;
            if (refDia.pesoKg > 0) {
              pesoRefSemanaTotal += refDia.pesoKg * d.avesComPeso;
              pesoRefSemanaPeso += d.avesComPeso;
            }
          }

          const porMotivo: MortalidadeItem[] = Object.values(d.porMotivoMap).map(pm => ({
            motivo: pm.motivo,
            submotivo: pm.submotivo,
            quantidade: pm.quantidade,
            pesoMedioKg: pm.avesComPeso > 0 ? pm.pesoTotalKg / pm.avesComPeso : null,
          }));

          return {
            dia: d.dia,
            data: d.data,
            totalMortes: d.totalMortes,
            pesoMedioKg: pesoMedio,
            pesoRefKg: refDia.pesoKg,
            ir,
            classificacao: classificarIR(ir),
            porMotivo,
          };
        });

      setMortalidadePorDia(diasArray);
      setTotalSemana(totalGeral);
      setFonteRef(primeiraFonte || 'curva_linhagem');

      // Resumo por motivo
      const resumoMotivos: ResumoMotivo[] = Object.values(motivoAgg)
        .sort((a, b) => b.quantidade - a.quantidade)
        .map(m => {
          let label = MOTIVO_LABELS[m.motivo] || m.motivo;
          if (m.submotivo) label += ` - ${SUBMOTIVO_LABELS[m.submotivo] || m.submotivo}`;
          const pesoMedio = m.avesComPeso > 0 ? m.pesoTotalKg / m.avesComPeso : null;
          const pesoRef = m.avesParaIR > 0 ? m.somaPesoRef / m.avesParaIR : null;
          const ir = pesoMedio != null && pesoRef != null && pesoRef > 0 ? pesoMedio / pesoRef : null;
          return {
            motivo: m.motivo,
            submotivo: m.submotivo,
            label,
            quantidade: m.quantidade,
            percentual: totalGeral > 0 ? (m.quantidade / totalGeral) * 100 : 0,
            pesoMedioKg: pesoMedio,
            pesoRefKg: pesoRef,
            ir,
            classificacao: classificarIR(ir),
          };
        });
      setResumoPorMotivo(resumoMotivos);

      // Resumo geral
      const pesoMedioMortoSem = pesoMortoSemanaPeso > 0 ? pesoMortoSemanaTotal / pesoMortoSemanaPeso : null;
      const pesoRefMedioSem = pesoRefSemanaPeso > 0 ? pesoRefSemanaTotal / pesoRefSemanaPeso : null;
      const irSem = pesoMedioMortoSem != null && pesoRefMedioSem != null && pesoRefMedioSem > 0
        ? pesoMedioMortoSem / pesoRefMedioSem
        : null;

      const novoResumo: ResumoAnalise = {
        totalAves: totalGeral,
        totalComPeso,
        pesoMedioMortoKg: pesoMedioMortoSem,
        pesoRefMedioKg: pesoRefMedioSem,
        ir: irSem,
        classificacao: classificarIR(irSem),
        percentSemPeso: totalGeral > 0 ? ((totalGeral - totalComPeso) / totalGeral) * 100 : 0,
        porClassificacao,
        totalNatural,
        totalEliminado,
        totalNaturalAcimaNormal,
        totalEliminadoRefugo,
      };
      setResumo(novoResumo);
    } catch (err) {
      console.error('Error processing mortality data:', err);
    }

    setLoading(false);
  };

  const percentualReal = quantidadeAlojada > 0 ? (totalSemana / quantidadeAlojada) * 100 : 0;
  const dentroDaMeta = metaSemana === 0 || percentualReal <= metaSemana;
  const insight = resumo ? gerarInsight(resumo) : null;

  const renderIR = (ir: number | null, classif: ClassificacaoInfo | null) => {
    if (ir == null || !classif) return null;
    return (
      <Badge variant="outline" className={`text-[10px] ${classificacaoToClasses(classif.tone)}`}>
        {classif.label} · IR {ir.toFixed(2)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5" />
            Mortalidade - Semana {semana}
          </DialogTitle>
          <DialogDescription>
            Dias {diaInicio} a {diaFim} do lote
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo da Semana */}
            <Card className={`border ${
              dentroDaMeta
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-destructive/10 border-destructive/30'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Total da Semana</p>
                    <p className={`text-2xl font-bold ${!dentroDaMeta ? 'text-destructive' : ''}`}>
                      {totalSemana.toLocaleString('pt-BR')} <span className="text-base font-normal text-muted-foreground">aves</span>
                    </p>
                    <p className={`text-sm ${!dentroDaMeta ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {percentualReal.toFixed(2)}%
                      {metaSemana > 0 && (
                        <span className="text-muted-foreground"> (meta: {metaSemana.toFixed(2)}%)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dentroDaMeta ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Perfil de Peso da Semana */}
            {resumo && (
              <Card className={`border ${resumo.classificacao ? classificacaoToClasses(resumo.classificacao.tone) : 'bg-muted/30 border-border'}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      Perfil de peso
                    </p>
                    {resumo.classificacao && (
                      <Badge variant="outline" className={classificacaoToClasses(resumo.classificacao.tone)}>
                        {resumo.classificacao.label}
                      </Badge>
                    )}
                  </div>

                  {resumo.totalComPeso === 0 ? (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Nenhum peso informado nos registros desta semana. Preencha o peso ao registrar mortalidade para liberar a análise de refugo.</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Peso médio morto</p>
                          <p className="text-base font-semibold">
                            {resumo.pesoMedioMortoKg ? `${resumo.pesoMedioMortoKg.toFixed(3)} kg` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Peso esperado</p>
                          <p className="text-base font-semibold">
                            {resumo.pesoRefMedioKg ? `${resumo.pesoRefMedioKg.toFixed(3)} kg` : '—'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {FONTE_LABELS[fonteRef]}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Índice IR</p>
                          <p className="text-base font-semibold flex items-center gap-1">
                            {resumo.ir ? resumo.ir.toFixed(2) : '—'}
                            {resumo.ir != null && (
                              resumo.ir < 0.85
                                ? <TrendingDown className="w-3 h-3 text-green-500" />
                                : <TrendingUp className="w-3 h-3 text-amber-500" />
                            )}
                          </p>
                        </div>
                      </div>

                      {resumo.classificacao && (
                        <p className="text-xs text-muted-foreground border-t pt-2">
                          {resumo.classificacao.descricao}
                        </p>
                      )}

                      {resumo.percentSemPeso > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {resumo.percentSemPeso.toFixed(0)}% dos registros sem peso informado
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Insight automático */}
            {insight && (
              <Card className="bg-primary/5 border-primary/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground/90">{insight}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Por Motivo */}
            {resumoPorMotivo.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3">Por Motivo</p>
                  <div className="space-y-3">
                    {resumoPorMotivo.map((r, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-sm">{r.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{r.quantidade}</span>
                            <Badge variant="secondary" className="text-xs">
                              {r.percentual.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        {r.pesoMedioKg != null && (
                          <div className="flex items-center justify-between pl-4 text-[11px] text-muted-foreground">
                            <span title={r.pesoRefKg ? `Esperado ${r.pesoRefKg.toFixed(3)} kg • Real ${r.pesoMedioKg.toFixed(3)} kg` : undefined}>
                              {r.pesoMedioKg.toFixed(3)} kg / ave
                              {r.pesoRefKg ? ` · ref ${r.pesoRefKg.toFixed(3)} kg` : ''}
                            </span>
                            {renderIR(r.ir, r.classificacao)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Por Dia */}
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Por Dia
                </p>
                {mortalidadePorDia.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma mortalidade registrada nesta semana
                  </p>
                ) : (
                  <div className="space-y-3">
                    {mortalidadePorDia.map((dia) => (
                      <div key={dia.data} className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Dia {dia.dia} ({format(new Date(dia.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })})
                          </span>
                          <Badge variant="outline">
                            {dia.totalMortes} aves
                          </Badge>
                        </div>

                        {dia.pesoMedioKg != null && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              Peso morto {dia.pesoMedioKg.toFixed(3)} kg
                              {dia.pesoRefKg > 0 && ` · ref ${dia.pesoRefKg.toFixed(3)} kg`}
                              {dia.ir != null && (
                                <span className={dia.ir < 0.85 ? 'text-green-600 dark:text-green-400 ml-1' : 'text-amber-600 dark:text-amber-400 ml-1'}>
                                  ({((dia.ir - 1) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </span>
                            {renderIR(dia.ir, dia.classificacao)}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-1">
                          {dia.porMotivo.map((pm, idx) => {
                            let label = MOTIVO_LABELS[pm.motivo] || pm.motivo;
                            if (pm.submotivo) {
                              label += ` - ${SUBMOTIVO_LABELS[pm.submotivo] || pm.submotivo}`;
                            }
                            return (
                              <span key={idx} className="block">
                                └ {label}: {pm.quantidade}
                                {pm.pesoMedioKg != null && (
                                  <span className="ml-1 text-[10px]">
                                    ({pm.pesoMedioKg.toFixed(3)} kg/ave)
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
