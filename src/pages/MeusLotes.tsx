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
import { Bird, ArrowLeft, Calendar, Users, Truck, ClipboardCheck, Scale, AlertTriangle, Skull, Target, ChevronDown, Package, Stethoscope, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, differenceInDays, differenceInHours, parseISO, isBefore } from 'date-fns';
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

interface Lote {
  id: string;
  quantidade_aves: number;
  data_prevista_alojamento: string;
  data_alojamento: string | null;
  data_fechamento: string | null;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  status: string;
  veterinario_id: string | null;
  integrado_id: string;
  peso_medio_pintinhos: number | null;
  nucleo_id: string;
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
  precisaPesar?: boolean;
  quantidadeAlojada?: number | null;
  temSolicitacaoPendente?: boolean;
  pendenciasVet?: number;
  jejumAtrasado?: boolean;
  saidaProxima?: boolean;
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
        sexo,
        status,
        integrado_id,
        peso_medio_pintinhos,
        nucleo_id,
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

        // Check for pending feed requests (solicitado, confirmado, or enviado status)
        const { data: solicitacaoData } = await supabase
          .from('solicitacoes_racao')
          .select('id')
          .eq('lote_id', loteData.id)
          .in('status', ['solicitado', 'confirmado', 'enviado'])
          .limit(1)
          .maybeSingle();

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
        const temSolicitacaoPendente = !!solicitacaoData;
        
        // Calculate quantidade alojada
        let quantidadeAlojada: number | null = null;
        if (recebimentoData) {
          const mortos = recebimentoData.quantidade_mortos || 0;
          const eliminadosLocomotor = recebimentoData.quantidade_eliminados_locomotor || 0;
          const eliminadosClassificacao = recebimentoData.quantidade_eliminados_classificacao || 0;
          quantidadeAlojada = loteData.quantidade_aves - mortos - eliminadosLocomotor - eliminadosClassificacao;
        }
        
        // Calculate days since alojamento
        let diasDesdeAlojamento = 0;
        if (loteData.data_alojamento) {
          diasDesdeAlojamento = differenceInDays(new Date(), new Date(loteData.data_alojamento));
        }

        // Check if needs weighing (every 7 days)
        let precisaPesar = false;
        if (loteData.status === 'alojado' && diasDesdeAlojamento >= 7) {
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
          precisaPesar,
          quantidadeAlojada,
          temSolicitacaoPendente,
          pendenciasVet,
          jejumAtrasado,
          saidaProxima,
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
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <strong>{lotesPrecisandoPesar} lote(s)</strong> precisam de pesagem (intervalo de 7 dias).
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
                  <p className="text-2xl font-bold text-destructive">{lotesEmTransito}</p>
                </div>
                <Truck className="w-8 h-8 text-destructive/50" />
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
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Todos os Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : lotes.length === 0 ? (
              <div className="text-center py-12">
                <Bird className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum lote cadastrado ainda.</p>
                <Button onClick={() => navigate('/gestao-campo')} className="gap-2">
                  Ir para Gestão de Campo
                </Button>
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
                      {lotes.some(l => l.status !== 'alojado' && l.status !== 'fechado') && (
                        <>
                          <TableHead>Linhagem</TableHead>
                          <TableHead>Previsão</TableHead>
                        </>
                      )}
                      <TableHead>Alojamento</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id} className={lote.precisaPesar ? 'bg-destructive/10' : ''}>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                        <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                        <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                        <TableCell>
                          {lote.status === 'alojado' || lote.status === 'fechado' ? (
                            <div className="flex flex-col">
                              <span>{(lote.quantidadeAlojada ?? lote.quantidade_aves).toLocaleString('pt-BR')}</span>
                              {lote.quantidadeAlojada !== null && lote.quantidadeAlojada !== lote.quantidade_aves && (
                                <span className="text-xs text-muted-foreground">
                                  de {lote.quantidade_aves.toLocaleString('pt-BR')}
                                </span>
                              )}
                            </div>
                          ) : (
                            lote.quantidade_aves.toLocaleString('pt-BR')
                          )}
                        </TableCell>
                        {lotes.some(l => l.status !== 'alojado' && l.status !== 'fechado') && (
                          <>
                            <TableCell>
                              {lote.status !== 'alojado' && lote.status !== 'fechado' ? getLinhagemLabel(lote.linhagem) : '-'}
                            </TableCell>
                            <TableCell>
                              {lote.status !== 'alojado' && lote.status !== 'fechado' ? formatDate(lote.data_prevista_alojamento) : '-'}
                            </TableCell>
                          </>
                        )}
                        <TableCell>{formatDate(lote.data_alojamento)}</TableCell>
                        <TableCell>
                          {lote.status === 'alojado' && lote.diasDesdeAlojamento !== undefined ? (
                            <Badge variant={lote.precisaPesar ? 'destructive' : 'secondary'}>
                              {lote.diasDesdeAlojamento} dias
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {lote.status === 'previsao' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAlojar(lote)}
                                className="gap-1"
                              >
                                <Truck className="w-4 h-4" />
                                Alojar
                              </Button>
                            )}
                            {lote.status === 'saiu_para_entrega' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleAdm(lote)}
                                className="gap-1"
                              >
                                <ClipboardCheck className="w-4 h-4" />
                                Adm.
                              </Button>
                            )}
                            {lote.status === 'alojado' && (
                              <>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant={lote.precisaPesar ? 'destructive' : 'default'}
                                      className="gap-1"
                                    >
                                      <ClipboardCheck className="w-4 h-4" />
                                      Adm.
                                      <ChevronDown className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handlePesagem(lote)} className="gap-2">
                                      <Scale className="w-4 h-4" />
                                      Pesagem
                                      {lote.precisaPesar && (
                                        <Badge variant="destructive" className="ml-2 text-xs">!</Badge>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleMortalidade(lote)} className="gap-2">
                                      <Skull className="w-4 h-4" />
                                      Mortalidade
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate(`/meus-lotes/${lote.id}/metas`)} className="gap-2">
                                      <Target className="w-4 h-4" />
                                      Meta
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button 
                                  size="sm" 
                                  variant={lote.temSolicitacaoPendente ? 'destructive' : 'outline'}
                                  onClick={() => handleRacao(lote)}
                                  className="gap-1 relative"
                                >
                                  <Package className="w-4 h-4" />
                                  Ração
                                  {lote.temSolicitacaoPendente && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                                    </span>
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={lote.pendenciasVet && lote.pendenciasVet > 0 ? 'destructive' : 'outline'}
                                  onClick={() => handleNotificacoesVet(lote)}
                                  className="gap-1 relative"
                                >
                                  <Stethoscope className="w-4 h-4" />
                                  {lote.pendenciasVet && lote.pendenciasVet > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                                    </span>
                                  )}
                                </Button>
                                <SiloBadge
                                  loteId={lote.id}
                                  linhagem={lote.linhagem}
                                  sexo={lote.sexo}
                                  diasDesdeAlojamento={lote.diasDesdeAlojamento || 0}
                                  avesVivas={lote.quantidadeAlojada || lote.quantidade_aves}
                                />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant={lote.jejumAtrasado ? 'destructive' : lote.data_prevista_saida ? 'outline' : 'ghost'}
                                        onClick={() => lote.data_prevista_saida ? handleSaidaInfo(lote) : undefined}
                                        className="gap-1 relative"
                                        disabled={!lote.data_prevista_saida}
                                      >
                                        <Truck className="w-4 h-4" />
                                        {(lote.jejumAtrasado || lote.saidaProxima) && (
                                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                          </span>
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {lote.data_prevista_saida ? (
                                        <div className="text-xs">
                                          <p>Saída: {format(parseISO(lote.data_prevista_saida), "dd/MM HH:mm")}</p>
                                          {lote.horario_inicio_jejum && (
                                            <p>Jejum: {format(parseISO(lote.horario_inicio_jejum), "dd/MM HH:mm")} {lote.jejum_confirmado ? '✓' : ''}</p>
                                          )}
                                        </div>
                                      ) : 'Sem saída programada'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {lote.horario_inicio_jejum && !lote.jejum_confirmado && (
                                  <Button 
                                    size="sm" 
                                    variant={lote.jejumAtrasado ? 'destructive' : 'outline'}
                                    onClick={() => handleJejum(lote)}
                                    className="gap-1"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
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
            pesoInicialPintinhos={selectedLote.peso_medio_pintinhos}
            diasDesdeAlojamento={selectedLote.diasDesdeAlojamento}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            onSuccess={fetchLotes}
          />
          <MortalidadeDialog
            open={mortalidadeOpen}
            onOpenChange={setMortalidadeOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            onSuccess={fetchLotes}
          />
          <RacaoLoteDialog
            open={racaoOpen}
            onOpenChange={setRacaoOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            nucleo={selectedLote.nucleo?.nome || '-'}
            galpao={selectedLote.galpao?.nome || '-'}
            tipoProducao={selectedLote.nucleo?.tipo_producao || null}
            linhagem={selectedLote.linhagem}
            sexo={selectedLote.sexo}
            diasDesdeAlojamento={selectedLote.diasDesdeAlojamento}
            avesVivas={selectedLote.quantidadeAlojada || selectedLote.quantidade_aves}
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
        </>
      )}
    </div>
  );
}
