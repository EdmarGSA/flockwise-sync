import { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Package, ArrowLeft, Bird, Truck, CheckCircle, Clock, RefreshCw, XCircle, AlertTriangle, Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { calcularIdadeLote } from '@/lib/utils';
import { calcularNivelSilo } from '@/lib/utils/calcularNivelSilo';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RacaoGestaoDialog } from '@/components/consumo/RacaoGestaoDialog';
import { EnviarRacaoDialog } from '@/components/consumo/EnviarRacaoDialog';
import { LotesAlarmeDialog } from '@/components/consumo/LotesAlarmeDialog';
import { SolicitacoesFilterDialog } from '@/components/consumo/SolicitacoesFilterDialog';
import { LotesListDialog } from '@/components/consumo/LotesListDialog';
import { ConsumoChartSection } from '@/components/consumo/ConsumoChartSection';
import { InsightBox } from '@/components/consumo/InsightBox';
import { SilosMapSection } from '@/components/consumo/SilosMapSection';
import { ConsumoAnomaliaCard } from '@/components/consumo/ConsumoAnomaliaCard';
import { RiscoEstoqueCard } from '@/components/consumo/RiscoEstoqueCard';
import { AnomaliaListDialog } from '@/components/consumo/AnomaliaListDialog';
import { RiscoEstoqueDialog } from '@/components/consumo/RiscoEstoqueDialog';
import { LotesAbertoDialog } from '@/components/consumo/LotesAbertoDialog';
import { SolicitacoesRacaoDialog } from '@/components/consumo/SolicitacoesRacaoDialog';

interface LoteConsumo {
  id: string;
  quantidade_aves: number;
  linhagem: string;
  sexo: string;
  data_alojamento: string | null;
  status: string;
  integrado_id: string;
  nucleo_id: string;
  nucleo: { nome: string; tipo_producao: string } | null;
  galpao: { nome: string } | null;
  quantidadeAlojada?: number | null;
  diasDesdeAlojamento?: number;
  nivelSilo?: number;
  diasEstoque?: number;
  consumoDiarioKg?: number;
  consumoRealKg?: number;
  consumoEsperadoKg?: number;
  tendencia?: 'subindo' | 'caindo' | 'estavel';
}

interface SolicitacaoRacao {
  id: string;
  lote_id: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  data_prevista_entrega: string | null;
  status: string;
  data_solicitacao: string;
  quantidade_recebida_kg: number | null;
  quantidade_devolvida_kg: number | null;
  devolucao_confirmada: boolean;
  urgente?: boolean;
}

type SolicitacaoFilter = 'todos' | 'a_confirmar' | 'a_enviar' | 'enviados' | 'urgentes';

export default function GestaoConsumo() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LoteConsumo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRacao[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [racaoDialogOpen, setRacaoDialogOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteConsumo | null>(null);
  const [enviarDialogOpen, setEnviarDialogOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoRacao | null>(null);
  
  // Filter state for solicitacoes
  const [solicitacaoFilter, setSolicitacaoFilter] = useState<SolicitacaoFilter>('todos');
  
  // Dialog states for cards
  const [lotesDialogOpen, setLotesDialogOpen] = useState(false);
  const [alarmeDialogOpen, setAlarmeDialogOpen] = useState(false);
  const [pendentesDialogOpen, setPendentesDialogOpen] = useState(false);
  const [transitoDialogOpen, setTransitoDialogOpen] = useState(false);
  const [devolucaoDialogOpen, setDevolucaoDialogOpen] = useState(false);
  const [anomaliaDialogOpen, setAnomaliaDialogOpen] = useState(false);
  const [riscoDialogOpen, setRiscoDialogOpen] = useState(false);
  const [lotesAbertoDialogOpen, setLotesAbertoDialogOpen] = useState(false);
  const [solicitacoesDialogOpen, setSolicitacoesDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Realtime subscription for solicitacoes
  useEffect(() => {
    const channel = supabase
      .channel('solicitacoes-racao-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitacoes_racao'
        },
        () => {
          fetchSolicitacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    await Promise.all([fetchLotes(), fetchSolicitacoes()]);
    setLoadingData(false);
  };

  const fetchLotes = async () => {
    const { data, error } = await supabase
      .from('lotes')
      .select(`
        id,
        quantidade_aves,
        linhagem,
        sexo,
        data_alojamento,
        status,
        integrado_id,
        nucleo_id,
        galpao_id,
        nucleo:nucleos(nome, tipo_producao),
        galpao:galpoes(nome)
      `)
      .in('status', ['previsao', 'saiu_para_entrega', 'alojado'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
      return;
    }

    const lotesProcessados: LoteConsumo[] = await Promise.all(
      (data || []).map(async (lote) => {
        const loteData = lote as LoteConsumo & { galpao_id?: string };

        // Get recebimento data for quantidade alojada
        const { data: recebimentoData } = await supabase
          .from('recebimento_lotes')
          .select('quantidade_mortos, quantidade_eliminados_locomotor, quantidade_eliminados_classificacao')
          .eq('lote_id', loteData.id)
          .maybeSingle();

        let quantidadeAlojada: number | null = null;
        if (recebimentoData) {
          const mortos = recebimentoData.quantidade_mortos || 0;
          const eliminadosLocomotor = recebimentoData.quantidade_eliminados_locomotor || 0;
          const eliminadosClassificacao = recebimentoData.quantidade_eliminados_classificacao || 0;
          quantidadeAlojada = loteData.quantidade_aves - mortos - eliminadosLocomotor - eliminadosClassificacao;
        }

        // Fetch accumulated mortality
        const { data: mortalidadeData } = await supabase
          .from('mortalidade')
          .select('mortalidade_itens(quantidade)')
          .eq('lote_id', loteData.id);

        const mortalidadeAcumulada = (mortalidadeData || []).reduce((total, m) => {
          const itens = m.mortalidade_itens as { quantidade: number }[] || [];
          return total + itens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
        }, 0);

        // Calculate aves vivas (considering mortality)
        const avesBase = quantidadeAlojada ?? loteData.quantidade_aves;
        const avesVivas = Math.max(0, avesBase - mortalidadeAcumulada);

        // Dia 1 = dia do alojamento
        const diasDesdeAlojamento = calcularIdadeLote(loteData.data_alojamento);

        // Calculate silo level and consumption data
        let nivelSilo = 0;
        let diasEstoque = 0;
        let consumoDiarioKg = 0;
        let consumoRealKg = 0;
        let consumoEsperadoKg = 0;
        
        if (diasDesdeAlojamento && diasDesdeAlojamento > 0) {
          // Fetch total received feed
          const { data: solicitacoesData } = await supabase
            .from('solicitacoes_racao')
            .select('quantidade_recebida_kg, quantidade_devolvida_kg, devolucao_confirmada, status')
            .eq('lote_id', loteData.id);

          const totalRecebido = (solicitacoesData || []).reduce((total, s) => {
            if (s.status === 'recebido' || s.status === 'parcialmente_devolvido') {
              const rec = s.quantidade_recebida_kg || 0;
              const dev = s.devolucao_confirmada ? (s.quantidade_devolvida_kg || 0) : 0;
              return total + (rec - dev);
            }
            return total;
          }, 0);

          // Fetch performance reference
          const linhagem = (loteData.linhagem || 'cobb_500') as 'cobb_500' | 'ross_308' | 'hubbard';
          const sexo = (loteData.sexo || 'misto') as 'macho' | 'femea' | 'misto';
          
          const { data: desempenho } = await supabase
            .from('desempenho_aves')
            .select('consumo_acumulado_racao_g, consumo_diario_racao_g')
            .eq('linhagem', linhagem)
            .eq('sexo', sexo)
            .lte('dia', Math.max(diasDesdeAlojamento, 1))
            .order('dia', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (desempenho) {
            consumoEsperadoKg = (desempenho.consumo_acumulado_racao_g * avesVivas) / 1000;
            consumoDiarioKg = (desempenho.consumo_diario_racao_g * avesVivas) / 1000;
            
            // Default fallback: total received - expected consumption
            let nivelSiloCalculado = totalRecebido - consumoEsperadoKg;

            // Check for historico_nivel_silo (manual record) if galpao_id exists
            if (loteData.galpao_id) {
              const { data: historicoNivel } = await supabase
                .from('historico_nivel_silo')
                .select('nivel_estimado_kg, created_at')
                .eq('galpao_id', loteData.galpao_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (historicoNivel) {
                const historicoDate = new Date(historicoNivel.created_at);
                const now = new Date();
                const horasDecorridas = differenceInHours(now, historicoDate);
                const diasDecorridos = horasDecorridas / 24;
                
                // Calculate consumption since historico was recorded
                const consumoDesdeHistorico = consumoDiarioKg * diasDecorridos;

                // Fetch feed received AFTER the last historico record
                const { data: racaoRecebida } = await supabase
                  .from('solicitacoes_racao')
                  .select('quantidade_recebida_kg, data_recebimento')
                  .eq('lote_id', loteData.id)
                  .eq('status', 'recebido')
                  .gt('data_recebimento', historicoDate.toISOString());

                const racaoRecebidaDesdeHistorico = (racaoRecebida || []).reduce(
                  (sum, r) => sum + (r.quantidade_recebida_kg || 0), 
                  0
                );

                // Calculate silo level using historico formula:
                // Nível = Informado + Ração Recebida Depois - Consumo Desde Registro
                nivelSiloCalculado = Math.max(0, 
                  historicoNivel.nivel_estimado_kg + racaoRecebidaDesdeHistorico - consumoDesdeHistorico
                );
              }
            }

            nivelSilo = nivelSiloCalculado;
            diasEstoque = consumoDiarioKg > 0 ? Math.floor(nivelSilo / consumoDiarioKg) : 0;
            
            // Real consumption = total received - current silo level
            consumoRealKg = totalRecebido - nivelSilo;
          }
        }

        // Calculate trend based on consumption deviation
        const tendencia: 'subindo' | 'caindo' | 'estavel' = 
          consumoRealKg > consumoEsperadoKg * 1.05 ? 'subindo' : 
          consumoRealKg < consumoEsperadoKg * 0.95 ? 'caindo' : 'estavel';

        return {
          ...loteData,
          quantidadeAlojada,
          diasDesdeAlojamento,
          nivelSilo,
          diasEstoque,
          consumoDiarioKg,
          consumoRealKg,
          consumoEsperadoKg,
          tendencia,
        };
      })
    );

    // Sort by dias_estoque (ascending) - critical first
    lotesProcessados.sort((a, b) => {
      const diasA = a.diasDesdeAlojamento && a.diasDesdeAlojamento > 0 ? (a.diasEstoque || 0) : 999;
      const diasB = b.diasDesdeAlojamento && b.diasDesdeAlojamento > 0 ? (b.diasEstoque || 0) : 999;
      return diasA - diasB;
    });

    setLotes(lotesProcessados);
  };

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes_racao')
      .select('*')
      .order('data_solicitacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      return;
    }

    setSolicitacoes(data || []);
  };

  // Filtered solicitacoes based on tab
  const filteredSolicitacoes = useMemo(() => {
    switch (solicitacaoFilter) {
      case 'a_confirmar':
        return solicitacoes.filter(s => s.status === 'solicitado');
      case 'a_enviar':
        return solicitacoes.filter(s => s.status === 'confirmado');
      case 'enviados':
        return solicitacoes.filter(s => s.status === 'enviado');
      case 'urgentes':
        return solicitacoes.filter(s => s.urgente && !['cancelado', 'recebido', 'devolvido'].includes(s.status));
      default:
        return solicitacoes;
    }
  }, [solicitacoes, solicitacaoFilter]);

  // Stats
  const lotesEmAlarme = useMemo(() => 
    lotes.filter(l => l.diasDesdeAlojamento && l.diasDesdeAlojamento > 0 && (l.diasEstoque || 0) < 1),
    [lotes]
  );

  const pendentesCount = solicitacoes.filter(s => s.status === 'solicitado').length;
  const enviadosCount = solicitacoes.filter(s => s.status === 'enviado').length;
  const devolucoesPendentes = solicitacoes.filter(s => 
    (s.quantidade_devolvida_kg || 0) > 0 && !s.devolucao_confirmada
  );
  const urgentesCount = solicitacoes.filter(s => s.urgente && !['cancelado', 'recebido', 'devolvido'].includes(s.status)).length;

  // Anomaly data for dialog
  const lotesComAnomalia = useMemo(() => {
    return lotes
      .filter(l => {
        if (!l.consumoRealKg || !l.consumoEsperadoKg || (l.diasDesdeAlojamento || 0) <= 0) return false;
        const desvio = Math.abs(((l.consumoRealKg - l.consumoEsperadoKg) / l.consumoEsperadoKg) * 100);
        return desvio > 15;
      })
      .map(l => ({
        id: l.id,
        nucleo_nome: l.nucleo?.nome || '-',
        galpao_nome: l.galpao?.nome || '-',
        consumoRealKg: l.consumoRealKg || 0,
        consumoEsperadoKg: l.consumoEsperadoKg || 0,
        desvioPercent: Math.round(((l.consumoRealKg! - l.consumoEsperadoKg!) / l.consumoEsperadoKg!) * 100),
      }));
  }, [lotes]);

  // Risk data for dialog
  const lotesEmRisco = useMemo(() => {
    return lotes
      .filter(l => {
        const diasEstoque = l.diasEstoque || 0;
        const diasDesdeAlojamento = l.diasDesdeAlojamento || 0;
        return diasDesdeAlojamento > 0 && diasEstoque >= 1 && diasEstoque <= 3;
      })
      .map(l => ({
        id: l.id,
        nucleo_nome: l.nucleo?.nome || '-',
        galpao_nome: l.galpao?.nome || '-',
        diasEstoque: l.diasEstoque || 0,
        nivelSilo: l.nivelSilo || 0,
        consumoDiarioKg: l.consumoDiarioKg || 0,
      }));
  }, [lotes]);

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'destructive' },
      alojado: { label: 'Alojado', variant: 'default' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDiasEstoqueBadge = (dias: number, nivel: number) => {
    if (nivel < 0 || dias < 1) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {nivel < 0 ? 'Déficit' : `${dias}d`}
        </Badge>
      );
    }
    if (dias <= 3) {
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
          {dias}d
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30">
        {dias}d
      </Badge>
    );
  };

  const getTrendIcon = (tendencia?: 'subindo' | 'caindo' | 'estavel') => {
    switch (tendencia) {
      case 'subindo':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'caindo':
        return <TrendingDown className="w-4 h-4 text-blue-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSolicitacaoStatusBadge = (status: string, urgente?: boolean) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
      solicitado: { label: 'Solicitado', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      confirmado: { label: 'Confirmado', variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
      enviado: { label: 'Enviado', variant: 'destructive', icon: <Truck className="w-3 h-3" /> },
      recebido: { label: 'Recebido', variant: 'default', icon: <Package className="w-3 h-3" /> },
      parcialmente_devolvido: { label: 'Devol. Parcial', variant: 'secondary', icon: <RefreshCw className="w-3 h-3" /> },
      devolvido: { label: 'Devolvido', variant: 'outline', icon: <RefreshCw className="w-3 h-3" /> },
      cancelado: { label: 'Cancelado', variant: 'outline', icon: <XCircle className="w-3 h-3" /> },
    };
    const config = variants[status] || { label: status, variant: 'outline', icon: null };
    return (
      <div className="flex items-center gap-1">
        {urgente && (
          <Badge variant="destructive" className="gap-0.5 px-1.5 py-0.5">
            <Flame className="w-3 h-3" />
          </Badge>
        )}
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          {config.label}
        </Badge>
      </div>
    );
  };

  const handleRacao = (lote: LoteConsumo) => {
    setSelectedLote(lote);
    setRacaoDialogOpen(true);
  };

  const handleConfirmarSolicitacao = async (solicitacao: SolicitacaoRacao) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          status: 'confirmado',
          confirmado_por: user?.id,
          data_confirmacao: new Date().toISOString(),
        })
        .eq('id', solicitacao.id);

      if (error) throw error;
      toast.success('Solicitação confirmada!');
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao confirmar solicitação');
    }
  };

  const handleCancelarSolicitacao = async (solicitacao: SolicitacaoRacao) => {
    if (!['solicitado', 'confirmado'].includes(solicitacao.status)) {
      toast.error('Solicitação já foi enviada e não pode ser cancelada');
      return;
    }

    try {
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          status: 'cancelado',
        })
        .eq('id', solicitacao.id);

      if (error) throw error;
      toast.success('Solicitação cancelada com sucesso');
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao cancelar solicitação');
    }
  };

  const handleOpenEnviarDialog = (solicitacao: SolicitacaoRacao) => {
    setSelectedSolicitacao(solicitacao);
    setEnviarDialogOpen(true);
  };

  const handleConfirmarDevolucao = async (solicitacao: SolicitacaoRacao) => {
    if (!solicitacao.quantidade_devolvida_kg || solicitacao.quantidade_devolvida_kg <= 0) {
      toast.error('Nenhuma devolução registrada para confirmar');
      return;
    }

    try {
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          devolucao_confirmada: true,
          status: solicitacao.quantidade_devolvida_kg >= (solicitacao.quantidade_recebida_kg || 0) 
            ? 'devolvido' 
            : 'parcialmente_devolvido',
        })
        .eq('id', solicitacao.id);

      if (error) throw error;
      toast.success('Devolução confirmada!');
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao confirmar devolução');
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Prepare data for dialogs
  const lotesListData = lotes.map(l => ({
    id: l.id,
    nucleo_nome: l.nucleo?.nome || '-',
    galpao_nome: l.galpao?.nome || '-',
    quantidade_aves: l.quantidadeAlojada ?? l.quantidade_aves,
    idade: l.diasDesdeAlojamento || 0,
    status: l.status,
    nivel_silo: l.nivelSilo || 0,
    dias_estoque: l.diasEstoque || 0,
  }));

  const lotesAlarmeData = lotesEmAlarme.map(l => ({
    id: l.id,
    nucleo_nome: l.nucleo?.nome || '-',
    galpao_nome: l.galpao?.nome || '-',
    quantidade_aves: l.quantidadeAlojada ?? l.quantidade_aves,
    idade: l.diasDesdeAlojamento || 0,
    nivel_silo: l.nivelSilo || 0,
    dias_estoque: l.diasEstoque || 0,
  }));

  const getSolicitacoesWithLoteInfo = (filter: (s: SolicitacaoRacao) => boolean) => {
    return solicitacoes.filter(filter).map(s => {
      const lote = lotes.find(l => l.id === s.lote_id);
      return {
        ...s,
        nucleo_nome: lote?.nucleo?.nome,
        galpao_nome: lote?.galpao?.nome,
      };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                <span className="hidden sm:inline">Gestão de </span>Consumo
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        {/* 1. Painel de Alertas Imediatos (Topo) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
          <Card 
            className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLotesDialogOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Lotes</p>
                  <p className="text-2xl font-bold text-primary">{lotes.length}</p>
                </div>
                <Bird className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-card border-border cursor-pointer hover:border-primary/50 transition-colors ${lotesEmAlarme.length > 0 ? 'border-destructive/50 bg-destructive/5' : ''}`}
            onClick={() => setAlarmeDialogOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">🔔 Alarme</p>
                  <p className={`text-2xl font-bold ${lotesEmAlarme.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {lotesEmAlarme.length}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${lotesEmAlarme.length > 0 ? 'text-destructive' : 'text-muted-foreground/50'}`} />
              </div>
            </CardContent>
          </Card>

          {/* New: Risk Card */}
          <RiscoEstoqueCard lotes={lotes} onClick={() => setRiscoDialogOpen(true)} />

          {/* New: Anomaly Card */}
          <ConsumoAnomaliaCard lotes={lotes} onClick={() => setAnomaliaDialogOpen(true)} />
          
          <Card 
            className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setPendentesDialogOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-500">{pendentesCount}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setTransitoDialogOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Em Trânsito</p>
                  <p className="text-2xl font-bold text-destructive">{enviadosCount}</p>
                </div>
                <Truck className="w-8 h-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setDevolucaoDialogOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Devol. Pend.</p>
                  <p className="text-2xl font-bold text-orange-500">{devolucoesPendentes.length}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Visão Geral de Consumo (Gráficos) */}
        <ConsumoChartSection lotes={lotes} loading={loadingData} />

        {/* 3. Insight Box */}
        <InsightBox lotes={lotes} />

        {/* 4. Mapa Visual de Silos */}
        <SilosMapSection 
          lotes={lotes} 
          loading={loadingData}
          onLoteClick={(loteId) => {
            const lote = lotes.find(l => l.id === loteId);
            if (lote) handleRacao(lote);
          }}
        />

        {/* Quick Access Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setLotesAbertoDialogOpen(true)}
          >
            <Bird className="w-4 h-4" />
            Lotes em Aberto
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setSolicitacoesDialogOpen(true)}
          >
            <Clock className="w-4 h-4" />
            Solicitações de Ração
          </Button>
        </div>
      </main>

      {/* Dialogs */}
      {selectedLote && (
        <RacaoGestaoDialog
          open={racaoDialogOpen}
          onOpenChange={setRacaoDialogOpen}
          lote={selectedLote}
          onSuccess={fetchSolicitacoes}
        />
      )}

      {selectedSolicitacao && (
        <EnviarRacaoDialog
          open={enviarDialogOpen}
          onOpenChange={setEnviarDialogOpen}
          solicitacao={selectedSolicitacao}
          loteInfo={(() => {
            const lote = lotes.find(l => l.id === selectedSolicitacao.lote_id);
            if (!lote) return null;
            return {
              nucleo_nome: lote.nucleo?.nome || '-',
              galpao_nome: lote.galpao?.nome || '-',
              tipo_producao: lote.nucleo?.tipo_producao || '',
            };
          })()}
          onSuccess={fetchSolicitacoes}
        />
      )}

      <LotesListDialog
        open={lotesDialogOpen}
        onOpenChange={setLotesDialogOpen}
        lotes={lotesListData}
        onSolicitarRacao={(loteId) => {
          const lote = lotes.find(l => l.id === loteId);
          if (lote) {
            setLotesDialogOpen(false);
            handleRacao(lote);
          }
        }}
      />

      <LotesAlarmeDialog
        open={alarmeDialogOpen}
        onOpenChange={setAlarmeDialogOpen}
        lotes={lotesAlarmeData}
      />

      <SolicitacoesFilterDialog
        open={pendentesDialogOpen}
        onOpenChange={setPendentesDialogOpen}
        title="Solicitações Pendentes (A Confirmar)"
        icon={<Clock className="w-5 h-5 text-amber-500" />}
        solicitacoes={getSolicitacoesWithLoteInfo(s => s.status === 'solicitado')}
        onConfirmar={handleConfirmarSolicitacao}
      />

      <SolicitacoesFilterDialog
        open={transitoDialogOpen}
        onOpenChange={setTransitoDialogOpen}
        title="Solicitações Em Trânsito"
        icon={<Truck className="w-5 h-5 text-destructive" />}
        solicitacoes={getSolicitacoesWithLoteInfo(s => s.status === 'enviado')}
      />

      <SolicitacoesFilterDialog
        open={devolucaoDialogOpen}
        onOpenChange={setDevolucaoDialogOpen}
        title="Devoluções Pendentes de Confirmação"
        icon={<RefreshCw className="w-5 h-5 text-orange-500" />}
        solicitacoes={getSolicitacoesWithLoteInfo(s => (s.quantidade_devolvida_kg || 0) > 0 && !s.devolucao_confirmada)}
        onConfirmarDevolucao={handleConfirmarDevolucao}
      />

      <AnomaliaListDialog
        open={anomaliaDialogOpen}
        onOpenChange={setAnomaliaDialogOpen}
        lotes={lotesComAnomalia}
      />

      <RiscoEstoqueDialog
        open={riscoDialogOpen}
        onOpenChange={setRiscoDialogOpen}
        lotes={lotesEmRisco}
      />

      {/* New Quick Access Dialogs */}
      <LotesAbertoDialog
        open={lotesAbertoDialogOpen}
        onOpenChange={setLotesAbertoDialogOpen}
        lotes={lotes.map(l => ({
          ...l,
          tendencia: l.tendencia === 'subindo' ? 'up' as const : l.tendencia === 'caindo' ? 'down' as const : 'stable' as const
        }))}
        loading={loadingData}
        onRacao={(lote) => {
          const originalLote = lotes.find(l => l.id === lote.id);
          if (originalLote) {
            setLotesAbertoDialogOpen(false);
            handleRacao(originalLote);
          }
        }}
      />

      <SolicitacoesRacaoDialog
        open={solicitacoesDialogOpen}
        onOpenChange={setSolicitacoesDialogOpen}
        solicitacoes={filteredSolicitacoes}
        lotes={lotes}
        filter={solicitacaoFilter}
        onFilterChange={setSolicitacaoFilter}
        urgentesCount={urgentesCount}
        onConfirmar={handleConfirmarSolicitacao}
        onEnviar={handleOpenEnviarDialog}
        onCancelar={handleCancelarSolicitacao}
        onConfirmarDevolucao={handleConfirmarDevolucao}
      />
    </div>
  );
}
