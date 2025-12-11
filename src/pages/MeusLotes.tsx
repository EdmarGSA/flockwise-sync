import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Bird, ArrowLeft, Calendar, Users, Truck, ClipboardCheck, Scale, AlertTriangle, Skull } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RecebimentoLoteDialog } from '@/components/lotes/RecebimentoLoteDialog';
import { PesagemDialog } from '@/components/lotes/PesagemDialog';
import { MortalidadeDialog } from '@/components/lotes/MortalidadeDialog';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_prevista_alojamento: string;
  data_alojamento: string | null;
  data_fechamento: string | null;
  linhagem: string;
  status: string;
  veterinario_id: string | null;
  integrado_id: string;
  peso_medio_pintinhos: number | null;
  nucleo: { nome: string } | null;
  galpao: { nome: string } | null;
}

interface LoteComPesagem extends Lote {
  ultimaPesagem?: string | null;
  diasDesdeAlojamento?: number;
  precisaPesar?: boolean;
}

export default function MeusLotes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LoteComPesagem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [recebimentoOpen, setRecebimentoOpen] = useState(false);
  const [pesagemOpen, setPesagemOpen] = useState(false);
  const [mortalidadeOpen, setMortalidadeOpen] = useState(false);
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
        status,
        integrado_id,
        peso_medio_pintinhos,
        nucleo:nucleos(nome),
        galpao:galpoes(nome),
        veterinario_id
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
      setLoadingData(false);
      return;
    }

    // Fetch last pesagem for each lote
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

        const ultimaPesagem = pesagemData?.data_pesagem || null;
        
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

        return {
          ...loteData,
          ultimaPesagem,
          diasDesdeAlojamento,
          precisaPesar,
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
                      <TableHead>Linhagem</TableHead>
                      <TableHead>Previsão</TableHead>
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
                        <TableCell>{lote.quantidade_aves.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{getLinhagemLabel(lote.linhagem)}</TableCell>
                        <TableCell>{formatDate(lote.data_prevista_alojamento)}</TableCell>
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
                                <Button 
                                  size="sm" 
                                  variant={lote.precisaPesar ? 'destructive' : 'outline'}
                                  onClick={() => handlePesagem(lote)}
                                  className="gap-1"
                                >
                                  <Scale className="w-4 h-4" />
                                  Pesar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleMortalidade(lote)}
                                  className="gap-1"
                                >
                                  <Skull className="w-4 h-4" />
                                  Mort.
                                </Button>
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
            onSuccess={fetchLotes}
          />
          <MortalidadeDialog
            open={mortalidadeOpen}
            onOpenChange={setMortalidadeOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            onSuccess={fetchLotes}
          />
        </>
      )}
    </div>
  );
}
