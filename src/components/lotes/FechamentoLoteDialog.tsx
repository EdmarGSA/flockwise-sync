import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfigFechamento } from '@/hooks/useConfigFechamento';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { calcularIdadeNaData } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { Lock, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';

interface FechamentoLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  dataAlojamento: string;
  quantidadeAlojada: number;
  pesoInicialPintinhos: number | null;
  linhagem: string;
  sexo: string;
  onSuccess?: () => void;
}

export function FechamentoLoteDialog({
  open,
  onOpenChange,
  loteId,
  integradoId,
  dataAlojamento,
  quantidadeAlojada,
  pesoInicialPintinhos,
  linhagem,
  sexo,
  onSuccess
}: FechamentoLoteDialogProps) {
  const { user } = useAuth();
  const { constanteAjusteCA } = useConfigFechamento();

  // User inputs
  const [dataAbate, setDataAbate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [avesAbatidas, setAvesAbatidas] = useState<string>('');
  const [pesoTotalAbatido, setPesoTotalAbatido] = useState<string>('');
  const [consumoTotalRacao, setConsumoTotalRacao] = useState<string>('');
  const [avesCondenadasParcial, setAvesCondenadasParcial] = useState<string>('0');
  const [avesCondenadasTotal, setAvesCondenadasTotal] = useState<string>('0');
  const [caloPataQtd, setCaloPataQtd] = useState<string>('0');
  
  const [pesoProjetado, setPesoProjetado] = useState<number | null>(null);
  const [convAjustadaPrev, setConvAjustadaPrev] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch peso projetado from metas_peso
  useEffect(() => {
    const fetchData = async () => {
      if (!open || !loteId) return;

      setLoading(true);
      
      // Fetch metas_peso for peso projetado
      const { data: metasData } = await supabase
        .from('metas_peso')
        .select('meta_42_dias_kg')
        .eq('lote_id', loteId)
        .maybeSingle();

      if (metasData) {
        setPesoProjetado(metasData.meta_42_dias_kg);
      }

      // Fetch previous week's average adjusted conversion
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: prevData } = await supabase
        .from('fechamento_lotes')
        .select('conversao_ajustada')
        .eq('integrado_id', integradoId)
        .gte('data_abate', format(oneWeekAgo, 'yyyy-MM-dd'))
        .lt('data_abate', format(new Date(), 'yyyy-MM-dd'));

      if (prevData && prevData.length > 0) {
        const validConversions = prevData.filter(d => d.conversao_ajustada !== null);
        if (validConversions.length > 0) {
          const sum = validConversions.reduce((acc, d) => acc + Number(d.conversao_ajustada), 0);
          setConvAjustadaPrev(sum / validConversions.length);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [open, loteId, integradoId]);

  // Calculated metrics
  const metrics = useMemo(() => {
    const avesAbatidasNum = parseFloat(avesAbatidas) || 0;
    const pesoTotalNum = parseFloat(pesoTotalAbatido) || 0;
    const consumoNum = parseFloat(consumoTotalRacao) || 0;
    const pesoInicialNum = pesoInicialPintinhos || 0.042;

    if (!dataAlojamento || avesAbatidasNum <= 0) {
      return null;
    }

    const idadeAbate = calcularIdadeNaData(dataAlojamento, dataAbate);
    const pesoMedioReal = pesoTotalNum / avesAbatidasNum;
    const gpdGramas = idadeAbate > 0 ? ((pesoMedioReal - pesoInicialNum) * 1000) / idadeAbate : 0;
    const gpdKg = gpdGramas / 1000;
    
    // CA = Consumo Total / Peso Total Abatido
    const conversaoAlimentar = pesoTotalNum > 0 ? consumoNum / pesoTotalNum : 0;
    
    // Viabilidade = (Aves Abatidas / Aves Alojadas) * 100
    const viabilidade = quantidadeAlojada > 0 ? (avesAbatidasNum / quantidadeAlojada) * 100 : 0;
    
    // Mortalidade = 100 - Viabilidade
    const mortalidade = 100 - viabilidade;
    
    // CAc = CA - (PM - PP) / K
    let conversaoAjustada: number | null = null;
    if (pesoProjetado && conversaoAlimentar > 0) {
      conversaoAjustada = conversaoAlimentar - (pesoMedioReal - pesoProjetado) / constanteAjusteCA;
    }

    // IEP = (GPD * VB) / CA * 100
    const iep = conversaoAlimentar > 0 ? (gpdKg * viabilidade) / conversaoAlimentar * 100 : 0;

    // IEE = (GPD * VB) / CA Ajustada * 100
    let iee: number | null = null;
    if (conversaoAjustada && conversaoAjustada > 0) {
      iee = (gpdKg * viabilidade) / conversaoAjustada * 100;
    }

    return {
      idadeAbate,
      pesoMedioReal,
      gpdKg,
      gpdGramas,
      conversaoAlimentar,
      conversaoAjustada,
      viabilidade,
      mortalidade,
      iep,
      iee
    };
  }, [dataAbate, avesAbatidas, pesoTotalAbatido, consumoTotalRacao, dataAlojamento, quantidadeAlojada, pesoInicialPintinhos, pesoProjetado, constanteAjusteCA]);

  const handleSubmit = async () => {
    if (!metrics || !user) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      // Insert fechamento_lotes
      const { error: fechamentoError } = await supabase
        .from('fechamento_lotes')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          aves_alojadas: quantidadeAlojada,
          peso_inicial_kg: pesoInicialPintinhos || 0.042,
          data_alojamento: dataAlojamento,
          data_abate: dataAbate,
          aves_abatidas: parseInt(avesAbatidas),
          peso_total_abatido_kg: parseFloat(pesoTotalAbatido),
          consumo_total_racao_kg: parseFloat(consumoTotalRacao),
          aves_condenadas_parcial: parseInt(avesCondenadasParcial) || 0,
          aves_condenadas_total: parseInt(avesCondenadasTotal) || 0,
          calo_pata_quantidade: parseInt(caloPataQtd) || 0,
          idade_abate: metrics.idadeAbate,
          peso_medio_real_kg: metrics.pesoMedioReal,
          gpd_kg: metrics.gpdKg,
          conversao_alimentar: metrics.conversaoAlimentar,
          peso_projetado_kg: pesoProjetado,
          conversao_ajustada: metrics.conversaoAjustada,
          viabilidade_percentual: metrics.viabilidade,
          mortalidade_percentual: metrics.mortalidade,
          iep: metrics.iep,
          iee: metrics.iee,
          conv_ajustada_prev: convAjustadaPrev,
          fechado_por: user.id
        });

      if (fechamentoError) throw fechamentoError;

      // Update lote status to fechado
      const { error: loteError } = await supabase
        .from('lotes')
        .update({
          status: 'fechado',
          data_fechamento: dataAbate
        })
        .eq('id', loteId);

      if (loteError) throw loteError;

      toast.success('Lote fechado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao fechar lote:', error);
      toast.error('Erro ao fechar lote');
    } finally {
      setSubmitting(false);
    }
  };

  const getLinhagemLabel = (lin: string) => {
    const labels: Record<string, string> = {
      cobb_500: 'Cobb 500',
      ross_308: 'Ross 308',
      hubbard: 'Hubbard',
    };
    return labels[lin] || lin;
  };

  const getSexoLabel = (s: string) => {
    const labels: Record<string, string> = {
      macho: 'Macho',
      femea: 'Fêmea',
      misto: 'Misto',
    };
    return labels[s] || s;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Fechamento de Lote
          </DialogTitle>
          <DialogDescription>
            Registre os dados de abate para calcular as métricas de desempenho
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dados de Alojamento (read-only) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  Dados de Alojamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Aves Alojadas</p>
                    <p className="font-medium">{quantidadeAlojada.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso Inicial</p>
                    <p className="font-medium">{((pesoInicialPintinhos || 0.042) * 1000).toFixed(0)} g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data Alojamento</p>
                    <p className="font-medium">
                      {dataAlojamento && !isNaN(parseISO(dataAlojamento).getTime()) 
                        ? format(parseISO(dataAlojamento), 'dd/MM/yyyy', { locale: ptBR }) 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Linhagem / Sexo</p>
                    <p className="font-medium">{getLinhagemLabel(linhagem)} / {getSexoLabel(sexo)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados de Abate (user input) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dados de Abate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Data do Abate</Label>
                    <Input
                      type="date"
                      value={dataAbate}
                      onChange={(e) => setDataAbate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aves Abatidas</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={avesAbatidas}
                      onChange={(e) => setAvesAbatidas(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso Total Abatido (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={pesoTotalAbatido}
                      onChange={(e) => setPesoTotalAbatido(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumo Total Ração (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={consumoTotalRacao}
                      onChange={(e) => setConsumoTotalRacao(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Condenações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Condenações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Condenadas Parcial</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={avesCondenadasParcial}
                      onChange={(e) => setAvesCondenadasParcial(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Condenadas Total</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={avesCondenadasTotal}
                      onChange={(e) => setAvesCondenadasTotal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Calo de Pata (patas)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={caloPataQtd}
                      onChange={(e) => setCaloPataQtd(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Métricas Calculadas */}
            {metrics && (
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Métricas Calculadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs">Idade Abate</p>
                      <p className="text-xl font-bold">{metrics.idadeAbate} <span className="text-xs font-normal">dias</span></p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs">Peso Médio Real</p>
                      <p className="text-xl font-bold">{metrics.pesoMedioReal.toFixed(3)} <span className="text-xs font-normal">kg</span></p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs">GPD</p>
                      <p className="text-xl font-bold">{metrics.gpdGramas.toFixed(1)} <span className="text-xs font-normal">g/dia</span></p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs">Conversão Alimentar</p>
                      <p className="text-xl font-bold">{metrics.conversaoAlimentar.toFixed(3)}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs">Viabilidade</p>
                      <p className="text-xl font-bold text-primary">{metrics.viabilidade.toFixed(2)} <span className="text-xs font-normal">%</span></p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs">Mortalidade</p>
                      <p className={`text-xl font-bold ${metrics.mortalidade > 5 ? 'text-destructive' : ''}`}>
                        {metrics.mortalidade.toFixed(2)} <span className="text-xs font-normal">%</span>
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <p className="text-muted-foreground text-xs">IEP</p>
                      <p className="text-xl font-bold text-primary">{metrics.iep.toFixed(0)}</p>
                    </div>
                    {metrics.iee !== null && (
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                        <p className="text-muted-foreground text-xs">IEE (CA Ajustada)</p>
                        <p className="text-xl font-bold text-primary">{metrics.iee.toFixed(0)}</p>
                      </div>
                    )}
                  </div>

                  {/* Conversão Ajustada */}
                  {metrics.conversaoAjustada !== null && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Conversão Ajustada</p>
                          <p className="text-xs text-muted-foreground">
                            CA - (PM - PP) / {constanteAjusteCA} = {metrics.conversaoAlimentar.toFixed(3)} - ({metrics.pesoMedioReal.toFixed(3)} - {pesoProjetado?.toFixed(3)}) / {constanteAjusteCA}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{metrics.conversaoAjustada.toFixed(3)}</p>
                          {convAjustadaPrev && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Prev. semana:</span>
                              <Badge variant={metrics.conversaoAjustada <= convAjustadaPrev ? 'default' : 'destructive'}>
                                {convAjustadaPrev.toFixed(3)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!pesoProjetado && (
                    <div className="mt-4 flex items-center gap-2 text-amber-500 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Peso projetado não encontrado nas metas. Configure as metas do lote para calcular a conversão ajustada.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !metrics}
                className="gap-2"
              >
                {submitting ? 'Fechando...' : 'Fechar Lote'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
