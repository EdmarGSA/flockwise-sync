import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Bird, 
  Scale, 
  Skull, 
  Target, 
  Package, 
  Stethoscope, 
  Truck, 
  ClipboardCheck,
  Egg,
  Lock,
  Clock
} from 'lucide-react';
import { format, differenceInDays, differenceInHours, parseISO, isBefore } from 'date-fns';
import { calcularIdadeLote } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RecebimentoLoteDialog } from '@/components/lotes/RecebimentoLoteDialog';
import { PesagemDialog } from '@/components/lotes/PesagemDialog';
import { MortalidadeDialog } from '@/components/lotes/MortalidadeDialog';
import { RacaoLoteDialog } from '@/components/lotes/RacaoLoteDialog';
import { NotificacoesVetDialog } from '@/components/lotes/NotificacoesVetDialog';
import { ConfirmarJejumDialog } from '@/components/lotes/ConfirmarJejumDialog';
import { SaidaLoteInfoDialog } from '@/components/lotes/SaidaLoteInfoDialog';
import { FechamentoLoteDialog } from '@/components/lotes/FechamentoLoteDialog';
import { FasePosturaBadge } from '@/components/lotes/postura/FasePosturaBadge';
import { ProducaoOvosDialog } from '@/components/lotes/postura/ProducaoOvosDialog';
import { SiloBadge } from '@/components/lotes/SiloBadge';

interface LoteData {
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

export default function LoteDetalhe() {
  const { loteId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [lote, setLote] = useState<LoteData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState<number | null>(null);
  const [diasDesdeAlojamento, setDiasDesdeAlojamento] = useState(0);
  const [semanasVida, setSemanasVida] = useState(0);
  const [precisaPesar, setPrecisaPesar] = useState(false);
  const [temSolicitacaoPendente, setTemSolicitacaoPendente] = useState(false);
  const [pendenciasVet, setPendenciasVet] = useState(0);
  const [jejumAtrasado, setJejumAtrasado] = useState(false);
  
  // Dialog states
  const [recebimentoOpen, setRecebimentoOpen] = useState(false);
  const [pesagemOpen, setPesagemOpen] = useState(false);
  const [mortalidadeOpen, setMortalidadeOpen] = useState(false);
  const [racaoOpen, setRacaoOpen] = useState(false);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [jejumDialogOpen, setJejumDialogOpen] = useState(false);
  const [saidaInfoOpen, setSaidaInfoOpen] = useState(false);
  const [fechamentoOpen, setFechamentoOpen] = useState(false);
  const [producaoOvosOpen, setProducaoOvosOpen] = useState(false);

  useEffect(() => {
    if (user && loteId) {
      fetchLote();
    }
  }, [user, loteId]);

  const fetchLote = async () => {
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
      .eq('id', loteId)
      .single();

    if (error || !data) {
      console.error('Erro ao buscar lote:', error);
      toast.error('Lote não encontrado');
      navigate('/meus-lotes');
      return;
    }

    const loteData = data as LoteData;
    setLote(loteData);

    // Get recebimento data for quantidade alojada
    const { data: recebimentoData } = await supabase
      .from('recebimento_lotes')
      .select('quantidade_mortos, quantidade_eliminados_locomotor, quantidade_eliminados_classificacao')
      .eq('lote_id', loteData.id)
      .maybeSingle();

    if (recebimentoData) {
      const mortos = recebimentoData.quantidade_mortos || 0;
      const eliminadosLocomotor = recebimentoData.quantidade_eliminados_locomotor || 0;
      const eliminadosClassificacao = recebimentoData.quantidade_eliminados_classificacao || 0;
      setQuantidadeAlojada(loteData.quantidade_aves - mortos - eliminadosLocomotor - eliminadosClassificacao);
    }

    // Calculate days since alojamento - Dia 1 = dia do alojamento
    if (loteData.data_alojamento) {
      const dias = calcularIdadeLote(loteData.data_alojamento);
      setDiasDesdeAlojamento(dias);
      setSemanasVida(Math.ceil(dias / 7));
    }

    // Check if needs weighing (every 7 days) - only for aves corte
    const isPostura = loteData.nucleo?.tipo_producao?.toLowerCase().includes('postura');
    if (!isPostura && loteData.status === 'alojado' && diasDesdeAlojamento >= 7) {
      const { data: pesagemData } = await supabase
        .from('pesagens')
        .select('data_pesagem')
        .eq('lote_id', loteData.id)
        .order('data_pesagem', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!pesagemData) {
        setPrecisaPesar(true);
      } else {
        const diasDesdeUltimaPesagem = differenceInDays(new Date(), new Date(pesagemData.data_pesagem));
        setPrecisaPesar(diasDesdeUltimaPesagem >= 7);
      }
    }

    // Check for pending feed requests
    const { data: solicitacaoData } = await supabase
      .from('solicitacoes_racao')
      .select('id')
      .eq('lote_id', loteData.id)
      .in('status', ['solicitado', 'confirmado', 'enviado']);
    setTemSolicitacaoPendente(solicitacaoData ? solicitacaoData.length > 0 : false);

    // Count pending vet notifications
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

    setPendenciasVet((orientacoesCount || 0) + (tratamentosCount || 0));

    // Check jejum atrasado
    const now = new Date();
    if (loteData.horario_inicio_jejum && !loteData.jejum_confirmado) {
      setJejumAtrasado(isBefore(parseISO(loteData.horario_inicio_jejum), now));
    }

    setLoadingData(false);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!lote) {
    return null;
  }

  const isPostura = lote.linhagem_postura !== null && lote.linhagem_postura !== undefined;
  const avesVivas = quantidadeAlojada ?? lote.quantidade_aves;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Em Trânsito', variant: 'destructive' },
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'secondary' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAlojar = async () => {
    try {
      const { error } = await supabase
        .from('lotes')
        .update({ status: 'saiu_para_entrega' })
        .eq('id', lote.id);

      if (error) throw error;

      toast.success('Status alterado para "Saiu para Entrega"');
      fetchLote();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/meus-lotes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">
              {lote.nucleo?.nome} / {lote.galpao?.nome}
            </h1>
          </div>
          {getStatusBadge(lote.status)}
        </div>
      </header>

      <main className="container mx-auto px-4 pt-20 pb-8">
        {/* Resumo do Lote */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Bird className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">Aves Vivas</p>
                  <p className="font-semibold text-lg">{avesVivas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              
              {lote.status === 'alojado' && (
                <div className="flex items-center gap-2 justify-end">
                  {isPostura ? (
                    <FasePosturaBadge semanasVida={semanasVida} />
                  ) : (
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">Idade</p>
                      <p className="font-semibold">{diasDesdeAlojamento} dias (S{semanasVida})</p>
                    </div>
                  )}
                </div>
              )}

              {lote.data_alojamento && (
                <div>
                  <p className="text-muted-foreground text-xs">Alojamento</p>
                  <p className="font-medium">{format(new Date(lote.data_alojamento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
              )}

              {lote.status === 'alojado' && (
                <div className="flex justify-end">
                  <SiloBadge
                    loteId={lote.id}
                    linhagem={lote.linhagem}
                    sexo={lote.sexo}
                    diasDesdeAlojamento={diasDesdeAlojamento}
                    avesVivas={avesVivas}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação - Grid responsivo */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status: previsao */}
          {lote.status === 'previsao' && (
            <>
              <Button 
                size="lg" 
                onClick={handleAlojar}
                className="h-20 flex-col gap-1"
              >
                <Truck className="w-6 h-6" />
                <span>Alojar</span>
              </Button>
              <Button 
                size="lg" 
                variant={temSolicitacaoPendente ? 'destructive' : 'outline'}
                onClick={() => setRacaoOpen(true)}
                className="h-20 flex-col gap-1 relative"
              >
                <Package className="w-6 h-6" />
                <span>Ração</span>
                {temSolicitacaoPendente && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse" />
                )}
              </Button>
            </>
          )}

          {/* Status: saiu_para_entrega */}
          {lote.status === 'saiu_para_entrega' && (
            <>
              <Button 
                size="lg" 
                onClick={() => setRecebimentoOpen(true)}
                className="h-20 flex-col gap-1"
              >
                <ClipboardCheck className="w-6 h-6" />
                <span>Receber</span>
              </Button>
              <Button 
                size="lg" 
                variant={temSolicitacaoPendente ? 'destructive' : 'outline'}
                onClick={() => setRacaoOpen(true)}
                className="h-20 flex-col gap-1"
              >
                <Package className="w-6 h-6" />
                <span>Ração</span>
              </Button>
            </>
          )}

          {/* Status: alojado */}
          {lote.status === 'alojado' && (
            <>
              {isPostura ? (
                <>
                  {/* Postura Actions */}
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setProducaoOvosOpen(true)}
                    className="h-20 flex-col gap-1"
                  >
                    <Egg className="w-6 h-6" />
                    <span>Produção</span>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setMortalidadeOpen(true)}
                    className="h-20 flex-col gap-1"
                  >
                    <Skull className="w-6 h-6" />
                    <span>Mortalidade</span>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate(`/meus-lotes/${lote.id}/metas-postura`)}
                    className="h-20 flex-col gap-1"
                  >
                    <Target className="w-6 h-6" />
                    <span>Metas</span>
                  </Button>
                </>
              ) : (
                <>
                  {/* Corte Actions */}
                  <Button 
                    size="lg" 
                    variant={precisaPesar ? 'destructive' : 'outline'}
                    onClick={() => setPesagemOpen(true)}
                    className="h-20 flex-col gap-1 relative"
                  >
                    <Scale className="w-6 h-6" />
                    <span>Pesagem</span>
                    {precisaPesar && (
                      <Badge variant="destructive" className="absolute top-1 right-1 text-[10px] px-1">!</Badge>
                    )}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setMortalidadeOpen(true)}
                    className="h-20 flex-col gap-1"
                  >
                    <Skull className="w-6 h-6" />
                    <span>Mortalidade</span>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate(`/meus-lotes/${lote.id}/metas`)}
                    className="h-20 flex-col gap-1"
                  >
                    <Target className="w-6 h-6" />
                    <span>Metas</span>
                  </Button>
                </>
              )}

              {/* Common Actions */}
              <Button 
                size="lg" 
                variant={temSolicitacaoPendente ? 'destructive' : 'outline'}
                onClick={() => setRacaoOpen(true)}
                className="h-20 flex-col gap-1 relative"
              >
                <Package className="w-6 h-6" />
                <span>Ração</span>
                {temSolicitacaoPendente && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse" />
                )}
              </Button>

              <Button 
                size="lg" 
                variant={pendenciasVet > 0 ? 'destructive' : 'outline'}
                onClick={() => setNotificacoesOpen(true)}
                className="h-20 flex-col gap-1 relative"
              >
                <Stethoscope className="w-6 h-6" />
                <span>Veterinário</span>
                {pendenciasVet > 0 && (
                  <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1.5">{pendenciasVet}</Badge>
                )}
              </Button>

              <Button 
                size="lg" 
                variant={jejumAtrasado ? 'destructive' : lote.data_prevista_saida ? 'outline' : 'secondary'}
                onClick={() => lote.data_prevista_saida ? setSaidaInfoOpen(true) : null}
                disabled={!lote.data_prevista_saida}
                className="h-20 flex-col gap-1 relative"
              >
                <Truck className="w-6 h-6" />
                <span>Saída</span>
                {jejumAtrasado && (
                  <Badge variant="destructive" className="absolute top-1 right-1 text-[10px] px-1">!</Badge>
                )}
              </Button>

              {lote.horario_inicio_jejum && !lote.jejum_confirmado && (
                <Button 
                  size="lg" 
                  variant={jejumAtrasado ? 'destructive' : 'outline'}
                  onClick={() => setJejumDialogOpen(true)}
                  className="h-20 flex-col gap-1"
                >
                  <Clock className="w-6 h-6" />
                  <span>Jejum</span>
                </Button>
              )}

              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setFechamentoOpen(true)}
                className="h-20 flex-col gap-1"
              >
                <Lock className="w-6 h-6" />
                <span>Fechamento</span>
              </Button>
            </>
          )}

          {/* Status: fechado - apenas visualização */}
          {lote.status === 'fechado' && (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Lote fechado em {lote.data_fechamento ? format(new Date(lote.data_fechamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <RecebimentoLoteDialog
        open={recebimentoOpen}
        onOpenChange={setRecebimentoOpen}
        loteId={lote.id}
        integradoId={lote.integrado_id}
        quantidadeAves={lote.quantidade_aves}
        onSuccess={fetchLote}
      />
      <PesagemDialog
        open={pesagemOpen}
        onOpenChange={setPesagemOpen}
        loteId={lote.id}
        integradoId={lote.integrado_id}
        galpaoId={lote.galpao_id}
        avesVivas={avesVivas}
        pesoInicialPintinhos={lote.peso_medio_pintinhos}
        diasDesdeAlojamento={diasDesdeAlojamento}
        dataAlojamento={lote.data_alojamento}
        linhagem={lote.linhagem}
        sexo={lote.sexo}
        onSuccess={fetchLote}
      />
      <MortalidadeDialog
        open={mortalidadeOpen}
        onOpenChange={setMortalidadeOpen}
        loteId={lote.id}
        integradoId={lote.integrado_id}
        dataAlojamento={lote.data_alojamento}
        quantidadeAves={avesVivas}
        onSuccess={fetchLote}
      />
      <RacaoLoteDialog
        open={racaoOpen}
        onOpenChange={setRacaoOpen}
        loteId={lote.id}
        integradoId={lote.integrado_id}
        galpaoId={lote.galpao_id}
        nucleo={lote.nucleo?.nome || '-'}
        galpao={lote.galpao?.nome || '-'}
        tipoProducao={lote.nucleo?.tipo_producao || null}
        linhagem={lote.linhagem}
        sexo={lote.sexo}
        diasDesdeAlojamento={diasDesdeAlojamento}
        avesVivas={avesVivas}
        onSuccess={fetchLote}
      />
      <NotificacoesVetDialog
        open={notificacoesOpen}
        onOpenChange={setNotificacoesOpen}
        loteId={lote.id}
        onSuccess={fetchLote}
      />
      <ConfirmarJejumDialog
        open={jejumDialogOpen}
        onOpenChange={setJejumDialogOpen}
        loteId={lote.id}
        horarioInicioJejum={lote.horario_inicio_jejum}
        dataPrevistaSaida={lote.data_prevista_saida}
        jejumConfirmado={lote.jejum_confirmado}
        jejumConfirmadoEm={lote.jejum_confirmado_em}
        onSuccess={fetchLote}
      />
      <SaidaLoteInfoDialog
        open={saidaInfoOpen}
        onOpenChange={setSaidaInfoOpen}
        dataPrevistaSaida={lote.data_prevista_saida}
        horarioInicioJejum={lote.horario_inicio_jejum}
        saidaVendaLocal={lote.saida_venda_local}
        saidaVendaExterna={lote.saida_venda_externa}
        saidaAbate={lote.saida_abate}
        jejumConfirmado={lote.jejum_confirmado}
        jejumConfirmadoEm={lote.jejum_confirmado_em}
      />
      <FechamentoLoteDialog
        open={fechamentoOpen}
        onOpenChange={setFechamentoOpen}
        loteId={lote.id}
        integradoId={lote.integrado_id}
        dataAlojamento={lote.data_alojamento || ''}
        quantidadeAlojada={quantidadeAlojada || lote.quantidade_aves}
        pesoInicialPintinhos={lote.peso_medio_pintinhos}
        linhagem={lote.linhagem}
        sexo={lote.sexo}
        onSuccess={fetchLote}
      />
      <ProducaoOvosDialog
        open={producaoOvosOpen}
        onOpenChange={setProducaoOvosOpen}
        loteId={lote.id}
        integradoId={lote.integrado_id}
        linhagem={lote.linhagem_postura || ''}
        semanasVida={semanasVida}
        avesVivas={avesVivas}
        onSuccess={fetchLote}
      />
    </div>
  );
}
