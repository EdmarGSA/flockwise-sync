import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Save, TrendingUp, Scale, Book, Skull, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import PesagemDetalheDialog from '@/components/veterinario/PesagemDetalheDialog';
import MortalidadeSemanaDetalheDialog from '@/components/lotes/MortalidadeSemanaDetalheDialog';
import { PesagemAnaliseCard } from '@/components/lotes/PesagemAnaliseCard';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  linhagem: string;
  sexo: string;
  peso_medio_pintinhos: number | null;
  nucleo: { nome: string } | null;
  galpao: { nome: string } | null;
}

interface MetasPeso {
  id?: string;
  peso_inicial_kg: number;
  meta_7_dias_kg: number;
  meta_14_dias_kg: number;
  meta_21_dias_kg: number;
  meta_28_dias_kg: number;
  meta_35_dias_kg: number;
  meta_42_dias_kg: number;
  gpd_kg: number;
}

interface PesagemData {
  dia: number;
  peso_real_kg: number;
  data_pesagem: string;
  numSessoes: number;
}

interface PesagemSelecionada {
  dataPesagem: string;
  dia: number;
  pesoReferencia?: number;
}

interface DesempenhoReferencia {
  dia: number;
  peso_g: number;
  ganho_diario_g: number;
  consumo_diario_racao_g: number;
  consumo_acumulado_racao_g: number;
  conversao_alimentar_acumulada: number;
}

interface Multiplicadores {
  mult_7_dias: number;
  mult_14_dias: number;
  mult_21_dias: number;
  mult_28_dias: number;
  mult_35_dias: number;
  mult_42_dias: number;
}

interface MortalidadeMedia {
  mortalidade_7_dias: number;
  mortalidade_14_dias: number;
  mortalidade_21_dias: number;
  mortalidade_28_dias: number;
  mortalidade_35_dias: number;
  mortalidade_42_dias: number;
  mortalidade_acima_42_dias: number;
}

interface MortalidadePorSemana {
  semana: number;
  diaInicio: number;
  diaFim: number;
  mortalidade_semana: number;
  mortalidade_referencia: number;
  quantidade_mortes_semana: number;
  acima_limite: boolean;
}

interface SemanaSelecionada {
  semana: number;
  diaInicio: number;
  diaFim: number;
  metaSemana: number;
}

interface RecebimentoLote {
  quantidade_mortos: number;
  quantidade_eliminados: number;
  quantidade_eliminados_classificacao: number;
  quantidade_eliminados_locomotor: number;
}

const DEFAULT_MULTIPLICADORES: Multiplicadores = {
  mult_7_dias: 4.5,
  mult_14_dias: 2.6,
  mult_21_dias: 1.9,
  mult_28_dias: 1.6,
  mult_35_dias: 1.4,
  mult_42_dias: 1.3,
};

export default function MetasPesoLote() {
  const { user, loading } = useAuth();
  const { integradoId } = useIntegradoId();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const [lote, setLote] = useState<Lote | null>(null);
  const [metas, setMetas] = useState<MetasPeso | null>(null);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [desempenhoReferencia, setDesempenhoReferencia] = useState<DesempenhoReferencia[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMetas, setEditingMetas] = useState<MetasPeso | null>(null);
  const [multiplicadores, setMultiplicadores] = useState<Multiplicadores>(DEFAULT_MULTIPLICADORES);
  
  // Mortalidade states
  const [mortalidadeMedia, setMortalidadeMedia] = useState<MortalidadeMedia | null>(null);
  const [mortalidadePorSemana, setMortalidadePorSemana] = useState<MortalidadePorSemana[]>([]);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState<number>(0);
  const [alertasMortalidade, setAlertasMortalidade] = useState<MortalidadePorSemana[]>([]);
  
  // State para PesagemDetalheDialog e MortalidadeSemanaDetalheDialog
  const [pesagemSelecionada, setPesagemSelecionada] = useState<PesagemSelecionada | null>(null);
  const [semanaSelecionada, setSemanaSelecionada] = useState<SemanaSelecionada | null>(null);
  
  // State para análise de Conversão Alimentar
  const [conversaoData, setConversaoData] = useState<{
    pesoMedio: number;
    avesVivas: number;
    consumoEstimado: number;
    conversaoReal: number;
    conversaoEsperada: number | null;
    diaReferencia: number | null;
    pesoReferencia: number | null;
    diaPesagem: number;
    dataPesagem: string;
  } | null>(null);
  
  // Histórico de CA por pesagem
  interface HistoricoCAItem {
    dia: number;
    dataPesagem: string;
    pesoMedio: number;
    conversaoReal: number;
    conversaoEsperada: number | null;
    diferencaCA: number | null;
  }
  const [historicoCA, setHistoricoCA] = useState<HistoricoCAItem[]>([]);

  useEffect(() => {
    if (user && loteId && integradoId) {
      fetchData();
    }
  }, [user, loteId, integradoId]);

  const fetchData = async () => {
    setLoadingData(true);

    // Fetch lote data
    const { data: loteData, error: loteError } = await supabase
      .from('lotes')
      .select(`
        id,
        quantidade_aves,
        data_alojamento,
        linhagem,
        sexo,
        peso_medio_pintinhos,
        nucleo:nucleos(nome),
        galpao:galpoes(nome)
      `)
      .eq('id', loteId)
      .maybeSingle();

    if (loteError || !loteData) {
      console.error('Erro ao buscar lote:', loteError);
      toast.error('Lote não encontrado');
      navigate('/meus-lotes');
      return;
    }

    setLote(loteData as Lote);

    // Buscar multiplicadores específicos da linhagem/sexo do lote
    if (loteData.linhagem && loteData.sexo && integradoId) {
      const { data: mult } = await supabase
        .from('multiplicadores_meta_peso')
        .select('mult_7_dias, mult_14_dias, mult_21_dias, mult_28_dias, mult_35_dias, mult_42_dias')
        .eq('integrado_id', integradoId)
        .eq('linhagem', loteData.linhagem)
        .eq('sexo', loteData.sexo)
        .maybeSingle();
      
      if (mult) {
        setMultiplicadores(mult);
      }
    }

    // Fetch recebimento_lotes para obter quantidade alojada
    const { data: recebimentoData } = await supabase
      .from('recebimento_lotes')
      .select('quantidade_mortos, quantidade_eliminados, quantidade_eliminados_classificacao, quantidade_eliminados_locomotor')
      .eq('lote_id', loteId)
      .maybeSingle();

    let qtdAlojada = loteData.quantidade_aves;
    if (recebimentoData) {
      const rec = recebimentoData as RecebimentoLote;
      const eliminadosTotal = (rec.quantidade_mortos || 0) + 
                             (rec.quantidade_eliminados || 0) + 
                             (rec.quantidade_eliminados_classificacao || 0) + 
                             (rec.quantidade_eliminados_locomotor || 0);
      qtdAlojada = loteData.quantidade_aves - eliminadosTotal;
    }
    setQuantidadeAlojada(qtdAlojada);

    // Fetch metas de peso
    const { data: metasData } = await supabase
      .from('metas_peso')
      .select('*')
      .eq('lote_id', loteId)
      .maybeSingle();

    if (metasData) {
      const metas: MetasPeso = {
        id: metasData.id,
        peso_inicial_kg: Number(metasData.peso_inicial_kg),
        meta_7_dias_kg: Number(metasData.meta_7_dias_kg),
        meta_14_dias_kg: Number(metasData.meta_14_dias_kg),
        meta_21_dias_kg: Number(metasData.meta_21_dias_kg),
        meta_28_dias_kg: Number(metasData.meta_28_dias_kg),
        meta_35_dias_kg: Number(metasData.meta_35_dias_kg),
        meta_42_dias_kg: Number(metasData.meta_42_dias_kg),
        gpd_kg: Number(metasData.gpd_kg),
      };
      setMetas(metas);
      setEditingMetas(metas);
    } else {
      // peso_medio_pintinhos está em gramas, converter para kg
      const pesoInicialKg = loteData.peso_medio_pintinhos ? Number(loteData.peso_medio_pintinhos) / 1000 : 0;
      if (pesoInicialKg > 0) {
        const calculatedMetas = calcularMetas(pesoInicialKg);
        setEditingMetas(calculatedMetas);
      } else {
        setEditingMetas({
          peso_inicial_kg: 0,
          meta_7_dias_kg: 0,
          meta_14_dias_kg: 0,
          meta_21_dias_kg: 0,
          meta_28_dias_kg: 0,
          meta_35_dias_kg: 0,
          meta_42_dias_kg: 0,
          gpd_kg: 0,
        });
      }
    }

    // Fetch desempenho de referência
    const { data: desempenhoData } = await supabase
      .from('desempenho_aves')
      .select('dia, peso_g, ganho_diario_g, consumo_diario_racao_g, consumo_acumulado_racao_g, conversao_alimentar_acumulada')
      .eq('linhagem', loteData.linhagem)
      .eq('sexo', loteData.sexo)
      .order('dia', { ascending: true });

    if (desempenhoData) {
      setDesempenhoReferencia(desempenhoData);
    }

    // Fetch pesagens
    const { data: pesagensData } = await supabase
      .from('pesagens')
      .select(`
        data_pesagem,
        pesagem_itens (
          quantidade_aves,
          peso_liquido_g
        )
      `)
      .eq('lote_id', loteId)
      .order('data_pesagem', { ascending: true });

    if (pesagensData && loteData.data_alojamento) {
      // Agrupar todas as pesagens parciais do mesmo dia e contar sessões
      const pesagensPorData = pesagensData.reduce((acc: Record<string, { itens: any[], sessoes: Set<string> }>, p: any) => {
        const data = p.data_pesagem;
        if (!acc[data]) acc[data] = { itens: [], sessoes: new Set() };
        acc[data].itens.push(...p.pesagem_itens);
        // Contar sessões únicas pelo created_at (assumindo formato timestamp)
        const sessaoId = p.created_at || p.id || data;
        acc[data].sessoes.add(sessaoId);
        return acc;
      }, {});

      // Calcular média ponderada consolidada por dia - usando +1 para dia do alojamento = Dia 1
      const pesagensProcessed: PesagemData[] = Object.entries(pesagensPorData).map(([data, { itens, sessoes }]) => {
        const totalAves = itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
        const totalPeso = itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_g || 0), 0);
        const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
        const dia = calcularIdadeNaData(loteData.data_alojamento, data);
        
        return {
          dia,
          peso_real_kg: pesoMedio,
          data_pesagem: data,
          numSessoes: sessoes.size,
        };
      }).sort((a, b) => a.dia - b.dia);
      
      setPesagens(pesagensProcessed);
    }

    // Fetch mortalidade média de referência (filtrar por linhagem/sexo com fallback para misto)
    let mortalidadeMediaData = null;
    
    // Primeiro tenta buscar específico para linhagem + sexo
    const { data: mortalidadeEspecifica } = await supabase
      .from('mortalidade_media')
      .select('*')
      .eq('integrado_id', integradoId!)
      .eq('linhagem', loteData.linhagem)
      .eq('sexo', loteData.sexo)
      .maybeSingle();
    
    if (mortalidadeEspecifica) {
      mortalidadeMediaData = mortalidadeEspecifica;
    } else {
      // Fallback: buscar linhagem + misto
      const { data: mortalidadeMisto } = await supabase
        .from('mortalidade_media')
        .select('*')
        .eq('integrado_id', integradoId!)
        .eq('linhagem', loteData.linhagem)
        .eq('sexo', 'misto')
        .maybeSingle();
      
      mortalidadeMediaData = mortalidadeMisto;
    }

    if (mortalidadeMediaData) {
      setMortalidadeMedia({
        mortalidade_7_dias: Number(mortalidadeMediaData.mortalidade_7_dias),
        mortalidade_14_dias: Number(mortalidadeMediaData.mortalidade_14_dias),
        mortalidade_21_dias: Number(mortalidadeMediaData.mortalidade_21_dias),
        mortalidade_28_dias: Number(mortalidadeMediaData.mortalidade_28_dias),
        mortalidade_35_dias: Number(mortalidadeMediaData.mortalidade_35_dias),
        mortalidade_42_dias: Number(mortalidadeMediaData.mortalidade_42_dias),
        mortalidade_acima_42_dias: Number(mortalidadeMediaData.mortalidade_acima_42_dias),
      });
    }

    // Fetch mortalidade do lote - agora calculando por semana (incremental)
    if (loteData.data_alojamento && qtdAlojada > 0) {
      const { data: mortalidadeData } = await supabase
        .from('mortalidade')
        .select(`
          data_registro,
          mortalidade_itens (quantidade)
        `)
        .eq('lote_id', loteId);

      if (mortalidadeData) {
        // Definir semanas com início e fim
        const semanasConfig = [
          { semana: 1, diaInicio: 1, diaFim: 7 },
          { semana: 2, diaInicio: 8, diaFim: 14 },
          { semana: 3, diaInicio: 15, diaFim: 21 },
          { semana: 4, diaInicio: 22, diaFim: 28 },
          { semana: 5, diaInicio: 29, diaFim: 35 },
          { semana: 6, diaInicio: 36, diaFim: 42 },
          { semana: 7, diaInicio: 43, diaFim: 49 },
        ];

        // Metas acumuladas de referência
        const metasAcumuladas = mortalidadeMediaData ? [
          0, // Semana 0 (não existe)
          Number(mortalidadeMediaData.mortalidade_7_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_14_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_21_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_28_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_35_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_42_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_acima_42_dias) || 0,
        ] : [];
        
        const mortalidadeSemanal: MortalidadePorSemana[] = semanasConfig.map((config) => {
          // Calcular mortes APENAS desta semana
          let mortesSemana = 0;
          mortalidadeData.forEach((m: any) => {
            const diaMorte = calcularIdadeNaData(loteData.data_alojamento, m.data_registro);
            if (diaMorte >= config.diaInicio && diaMorte <= config.diaFim) {
              mortesSemana += m.mortalidade_itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);
            }
          });

          const mortalidadeSemana = (mortesSemana / qtdAlojada) * 100;
          
          // Meta da semana = meta acumulada atual - meta acumulada anterior
          const metaAtual = metasAcumuladas[config.semana] || 0;
          const metaAnterior = metasAcumuladas[config.semana - 1] || 0;
          const metaSemana = metaAtual - metaAnterior;

          return {
            semana: config.semana,
            diaInicio: config.diaInicio,
            diaFim: config.diaFim,
            mortalidade_semana: mortalidadeSemana,
            mortalidade_referencia: metaSemana,
            quantidade_mortes_semana: mortesSemana,
            acima_limite: metaSemana > 0 && mortalidadeSemana > metaSemana,
          };
        });

        setMortalidadePorSemana(mortalidadeSemanal);
        
        // Filtrar alertas - semanas já transcorridas com mortalidade acima da meta
        const diasDesdeAloj = calcularIdadeLote(loteData.data_alojamento);
        const alertas = mortalidadeSemanal.filter(m => m.acima_limite && m.diaFim <= diasDesdeAloj);
        setAlertasMortalidade(alertas);
      }
    }

    // Calcular dados de Conversão Alimentar baseado na última pesagem
    if (pesagensData && pesagensData.length > 0 && loteData.data_alojamento && desempenhoData) {
      // Agrupar pesagens por data e calcular a última
      const pesagensPorData = pesagensData.reduce((acc: Record<string, any[]>, p: any) => {
        const data = p.data_pesagem;
        if (!acc[data]) acc[data] = [];
        acc[data].push(...p.pesagem_itens);
        return acc;
      }, {});

      const datasPesagens = Object.keys(pesagensPorData).sort();
      const ultimaData = datasPesagens[datasPesagens.length - 1];
      
      if (ultimaData) {
        const itensDia = pesagensPorData[ultimaData];
        const totalAves = itensDia.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
        const totalPeso = itensDia.reduce((acc: number, item: any) => acc + (item.peso_liquido_g || 0), 0);
        // peso_liquido_g já está em kg (nomenclatura incorreta no banco)
        const pesoMedioKg = totalAves > 0 ? totalPeso / totalAves : 0;
        const diaDaPesagem = calcularIdadeNaData(loteData.data_alojamento, ultimaData);

        // Buscar mortalidade com data_registro para calcular aves vivas por data
        const { data: mortalidadeDataCA } = await supabase
          .from('mortalidade')
          .select(`
            data_registro,
            mortalidade_itens (quantidade)
          `)
          .eq('lote_id', loteId);

        // Função para calcular aves vivas até uma data específica
        const calcularAvesVivasAteData = (dataLimite: string): number => {
          let mortesAteData = 0;
          if (mortalidadeDataCA) {
            mortalidadeDataCA.forEach((m: any) => {
              if (m.data_registro <= dataLimite) {
                mortesAteData += m.mortalidade_itens.reduce(
                  (acc: number, item: any) => acc + item.quantidade, 0
                );
              }
            });
          }
          return qtdAlojada - mortesAteData;
        };

        // Aves vivas NA DATA da última pesagem (não mortalidade total atual)
        const avesVivasNaPesagem = calcularAvesVivasAteData(ultimaData);

        // Buscar consumo acumulado da tabela de referência para o dia da pesagem
        const refDiaPesagem = desempenhoData.find((d: any) => d.dia === diaDaPesagem);
        const consumoAcumuladoG = refDiaPesagem ? refDiaPesagem.consumo_acumulado_racao_g : 0;
        
        // Se não encontrar no dia exato, interpolar ou usar o mais próximo
        let consumoFinal = consumoAcumuladoG;
        if (!refDiaPesagem) {
          const diasDisponiveis = desempenhoData.map((d: any) => d.dia);
          const diaMaisProximo = diasDisponiveis.reduce((prev: number, curr: number) =>
            Math.abs(curr - diaDaPesagem) < Math.abs(prev - diaDaPesagem) ? curr : prev
          );
          const refMaisProximo = desempenhoData.find((d: any) => d.dia === diaMaisProximo);
          if (refMaisProximo) {
            const consumoDiarioEstimado = refMaisProximo.consumo_diario_racao_g || 150;
            consumoFinal = refMaisProximo.consumo_acumulado_racao_g + 
              (diaDaPesagem - diaMaisProximo) * consumoDiarioEstimado;
          }
        }

        // Consumo estimado do lote em kg - usando aves vivas na data da pesagem
        const consumoEstimadoKg = (consumoFinal * avesVivasNaPesagem) / 1000;
        const pesoTotalLoteKg = pesoMedioKg * avesVivasNaPesagem;
        const conversaoReal = pesoTotalLoteKg > 0 ? consumoEstimadoKg / pesoTotalLoteKg : 0;

        // Encontrar o dia de referência cujo peso mais se aproxima do peso medido
        let diaReferencia: number | null = null;
        let conversaoEsperada: number | null = null;
        let pesoReferencia: number | null = null;

        if (desempenhoData.length > 0) {
          // Peso de referência do dia da pesagem
          const refPesoPesagem = desempenhoData.find((d: any) => d.dia === diaDaPesagem);
          pesoReferencia = refPesoPesagem ? refPesoPesagem.peso_g / 1000 : null;

          // Encontrar dia cujo peso_g mais se aproxima do peso medido
          let menorDiferenca = Infinity;
          for (const ref of desempenhoData) {
            // Converter peso de referência para kg para comparar
            const pesoRefKg = (ref as any).peso_g / 1000;
            const diferenca = Math.abs(pesoRefKg - pesoMedioKg);
            if (diferenca < menorDiferenca) {
              menorDiferenca = diferenca;
              diaReferencia = (ref as any).dia;
              conversaoEsperada = (ref as any).conversao_alimentar_acumulada;
            }
          }
        }

        setConversaoData({
          pesoMedio: pesoMedioKg,
          avesVivas: avesVivasNaPesagem,
          consumoEstimado: consumoEstimadoKg,
          conversaoReal,
          conversaoEsperada,
          diaReferencia,
          pesoReferencia,
          diaPesagem: diaDaPesagem,
          dataPesagem: ultimaData,
        });

        // Calcular histórico de CA para todas as pesagens - usando aves vivas por data
        const historicoCACalculado: HistoricoCAItem[] = [];
        
        for (const dataPes of datasPesagens) {
          const itens = pesagensPorData[dataPes];
          const totalAvesDia = itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
          const totalPesoDia = itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_g || 0), 0);
          // peso_liquido_g já está em kg
          const pesoMedioDiaKg = totalAvesDia > 0 ? totalPesoDia / totalAvesDia : 0;
          const diaPes = calcularIdadeNaData(loteData.data_alojamento, dataPes);
          
          // Calcular aves vivas ATÉ esta data específica de pesagem
          const avesVivasDia = calcularAvesVivasAteData(dataPes);
          
          // Buscar consumo para este dia
          const refDia = desempenhoData.find((d: any) => d.dia === diaPes);
          let consumoDia = refDia ? refDia.consumo_acumulado_racao_g : 0;
          
          if (!refDia && desempenhoData.length > 0) {
            const diasDisp = desempenhoData.map((d: any) => d.dia);
            const diaMaisProx = diasDisp.reduce((prev: number, curr: number) =>
              Math.abs(curr - diaPes) < Math.abs(prev - diaPes) ? curr : prev
            );
            const refProx = desempenhoData.find((d: any) => d.dia === diaMaisProx);
            if (refProx) {
              const consumoDiarioEst = refProx.consumo_diario_racao_g || 150;
              consumoDia = refProx.consumo_acumulado_racao_g + (diaPes - diaMaisProx) * consumoDiarioEst;
            }
          }
          
          // Tratar dias 0-6 onde consumo é zero na referência
          if (consumoDia === 0 && diaPes <= 6) {
            historicoCACalculado.push({
              dia: diaPes,
              dataPesagem: dataPes,
              pesoMedio: pesoMedioDiaKg,
              conversaoReal: 0,
              conversaoEsperada: null,
              diferencaCA: null,
            });
            continue;
          }
          
          // Usar aves vivas DA DATA da pesagem (não total atual)
          const consumoKg = (consumoDia * avesVivasDia) / 1000;
          const pesoTotalKg = pesoMedioDiaKg * avesVivasDia;
          const caReal = pesoTotalKg > 0 ? consumoKg / pesoTotalKg : 0;
          
          // Encontrar CA esperada para o peso medido
          let caEsperada: number | null = null;
          if (desempenhoData.length > 0) {
            let menorDif = Infinity;
            for (const ref of desempenhoData) {
              // Converter peso de referência para kg para comparar
              const pesoRefKg = (ref as any).peso_g / 1000;
              const dif = Math.abs(pesoRefKg - pesoMedioDiaKg);
              if (dif < menorDif) {
                menorDif = dif;
                caEsperada = (ref as any).conversao_alimentar_acumulada;
              }
            }
          }
          
          const difCA = caEsperada !== null ? caReal - caEsperada : null;
          
          historicoCACalculado.push({
            dia: diaPes,
            dataPesagem: dataPes,
            pesoMedio: pesoMedioDiaKg,
            conversaoReal: caReal,
            conversaoEsperada: caEsperada,
            diferencaCA: difCA,
          });
        }
        
        setHistoricoCA(historicoCACalculado);
      }
    }

    setLoadingData(false);
  };

  const calcularMetas = (pesoInicial: number): MetasPeso => {
    const meta7 = pesoInicial * multiplicadores.mult_7_dias;
    const meta14 = meta7 * multiplicadores.mult_14_dias;
    const meta21 = meta14 * multiplicadores.mult_21_dias;
    const meta28 = meta21 * multiplicadores.mult_28_dias;
    const meta35 = meta28 * multiplicadores.mult_35_dias;
    const meta42 = meta35 * multiplicadores.mult_42_dias;
    const gpd = (meta42 - pesoInicial) / 42;

    return {
      peso_inicial_kg: pesoInicial,
      meta_7_dias_kg: meta7,
      meta_14_dias_kg: meta14,
      meta_21_dias_kg: meta21,
      meta_28_dias_kg: meta28,
      meta_35_dias_kg: meta35,
      meta_42_dias_kg: meta42,
      gpd_kg: gpd,
    };
  };

  const handleSaveMetas = async () => {
    if (!editingMetas || !loteId || !user) return;

    setSaving(true);

    try {
      if (metas?.id) {
        const { error } = await supabase
          .from('metas_peso')
          .update({
            peso_inicial_kg: editingMetas.peso_inicial_kg,
            meta_7_dias_kg: editingMetas.meta_7_dias_kg,
            meta_14_dias_kg: editingMetas.meta_14_dias_kg,
            meta_21_dias_kg: editingMetas.meta_21_dias_kg,
            meta_28_dias_kg: editingMetas.meta_28_dias_kg,
            meta_35_dias_kg: editingMetas.meta_35_dias_kg,
            meta_42_dias_kg: editingMetas.meta_42_dias_kg,
            gpd_kg: editingMetas.gpd_kg,
          })
          .eq('id', metas.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('metas_peso')
          .insert({
            lote_id: loteId,
            integrado_id: integradoId!,
            peso_inicial_kg: editingMetas.peso_inicial_kg,
            meta_7_dias_kg: editingMetas.meta_7_dias_kg,
            meta_14_dias_kg: editingMetas.meta_14_dias_kg,
            meta_21_dias_kg: editingMetas.meta_21_dias_kg,
            meta_28_dias_kg: editingMetas.meta_28_dias_kg,
            meta_35_dias_kg: editingMetas.meta_35_dias_kg,
            meta_42_dias_kg: editingMetas.meta_42_dias_kg,
            gpd_kg: editingMetas.gpd_kg,
          });

        if (error) throw error;
      }

      toast.success('Metas salvas com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalcular = () => {
    if (!editingMetas) return;
    const novasMetas = calcularMetas(editingMetas.peso_inicial_kg);
    setEditingMetas(novasMetas);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Prepare chart data for peso
  const chartData = [0, 7, 14, 21, 28, 35, 42].map(dia => {
    const refData = desempenhoReferencia.find(d => d.dia === dia);
    const metaKeys: Record<number, keyof MetasPeso> = {
      0: 'peso_inicial_kg',
      7: 'meta_7_dias_kg',
      14: 'meta_14_dias_kg',
      21: 'meta_21_dias_kg',
      28: 'meta_28_dias_kg',
      35: 'meta_35_dias_kg',
      42: 'meta_42_dias_kg',
    };
    return {
      dia,
      meta: editingMetas ? editingMetas[metaKeys[dia]] || 0 : 0,
      referencia: refData ? refData.peso_g / 1000 : undefined,
    };
  });

  pesagens.forEach((p) => {
    const existing = chartData.find((c) => c.dia === p.dia);
    if (existing) {
      (existing as any).real = p.peso_real_kg;
    } else {
      const refData = desempenhoReferencia.find(d => d.dia === p.dia);
      chartData.push({ 
        dia: p.dia, 
        meta: 0, 
        real: p.peso_real_kg,
        referencia: refData ? refData.peso_g / 1000 : undefined,
      } as any);
    }
  });

  chartData.sort((a, b) => a.dia - b.dia);

  // Prepare chart data for mortalidade (convertendo para formato acumulado para o gráfico)
  const mortalidadeChartData = mortalidadePorSemana.map((m, idx) => {
    // Calcular mortalidade acumulada até esta semana para o gráfico
    const mortalidadeAcumulada = mortalidadePorSemana
      .slice(0, idx + 1)
      .reduce((acc, s) => acc + s.mortalidade_semana, 0);
    const referenciaAcumulada = mortalidadePorSemana
      .slice(0, idx + 1)
      .reduce((acc, s) => acc + s.mortalidade_referencia, 0);
    
    return {
      dia: m.diaFim,
      real: mortalidadeAcumulada,
      referencia: referenciaAcumulada,
    };
  });

  const diasDesdeAlojamento = lote?.data_alojamento 
    ? calcularIdadeLote(lote.data_alojamento)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/meus-lotes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">Metas</span>
                  {alertasMortalidade.length > 0 && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </div>
                {lote && (
                  <p className="text-sm text-muted-foreground">
                    {lote.nucleo?.nome} - {lote.galpao?.nome}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Badge variant="secondary" className="gap-1">
            <Scale className="w-3 h-3" />
            {diasDesdeAlojamento} dias
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-28">
        {loadingData ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-6">
            {/* Alertas de Mortalidade */}
            {alertasMortalidade.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Mortalidade acima da referência!</AlertTitle>
                <AlertDescription>
                  {alertasMortalidade.map(a => (
                    <span key={a.semana} className="block">
                      Semana {a.semana} (Dias {a.diaInicio}-{a.diaFim}): {a.mortalidade_semana.toFixed(2)}% (Meta: {a.mortalidade_referencia.toFixed(2)}%)
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart Peso */}
              <Card className="lg:col-span-2 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Peso Real vs Meta
                  </CardTitle>
                  <CardDescription>
                    Comparativo de peso ao longo do ciclo do lote
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="dia" 
                          label={{ value: 'Dias', position: 'insideBottom', offset: -5 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(3)} kg`,
                            name === 'meta' ? 'Meta' : name === 'referencia' ? 'Ref. Linhagem' : 'Peso Real'
                          ]}
                        />
                        <Legend />
                        <ReferenceLine x={diasDesdeAlojamento} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Hoje" />
                        <Line 
                          type="monotone" 
                          dataKey="referencia" 
                          stroke="hsl(var(--chart-3))" 
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={{ fill: 'hsl(var(--chart-3))' }}
                          name="Ref. Linhagem"
                          connectNulls
                        />
                        <Line 
                          type="monotone" 
                          dataKey="meta" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: 'hsl(var(--muted-foreground))' }}
                          name="Meta"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="real" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))' }}
                          name="Peso Real"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Metas Form */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Configurar Metas
                  </CardTitle>
                  <CardDescription>
                    Defina as metas de peso para cada semana
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingMetas && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Peso Inicial (kg)</Label>
                          {lote?.peso_medio_pintinhos && (
                            <span className="text-xs text-muted-foreground">
                              Do lote: {Number(lote.peso_medio_pintinhos).toFixed(3)} kg
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={editingMetas.peso_inicial_kg}
                            onChange={(e) => setEditingMetas({
                              ...editingMetas,
                              peso_inicial_kg: parseFloat(e.target.value) || 0
                            })}
                            placeholder={lote?.peso_medio_pintinhos ? `${Number(lote.peso_medio_pintinhos).toFixed(3)}` : 'Digite o peso inicial'}
                          />
                          <Button variant="outline" onClick={handleRecalcular} size="icon" title="Recalcular">
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { dia: 7, key: 'meta_7_dias_kg' },
                          { dia: 14, key: 'meta_14_dias_kg' },
                          { dia: 21, key: 'meta_21_dias_kg' },
                          { dia: 28, key: 'meta_28_dias_kg' },
                          { dia: 35, key: 'meta_35_dias_kg' },
                          { dia: 42, key: 'meta_42_dias_kg' },
                        ].map(({ dia, key }) => {
                          const metaValue = (editingMetas as any)[key] as number;
                          const refData = desempenhoReferencia.find(d => d.dia === dia);
                          const refValue = refData ? refData.peso_g / 1000 : 0;
                          const diff = refValue > 0 ? ((metaValue - refValue) / refValue) * 100 : 0;
                          
                          return (
                            <div key={dia} className="grid grid-cols-12 gap-2 items-center">
                              <Label className="col-span-3 text-xs">{dia} dias</Label>
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={metaValue.toFixed(3)}
                                  onChange={(e) => setEditingMetas({
                                    ...editingMetas,
                                    [key]: parseFloat(e.target.value) || 0
                                  })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              {refValue > 0 && (
                                <>
                                  <div className="col-span-3 text-xs text-muted-foreground text-center">
                                    Ref: {refValue.toFixed(3)}
                                  </div>
                                  <div className="col-span-2">
                                    <Badge 
                                      variant={diff >= 0 ? 'default' : 'destructive'}
                                      className="text-[10px] w-full justify-center"
                                    >
                                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </>
                              )}
                              {refValue === 0 && <div className="col-span-5" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-border">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                          <span className="font-medium">GPD (kg/dia)</span>
                          <span className="text-lg font-bold text-primary">
                            {editingMetas.gpd_kg.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <Button 
                        className="w-full gap-2" 
                        onClick={handleSaveMetas}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Salvando...' : 'Salvar Metas'}
                      </Button>
                    </>
                  )}

                  {!editingMetas && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Defina o peso inicial do lote para calcular as metas personalizadas
                      </p>
                      <div className="space-y-2">
                        <Label>Peso Inicial (kg)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="Ex: 0.042"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (value > 0) {
                                setEditingMetas(calcularMetas(value));
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      {desempenhoReferencia.length > 0 && (
                        <div className="pt-4 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-3">
                            Ou use os valores de referência da linhagem:
                          </p>
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => {
                              const getRefValue = (dia: number) => {
                                const ref = desempenhoReferencia.find(d => d.dia === dia);
                                return ref ? ref.peso_g / 1000 : 0;
                              };
                              const pesoInicial = getRefValue(0);
                              const meta42 = getRefValue(42);
                              const gpd = pesoInicial > 0 && meta42 > 0 ? (meta42 - pesoInicial) / 42 : 0;
                              
                              setEditingMetas({
                                peso_inicial_kg: pesoInicial,
                                meta_7_dias_kg: getRefValue(7),
                                meta_14_dias_kg: getRefValue(14),
                                meta_21_dias_kg: getRefValue(21),
                                meta_28_dias_kg: getRefValue(28),
                                meta_35_dias_kg: getRefValue(35),
                                meta_42_dias_kg: meta42,
                                gpd_kg: gpd,
                              });
                              toast.success('Metas preenchidas com valores de referência');
                            }}
                          >
                            <Book className="w-4 h-4" />
                            Usar Referência ({lote?.linhagem?.replace('_', ' ').toUpperCase()})
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Mortalidade */}
              <Card className="lg:col-span-3 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Skull className="w-5 h-5" />
                    Mortalidade Real vs Referência
                  </CardTitle>
                  <CardDescription>
                    Comparativo de mortalidade acumulada ao longo do ciclo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!mortalidadeMedia ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Configure a mortalidade média de referência para comparação
                      </p>
                      <Button variant="outline" asChild>
                        <Link to="/configuracoes/mortalidade-media">
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar Referência
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mortalidadeChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="dia" 
                            label={{ value: 'Dias', position: 'insideBottom', offset: -5 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            label={{ value: 'Mortalidade (%)', angle: -90, position: 'insideLeft' }}
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(2)}%`,
                              name === 'referencia' ? 'Referência' : 'Mortalidade Real'
                            ]}
                          />
                          <Legend />
                          <ReferenceLine x={diasDesdeAlojamento} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Hoje" />
                          <Line 
                            type="monotone" 
                            dataKey="referencia" 
                            stroke="hsl(var(--chart-4))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: 'hsl(var(--chart-4))' }}
                            name="Referência"
                            connectNulls
                          />
                          <Line 
                            type="monotone" 
                            dataKey="real" 
                            stroke="hsl(var(--destructive))" 
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--destructive))' }}
                            name="Mortalidade Real"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card de Análise de Conversão Alimentar */}
              {conversaoData && pesagens.length > 0 && (
                <div className="lg:col-span-3">
                  <PesagemAnaliseCard
                    pesoMedio={conversaoData.pesoMedio}
                    avesVivas={conversaoData.avesVivas}
                    consumoTotal={conversaoData.consumoEstimado}
                    conversaoAlimentar={conversaoData.conversaoReal}
                    conversaoEsperada={conversaoData.conversaoEsperada}
                    diaAtual={conversaoData.diaPesagem}
                    diaReferencia={conversaoData.diaReferencia}
                    pesoReferencia={conversaoData.pesoReferencia}
                    dataPesagem={conversaoData.dataPesagem}
                  />
                </div>
              )}

              {/* Histórico de Conversão Alimentar */}
              {historicoCA.length > 0 && (
                <Card className="lg:col-span-3 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Histórico de Conversão Alimentar
                    </CardTitle>
                    <CardDescription>
                      Evolução da CA ao longo das pesagens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {historicoCA.map((item, idx) => {
                        const dentroMeta = item.diferencaCA !== null && Math.abs(item.diferencaCA) <= 0.03;
                        const acimaMeta = item.diferencaCA !== null && item.diferencaCA > 0.03;
                        
                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-lg border text-center space-y-1 ${
                              dentroMeta 
                                ? 'bg-green-500/10 border-green-500/30' 
                                : acimaMeta 
                                  ? 'bg-destructive/10 border-destructive/30'
                                  : 'bg-green-500/10 border-green-500/30'
                            }`}
                          >
                            <p className="text-xs text-muted-foreground font-medium">Dia {item.dia}</p>
                            <p className="text-lg font-bold">{item.pesoMedio.toFixed(3)} kg</p>
                            <p className={`text-sm font-semibold ${
                              acimaMeta ? 'text-destructive' : 'text-green-600'
                            }`}>
                              CA: {item.conversaoReal.toFixed(2)}
                            </p>
                            {item.diferencaCA !== null && (
                              <Badge 
                                variant={acimaMeta ? 'destructive' : 'outline'} 
                                className={`text-xs ${!acimaMeta ? 'bg-green-500/10 text-green-600 border-green-500/30' : ''}`}
                              >
                                {item.diferencaCA > 0 ? '+' : ''}{item.diferencaCA.toFixed(2)}
                              </Badge>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(item.dataPesagem), 'dd/MM/yy', { locale: ptBR })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Histórico Mortalidade por Semana */}
              {mortalidadePorSemana.length > 0 && (
                <Card className="lg:col-span-3 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Skull className="w-5 h-5" />
                      Histórico de Mortalidade por Semana
                    </CardTitle>
                    <CardDescription>
                      Quantidade alojada: {quantidadeAlojada.toLocaleString('pt-BR')} aves
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Resumo de Totais */}
                    {(() => {
                      // Somar mortalidade de todas as semanas transcorridas
                      const semanaAtual = Math.ceil(diasDesdeAlojamento / 7);
                      const semanasTranscorridas = mortalidadePorSemana.filter(m => m.semana <= semanaAtual);
                      
                      const totalMortalidadeReal = semanasTranscorridas.reduce((acc, m) => acc + m.mortalidade_semana, 0);
                      const totalQuantidadeMortes = semanasTranscorridas.reduce((acc, m) => acc + m.quantidade_mortes_semana, 0);
                      
                      // Mortalidade máxima de referência = valor acumulado do dia 42 (ou acima de 42)
                      const totalReferenciaMaxima = mortalidadeMedia 
                        ? (mortalidadeMedia.mortalidade_acima_42_dias || mortalidadeMedia.mortalidade_42_dias || 0)
                        : null;
                      
                      const dentroDoLimite = totalReferenciaMaxima !== null 
                        ? totalMortalidadeReal <= totalReferenciaMaxima 
                        : true;
                      
                      const diferencaPercentual = totalReferenciaMaxima && totalReferenciaMaxima > 0
                        ? ((totalMortalidadeReal - totalReferenciaMaxima) / totalReferenciaMaxima) * 100
                        : 0;

                      return (
                        <div className={`p-4 rounded-lg border ${
                          dentroDoLimite 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-destructive/10 border-destructive/30'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-6">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Mortalidade Real Total</p>
                                <p className={`text-2xl font-bold ${!dentroDoLimite ? 'text-destructive' : ''}`}>
                                  {totalQuantidadeMortes.toLocaleString('pt-BR')} <span className="text-base font-normal text-muted-foreground">aves</span>
                                </p>
                                <p className={`text-sm ${!dentroDoLimite ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {totalMortalidadeReal.toFixed(2)}%
                                </p>
                              </div>
                              
                              {totalReferenciaMaxima !== null && (
                                <>
                                  <div className="w-px h-12 bg-border" />
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Máx. Referência</p>
                                    <p className="text-2xl font-bold text-muted-foreground">
                                      {totalReferenciaMaxima.toFixed(2)}%
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {dentroDoLimite ? (
                                <>
                                  <CheckCircle className="w-6 h-6 text-green-500" />
                                  <span className="text-sm font-medium text-green-600">Dentro do limite</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-6 h-6 text-destructive" />
                                  <div className="text-right">
                                    <span className="text-sm font-medium text-destructive block">Acima do limite</span>
                                    <Badge variant="destructive" className="text-xs">
                                      +{diferencaPercentual.toFixed(1)}% acima
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Grid de Semanas - Cards Clicáveis */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      {mortalidadePorSemana.filter(m => m.diaFim <= Math.max(diasDesdeAlojamento + 7, 7)).map((m) => (
                        <div 
                          key={m.semana}
                          onClick={() => lote?.data_alojamento && setSemanaSelecionada({
                            semana: m.semana,
                            diaInicio: m.diaInicio,
                            diaFim: m.diaFim,
                            metaSemana: m.mortalidade_referencia,
                          })}
                          className={`p-4 rounded-lg text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                            m.acima_limite ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <p className="text-xs text-muted-foreground font-medium">Semana {m.semana}</p>
                          <p className="text-[10px] text-muted-foreground">(Dias {m.diaInicio}-{m.diaFim})</p>
                          <p className={`text-lg font-bold ${m.acima_limite ? 'text-destructive' : ''}`}>
                            {m.quantidade_mortes_semana.toLocaleString('pt-BR')}
                          </p>
                          <p className={`text-sm ${m.acima_limite ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {m.mortalidade_semana.toFixed(2)}%
                          </p>
                          {m.mortalidade_referencia > 0 && (
                            <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-border/50">
                              {m.acima_limite ? (
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                              ) : (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                Meta: {m.mortalidade_referencia.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabela de Referência de Desempenho */}
              {desempenhoReferencia.length > 0 && (
                <Card className="lg:col-span-3 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Book className="w-5 h-5" />
                      Referência de Desempenho - {lote?.linhagem?.replace('_', ' ').toUpperCase()} ({lote?.sexo})
                    </CardTitle>
                    <CardDescription>
                      Tabela de referência padrão para comparação de desempenho do lote
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">Dia</TableHead>
                            <TableHead className="text-center">Peso (g)</TableHead>
                            <TableHead className="text-center">Ganho Diário (g)</TableHead>
                            <TableHead className="text-center">Consumo Diário (g)</TableHead>
                            <TableHead className="text-center">CA Acumulada</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {desempenhoReferencia.filter(d => [0, 7, 14, 21, 28, 35, 42].includes(d.dia)).map((d) => (
                            <TableRow key={d.dia} className={d.dia === diasDesdeAlojamento ? 'bg-primary/10' : ''}>
                              <TableCell className="text-center font-medium">
                                {d.dia}
                                {d.dia === diasDesdeAlojamento && (
                                  <Badge variant="secondary" className="ml-2">Hoje</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">{d.peso_g.toFixed(0)}</TableCell>
                              <TableCell className="text-center">{d.ganho_diario_g.toFixed(1)}</TableCell>
                              <TableCell className="text-center">{d.consumo_diario_racao_g.toFixed(1)}</TableCell>
                              <TableCell className="text-center">{d.conversao_alimentar_acumulada.toFixed(3)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pesagens Summary */}
              <Card className="lg:col-span-3 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    Histórico de Pesagens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pesagens.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma pesagem registrada ainda
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      {pesagens.map((p, index) => {
                        const metaDia = [0, 7, 14, 21, 28, 35, 42].reduce((prev, curr) =>
                          Math.abs(curr - p.dia) < Math.abs(prev - p.dia) ? curr : prev
                        );
                        const metaValue = editingMetas ? (editingMetas as any)[`meta_${metaDia}_dias_kg`] || editingMetas.peso_inicial_kg : 0;
                        const diff = metaValue > 0 ? ((p.peso_real_kg - metaValue) / metaValue) * 100 : 0;
                        const refData = desempenhoReferencia.find(d => d.dia === p.dia);
                        
                        return (
                          <div 
                            key={index} 
                            className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => {
                              setPesagemSelecionada({
                                dataPesagem: p.data_pesagem,
                                dia: p.dia,
                                pesoReferencia: refData ? refData.peso_g / 1000 : undefined
                              });
                            }}
                          >
                            <p className="text-xs text-muted-foreground">Dia {p.dia}</p>
                            <p className="text-lg font-bold">{p.peso_real_kg.toFixed(3)} kg</p>
                            <Badge 
                              variant={diff >= 0 ? 'default' : 'destructive'}
                              className="text-xs mt-1"
                            >
                              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(p.data_pesagem), 'dd/MM', { locale: ptBR })}
                            </p>
                            {p.numSessoes > 1 && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {p.numSessoes} sessões
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Dialog de detalhes da pesagem */}
      {pesagemSelecionada && (
        <PesagemDetalheDialog
          open={!!pesagemSelecionada}
          onOpenChange={(open) => !open && setPesagemSelecionada(null)}
          dataPesagem={pesagemSelecionada.dataPesagem}
          loteId={loteId!}
          dia={pesagemSelecionada.dia}
          pesoReferencia={pesagemSelecionada.pesoReferencia}
        />
      )}

      {/* Dialog de detalhes da mortalidade por semana */}
      {semanaSelecionada && lote?.data_alojamento && (
        <MortalidadeSemanaDetalheDialog
          open={!!semanaSelecionada}
          onOpenChange={(open) => !open && setSemanaSelecionada(null)}
          loteId={loteId!}
          semana={semanaSelecionada.semana}
          diaInicio={semanaSelecionada.diaInicio}
          diaFim={semanaSelecionada.diaFim}
          dataAlojamento={lote.data_alojamento}
          metaSemana={semanaSelecionada.metaSemana}
          quantidadeAlojada={quantidadeAlojada}
        />
      )}
    </div>
  );
}
