import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skull, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

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

interface MortalidadeDia {
  dia: number;
  data: string;
  totalMortes: number;
  porMotivo: {
    motivo: string;
    submotivo: string | null;
    quantidade: number;
  }[];
}

interface ResumoMotivo {
  label: string;
  quantidade: number;
  percentual: number;
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

  useEffect(() => {
    if (open && loteId && dataAlojamento) {
      fetchMortalidadeDetalhada();
    }
  }, [open, loteId, dataAlojamento, diaInicio, diaFim]);

  const fetchMortalidadeDetalhada = async () => {
    setLoading(true);

    try {
      // Calculate date range for this week
      const alojamentoDate = new Date(dataAlojamento);
      const dataInicio = addDays(alojamentoDate, diaInicio - 1);
      const dataFimCalc = addDays(alojamentoDate, diaFim - 1);

      // Fetch mortality with items for this lot
      const { data: mortalidadeData, error } = await supabase
        .from('mortalidade')
        .select(`
          data_registro,
          mortalidade_itens (
            motivo,
            submotivo,
            quantidade
          )
        `)
        .eq('lote_id', loteId)
        .gte('data_registro', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data_registro', format(dataFimCalc, 'yyyy-MM-dd'));

      if (error) {
        console.error('Error fetching mortality:', error);
        setLoading(false);
        return;
      }

      // Process data by day
      const porDiaMap: Record<string, MortalidadeDia> = {};
      const motivoTotals: Record<string, number> = {};
      let totalGeral = 0;

      mortalidadeData?.forEach((m: any) => {
        const dataReg = m.data_registro;
        const diaCalc = Math.floor((new Date(dataReg).getTime() - alojamentoDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (!porDiaMap[dataReg]) {
          porDiaMap[dataReg] = {
            dia: diaCalc,
            data: dataReg,
            totalMortes: 0,
            porMotivo: [],
          };
        }

        m.mortalidade_itens?.forEach((item: any) => {
          const quantidade = item.quantidade || 0;
          porDiaMap[dataReg].totalMortes += quantidade;
          totalGeral += quantidade;

          // Aggregate by motivo for this day
          const existingMotivo = porDiaMap[dataReg].porMotivo.find(
            pm => pm.motivo === item.motivo && pm.submotivo === item.submotivo
          );
          if (existingMotivo) {
            existingMotivo.quantidade += quantidade;
          } else {
            porDiaMap[dataReg].porMotivo.push({
              motivo: item.motivo,
              submotivo: item.submotivo,
              quantidade,
            });
          }

          // Aggregate totals by motivo
          const motivoKey = item.submotivo 
            ? `${item.motivo}-${item.submotivo}` 
            : item.motivo;
          motivoTotals[motivoKey] = (motivoTotals[motivoKey] || 0) + quantidade;
        });
      });

      // Convert to array and sort by day
      const diasArray = Object.values(porDiaMap).sort((a, b) => a.dia - b.dia);
      setMortalidadePorDia(diasArray);
      setTotalSemana(totalGeral);

      // Build resumo por motivo
      const resumo: ResumoMotivo[] = Object.entries(motivoTotals)
        .map(([key, quantidade]) => {
          const [motivo, submotivo] = key.split('-');
          let label = MOTIVO_LABELS[motivo] || motivo;
          if (submotivo) {
            label += ` - ${SUBMOTIVO_LABELS[submotivo] || submotivo}`;
          }
          return {
            label,
            quantidade,
            percentual: totalGeral > 0 ? (quantidade / totalGeral) * 100 : 0,
          };
        })
        .sort((a, b) => b.quantidade - a.quantidade);

      setResumoPorMotivo(resumo);
    } catch (err) {
      console.error('Error processing mortality data:', err);
    }

    setLoading(false);
  };

  const percentualReal = quantidadeAlojada > 0 ? (totalSemana / quantidadeAlojada) * 100 : 0;
  const dentroDaMeta = metaSemana === 0 || percentualReal <= metaSemana;

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

            {/* Por Motivo */}
            {resumoPorMotivo.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3">Por Motivo</p>
                  <div className="space-y-2">
                    {resumoPorMotivo.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between">
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
                      <div key={dia.data} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Dia {dia.dia} ({format(new Date(dia.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })})
                          </span>
                          <Badge variant="outline">
                            {dia.totalMortes} aves
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {dia.porMotivo.map((pm, idx) => {
                            let label = MOTIVO_LABELS[pm.motivo] || pm.motivo;
                            if (pm.submotivo) {
                              label += ` - ${SUBMOTIVO_LABELS[pm.submotivo] || pm.submotivo}`;
                            }
                            return (
                              <span key={idx} className="block">
                                └ {label}: {pm.quantidade}
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
