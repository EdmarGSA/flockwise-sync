import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Package, MessageSquare, Bird, Pill, Scissors, Scale, Calendar, Skull } from 'lucide-react';
import { calcularIdadeLote } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useMortalidadeAlertaLotes } from '@/hooks/useMortalidadeAlerta';
import { toast } from 'sonner';
import ConnectionStatus from '@/components/veterinario/ConnectionStatus';
import ObservacoesDialog from '@/components/veterinario/ObservacoesDialog';
import TratamentosDialog from '@/components/veterinario/TratamentosDialog';
import AutopsiasDialog from '@/components/veterinario/AutopsiasDialog';
import MetasDialog from '@/components/veterinario/MetasDialog';
import ConsumoDialog from '@/components/veterinario/ConsumoDialog';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  data_prevista_alojamento: string;
  linhagem: string | null;
  linhagem_postura: string | null;
  sexo: string;
  status: string;
  peso_medio_pintinhos: number | null;
  nucleo: { nome: string; tipo_producao: string } | null;
  galpao: { nome: string } | null;
}

interface Counts {
  observacoes: number;
  tratamentos: number;
  autopsias: number;
}

export default function VeterinarioLote() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const { integradoId } = useIntegradoId();
  const [lote, setLote] = useState<Lote | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [counts, setCounts] = useState<Counts>({ observacoes: 0, tratamentos: 0, autopsias: 0 });

  const lotesForHook = lote ? [{ id: lote.id, quantidade_aves: lote.quantidade_aves, data_alojamento: lote.data_alojamento }] : [];
  const { mortalidadeMap } = useMortalidadeAlertaLotes(lotesForHook, integradoId);
  const mortInfo = lote ? mortalidadeMap[lote.id] : undefined;

  // Dialog states
  const [observacoesOpen, setObservacoesOpen] = useState(false);
  const [tratamentosOpen, setTratamentosOpen] = useState(false);
  const [autopsiasOpen, setAutopsiasOpen] = useState(false);
  const [metasOpen, setMetasOpen] = useState(false);
  const [consumoOpen, setConsumoOpen] = useState(false);

  useEffect(() => {
    if (user && loteId) {
      fetchLote();
      fetchCounts();
    }
  }, [user, loteId]);

  const fetchLote = async () => {
    setLoadingData(true);

    const { data, error } = await supabase
      .from('lotes')
      .select(`
        id,
        quantidade_aves,
        data_alojamento,
        data_prevista_alojamento,
        linhagem,
        linhagem_postura,
        sexo,
        status,
        peso_medio_pintinhos,
        nucleo:nucleos(nome, tipo_producao),
        galpao:galpoes(nome)
      `)
      .eq('id', loteId)
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao buscar lote:', error);
      toast.error('Lote não encontrado');
      navigate('/veterinario');
      return;
    }

    setLote(data as Lote);
    setLoadingData(false);
  };

  const fetchCounts = async () => {
    if (!loteId) return;

    const [obsRes, tratRes, autRes] = await Promise.all([
      supabase.from('observacoes_lote').select('*', { count: 'exact', head: true }).eq('lote_id', loteId),
      supabase.from('tratamentos_lote').select('*', { count: 'exact', head: true }).eq('lote_id', loteId).eq('status', 'ativo'),
      supabase.from('autopsias').select('*', { count: 'exact', head: true }).eq('lote_id', loteId),
    ]);

    setCounts({
      observacoes: obsRes.count || 0,
      tratamentos: tratRes.count || 0,
      autopsias: autRes.count || 0,
    });
  };

  const formatLinhagem = (linhagem: string | null, linhagemPostura: string | null) => {
    if (linhagemPostura) {
      const labels: Record<string, string> = {
        lohmann_brown_lite: 'Lohmann Brown-Lite',
        lohmann_lsl_lite: 'Lohmann LSL Lite',
      };
      return labels[linhagemPostura] || linhagemPostura;
    }
    if (linhagem) {
      const labels: Record<string, string> = {
        cobb_500: 'Cobb 500',
        ross_308: 'Ross 308',
        hubbard: 'Hubbard',
      };
      return labels[linhagem] || linhagem;
    }
    return 'N/A';
  };

  const isPostura = lote?.linhagem_postura !== null || lote?.nucleo?.tipo_producao === 'Aves Postura';

  const getIdadeDisplay = () => {
    if (!lote?.data_alojamento) return null;
    const dias = calcularIdadeLote(lote.data_alojamento);
    if (isPostura) {
      const semanas = Math.ceil(dias / 7);
      return `${semanas} sem`;
    }
    return `${dias}d`;
  };

  const formatSexo = (sexo: string) => {
    const labels: Record<string, string> = {
      macho: 'M',
      femea: 'F',
      misto: 'Mix',
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

  const getDiasLote = () => {
    if (!lote?.data_alojamento) return null;
    return calcularIdadeLote(lote.data_alojamento);
  };

  const dias = getDiasLote();
  const idadeDisplay = getIdadeDisplay();

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

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Compact Mobile Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/veterinario')} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-foreground truncate">
                  {lote.nucleo?.nome} - {lote.galpao?.nome}
                </h1>
                {getStatusBadge(lote.status)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>{formatLinhagem(lote.linhagem, lote.linhagem_postura)}</span>
                <span>•</span>
                <span>{formatSexo(lote.sexo)}</span>
                {idadeDisplay && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-foreground">{idadeDisplay}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Offline status bar */}
        <ConnectionStatus className="px-4 pb-2" />
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Mortality Alert */}
        {mortInfo?.emAlerta && (
          <Alert variant="destructive">
            <Skull className="h-4 w-4" />
            <AlertTitle>Mortalidade acima do limiar</AlertTitle>
            <AlertDescription>
              Mortalidade atual: <strong>{mortInfo.percentual.toFixed(2)}%</strong> ({mortInfo.totalMortos} aves) — Limiar: <strong>{mortInfo.limiar?.toFixed(2)}%</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Cards 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-2">
              <Bird className="w-6 h-6 text-primary/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{lote.quantidade_aves.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Aves</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-2">
              <Scale className="w-6 h-6 text-emerald-500/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">
                  {lote.peso_medio_pintinhos ? `${lote.peso_medio_pintinhos.toFixed(3)}` : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Peso Ini. (kg)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-500/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">
                  {lote.data_alojamento 
                    ? new Date(lote.data_alojamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Alojamento</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-purple-500">{dias ?? '-'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{dias !== null ? `${dias}` : '-'}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Dias</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons Grid 2x2 - Same as Meus Lotes */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setObservacoesOpen(true)}
            className="h-20 flex-col gap-1 relative bg-card hover:bg-accent/50"
          >
            <MessageSquare className="w-6 h-6 text-blue-500" />
            <span className="text-sm font-medium">Observações</span>
            {counts.observacoes > 0 && (
              <Badge className="absolute top-2 right-2 h-5 min-w-5 px-1.5 text-xs">
                {counts.observacoes}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setTratamentosOpen(true)}
            className="h-20 flex-col gap-1 relative bg-card hover:bg-accent/50"
          >
            <Pill className="w-6 h-6 text-green-500" />
            <span className="text-sm font-medium">Tratamentos</span>
            {counts.tratamentos > 0 && (
              <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 px-1.5 text-xs">
                {counts.tratamentos}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setAutopsiasOpen(true)}
            className="h-20 flex-col gap-1 relative bg-card hover:bg-accent/50"
          >
            <Scissors className="w-6 h-6 text-red-500" />
            <span className="text-sm font-medium">Autópsias</span>
            {counts.autopsias > 0 && (
              <Badge variant="secondary" className="absolute top-2 right-2 h-5 min-w-5 px-1.5 text-xs">
                {counts.autopsias}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setMetasOpen(true)}
            className="h-20 flex-col gap-1 bg-card hover:bg-accent/50"
          >
            <Target className="w-6 h-6 text-amber-500" />
            <span className="text-sm font-medium">Metas</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setConsumoOpen(true)}
            className="h-20 flex-col gap-1 bg-card hover:bg-accent/50 col-span-2"
          >
            <Package className="w-6 h-6 text-purple-500" />
            <span className="text-sm font-medium">Consumo</span>
          </Button>
        </div>
      </main>

      {/* Dialogs */}
      <ObservacoesDialog 
        open={observacoesOpen} 
        onOpenChange={setObservacoesOpen}
        loteId={lote.id}
        diasLote={dias}
      />

      <TratamentosDialog
        open={tratamentosOpen}
        onOpenChange={setTratamentosOpen}
        loteId={lote.id}
        dataAlojamento={lote.data_alojamento}
      />

      <AutopsiasDialog
        open={autopsiasOpen}
        onOpenChange={setAutopsiasOpen}
        loteId={lote.id}
        diasLote={dias}
      />

      <MetasDialog
        open={metasOpen}
        onOpenChange={setMetasOpen}
        loteId={lote.id}
        lote={lote}
        isPostura={isPostura}
      />

      <ConsumoDialog
        open={consumoOpen}
        onOpenChange={setConsumoOpen}
        loteId={lote.id}
      />
    </div>
  );
}
