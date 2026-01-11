import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Package, MessageSquare, Bird, Pill, Scissors, Scale, Calendar } from 'lucide-react';
import { calcularIdadeLote } from '@/lib/utils';
import { toast } from 'sonner';
import ObservacoesTab from '@/components/veterinario/ObservacoesTab';
import MetasVetTab from '@/components/veterinario/MetasVetTab';
import MetasPosturaVetTab from '@/components/veterinario/MetasPosturaVetTab';
import ConsumoVetTab from '@/components/veterinario/ConsumoVetTab';
import TratamentosTab from '@/components/veterinario/TratamentosTab';
import AutopsiasTab from '@/components/veterinario/AutopsiasTab';
import ConnectionStatus from '@/components/veterinario/ConnectionStatus';

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

export default function VeterinarioLote() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const [lote, setLote] = useState<Lote | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('observacoes');

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

        {/* Tabs with Horizontal Scroll */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max bg-muted/50 p-1 h-auto">
              <TabsTrigger 
                value="observacoes" 
                className="gap-2 px-4 py-2.5 data-[state=active]:bg-background"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Observações</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tratamentos" 
                className="gap-2 px-4 py-2.5 data-[state=active]:bg-background"
              >
                <Pill className="w-4 h-4" />
                <span>Tratamentos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="autopsias" 
                className="gap-2 px-4 py-2.5 data-[state=active]:bg-background"
              >
                <Scissors className="w-4 h-4" />
                <span>Autópsias</span>
              </TabsTrigger>
              <TabsTrigger 
                value="metas" 
                className="gap-2 px-4 py-2.5 data-[state=active]:bg-background"
              >
                <Target className="w-4 h-4" />
                <span>Metas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="consumo" 
                className="gap-2 px-4 py-2.5 data-[state=active]:bg-background"
              >
                <Package className="w-4 h-4" />
                <span>Consumo</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="observacoes" className="mt-4">
            <ObservacoesTab loteId={lote.id} diasLote={dias} />
          </TabsContent>

          <TabsContent value="tratamentos" className="mt-4">
            <TratamentosTab 
              loteId={lote.id} 
              dataAlojamento={lote.data_alojamento}
            />
          </TabsContent>

          <TabsContent value="autopsias" className="mt-4">
            <AutopsiasTab loteId={lote.id} diasLote={dias} />
          </TabsContent>

          <TabsContent value="metas" className="mt-4">
            {isPostura ? (
              <MetasPosturaVetTab loteId={lote.id} lote={lote} />
            ) : (
              <MetasVetTab loteId={lote.id} lote={lote} />
            )}
          </TabsContent>

          <TabsContent value="consumo" className="mt-4">
            <ConsumoVetTab loteId={lote.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
