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
        const loteData = lote as LoteConsumo;

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

        // Dia 1 = dia do alojamento
        const diasDesdeAlojamento = calcularIdadeLote(loteData.data_alojamento);

        // Calculate silo level and consumption data
        let nivelSilo = 0;
        let diasEstoque = 0;
        let consumoDiarioKg = 0;
        let consumoRealKg = 0;
        let consumoEsperadoKg = 0;
        
        if (diasDesdeAlojamento && diasDesdeAlojamento > 0) {
          const avesVivas = quantidadeAlojada ?? loteData.quantidade_aves;
          
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
            nivelSilo = totalRecebido - consumoEsperadoKg;
            diasEstoque = consumoDiarioKg > 0 ? Math.floor(nivelSilo / consumoDiarioKg) : 0;
            
            // Real consumption = total received - current silo level (estimated)
            consumoRealKg = totalRecebido - nivelSilo;
          }
        }

        // Calculate trend based on last 3 weighings or estimations
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

        {/* 5. Lotes Table - Updated with trend column */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Lotes em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : lotes.length === 0 ? (
              <div className="text-center py-12">
                <Bird className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum lote ativo encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Núcleo</TableHead>
                      <TableHead>Galpão</TableHead>
                      <TableHead>Qtd. Aves</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Nível Silo</TableHead>
                      <TableHead>Dias Estoque</TableHead>
                      <TableHead>Tend.</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id} className={(lote.diasEstoque || 0) < 1 && (lote.diasDesdeAlojamento || 0) > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                        <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                        <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                        <TableCell>
                          {(lote.quantidadeAlojada ?? lote.quantidade_aves).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {lote.diasDesdeAlojamento !== undefined && lote.diasDesdeAlojamento > 0 ? (
                            <Badge variant="secondary">{lote.diasDesdeAlojamento} dias</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {lote.diasDesdeAlojamento && lote.diasDesdeAlojamento > 0 ? (
                            lote.nivelSilo !== undefined && lote.nivelSilo < 0 ? (
                              <span className="text-destructive font-medium">Déficit</span>
                            ) : (
                              `${(lote.nivelSilo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                            )
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {lote.diasDesdeAlojamento && lote.diasDesdeAlojamento > 0 ? (
                            getDiasEstoqueBadge(lote.diasEstoque || 0, lote.nivelSilo || 0)
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {lote.diasDesdeAlojamento && lote.diasDesdeAlojamento > 0 ? (
                            getTrendIcon(lote.tendencia)
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRacao(lote)}
                            className="gap-1"
                          >
                            <Package className="w-4 h-4" />
                            Ração
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Solicitações with Filters */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Solicitações de Ração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={solicitacaoFilter} onValueChange={(v) => setSolicitacaoFilter(v as SolicitacaoFilter)} className="mb-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="a_confirmar">A Confirmar</TabsTrigger>
                <TabsTrigger value="a_enviar">A Enviar</TabsTrigger>
                <TabsTrigger value="enviados">Enviados</TabsTrigger>
                <TabsTrigger value="urgentes" className="gap-1">
                  <Flame className="w-3 h-3" />
                  Urgentes {urgentesCount > 0 && `(${urgentesCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredSolicitacoes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma solicitação de ração.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo Ração</TableHead>
                      <TableHead>Qtd. Solicitada</TableHead>
                      <TableHead>Previsão Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recebido</TableHead>
                      <TableHead>Devolvido</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSolicitacoes.map((solicitacao) => {
                      const lote = lotes.find(l => l.id === solicitacao.lote_id);
                      return (
                        <TableRow key={solicitacao.id}>
                          <TableCell className="font-medium">
                            {lote ? `${lote.nucleo?.nome} - ${lote.galpao?.nome}` : '-'}
                          </TableCell>
                          <TableCell>{solicitacao.tipo_racao}</TableCell>
                          <TableCell>{solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</TableCell>
                          <TableCell>{formatDateTime(solicitacao.data_prevista_entrega)}</TableCell>
                          <TableCell>{getSolicitacaoStatusBadge(solicitacao.status, solicitacao.urgente)}</TableCell>
                          <TableCell>
                            {solicitacao.quantidade_recebida_kg 
                              ? `${solicitacao.quantidade_recebida_kg.toLocaleString('pt-BR')} kg` 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {solicitacao.quantidade_devolvida_kg && solicitacao.quantidade_devolvida_kg > 0 ? (
                              <div className="flex items-center gap-1">
                                <span>{solicitacao.quantidade_devolvida_kg.toLocaleString('pt-BR')} kg</span>
                                {solicitacao.devolucao_confirmada && (
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {solicitacao.status === 'solicitado' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleConfirmarSolicitacao(solicitacao)}
                                  >
                                    Confirmar
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja cancelar esta solicitação de {solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg de {solicitacao.tipo_racao}?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleCancelarSolicitacao(solicitacao)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Confirmar Cancelamento
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                              {solicitacao.status === 'confirmado' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handleOpenEnviarDialog(solicitacao)}
                                    className="gap-1"
                                  >
                                    <Truck className="w-4 h-4" />
                                    Enviar
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja cancelar esta solicitação de {solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg de {solicitacao.tipo_racao}?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleCancelarSolicitacao(solicitacao)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Confirmar Cancelamento
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                              {solicitacao.quantidade_devolvida_kg && 
                               solicitacao.quantidade_devolvida_kg > 0 && 
                               !solicitacao.devolucao_confirmada && (
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => handleConfirmarDevolucao(solicitacao)}
                                  className="gap-1"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Confirm. Devol.
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* New Dialogs */}
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
    </div>
  );
}
