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
import { Bird, ArrowLeft, Calendar, Users, Truck, ClipboardCheck, Scale, AlertTriangle, Skull, Target, ChevronDown, Package, Stethoscope, Clock, Lock, Egg } from 'lucide-react';
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
import { FasePosturaBadge } from '@/components/lotes/postura/FasePosturaBadge';
import { PosturaIndicators } from '@/components/lotes/postura/PosturaIndicators';
import { ProducaoOvosDialog } from '@/components/lotes/postura/ProducaoOvosDialog';
import { MetasPosturaDialog } from '@/components/lotes/postura/MetasPosturaDialog';

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
  // Saída de Lote fields
  data_prevista_saida: string | null;
  horario_inicio_jejum: string | null;
  saida_venda_local: number;
  saida_venda_externa: number;
  saida_abate: number;
  jejum_confirmado: boolean;
  jejum_confirmado_por: string | null;
  jejum_confirmado_em: string | null;
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
  // Postura specific
  percentualPostura?: number | null;
  percentualReferencia?: number | null;
  ovosAveAlojada?: number | null;
}

export default function MeusLotes() {
  const { user, loading } = useAuth();
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

    // Fetch last pesagem and recebimento for each lote
    const lotesComPesagem: LoteComPesagem[] = await Promise.all(
      (data || []).map(async (lote) => {
        const loteData = lote as Lote;
        
        // Get last pesagem date
        const { data: pesagemData } = await supabase
          .from('pesagens')
          .select('data_pesagem')
          .eq('lote_id', loteData.id)
          .order('data_pesagem', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get recebimento data for quantidade alojada
        const { data: recebimentoData } = await supabase
          .from('recebimento_lotes')
          .select('quantidade_mortos, quantidade_eliminados_locomotor, quantidade_eliminados_classificacao')
          .eq('lote_id', loteData.id)
          .maybeSingle();

        // Get accumulated mortality data
        const { data: mortalidadeData } = await supabase
          .from('mortalidade')
          .select('mortalidade_itens(quantidade)')
          .eq('lote_id', loteData.id);

        // Calculate total accumulated mortality
        const mortalidadeAcumulada = mortalidadeData?.reduce((total, m) => {
          const itens = m.mortalidade_itens as { quantidade: number }[];
          return total + (itens?.reduce((sum, item) => sum + (item.quantidade || 0), 0) || 0);
        }, 0) || 0;

        // Check for pending feed requests (solicitado, confirmado, or enviado status)
        const { data: solicitacaoData } = await supabase
          .from('solicitacoes_racao')
          .select('id, status')
          .eq('lote_id', loteData.id)
          .in('status', ['solicitado', 'confirmado', 'enviado']);

        // Count pending vet notifications (unread orientacoes + unconfirmed tratamentos)
        const { count: orientacoesCount } = await supabase
          .from('observacoes_lote')
          .select('id', { count: 'exact', head: true })
          .eq('lote_id', loteData.id)
          .eq('tipo', 'orientacao')
          .is('lido_por', null);

        const { count: tratamentosCount } = await supabase
          .from('tratamentos_lote')
          .select('id', { count: 'exact', head: true })
          .eq('lote_id', loteData.id)
          .eq('status', 'ativo')
          .eq('aplicacao_confirmada', false);

        const pendenciasVet = (orientacoesCount || 0) + (tratamentosCount || 0);

        const ultimaPesagem = pesagemData?.data_pesagem || null;
        const temSolicitacaoPendente = solicitacaoData && solicitacaoData.length > 0;
        const temSolicitacaoEnviada = solicitacaoData?.some(s => s.status === 'enviado') || false;
        
        // Calculate quantidade alojada (descounting dead/eliminated on arrival)
        let quantidadeAlojada: number | null = null;
        if (recebimentoData) {
          const mortos = recebimentoData.quantidade_mortos || 0;
          const eliminadosLocomotor = recebimentoData.quantidade_eliminados_locomotor || 0;
          const eliminadosClassificacao = recebimentoData.quantidade_eliminados_classificacao || 0;
          quantidadeAlojada = loteData.quantidade_aves - mortos - eliminadosLocomotor - eliminadosClassificacao;
        }

        // Calculate live birds (alojada - accumulated daily mortality)
        const avesVivas = (quantidadeAlojada ?? loteData.quantidade_aves) - mortalidadeAcumulada;
        
        // Calculate days since alojamento - Dia 1 = dia do alojamento
        let diasDesdeAlojamento = 0;
        let semanasVida = 0;
        if (loteData.data_alojamento) {
          diasDesdeAlojamento = calcularIdadeLote(loteData.data_alojamento);
          semanasVida = Math.ceil(diasDesdeAlojamento / 7);
        }

        // Check if is postura type
        const isPostura = loteData.nucleo?.tipo_producao?.toLowerCase().includes('postura');

        // Fetch postura-specific data if applicable
        let percentualPostura: number | null = null;
        let percentualReferencia: number | null = null;
        let ovosAveAlojada: number | null = null;

        if (isPostura && loteData.status === 'alojado' && semanasVida >= 19) {
          // Get total eggs produced
          const { data: producaoData } = await supabase
            .from('producao_ovos')
            .select('quantidade_ovos')
            .eq('lote_id', loteData.id);
          
          const totalOvos = producaoData?.reduce((sum, p) => sum + ((p as any).quantidade_ovos || 0), 0) || 0;
          const avesVivasPostura = avesVivas;
          
          // Calculate ovos por ave viva
          ovosAveAlojada = avesVivasPostura > 0 ? totalOvos / avesVivasPostura : 0;
          
          // Calculate approximate % postura (last 7 days average)
          const { data: recentProducao } = await supabase
            .from('producao_ovos')
            .select('quantidade_ovos')
            .eq('lote_id', loteData.id)
            .order('data_producao', { ascending: false })
            .limit(7);
          
          if (recentProducao && recentProducao.length > 0) {
            const avgDailyOvos = recentProducao.reduce((sum, p) => sum + ((p as any).quantidade_ovos || 0), 0) / recentProducao.length;
            percentualPostura = avesVivasPostura > 0 ? (avgDailyOvos / avesVivasPostura) * 100 : 0;
            
          }
          
          // Get reference % from desempenho_postura
          if (loteData.linhagem_postura) {
            const { data: refData } = await supabase
              .from('desempenho_postura')
              .select('producao_percentual')
              .eq('linhagem', loteData.linhagem_postura as any)
              .eq('semana', semanasVida)
              .maybeSingle();
            
            percentualReferencia = refData?.producao_percentual || null;
          }
        }

        // Check if needs weighing (every 7 days) - only for aves corte
        let precisaPesar = false;
        if (!isPostura && loteData.status === 'alojado' && diasDesdeAlojamento >= 7) {
          if (!ultimaPesagem) {
            precisaPesar = true;
          } else {
            const diasDesdeUltimaPesagem = differenceInDays(new Date(), new Date(ultimaPesagem));
            precisaPesar = diasDesdeUltimaPesagem >= 7;
          }
        }

        // Check jejum atrasado and saida proxima
        const now = new Date();
        const jejumAtrasado = loteData.horario_inicio_jejum 
          ? isBefore(parseISO(loteData.horario_inicio_jejum), now) && !loteData.jejum_confirmado
          : false;
        
        const horasParaSaida = loteData.data_prevista_saida 
          ? differenceInHours(parseISO(loteData.data_prevista_saida), now)
          : null;
        const saidaProxima = horasParaSaida !== null && horasParaSaida <= 24 && horasParaSaida >= 0;

        return {
          ...loteData,
          ultimaPesagem,
          diasDesdeAlojamento,
          semanasVida,
          precisaPesar,
          quantidadeAlojada,
          avesVivas,
          temSolicitacaoPendente,
          temSolicitacaoEnviada,
          pendenciasVet,
          jejumAtrasado,
          saidaProxima,
          percentualPostura,
          percentualReferencia,
          ovosAveAlojada,
        };
      })
    );
    
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
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'destructive' },
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'secondary' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
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
    // Lotes de postura usam linhagem_postura, lotes de corte usam linhagem
    return lote.linhagem_postura !== null && lote.linhagem_postura !== undefined;
  };

  const getLinhagemPosturaLabel = (linhagem: string | null) => {
    if (!linhagem) return '-';
    const labels: Record<string, string> = {
      lohmann_brown_lite: 'Lohmann Brown-Lite',
      hy_line_brown: 'Hy-Line Brown',
      isa_brown: 'ISA Brown',
      lohmann_lsl: 'Lohmann LSL',
      dekalb_white: 'Dekalb White',
    };
    return labels[linhagem] || linhagem;
  };

  const getLinhagemLabel = (linhagem: string) => {
    const labels: Record<string, string> = {
      cobb_500: 'Cobb 500',
      ross_308: 'Ross 308',
      hubbard: 'Hubbard',
    };
    return labels[linhagem] || linhagem;
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

          <Button onClick={() => navigate('/gestao-campo')} variant="outline" className="gap-2">
            Gestão de Campo
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Weighing Alert */}
        {lotesPrecisandoPesar > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <strong>{lotesPrecisandoPesar} lote(s)</strong> precisam de pesagem.
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {[
            { status: 'todos', label: 'Todos', count: lotes.length },
            { status: 'alojado', label: 'Alojados', count: lotesAtivos },
            { status: 'previsao', label: 'Previstos', count: lotesPendentes },
            { status: 'saiu_para_entrega', label: 'Trânsito', count: lotesEmTransito },
            { status: 'fechado', label: 'Fechados', count: lotesFechados },
          ].map((tab) => (
            <Badge
              key={tab.status}
              variant={tab.count > 0 ? 'default' : 'secondary'}
              className="cursor-pointer whitespace-nowrap px-3 py-1.5"
            >
              {tab.label} ({tab.count})
            </Badge>
          ))}
        </div>

        {/* Lotes Grid */}
        {loadingData ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : lotes.length === 0 ? (
          <div className="text-center py-12">
            <Bird className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum lote cadastrado ainda.</p>
            <Button onClick={() => navigate('/gestao-campo')} className="gap-2">
              Ir para Gestão de Campo
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lotes.map((lote) => (
              <Card 
                key={lote.id}
                className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${lote.precisaPesar ? 'border-destructive/50 bg-destructive/5' : ''}`}
                onClick={() => navigate(`/meus-lotes/${lote.id}`)}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(lote.status)}
                    <div className="flex items-center gap-1">
                      {lote.precisaPesar && (
                        <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                          <Scale className="w-3 h-3 text-destructive" />
                        </div>
                      )}
                      {lote.temSolicitacaoPendente && (
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Package className="w-3 h-3 text-amber-600" />
                        </div>
                      )}
                      {lote.pendenciasVet && lote.pendenciasVet > 0 && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <Stethoscope className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <h3 className="font-semibold text-foreground mb-3 truncate">
                    {lote.nucleo?.nome} / {lote.galpao?.nome}
                  </h3>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Bird className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {(lote.avesVivas ?? lote.quantidadeAlojada ?? lote.quantidade_aves).toLocaleString('pt-BR')} aves
                        </span>
                        {lote.quantidadeAlojada && lote.quantidadeAlojada !== lote.quantidade_aves && (
                          <span className="text-xs text-muted-foreground">
                            (alojadas: {lote.quantidadeAlojada.toLocaleString('pt-BR')})
                          </span>
                        )}
                      </div>
                    </div>
                    {lote.status === 'alojado' && (
                      <div className="flex justify-end">
                        <Badge variant="secondary" className="text-xs">
                          {lote.diasDesdeAlojamento}d (S{lote.semanasVida})
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

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
            galpaoId={selectedLote.galpao_id}
            avesVivas={selectedLote.avesVivas ?? selectedLote.quantidadeAlojada ?? selectedLote.quantidade_aves}
            pesoInicialPintinhos={selectedLote.peso_medio_pintinhos}
            diasDesdeAlojamento={selectedLote.diasDesdeAlojamento}
            dataAlojamento={selectedLote.data_alojamento}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            onSuccess={fetchLotes}
          />
          <MortalidadeDialog
            open={mortalidadeOpen}
            onOpenChange={setMortalidadeOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            dataAlojamento={selectedLote.data_alojamento}
            quantidadeAves={selectedLote.quantidade_aves}
            onSuccess={fetchLotes}
          />
          <RacaoLoteDialog
            open={racaoOpen}
            onOpenChange={setRacaoOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            galpaoId={selectedLote.galpao_id}
            nucleo={selectedLote.nucleo?.nome || '-'}
            galpao={selectedLote.galpao?.nome || '-'}
            tipoProducao={selectedLote.nucleo?.tipo_producao || null}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            diasDesdeAlojamento={selectedLote.diasDesdeAlojamento}
            avesVivas={selectedLote.avesVivas ?? selectedLote.quantidadeAlojada ?? selectedLote.quantidade_aves}
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
            quantidadeAlojada={selectedLote.quantidadeAlojada || selectedLote.quantidade_aves}
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
            linhagem={selectedLote.linhagem_postura || ''}
            semanasVida={selectedLote.semanasVida || 0}
            avesVivas={selectedLote.avesVivas ?? selectedLote.quantidadeAlojada ?? selectedLote.quantidade_aves}
            onSuccess={fetchLotes}
          />
          <MetasPosturaDialog
            open={metasPosturaOpen}
            onOpenChange={setMetasPosturaOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            linhagem={selectedLote.linhagem_postura || ''}
            semanasVida={selectedLote.semanasVida || 0}
            onSuccess={fetchLotes}
          />
        </>
      )}
    </div>
  );
}
