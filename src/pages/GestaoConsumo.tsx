import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Package, ArrowLeft, Bird, Calendar, Truck, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RacaoGestaoDialog } from '@/components/consumo/RacaoGestaoDialog';

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
}

export default function GestaoConsumo() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LoteConsumo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRacao[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [racaoDialogOpen, setRacaoDialogOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<LoteConsumo | null>(null);

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

        let diasDesdeAlojamento = 0;
        if (loteData.data_alojamento) {
          diasDesdeAlojamento = differenceInDays(new Date(), new Date(loteData.data_alojamento));
        }

        return {
          ...loteData,
          quantidadeAlojada,
          diasDesdeAlojamento,
        };
      })
    );

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

  const getLinhagemLabel = (linhagem: string) => {
    const labels: Record<string, string> = {
      cobb_500: 'Cobb 500',
      ross_308: 'Ross 308',
      hubbard: 'Hubbard',
    };
    return labels[linhagem] || linhagem;
  };

  const getSexoLabel = (sexo: string) => {
    const labels: Record<string, string> = {
      macho: 'Macho',
      femea: 'Fêmea',
      misto: 'Misto',
    };
    return labels[sexo] || sexo;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'destructive' },
      alojado: { label: 'Alojado', variant: 'default' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSolicitacaoStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
      solicitado: { label: 'Solicitado', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      confirmado: { label: 'Confirmado', variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
      enviado: { label: 'Enviado', variant: 'destructive', icon: <Truck className="w-3 h-3" /> },
      recebido: { label: 'Recebido', variant: 'default', icon: <Package className="w-3 h-3" /> },
      parcialmente_devolvido: { label: 'Devol. Parcial', variant: 'secondary', icon: <RefreshCw className="w-3 h-3" /> },
      devolvido: { label: 'Devolvido', variant: 'outline', icon: <RefreshCw className="w-3 h-3" /> },
    };
    const config = variants[status] || { label: status, variant: 'outline', icon: null };
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
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

  const handleConfirmarEnvio = async (solicitacao: SolicitacaoRacao) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          status: 'enviado',
          data_envio: new Date().toISOString(),
        })
        .eq('id', solicitacao.id);

      if (error) throw error;
      toast.success('Envio confirmado!');
      fetchSolicitacoes();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao confirmar envio');
    }
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getLoteSolicitacoes = (loteId: string) => {
    return solicitacoes.filter(s => s.lote_id === loteId);
  };

  const getPendingCount = () => {
    return solicitacoes.filter(s => s.status === 'solicitado').length;
  };

  const getEnviadosCount = () => {
    return solicitacoes.filter(s => s.status === 'enviado').length;
  };

  const getDevolucoesPendentes = () => {
    return solicitacoes.filter(s => 
      (s.quantidade_devolvida_kg || 0) > 0 && !s.devolucao_confirmada
    ).length;
  };

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
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Gestão de Consumo
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Lotes Ativos</p>
                  <p className="text-2xl font-bold text-primary">{lotes.length}</p>
                </div>
                <Bird className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Solicit. Pendentes</p>
                  <p className="text-2xl font-bold text-amber-500">{getPendingCount()}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Em Trânsito</p>
                  <p className="text-2xl font-bold text-destructive">{getEnviadosCount()}</p>
                </div>
                <Truck className="w-8 h-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Devol. Pendentes</p>
                  <p className="text-2xl font-bold text-orange-500">{getDevolucoesPendentes()}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lotes Table */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Lotes Ativos</CardTitle>
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
                      <TableHead>Linhagem</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                        <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                        <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                        <TableCell>
                          {(lote.quantidadeAlojada ?? lote.quantidade_aves).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{getLinhagemLabel(lote.linhagem)}</TableCell>
                        <TableCell>{getSexoLabel(lote.sexo)}</TableCell>
                        <TableCell>
                          {lote.diasDesdeAlojamento !== undefined && lote.diasDesdeAlojamento > 0 ? (
                            <Badge variant="secondary">{lote.diasDesdeAlojamento} dias</Badge>
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

        {/* Solicitações Pendentes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Solicitações de Ração
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solicitacoes.length === 0 ? (
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
                    {solicitacoes.map((solicitacao) => {
                      const lote = lotes.find(l => l.id === solicitacao.lote_id);
                      return (
                        <TableRow key={solicitacao.id}>
                          <TableCell className="font-medium">
                            {lote ? `${lote.nucleo?.nome} - ${lote.galpao?.nome}` : '-'}
                          </TableCell>
                          <TableCell>{solicitacao.tipo_racao}</TableCell>
                          <TableCell>{solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</TableCell>
                          <TableCell>{formatDateTime(solicitacao.data_prevista_entrega)}</TableCell>
                          <TableCell>{getSolicitacaoStatusBadge(solicitacao.status)}</TableCell>
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
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleConfirmarSolicitacao(solicitacao)}
                                >
                                  Confirmar
                                </Button>
                              )}
                              {solicitacao.status === 'confirmado' && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleConfirmarEnvio(solicitacao)}
                                  className="gap-1"
                                >
                                  <Truck className="w-4 h-4" />
                                  Enviar
                                </Button>
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

      {selectedLote && (
        <RacaoGestaoDialog
          open={racaoDialogOpen}
          onOpenChange={setRacaoDialogOpen}
          lote={selectedLote}
          onSuccess={fetchSolicitacoes}
        />
      )}
    </div>
  );
}
