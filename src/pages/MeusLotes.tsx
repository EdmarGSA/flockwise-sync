import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Bird, ArrowLeft, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_prevista_alojamento: string;
  data_alojamento: string | null;
  data_fechamento: string | null;
  linhagem: string;
  status: string;
  veterinario_id: string | null;
  nucleo: { nome: string } | null;
  galpao: { nome: string } | null;
}

export default function MeusLotes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
        nucleo:nucleos(nome),
        galpao:galpoes(nome),
        veterinario_id
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
    } else {
      setLotes(data as Lote[]);
    }
    
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
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'secondary' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
  const lotesFechados = lotes.filter(l => l.status === 'fechado').length;

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
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Lotes Alojados</p>
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
                      <TableHead>Veterinário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                        <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                        <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                        <TableCell>{lote.quantidade_aves.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{getLinhagemLabel(lote.linhagem)}</TableCell>
                        <TableCell>{formatDate(lote.data_prevista_alojamento)}</TableCell>
                        <TableCell>{formatDate(lote.data_alojamento)}</TableCell>
                        <TableCell>{lote.veterinario_id ? 'Sim' : '-'}</TableCell>
                      </TableRow>
                    ))}
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
