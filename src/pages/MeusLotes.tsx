import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Bird, ArrowLeft, Calendar, Users, Truck, ClipboardCheck, Scale, AlertTriangle, Skull, Target, ChevronDown, Package, Stethoscope, Clock, Lock, Egg, LogOut, Thermometer, Droplets, Wifi, WifiOff, Zap, Power } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, differenceInDays, differenceInHours, parseISO, isBefore } from 'date-fns';
import { calcularIdadeLote } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RecebimentoLoteDialog } from '@/components/lotes/RecebimentoLoteDialog';
import { PesagemDialog } from '@/components/lotes/PesagemDialog';
import { MortalidadeDialog } from '@/components/lotes/MortalidadeDialog';
import { RacaoLoteDialog } from '@/components/lotes/RacaoLoteDialog';
import { SiloBadge } from '@/components/lotes/SiloBadge';
import { NotificacoesVetDialog } from '@/components/lotes/NotificacoesVetDialog';
import { ConfirmarJejumDialog } from '@/components/lotes/ConfirmarJejumDialog';
import { SaidaLoteInfoDialog } from '@/components/lotes/SaidaLoteInfoDialog';
import { FechamentoLoteDialog } from '@/components/lotes/FechamentoLoteDialog';
import { AlertasTemperaturaBar } from '@/components/lotes/AlertasTemperaturaBar';
import { AlertasClimaticosBar } from '@/components/lotes/AlertasClimaticosBar';
import { FasePosturaBadge } from '@/components/lotes/postura/FasePosturaBadge';
import { PosturaIndicators } from '@/components/lotes/postura/PosturaIndicators';
import { ProducaoOvosDialog } from '@/components/lotes/postura/ProducaoOvosDialog';
import { MetasPosturaDialog } from '@/components/lotes/postura/MetasPosturaDialog';
import { getLinhagemLabel, getLinhagemPosturaLabel, getStatusBadgeConfig } from '@/lib/utils/labels';
import { calcularAvesVivas, calcularQuantidadeAlojada, calcularMortalidadeTotal } from '@/lib/utils/calcularAvesVivas';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_prevista_alojamento: string;
  data_alojamento: string | null;
  data_fechamento: string | null;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  linhagem_postura: string | null;
  sexo: 'macho' | 'femea' | 'misto';
  status: string;
  veterinario_id: string | null;
  integrado_id: string;
  peso_medio_pintinhos: number | null;
  nucleo_id: string;
  galpao_id: string;
  nucleo: { nome: string; tipo_producao: string } | null;
  galpao: { nome: string } | null;
  data_prevista_saida: string | null;
  horario_inicio_jejum: string | null;
  saida_venda_local: number;
  saida_venda_externa: number;
  saida_abate: number;
  jejum_confirmado: boolean;
  jejum_confirmado_por: string | null;
  jejum_confirmado_em: string | null;
}

interface IoTAmbiente {
  temperaturaAtual: number | null;
  umidadeAtual: number | null;
  dispositivosOnline: number;
  dispositivosTotal: number;
  dispositivosLigados: number;
  dispositivos: { nome: string; online: boolean; switchOn: boolean }[];
}

interface LoteComPesagem extends Lote {
  ultimaPesagem?: string | null;
  diasDesdeAlojamento?: number;
  semanasVida?: number;
  precisaPesar?: boolean;
  quantidadeAlojada?: number | null;
  avesVivas?: number;
  temSolicitacaoPendente?: boolean;
  temSolicitacaoEnviada?: boolean;
  pendenciasVet?: number;
  jejumAtrasado?: boolean;
  saidaProxima?: boolean;
  percentualPostura?: number | null;
  percentualReferencia?: number | null;
  ovosAveAlojada?: number | null;
  iot?: IoTAmbiente;
}

export default function MeusLotes() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LoteComPesagem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [recebimentoOpen, setRecebimentoOpen] = useState(false);
  const [pesagemOpen, setPesagemOpen] = useState(false);
  const [mortalidadeOpen, setMortalidadeOpen] = useState(false);
  const [racaoOpen, setRacaoOpen] = useState(false);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [jejumDialogOpen, setJejumDialogOpen] = useState(false);
  const [saidaInfoOpen, setSaidaInfoOpen] = useState(false);
  const [fechamentoOpen, setFechamentoOpen] = useState(false);
  const [producaoOvosOpen, setProducaoOvosOpen] = useState(false);
  const [metasPosturaOpen, setMetasPosturaOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteComPesagem | null>(null);

  useEffect(() => {
    if (user) {
      fetchLotes();
    }
  }, [user]);

  const fetchLotes = async () => {
    setLoadingData(true);
    
    const { data, error } = await supabase
      .from('lotes')
      .select(`
        id,
        quantidade_aves,
        data_prevista_alojamento,
        data_alojamento,
        data_fechamento,
        linhagem,
        linhagem_postura,
        sexo,
        status,
        integrado_id,
        peso_medio_pintinhos,
        nucleo_id,
        galpao_id,
        nucleo:nucleos(nome, tipo_producao),
        galpao:galpoes(nome),
        veterinario_id,
        data_prevista_saida,
        horario_inicio_jejum,
        saida_venda_local,
        saida_venda_externa,
        saida_abate,
        jejum_confirmado,
        jejum_confirmado_por,
        jejum_confirmado_em
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
      setLoadingData(false);
      return;
    }

    const lotesData = (data || []) as Lote[];
    const loteIds = lotesData.map(l => l.id);

    if (loteIds.length === 0) {
      setLotes([]);
      setLoadingData(false);
      return;
    }

    // Batch queries instead of N+1
    const [
      pesagensRes,
      recebimentosRes,
      mortalidadeRes,
      solicitacoesRes,
      orientacoesRes,
      tratamentosRes,
    ] = await Promise.all([
      supabase
        .from('pesagens')
        .select('lote_id, data_pesagem')
        .in('lote_id', loteIds)
        .order('data_pesagem', { ascending: false }),
      supabase
        .from('recebimento_lotes')
        .select('lote_id, quantidade_mortos, quantidade_eliminados_locomotor, quantidade_eliminados_classificacao')
        .in('lote_id', loteIds),
      supabase
        .from('mortalidade')
        .select('lote_id, mortalidade_itens(quantidade)')
        .in('lote_id', loteIds),
      supabase
        .from('solicitacoes_racao')
        .select('lote_id, status')
        .in('lote_id', loteIds)
        .in('status', ['solicitado', 'confirmado', 'enviado']),
      supabase
        .from('observacoes_lote')
        .select('lote_id')
        .in('lote_id', loteIds)
        .eq('tipo', 'orientacao')
        .is('lido_por', null),
      supabase
        .from('tratamentos_lote')
        .select('lote_id')
        .in('lote_id', loteIds)
        .eq('status', 'ativo')
        .eq('aplicacao_confirmada', false),
    ]);

    // Index batch results by lote_id for O(1) lookup
    const pesagensMap = new Map<string, string>();
    (pesagensRes.data || []).forEach(p => {
      // Only keep the first (most recent) pesagem per lote
      if (!pesagensMap.has(p.lote_id)) {
        pesagensMap.set(p.lote_id, p.data_pesagem);
      }
    });

    const recebimentoMap = new Map<string, any>();
    (recebimentosRes.data || []).forEach(r => {
      recebimentoMap.set(r.lote_id, r);
    });

    // Group mortality by lote_id
    const mortalidadeMap = new Map<string, number>();
    (mortalidadeRes.data || []).forEach(m => {
      const itens = m.mortalidade_itens as { quantidade: number }[];
      const total = itens?.reduce((sum, item) => sum + (item.quantidade || 0), 0) || 0;
      mortalidadeMap.set(m.lote_id, (mortalidadeMap.get(m.lote_id) || 0) + total);
    });

    // Group solicitações by lote_id
    const solicitacoesMap = new Map<string, { pendente: boolean; enviada: boolean }>();
    (solicitacoesRes.data || []).forEach(s => {
      const existing = solicitacoesMap.get(s.lote_id) || { pendente: false, enviada: false };
      existing.pendente = true;
      if (s.status === 'enviado') existing.enviada = true;
      solicitacoesMap.set(s.lote_id, existing);
    });

    // Count vet pendencies per lote
    const orientacoesMap = new Map<string, number>();
    (orientacoesRes.data || []).forEach(o => {
      orientacoesMap.set(o.lote_id, (orientacoesMap.get(o.lote_id) || 0) + 1);
    });
    const tratamentosMap = new Map<string, number>();
    (tratamentosRes.data || []).forEach(t => {
      tratamentosMap.set(t.lote_id, (tratamentosMap.get(t.lote_id) || 0) + 1);
    });

    // Identify postura lotes that need extra queries
    const posturaLoteIds = lotesData
      .filter(l => {
        const isPostura = l.nucleo?.tipo_producao?.toLowerCase().includes('postura');
        const semanasVida = l.data_alojamento ? Math.ceil(calcularIdadeLote(l.data_alojamento) / 7) : 0;
        return isPostura && l.status === 'alojado' && semanasVida >= 19;
      })
      .map(l => l.id);

    // Batch postura queries
    let producaoMap = new Map<string, number[]>();
    let recentProducaoMap = new Map<string, number[]>();
    
    if (posturaLoteIds.length > 0) {
      const [producaoRes, recentProducaoRes] = await Promise.all([
        supabase
          .from('producao_ovos')
          .select('lote_id, ovos_totais')
          .in('lote_id', posturaLoteIds),
        supabase
          .from('producao_ovos')
          .select('lote_id, ovos_totais, data_producao')
          .in('lote_id', posturaLoteIds)
          .order('data_producao', { ascending: false }),
      ]);

      (producaoRes.data || []).forEach((p: any) => {
        const list = producaoMap.get(p.lote_id) || [];
        list.push(p.ovos_totais || 0);
        producaoMap.set(p.lote_id, list);
      });

      // Get last 7 per lote for recent average
      const recentCountMap = new Map<string, number>();
      (recentProducaoRes.data || []).forEach((p: any) => {
        const count = recentCountMap.get(p.lote_id) || 0;
        if (count < 7) {
          const list = recentProducaoMap.get(p.lote_id) || [];
          list.push(p.ovos_totais || 0);
          recentProducaoMap.set(p.lote_id, list);
          recentCountMap.set(p.lote_id, count + 1);
        }
      });
    }

    // Batch IoT query — get all devices for active lot galpoes
    const activeLotes = lotesData.filter(l => l.status === 'alojado');
    const galpaoIds = [...new Set(activeLotes.map(l => l.galpao_id).filter(Boolean))];
    
    const iotMap = new Map<string, IoTAmbiente>();
    
    if (galpaoIds.length > 0) {
      const { data: devices } = await supabase
        .from('dispositivos_iot')
        .select('id, nome, galpao_id, device_id_ewelink')
        .in('galpao_id', galpaoIds)
        .eq('ativo', true);

      if (devices && devices.length > 0) {
        const deviceIds = devices.map(d => d.id);
        
        // Get latest reading per device using batch
        const { data: leituras } = await supabase
          .from('leituras_sensores')
          .select('dispositivo_id, temperatura_c, umidade_pct, online, created_at')
          .in('dispositivo_id', deviceIds)
          .order('created_at', { ascending: false });

        // Keep only latest per device
        const latestLeitura = new Map<string, any>();
        (leituras || []).forEach(l => {
          if (!latestLeitura.has(l.dispositivo_id)) {
            latestLeitura.set(l.dispositivo_id, l);
          }
        });

        // Aggregate by galpao_id
        const galpaoDevices = new Map<string, { nome: string; online: boolean; temp: number | null; hum: number | null }[]>();
        devices.forEach(d => {
          const reading = latestLeitura.get(d.id);
          const list = galpaoDevices.get(d.galpao_id!) || [];
          list.push({
            nome: d.nome,
            online: reading?.online ?? false,
            temp: reading?.temperatura_c ?? null,
            hum: reading?.umidade_pct ?? null,
          });
          galpaoDevices.set(d.galpao_id!, list);
        });

        galpaoDevices.forEach((devs, galpaoId) => {
          const onlineDevs = devs.filter(d => d.online);
          const temps = devs.map(d => d.temp).filter((t): t is number => t !== null);
          const hums = devs.map(d => d.hum).filter((h): h is number => h !== null);
          
          iotMap.set(galpaoId, {
            temperaturaAtual: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
            umidadeAtual: hums.length > 0 ? hums.reduce((a, b) => a + b, 0) / hums.length : null,
            dispositivosOnline: onlineDevs.length,
            dispositivosTotal: devs.length,
            dispositivosLigados: onlineDevs.length, // switch state would require ewelink API call, use online as proxy
            dispositivos: devs.map(d => ({ nome: d.nome, online: d.online, switchOn: d.online })),
          });
        });
      }
    }

    // Process all lotes using indexed data
    const lotesComPesagem: LoteComPesagem[] = lotesData.map(lote => {
      const recebimento = recebimentoMap.get(lote.id) || null;
      const mortalidadeAcumulada = mortalidadeMap.get(lote.id) || 0;
      
      const quantidadeAlojadaCalc = calcularQuantidadeAlojada(lote.quantidade_aves, recebimento);
      const avesVivas = calcularAvesVivas(lote.quantidade_aves, recebimento, mortalidadeAcumulada);

      const ultimaPesagem = pesagensMap.get(lote.id) || null;
      const solicitacao = solicitacoesMap.get(lote.id);
      const pendenciasVet = (orientacoesMap.get(lote.id) || 0) + (tratamentosMap.get(lote.id) || 0);

      let diasDesdeAlojamento = 0;
      let semanasVida = 0;
      if (lote.data_alojamento) {
        diasDesdeAlojamento = calcularIdadeLote(lote.data_alojamento);
        semanasVida = Math.ceil(diasDesdeAlojamento / 7);
      }

      const isPostura = lote.nucleo?.tipo_producao?.toLowerCase().includes('postura');

      // Postura data
      let percentualPostura: number | null = null;
      let ovosAveAlojada: number | null = null;

      if (isPostura && lote.status === 'alojado' && semanasVida >= 19) {
        const totalOvosList = producaoMap.get(lote.id) || [];
        const totalOvos = totalOvosList.reduce((sum, v) => sum + v, 0);
        ovosAveAlojada = avesVivas > 0 ? totalOvos / avesVivas : 0;

        const recentList = recentProducaoMap.get(lote.id) || [];
        if (recentList.length > 0) {
          const avgDailyOvos = recentList.reduce((sum, v) => sum + v, 0) / recentList.length;
          percentualPostura = avesVivas > 0 ? (avgDailyOvos / avesVivas) * 100 : 0;
        }
      }

      // Check if needs weighing (every 7 days) - only for corte
      let precisaPesar = false;
      if (!isPostura && lote.status === 'alojado' && diasDesdeAlojamento >= 7) {
        if (!ultimaPesagem) {
          precisaPesar = true;
        } else {
          const diasDesdeUltimaPesagem = differenceInDays(new Date(), new Date(ultimaPesagem));
          precisaPesar = diasDesdeUltimaPesagem >= 7;
        }
      }

      // Check jejum atrasado and saida proxima
      const now = new Date();
      const jejumAtrasado = lote.horario_inicio_jejum
        ? isBefore(parseISO(lote.horario_inicio_jejum), now) && !lote.jejum_confirmado
        : false;
      const horasParaSaida = lote.data_prevista_saida
        ? differenceInHours(parseISO(lote.data_prevista_saida), now)
        : null;
      const saidaProxima = horasParaSaida !== null && horasParaSaida <= 24 && horasParaSaida >= 0;

      return {
        ...lote,
        ultimaPesagem,
        diasDesdeAlojamento,
        semanasVida,
        precisaPesar,
        quantidadeAlojada: quantidadeAlojadaCalc,
        avesVivas,
        temSolicitacaoPendente: solicitacao?.pendente || false,
        temSolicitacaoEnviada: solicitacao?.enviada || false,
        pendenciasVet,
        jejumAtrasado,
        saidaProxima,
        percentualPostura,
        percentualReferencia: null,
        ovosAveAlojada,
        iot: iotMap.get(lote.galpao_id),
      };
    });
    
    setLotes(lotesComPesagem);
    setLoadingData(false);
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

  const getStatusBadge = (status: string) => {
    const config = getStatusBadgeConfig(status);
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAlojar = async (lote: LoteComPesagem) => {
    try {
      const { error } = await supabase
        .from('lotes')
        .update({ status: 'saiu_para_entrega' })
        .eq('id', lote.id);

      if (error) throw error;

      toast.success('Status alterado para "Saiu para Entrega"');
      fetchLotes();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAdm = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setRecebimentoOpen(true);
  };

  const handlePesagem = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setPesagemOpen(true);
  };

  const handleMortalidade = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setMortalidadeOpen(true);
  };

  const handleRacao = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setRacaoOpen(true);
  };

  const handleNotificacoesVet = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setNotificacoesOpen(true);
  };

  const handleJejum = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setJejumDialogOpen(true);
  };

  const handleSaidaInfo = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setSaidaInfoOpen(true);
  };

  const handleFechamento = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setFechamentoOpen(true);
  };

  const handleProducaoOvos = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setProducaoOvosOpen(true);
  };

  const handleMetasPostura = (lote: LoteComPesagem) => {
    setSelectedLote(lote);
    setMetasPosturaOpen(true);
  };

  const isPosturaLote = (lote: LoteComPesagem) => {
    return lote.linhagem_postura !== null && lote.linhagem_postura !== undefined;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const lotesAtivos = lotes.filter(l => l.status === 'alojado').length;
  const lotesPendentes = lotes.filter(l => l.status === 'previsao').length;
  const lotesEmTransito = lotes.filter(l => l.status === 'saiu_para_entrega').length;
  const lotesFechados = lotes.filter(l => l.status === 'fechado').length;
  const lotesPrecisandoPesar = lotes.filter(l => l.precisaPesar).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Bird className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Meus Lotes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/gestao-campo')} variant="outline" className="gap-2">
              Gestão de Campo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Temperature Alerts */}
        <AlertasTemperaturaBar />
        <AlertasClimaticosBar />
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Alojados</p>
                  <p className="text-2xl font-bold text-primary">{lotesAtivos}</p>
                </div>
                <Bird className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Previstos</p>
                  <p className="text-2xl font-bold text-amber-500">{lotesPendentes}</p>
                </div>
                <Calendar className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Em Trânsito</p>
                  <p className="text-2xl font-bold text-blue-500">{lotesEmTransito}</p>
                </div>
                <Truck className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Fechados</p>
                  <p className="text-2xl font-bold text-muted-foreground">{lotesFechados}</p>
                </div>
                <Lock className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          {lotesPrecisandoPesar > 0 && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-destructive text-sm">Pesar!</p>
                    <p className="text-2xl font-bold text-destructive">{lotesPrecisandoPesar}</p>
                  </div>
                  <Scale className="w-8 h-8 text-destructive/50" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Lotes ({lotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : lotes.length === 0 ? (
              <div className="text-center py-8">
                <Bird className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum lote encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-center">Aves</TableHead>
                      <TableHead className="text-center">Idade</TableHead>
                      <TableHead className="text-center">Ambiente</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Alertas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => {
                      const isPostura = isPosturaLote(lote);
                      return (
                        <TableRow key={lote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/meus-lotes/${lote.id}`)}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{lote.nucleo?.nome || '-'}</p>
                              <p className="text-xs text-muted-foreground">{lote.galpao?.nome || '-'}</p>
                              <p className="text-xs text-muted-foreground">
                                {isPostura 
                                  ? getLinhagemPosturaLabel(lote.linhagem_postura)
                                  : getLinhagemLabel(lote.linhagem)
                                }
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div>
                              <p className="font-medium">{(lote.avesVivas ?? lote.quantidade_aves).toLocaleString('pt-BR')}</p>
                              <p className="text-xs text-muted-foreground">de {lote.quantidade_aves.toLocaleString('pt-BR')}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {lote.status === 'alojado' ? (
                              <div>
                                {isPostura ? (
                                  <FasePosturaBadge semanasVida={lote.semanasVida || 0} />
                                ) : (
                                  <>
                                    <p className="font-medium">{lote.diasDesdeAlojamento || 0}d</p>
                                    <p className="text-xs text-muted-foreground">S{lote.semanasVida}</p>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                {formatDate(lote.data_prevista_alojamento)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {lote.iot ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex flex-col items-center gap-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <Thermometer className={`w-3.5 h-3.5 ${
                                          lote.iot.temperaturaAtual === null ? 'text-muted-foreground' :
                                          lote.iot.temperaturaAtual >= 20 && lote.iot.temperaturaAtual <= 28 ? 'text-emerald-600' :
                                          lote.iot.temperaturaAtual >= 15 && lote.iot.temperaturaAtual <= 35 ? 'text-amber-500' :
                                          'text-destructive'
                                        }`} />
                                        <span className={`text-xs font-medium ${
                                          lote.iot.temperaturaAtual === null ? 'text-muted-foreground' :
                                          lote.iot.temperaturaAtual >= 20 && lote.iot.temperaturaAtual <= 28 ? 'text-emerald-600' :
                                          lote.iot.temperaturaAtual >= 15 && lote.iot.temperaturaAtual <= 35 ? 'text-amber-500' :
                                          'text-destructive'
                                        }`}>
                                          {lote.iot.temperaturaAtual !== null ? `${lote.iot.temperaturaAtual.toFixed(1)}°C` : '--'}
                                        </span>
                                        <Droplets className={`w-3.5 h-3.5 ml-1 ${
                                          lote.iot.umidadeAtual === null ? 'text-muted-foreground' :
                                          lote.iot.umidadeAtual >= 50 && lote.iot.umidadeAtual <= 70 ? 'text-emerald-600' :
                                          lote.iot.umidadeAtual >= 40 && lote.iot.umidadeAtual <= 80 ? 'text-amber-500' :
                                          'text-destructive'
                                        }`} />
                                        <span className="text-xs text-muted-foreground">
                                          {lote.iot.umidadeAtual !== null ? `${lote.iot.umidadeAtual.toFixed(0)}%` : '--'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {lote.iot.dispositivosOnline === lote.iot.dispositivosTotal ? (
                                          <Wifi className="w-3 h-3 text-emerald-600" />
                                        ) : lote.iot.dispositivosOnline > 0 ? (
                                          <Wifi className="w-3 h-3 text-amber-500" />
                                        ) : (
                                          <WifiOff className="w-3 h-3 text-destructive" />
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                          {lote.iot.dispositivosOnline}/{lote.iot.dispositivosTotal}
                                        </span>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="text-xs space-y-1">
                                      <p className="font-medium">Dispositivos IoT</p>
                                      {lote.iot.dispositivos.map((d, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                          {d.online ? (
                                            <Wifi className="w-3 h-3 text-emerald-600" />
                                          ) : (
                                            <WifiOff className="w-3 h-3 text-destructive" />
                                          )}
                                          <span>{d.nome}</span>
                                          <span className={d.online ? 'text-emerald-600' : 'text-destructive'}>
                                            {d.online ? 'Online' : 'Offline'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(lote.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {lote.precisaPesar && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Scale className="w-4 h-4 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent>Necessita pesagem</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {lote.temSolicitacaoPendente && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Package className="w-4 h-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Solicitação de ração pendente</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {(lote.pendenciasVet || 0) > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Stethoscope className="w-4 h-4 text-blue-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>{lote.pendenciasVet} pendência(s) veterinária(s)</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {lote.jejumAtrasado && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent>Jejum atrasado!</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {lote.saidaProxima && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Clock className="w-4 h-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Saída prevista nas próximas 24h</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {lote.status === 'previsao' && (
                                  <DropdownMenuItem onClick={() => handleAlojar(lote)}>
                                    <Truck className="w-4 h-4 mr-2" />
                                    Enviar para Entrega
                                  </DropdownMenuItem>
                                )}
                                {lote.status === 'saiu_para_entrega' && (
                                  <DropdownMenuItem onClick={() => handleAdm(lote)}>
                                    <ClipboardCheck className="w-4 h-4 mr-2" />
                                    Receber Lote
                                  </DropdownMenuItem>
                                )}
                                {lote.status === 'alojado' && !isPostura && (
                                  <DropdownMenuItem onClick={() => handlePesagem(lote)}>
                                    <Scale className="w-4 h-4 mr-2" />
                                    Pesagem
                                  </DropdownMenuItem>
                                )}
                                {lote.status === 'alojado' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleMortalidade(lote)}>
                                      <Skull className="w-4 h-4 mr-2" />
                                      Mortalidade
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRacao(lote)}>
                                      <Package className="w-4 h-4 mr-2" />
                                      Ração
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleNotificacoesVet(lote)}>
                                      <Stethoscope className="w-4 h-4 mr-2" />
                                      Veterinário
                                    </DropdownMenuItem>
                                    {isPostura && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleProducaoOvos(lote)}>
                                          <Egg className="w-4 h-4 mr-2" />
                                          Produção de Ovos
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMetasPostura(lote)}>
                                          <Target className="w-4 h-4 mr-2" />
                                          Metas Postura
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {!isPostura && (
                                      <DropdownMenuItem onClick={() => navigate(`/meus-lotes/${lote.id}/metas`)}>
                                        <Target className="w-4 h-4 mr-2" />
                                        Metas
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleFechamento(lote)}>
                                      <Lock className="w-4 h-4 mr-2" />
                                      Fechar Lote
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Postura Indicators for selected lotes */}
        {lotes.filter(l => isPosturaLote(l) && l.status === 'alojado' && (l.semanasVida || 0) >= 19).length > 0 && (
          <Card className="mt-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Egg className="w-5 h-5" />
                Indicadores de Postura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lotes
                  .filter(l => isPosturaLote(l) && l.status === 'alojado' && (l.semanasVida || 0) >= 19)
                  .map(lote => (
                    <div key={lote.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{lote.nucleo?.nome} / {lote.galpao?.nome}</span>
                        <FasePosturaBadge semanasVida={lote.semanasVida || 0} />
                      </div>
                      <PosturaIndicators
                        percentualPostura={lote.percentualPostura}
                        percentualReferencia={lote.percentualReferencia}
                        ovosAveAlojada={lote.ovosAveAlojada}
                        semanasVida={lote.semanasVida || 0}
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialogs */}
      {selectedLote && (
        <>
          <RecebimentoLoteDialog
            open={recebimentoOpen}
            onOpenChange={setRecebimentoOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            quantidadeAves={selectedLote.quantidade_aves}
            onSuccess={fetchLotes}
          />
          <PesagemDialog
            open={pesagemOpen}
            onOpenChange={setPesagemOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            dataAlojamento={selectedLote.data_alojamento || ''}
            avesVivas={selectedLote.avesVivas || selectedLote.quantidade_aves}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            pesoInicialPintinhos={selectedLote.peso_medio_pintinhos}
            galpaoId={selectedLote.galpao_id}
            onSuccess={fetchLotes}
          />
          <MortalidadeDialog
            open={mortalidadeOpen}
            onOpenChange={setMortalidadeOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            quantidadeAves={selectedLote.avesVivas || selectedLote.quantidade_aves}
            dataAlojamento={selectedLote.data_alojamento || ''}
            onSuccess={fetchLotes}
          />
          <RacaoLoteDialog
            open={racaoOpen}
            onOpenChange={setRacaoOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            galpaoId={selectedLote.galpao_id}
            nucleo={selectedLote.nucleo?.nome || ''}
            galpao={selectedLote.galpao?.nome || ''}
            tipoProducao={selectedLote.nucleo?.tipo_producao || null}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            diasDesdeAlojamento={selectedLote.diasDesdeAlojamento || 0}
            avesVivas={selectedLote.avesVivas || selectedLote.quantidade_aves}
            onSuccess={fetchLotes}
          />
          <NotificacoesVetDialog
            open={notificacoesOpen}
            onOpenChange={setNotificacoesOpen}
            loteId={selectedLote.id}
            onSuccess={fetchLotes}
          />
          <ConfirmarJejumDialog
            open={jejumDialogOpen}
            onOpenChange={setJejumDialogOpen}
            loteId={selectedLote.id}
            horarioInicioJejum={selectedLote.horario_inicio_jejum}
            dataPrevistaSaida={selectedLote.data_prevista_saida}
            jejumConfirmado={selectedLote.jejum_confirmado}
            jejumConfirmadoEm={selectedLote.jejum_confirmado_em}
            onSuccess={fetchLotes}
          />
          <SaidaLoteInfoDialog
            open={saidaInfoOpen}
            onOpenChange={setSaidaInfoOpen}
            dataPrevistaSaida={selectedLote.data_prevista_saida}
            horarioInicioJejum={selectedLote.horario_inicio_jejum}
            saidaVendaLocal={selectedLote.saida_venda_local}
            saidaVendaExterna={selectedLote.saida_venda_externa}
            saidaAbate={selectedLote.saida_abate}
            jejumConfirmado={selectedLote.jejum_confirmado}
            jejumConfirmadoEm={selectedLote.jejum_confirmado_em}
          />
          <FechamentoLoteDialog
            open={fechamentoOpen}
            onOpenChange={setFechamentoOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            dataAlojamento={selectedLote.data_alojamento || ''}
            quantidadeAlojada={selectedLote.quantidadeAlojada ?? selectedLote.quantidade_aves}
            pesoInicialPintinhos={selectedLote.peso_medio_pintinhos}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            onSuccess={fetchLotes}
          />
          <ProducaoOvosDialog
            open={producaoOvosOpen}
            onOpenChange={setProducaoOvosOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            semanasVida={selectedLote.semanasVida || 0}
            avesVivas={selectedLote.avesVivas || selectedLote.quantidade_aves}
            linhagem={selectedLote.linhagem_postura || ''}
            onSuccess={fetchLotes}
          />
          <MetasPosturaDialog
            open={metasPosturaOpen}
            onOpenChange={setMetasPosturaOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            linhagem={selectedLote.linhagem_postura || ''}
            semanasVida={selectedLote.semanasVida || 0}
          />
        </>
      )}
    </div>
  );
}
