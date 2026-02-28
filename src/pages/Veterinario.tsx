import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Stethoscope, Search, Bird, AlertTriangle, MessageSquare, ChevronRight, Calendar, LogOut, Skull } from 'lucide-react';
import { calcularIdadeLote } from '@/lib/utils';
import { toast } from 'sonner';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useMortalidadeAlertaLotes } from '@/hooks/useMortalidadeAlerta';

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

type StatusFilter = 'todos' | 'alojado' | 'previsao' | 'saiu_para_entrega' | 'fechado';

export default function Veterinario() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const { mortalidadeMap } = useMortalidadeAlertaLotes(
    lotes.map(l => ({ id: l.id, quantidade_aves: l.quantidade_aves, data_alojamento: l.data_alojamento })),
    integradoId
  );

  useEffect(() => {
    if (user) {
      fetchLotes();
    }
  }, [user]);

  const fetchLotes = async () => {
    setLoadingData(true);

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
      .order('data_alojamento', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
      toast.error('Erro ao carregar lotes');
      setLoadingData(false);
      return;
    }

    const lotesWithCounts = await Promise.all(
      (lotesData || []).map(async (lote) => {
        const { count: obsCount } = await supabase
          .from('observacoes_lote')
          .select('*', { count: 'exact', head: true })
          .eq('lote_id', lote.id);

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
      saiu_para_entrega: { label: 'Saiu', variant: 'secondary' },
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const getDiasLote = (dataAlojamento: string | null) => {
    if (!dataAlojamento) return null;
    return calcularIdadeLote(dataAlojamento);
  };

  // Status counts
  const statusCounts = {
    todos: lotes.length,
    alojado: lotes.filter(l => l.status === 'alojado').length,
    previsao: lotes.filter(l => l.status === 'previsao').length,
    saiu_para_entrega: lotes.filter(l => l.status === 'saiu_para_entrega').length,
    fechado: lotes.filter(l => l.status === 'fechado').length,
  };

  const filteredLotes = lotes.filter((lote) => {
    // Status filter
    if (statusFilter !== 'todos' && lote.status !== statusFilter) {
      return false;
    }
    // Search filter
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

  const totalAlertas = lotes.reduce((acc, l) => acc + (l.alertas_count || 0), 0);

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'alojado', label: 'Alojados' },
    { key: 'previsao', label: 'Previstos' },
    { key: 'saiu_para_entrega', label: 'Em Trânsito' },
    { key: 'fechado', label: 'Fechados' },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Mobile-optimized Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="shrink-0 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Veterinário</h1>
              <p className="text-xs text-muted-foreground">Acompanhamento técnico</p>
            </div>
          </div>
          {totalAlertas > 0 && (
            <Badge variant="destructive" className="shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {totalAlertas}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive gap-1.5 shrink-0"
            onClick={async () => { await signOut(); navigate('/'); }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Status Filter Pills - Horizontal Scroll */}
        <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4">
          <div className="flex gap-2">
            {filterButtons.map((btn) => (
              <Button
                key={btn.key}
                variant={statusFilter === btn.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(btn.key)}
                className="shrink-0 gap-1.5"
              >
                {btn.label}
                <Badge 
                  variant={statusFilter === btn.key ? 'secondary' : 'outline'} 
                  className="h-5 min-w-5 px-1.5 text-xs ml-1"
                >
                  {statusCounts[btn.key]}
                </Badge>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Lotes Cards List */}
        {loadingData ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando lotes...
          </div>
        ) : filteredLotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bird className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{searchTerm || statusFilter !== 'todos' ? 'Nenhum lote encontrado' : 'Nenhum lote ativo'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLotes.map((lote) => {
              const dias = getDiasLote(lote.data_alojamento);
              const hasAlerts = (lote.alertas_count || 0) > 0;
              const mortInfo = mortalidadeMap[lote.id];
              const hasMortAlerta = mortInfo?.emAlerta;
              
              return (
                  <Card 
                  key={lote.id} 
                  className={`bg-card border-border overflow-hidden active:scale-[0.98] transition-transform cursor-pointer ${hasAlerts || hasMortAlerta ? 'border-l-4 border-l-destructive' : ''}`}
                  onClick={() => navigate(`/veterinario/${lote.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Location */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground truncate">
                            {lote.nucleo?.nome || 'N/A'} - {lote.galpao?.nome || 'N/A'}
                          </span>
                          {hasAlerts && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                            </span>
                          )}
                        </div>
                        
                        {/* Details Line */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                          <span>{formatLinhagem(lote.linhagem)}</span>
                          <span>•</span>
                          <span>{formatSexo(lote.sexo)}</span>
                          {dias !== null && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground">{dias}d</span>
                            </>
                          )}
                        </div>
                        
                        {/* Bottom Row */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Bird className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{lote.quantidade_aves.toLocaleString('pt-BR')}</span>
                          </div>
                          {getStatusBadge(lote.status)}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{lote.observacoes_count || 0}</span>
                          </div>
                          {hasAlerts && (
                            <div className="flex items-center gap-1 text-sm text-destructive">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{lote.alertas_count}</span>
                            </div>
                          )}
                          {hasMortAlerta && mortInfo && (
                            <div className="flex items-center gap-1 text-sm text-destructive font-medium">
                              <Skull className="w-3.5 h-3.5" />
                              <span>{mortInfo.percentual.toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
