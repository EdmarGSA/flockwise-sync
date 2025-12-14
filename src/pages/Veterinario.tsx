import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Stethoscope, Search, Bird, MapPin, Calendar, AlertTriangle, Eye, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  data_prevista_alojamento: string;
  linhagem: string;
  sexo: string;
  status: string;
  nucleo: { nome: string } | null;
  galpao: { nome: string } | null;
  observacoes_count?: number;
  alertas_count?: number;
}

export default function Veterinario() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchLotes();
    }
  }, [user]);

  const fetchLotes = async () => {
    setLoadingData(true);

    // Fetch lotes with status alojado ou previsao
    const { data: lotesData, error } = await supabase
      .from('lotes')
      .select(`
        id,
        quantidade_aves,
        data_alojamento,
        data_prevista_alojamento,
        linhagem,
        sexo,
        status,
        nucleo:nucleos(nome),
        galpao:galpoes(nome)
      `)
      .in('status', ['alojado', 'previsao', 'saiu_para_entrega'])
      .order('data_alojamento', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
      toast.error('Erro ao carregar lotes');
      setLoadingData(false);
      return;
    }

    // Fetch observações count for each lote
    const lotesWithCounts = await Promise.all(
      (lotesData || []).map(async (lote) => {
        const { count: obsCount } = await supabase
          .from('observacoes_lote')
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', lote.id);

        // Count observações with alta prioridade
        const { count: alertCount } = await supabase
          .from('observacoes_lote')
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', lote.id)
          .eq('prioridade', 'alta');

        return {
          ...lote,
          observacoes_count: obsCount || 0,
          alertas_count: alertCount || 0,
        };
      })
    );

    setLotes(lotesWithCounts as Lote[]);
    setLoadingData(false);
  };

  const formatLinhagem = (linhagem: string) => {
    const labels: Record<string, string> = {
      cobb_500: 'Cobb 500',
      ross_308: 'Ross 308',
      hubbard: 'Hubbard',
    };
    return labels[linhagem] || linhagem;
  };

  const formatSexo = (sexo: string) => {
    const labels: Record<string, string> = {
      macho: 'Macho',
      femea: 'Fêmea',
      misto: 'Misto',
    };
    return labels[sexo] || sexo;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'secondary' },
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDiasLote = (dataAlojamento: string | null) => {
    if (!dataAlojamento) return null;
    return differenceInDays(new Date(), new Date(dataAlojamento));
  };

  const filteredLotes = lotes.filter((lote) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lote.nucleo?.nome?.toLowerCase().includes(searchLower) ||
      lote.galpao?.nome?.toLowerCase().includes(searchLower) ||
      formatLinhagem(lote.linhagem).toLowerCase().includes(searchLower)
    );
  });

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

  const totalLotes = lotes.length;
  const lotesAlojados = lotes.filter(l => l.status === 'alojado').length;
  const totalAlertas = lotes.reduce((acc, l) => acc + (l.alertas_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-glow">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-foreground">Módulo Veterinário</span>
                <p className="text-sm text-muted-foreground">Acompanhamento técnico de lotes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Lotes Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{lotesAlojados}</p>
                </div>
                <Bird className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total de Lotes</p>
                  <p className="text-2xl font-bold text-foreground">{totalLotes}</p>
                </div>
                <MapPin className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Alertas Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{totalAlertas}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${totalAlertas > 0 ? 'text-destructive' : 'text-muted-foreground/50'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Lotes List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bird className="w-5 h-5 text-primary" />
              Lotes para Acompanhamento
            </CardTitle>
            <CardDescription>
              Clique em um lote para visualizar metas, consumo e registrar observações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por núcleo, galpão ou linhagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loadingData ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando lotes...
              </div>
            ) : filteredLotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum lote encontrado' : 'Nenhum lote ativo'}
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Núcleo / Galpão</TableHead>
                      <TableHead>Linhagem</TableHead>
                      <TableHead className="text-center">Idade</TableHead>
                      <TableHead className="text-center">Aves</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Obs.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLotes.map((lote) => {
                      const dias = getDiasLote(lote.data_alojamento);
                      return (
                        <TableRow key={lote.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <span className="font-medium">{lote.nucleo?.nome || 'N/A'}</span>
                              <span className="text-muted-foreground"> / {lote.galpao?.nome || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatLinhagem(lote.linhagem)}</span>
                              <span className="text-xs text-muted-foreground">{formatSexo(lote.sexo)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {dias !== null ? (
                              <Badge variant="outline">{dias} dias</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {lote.quantidade_aves.toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(lote.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span>{lote.observacoes_count || 0}</span>
                              {(lote.alertas_count || 0) > 0 && (
                                <span className="relative flex h-2 w-2 ml-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/veterinario/${lote.id}`)}
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </Button>
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
    </div>
  );
}
