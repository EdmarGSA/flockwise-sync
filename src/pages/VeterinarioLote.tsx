import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Stethoscope, Target, Package, MessageSquare, Bird, Pill } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import ObservacoesTab from '@/components/veterinario/ObservacoesTab';
import MetasVetTab from '@/components/veterinario/MetasVetTab';
import MetasPosturaVetTab from '@/components/veterinario/MetasPosturaVetTab';
import ConsumoVetTab from '@/components/veterinario/ConsumoVetTab';
import TratamentosTab from '@/components/veterinario/TratamentosTab';

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
    const dias = differenceInDays(new Date(), new Date(lote.data_alojamento));
    if (isPostura) {
      const semanas = Math.floor(dias / 7) + 1;
      return `${semanas} semanas`;
    }
    return `${dias} dias`;
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

  const getDiasLote = () => {
    if (!lote?.data_alojamento) return null;
    return differenceInDays(new Date(), new Date(lote.data_alojamento));
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
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/veterinario')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-glow">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-foreground">
                  {lote.nucleo?.nome} - {lote.galpao?.nome}
                </span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatLinhagem(lote.linhagem, lote.linhagem_postura)}</span>
                  <span>•</span>
                  <span>{formatSexo(lote.sexo)}</span>
                  {idadeDisplay && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">{idadeDisplay}</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(lote.status)}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Lote Info Card */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Bird className="w-8 h-8 text-primary/50" />
                <div>
                  <p className="text-muted-foreground text-sm">Aves</p>
                  <p className="font-bold">{lote.quantidade_aves.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Peso Inicial</p>
                <p className="font-bold">
                  {lote.peso_medio_pintinhos ? `${lote.peso_medio_pintinhos.toFixed(3)} kg` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Alojamento</p>
                <p className="font-bold">
                  {lote.data_alojamento 
                    ? new Date(lote.data_alojamento).toLocaleDateString('pt-BR')
                    : 'Não alojado'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Idade</p>
                <p className="font-bold">{dias !== null ? `${dias} dias` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="observacoes" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Observações</span>
              <span className="sm:hidden">Obs.</span>
            </TabsTrigger>
            <TabsTrigger value="tratamentos" className="gap-2">
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">Tratamentos</span>
              <span className="sm:hidden">Trat.</span>
            </TabsTrigger>
            <TabsTrigger value="metas" className="gap-2">
              <Target className="w-4 h-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="consumo" className="gap-2">
              <Package className="w-4 h-4" />
              Consumo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="observacoes">
            <ObservacoesTab loteId={lote.id} diasLote={dias} />
          </TabsContent>

          <TabsContent value="tratamentos">
            <TratamentosTab 
              loteId={lote.id} 
              dataAlojamento={lote.data_alojamento}
            />
          </TabsContent>

          <TabsContent value="metas">
            {isPostura ? (
              <MetasPosturaVetTab loteId={lote.id} lote={lote} />
            ) : (
              <MetasVetTab loteId={lote.id} lote={lote} />
            )}
          </TabsContent>

          <TabsContent value="consumo">
            <ConsumoVetTab loteId={lote.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
