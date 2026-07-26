import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfigFechamento } from '@/hooks/useConfigFechamento';
import { useDadosInternosLote } from '@/hooks/useDadosInternosLote';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { calcularIdadeNaData } from '@/lib/utils';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { AbaAbate, AbateCampos } from './fechamento/AbaAbate';
import { AbaCargas } from './fechamento/AbaCargas';
import { AbaCondenacoes } from './fechamento/AbaCondenacoes';
import { AbaPartilha, PartilhaCampos } from './fechamento/AbaPartilha';
import { PainelDivergencias } from './fechamento/PainelDivergencias';
import { ImportarRipiPdf, BlocoRipi } from './fechamento/ImportarRipiPdf';
import { RipiExtracao, str } from '@/lib/utils/ripiImport';
import {
  CargaAbate,
  CondenacaoItem,
  DescontoItem,
  calcularPartilha,
  calcularValoresFinais,
  compararDados,
  percentualCondenacao,
  totalizarCargas,
} from '@/lib/utils/fechamentoRipi';


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

const camposAbateIniciais = (): AbateCampos => ({
  dataAbate: format(new Date(), 'yyyy-MM-dd'),
  horaMediaAbate: '',
  avesAbatidas: '',
  pesoTotalAbatido: '',
  consumoTotalRacao: '',
  tipoProduto: '',
  abatedouro: '',
  loteIntegradora: '',
  tecnicoResponsavel: '',
  conversaoPrevista: '',
  mortalidadePrevista: '',
});

const camposPartilhaIniciais = (): PartilhaCampos => ({
  precoKgFrango: '',
  valorRacao: '',
  percentualBasico: '',
  avalConversao: '',
  avalCondenacao: '',
  avalCaloPata: '',
  avalChecklist: '',
});

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
  onSuccess,
}: FechamentoLoteDialogProps) {
  const { user } = useAuth();
  const { constanteAjusteCA } = useConfigFechamento();
  const { dados: dadosInternos, loading: loadingInternos } = useDadosInternosLote(
    open ? loteId : null,
    quantidadeAlojada,
    open,
  );

  const [abate, setAbate] = useState<AbateCampos>(camposAbateIniciais);
  const [partilha, setPartilha] = useState<PartilhaCampos>(camposPartilhaIniciais);
  const [cargas, setCargas] = useState<CargaAbate[]>([]);
  const [condenacoes, setCondenacoes] = useState<CondenacaoItem[]>([]);
  const [descontos, setDescontos] = useState<DescontoItem[]>([]);
  const [condTotal, setCondTotal] = useState('0');
  const [condParcial, setCondParcial] = useState('0');
  const [caloPataQtd, setCaloPataQtd] = useState('0');
  const [patasCondenadas, setPatasCondenadas] = useState('0');
  const [pcCondenacaoPrevisto, setPcCondenacaoPrevisto] = useState('');
  const [pcCaloPataPrevisto, setPcCaloPataPrevisto] = useState('');

  const [pesoProjetado, setPesoProjetado] = useState<number | null>(null);
  const [convAjustadaPrev, setConvAjustadaPrev] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAbate(camposAbateIniciais());
    setPartilha(camposPartilhaIniciais());
    setCargas([]);
    setCondenacoes([]);
    setDescontos([]);
    setCondTotal('0');
    setCondParcial('0');
    setCaloPataQtd('0');
    setPatasCondenadas('0');
    setPcCondenacaoPrevisto('');
    setPcCaloPataPrevisto('');
  }, [open, loteId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!open || !loteId) return;
      setLoading(true);

      const { data: metasData } = await supabase
        .from('metas_peso')
        .select('meta_42_dias_kg')
        .eq('lote_id', loteId)
        .maybeSingle();

      if (metasData) setPesoProjetado(metasData.meta_42_dias_kg);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: prevData } = await supabase
        .from('fechamento_lotes')
        .select('conversao_ajustada')
        .eq('integrado_id', integradoId)
        .gte('data_abate', format(oneWeekAgo, 'yyyy-MM-dd'))
        .lt('data_abate', format(new Date(), 'yyyy-MM-dd'));

      if (prevData && prevData.length > 0) {
        const validas = prevData.filter((d) => d.conversao_ajustada !== null);
        if (validas.length > 0) {
          const sum = validas.reduce((acc, d) => acc + Number(d.conversao_ajustada), 0);
          setConvAjustadaPrev(sum / validas.length);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [open, loteId, integradoId]);

  const totaisCargas = totalizarCargas(cargas);
  const cargasInformadas = cargas.length > 0 && totaisCargas.quantidade > 0;

  // Cargas alimentam os totais de abate quando informadas
  useEffect(() => {
    if (!cargasInformadas) return;
    setAbate((prev) => ({
      ...prev,
      avesAbatidas: String(totaisCargas.quantidade),
      pesoTotalAbatido: String(totaisCargas.pesoTotal),
    }));
  }, [cargasInformadas, totaisCargas.quantidade, totaisCargas.pesoTotal]);

  const metrics = useMemo(() => {
    const avesAbatidasNum = parseFloat(abate.avesAbatidas) || 0;
    const pesoTotalNum = parseFloat(abate.pesoTotalAbatido) || 0;
    const consumoNum = parseFloat(abate.consumoTotalRacao) || 0;
    const pesoInicialNum = pesoInicialPintinhos || 0.042;

    if (!dataAlojamento || avesAbatidasNum <= 0) return null;

    const idadeAbate = calcularIdadeNaData(dataAlojamento, abate.dataAbate);
    const pesoMedioReal = pesoTotalNum / avesAbatidasNum;
    const gpdGramas = idadeAbate > 0 ? ((pesoMedioReal - pesoInicialNum) * 1000) / idadeAbate : 0;
    const gpdKg = gpdGramas / 1000;
    const conversaoAlimentar = pesoTotalNum > 0 ? consumoNum / pesoTotalNum : 0;
    const viabilidade = quantidadeAlojada > 0 ? (avesAbatidasNum / quantidadeAlojada) * 100 : 0;
    const mortalidade = 100 - viabilidade;

    let conversaoAjustada: number | null = null;
    if (pesoProjetado && conversaoAlimentar > 0) {
      conversaoAjustada = conversaoAlimentar - (pesoMedioReal - pesoProjetado) / constanteAjusteCA;
    }

    const iep = conversaoAlimentar > 0 ? ((gpdKg * viabilidade) / conversaoAlimentar) * 100 : 0;
    let iee: number | null = null;
    if (conversaoAjustada && conversaoAjustada > 0) {
      iee = ((gpdKg * viabilidade) / conversaoAjustada) * 100;
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
      iee,
      avesAbatidasNum,
      pesoTotalNum,
      consumoNum,
    };
  }, [abate, dataAlojamento, quantidadeAlojada, pesoInicialPintinhos, pesoProjetado, constanteAjusteCA]);

  const divergencias = useMemo(
    () =>
      compararDados(
        dadosInternos ?? { racaoConsumidaKg: null, mortalidadePercentual: null, pesoMedioKg: null, avesVivas: null },
        {
          racaoConsumidaKg: metrics?.consumoNum || null,
          mortalidadePercentual: metrics?.mortalidade ?? null,
          pesoMedioKg: metrics?.pesoMedioReal ?? null,
          avesAbatidas: metrics?.avesAbatidasNum ?? null,
        },
      ),
    [dadosInternos, metrics],
  );

  const partilhaCalc = useMemo(
    () =>
      calcularPartilha({
        pesoTotalKg: metrics?.pesoTotalNum ?? 0,
        avesAbatidas: metrics?.avesAbatidasNum ?? 0,
        precoKgFrango: Number(partilha.precoKgFrango) || 0,
        percentualBasico: Number(partilha.percentualBasico) || 0,
        avalConversao: Number(partilha.avalConversao) || 0,
        avalCondenacao: Number(partilha.avalCondenacao) || 0,
        avalCaloPata: Number(partilha.avalCaloPata) || 0,
        avalChecklist: Number(partilha.avalChecklist) || 0,
      }),
    [metrics, partilha],
  );

  const valoresFinais = useMemo(
    () => calcularValoresFinais(partilhaCalc.resultadoBruto.valor, descontos),
    [partilhaCalc, descontos],
  );

  const num = (v: string) => (v === '' ? null : Number(v));

  const handleSubmit = async () => {
    if (!metrics || !user) {
      toast.error('Preencha os dados de abate obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const avesAbatidas = metrics.avesAbatidasNum;
      const { data: fechamento, error: fechamentoError } = await supabase
        .from('fechamento_lotes')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          aves_alojadas: quantidadeAlojada,
          peso_inicial_kg: pesoInicialPintinhos || 0.042,
          data_alojamento: dataAlojamento,
          data_abate: abate.dataAbate,
          hora_media_abate: abate.horaMediaAbate || null,
          aves_abatidas: Math.round(avesAbatidas),
          peso_total_abatido_kg: metrics.pesoTotalNum,
          peso_recebido_kg: metrics.pesoTotalNum,
          consumo_total_racao_kg: metrics.consumoNum,
          tipo_produto: abate.tipoProduto || null,
          abatedouro: abate.abatedouro || null,
          lote_integradora: abate.loteIntegradora || null,
          tecnico_responsavel: abate.tecnicoResponsavel || null,
          conversao_prevista: num(abate.conversaoPrevista),
          mortalidade_prevista: num(abate.mortalidadePrevista),
          aves_condenadas_parcial: parseInt(condParcial) || 0,
          aves_condenadas_total: parseInt(condTotal) || 0,
          calo_pata_quantidade: parseInt(caloPataQtd) || 0,
          patas_condenadas: parseInt(patasCondenadas) || 0,
          pc_condenacao_previsto: num(pcCondenacaoPrevisto),
          pc_condenacao_real: percentualCondenacao(
            (Number(condTotal) || 0) + (Number(condParcial) || 0),
            avesAbatidas,
          ),
          pc_calo_pata_previsto: num(pcCaloPataPrevisto),
          pc_calo_pata_real: percentualCondenacao(Number(caloPataQtd) || 0, avesAbatidas),
          preco_kg_frango: num(partilha.precoKgFrango),
          valor_racao: num(partilha.valorRacao),
          percentual_basico_partilha: num(partilha.percentualBasico),
          aval_conversao_pc: num(partilha.avalConversao),
          aval_condenacao_pc: num(partilha.avalCondenacao),
          aval_calo_pata_pc: num(partilha.avalCaloPata),
          aval_checklist_pc: num(partilha.avalChecklist),
          resultado_bruto_pc: partilhaCalc.resultadoBruto.percentual,
          resultado_bruto_kg: partilhaCalc.resultadoBruto.kg,
          resultado_bruto_valor: partilhaCalc.resultadoBruto.valor,
          resultado_bruto_por_cab: partilhaCalc.resultadoBruto.porCabeca,
          valor_renda_bruta: valoresFinais.rendaBruta,
          valor_total_depositar: valoresFinais.totalDepositar,
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
          fechado_por: user.id,
        })
        .select('id')
        .single();

      if (fechamentoError) throw fechamentoError;
      const fechamentoId = fechamento.id;

      if (cargas.length > 0) {
        const { error } = await supabase.from('fechamento_cargas').insert(
          cargas.map((c) => ({
            fechamento_id: fechamentoId,
            abatedouro: c.abatedouro || null,
            data_abate: c.data_abate || abate.dataAbate,
            quantidade: Math.round(Number(c.quantidade) || 0),
            peso_total_kg: Number(c.peso_total_kg) || 0,
            peso_medio_kg: Number(c.quantidade) > 0 ? Number(c.peso_total_kg) / Number(c.quantidade) : 0,
            nota_produtor: c.nota_produtor || null,
          })),
        );
        if (error) throw error;
      }

      if (condenacoes.length > 0) {
        const { error } = await supabase.from('fechamento_condenacoes').insert(
          condenacoes.map((c) => ({
            fechamento_id: fechamentoId,
            tipo: c.tipo,
            codigo: c.codigo || null,
            descricao: c.descricao || null,
            quantidade: Math.round(Number(c.quantidade) || 0),
            percentual: percentualCondenacao(Number(c.quantidade) || 0, avesAbatidas),
          })),
        );
        if (error) throw error;
      }

      if (descontos.length > 0) {
        const { error } = await supabase.from('fechamento_descontos').insert(
          descontos.map((d) => ({
            fechamento_id: fechamentoId,
            descricao: d.descricao || null,
            debito: Number(d.debito) || 0,
            credito: Number(d.credito) || 0,
            valor_por_cab: avesAbatidas > 0 ? ((Number(d.debito) || 0) + (Number(d.credito) || 0)) / avesAbatidas : 0,
          })),
        );
        if (error) throw error;
      }

      const { error: loteError } = await supabase
        .from('lotes')
        .update({ status: 'fechado', data_fechamento: abate.dataAbate })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Fechamento de Lote (RIPI)
          </DialogTitle>
          <DialogDescription>
            Registre abate, cargas, condenações e a partilha do integrado para gerar o resultado do lote
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="abate">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
                <TabsTrigger value="abate">Abate</TabsTrigger>
                <TabsTrigger value="cargas">Cargas</TabsTrigger>
                <TabsTrigger value="condenacoes">Condenações</TabsTrigger>
                <TabsTrigger value="partilha">Partilha</TabsTrigger>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
              </TabsList>

              <TabsContent value="abate" className="mt-4">
                <AbaAbate
                  campos={abate}
                  onChangeCampo={(campo, valor) => setAbate((p) => ({ ...p, [campo]: valor }))}
                  quantidadeAlojada={quantidadeAlojada}
                  pesoInicialPintinhos={pesoInicialPintinhos}
                  dataAlojamento={dataAlojamento}
                  linhagem={linhagem}
                  sexo={sexo}
                  cargasInformadas={cargasInformadas}
                />
              </TabsContent>

              <TabsContent value="cargas" className="mt-4">
                <AbaCargas cargas={cargas} onChange={setCargas} dataAbatePadrao={abate.dataAbate} />
              </TabsContent>

              <TabsContent value="condenacoes" className="mt-4">
                <AbaCondenacoes
                  avesAbatidas={metrics?.avesAbatidasNum ?? 0}
                  condenadasTotal={condTotal}
                  condenadasParcial={condParcial}
                  caloPataQtd={caloPataQtd}
                  patasCondenadas={patasCondenadas}
                  pcCondenacaoPrevisto={pcCondenacaoPrevisto}
                  pcCaloPataPrevisto={pcCaloPataPrevisto}
                  onChangeCampo={(campo, valor) => {
                    if (campo === 'condenadasTotal') setCondTotal(valor);
                    if (campo === 'condenadasParcial') setCondParcial(valor);
                    if (campo === 'caloPataQtd') setCaloPataQtd(valor);
                    if (campo === 'patasCondenadas') setPatasCondenadas(valor);
                    if (campo === 'pcCondenacaoPrevisto') setPcCondenacaoPrevisto(valor);
                    if (campo === 'pcCaloPataPrevisto') setPcCaloPataPrevisto(valor);
                  }}
                  itens={condenacoes}
                  onChangeItens={setCondenacoes}
                />
              </TabsContent>

              <TabsContent value="partilha" className="mt-4">
                <AbaPartilha
                  campos={partilha}
                  onChangeCampo={(campo, valor) => setPartilha((p) => ({ ...p, [campo]: valor }))}
                  descontos={descontos}
                  onChangeDescontos={setDescontos}
                  pesoTotalKg={metrics?.pesoTotalNum ?? 0}
                  avesAbatidas={metrics?.avesAbatidasNum ?? 0}
                />
              </TabsContent>

              <TabsContent value="resumo" className="mt-4 space-y-4">
                {metrics ? (
                  <Card className="border-primary/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Métricas calculadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground text-xs">Idade abate</p>
                          <p className="text-xl font-bold">{metrics.idadeAbate} <span className="text-xs font-normal">dias</span></p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground text-xs">Peso médio real</p>
                          <p className="text-xl font-bold">{metrics.pesoMedioReal.toFixed(3)} <span className="text-xs font-normal">kg</span></p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground text-xs">GPD</p>
                          <p className="text-xl font-bold">{metrics.gpdGramas.toFixed(1)} <span className="text-xs font-normal">g/dia</span></p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-muted-foreground text-xs">Conversão alimentar</p>
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
                            <p className="text-muted-foreground text-xs">IEE (CA ajustada)</p>
                            <p className="text-xl font-bold text-primary">{metrics.iee.toFixed(0)}</p>
                          </div>
                        )}
                      </div>

                      {metrics.conversaoAjustada !== null && (
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Conversão ajustada</p>
                            <p className="text-xs text-muted-foreground">
                              CA - (PM - PP) / {constanteAjusteCA}
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
                      )}

                      {!pesoProjetado && (
                        <div className="mt-4 flex items-center gap-2 text-amber-500 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Peso projetado não encontrado nas metas do lote — conversão ajustada indisponível.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      Informe as aves abatidas na aba Abate (ou cadastre as cargas) para calcular as métricas.
                    </CardContent>
                  </Card>
                )}

                <PainelDivergencias divergencias={divergencias} loading={loadingInternos} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !metrics} className="gap-2">
                {submitting ? 'Fechando...' : 'Fechar Lote'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
