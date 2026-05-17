import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Factory, 
  AlertTriangle, 
  ShoppingCart, 
  FileText, 
  RefreshCw,
  Package,
  Cog,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AlertaEstoqueCard from '@/components/fabrica/AlertaEstoqueCard';
import ProdutosCriticosDialog from '@/components/fabrica/ProdutosCriticosDialog';
import OrdensCompraTable from '@/components/fabrica/OrdensCompraTable';
import RecebimentosTable from '@/components/fabrica/RecebimentosTable';
import GestaoProducaoTab from '@/components/fabrica/producao/GestaoProducaoTab';
import EstoqueRacaoDialog, { RacaoDetalhe } from '@/components/fabrica/EstoqueRacaoDialog';
import PrevisaoConsumoDialog from '@/components/fabrica/PrevisaoConsumoDialog';
import AlertasDetalheDialog from '@/components/fabrica/AlertasDetalheDialog';
import OCManualDialog from '@/components/fabrica/OCManualDialog';
import ComparativoFornecedoresDialog from '@/components/fabrica/ComparativoFornecedoresDialog';
import CommodityTicker from '@/components/fabrica/CommodityTicker';

interface ProdutoCritico {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  unidade_compra: string;
  fator_conversao: number;
  consumo_medio_diario: number;
  dias_restantes: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
  estoque_comprometido: number;
  estoque_disponivel: number;
  ops_vinculadas: number;
}

export default function FabricaRacao() {
  const { user } = useAuth();
  const { integradoId } = useIntegradoId();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [produtosCriticos, setProdutosCriticos] = useState<ProdutoCritico[]>([]);
  const [showProdutosCriticos, setShowProdutosCriticos] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
const [stats, setStats] = useState({
    alertasCriticos: 0,
    alertasAtencao: 0,
    ocsPendentes: 0,
    estoqueRacao: 0,
    previsaoConsumo3d: 0,
    racoesNegativas: 0,
    racoesCriticas: 0
  });

  // States for analytical dialogs
  const [showEstoqueRacao, setShowEstoqueRacao] = useState(false);
  const [showPrevisaoConsumo, setShowPrevisaoConsumo] = useState(false);
  const [showAlertasCriticos, setShowAlertasCriticos] = useState(false);
  const [showAlertasAtencao, setShowAlertasAtencao] = useState(false);
  
  // States for OC Manual flow
  const [showOCManual, setShowOCManual] = useState(false);
  const [showComparativo, setShowComparativo] = useState(false);
  const [produtosParaComparativo, setProdutosParaComparativo] = useState<any[]>([]);
  const [produtosEmOC, setProdutosEmOC] = useState<Set<string>>(new Set());
  const [racoesDetalhadas, setRacoesDetalhadas] = useState<RacaoDetalhe[]>([]);

  useEffect(() => {
    if (integradoId) {
      fetchProdutosCriticos();
      fetchStats();
    }
  }, [integradoId]);

  const fetchStats = async () => {
    if (!integradoId) return;

    try {
      // Count pending purchase orders
      const { data: ocs, error: ocsError } = await supabase
        .from('ordens_compra')
        .select('id')
        .eq('integrado_id', integradoId)
        .in('status', ['pendente', 'aprovada']);

      if (ocsError) throw ocsError;

      // Fetch feed products (grupo "Ração") for stock and consumption
      const { data: grupoRacao } = await supabase
        .from('grupos_produto')
        .select('id')
        .eq('integrado_id', integradoId)
        .eq('nome', 'Ração')
        .maybeSingle();

      let estoqueRacao = 0;
      let previsaoConsumo3d = 0;
      const grupoId = grupoRacao?.id;
      const racoesDetalhadasTemp: RacaoDetalhe[] = [];

      if (grupoId) {
        const { data: racoesData } = await supabase
          .from('produtos')
          .select('id, nome, sku, estoque_atual, unidade_medida')
          .eq('integrado_id', integradoId)
          .eq('grupo_produto_id', grupoId)
          .eq('ativo', true);

        estoqueRacao = (racoesData || []).reduce((sum, p) => sum + (p.estoque_atual || 0), 0);

        // Build detailed feed data for EstoqueRacaoDialog
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const racaoIds = (racoesData || []).map(p => p.id);

        if (racaoIds.length > 0) {
          const { data: kardexRacao } = await supabase
            .from('kardex')
            .select('produto_id, quantidade, tipo_movimento')
            .eq('integrado_id', integradoId)
            .in('produto_id', racaoIds)
            .gte('created_at', fifteenDaysAgo.toISOString());

          const consumoPorProduto: Record<string, number> = {};
          (kardexRacao || [])
            .filter(k => k.tipo_movimento === 'saida' || k.tipo_movimento === 'ajuste_saida')
            .forEach(k => {
              if (!consumoPorProduto[k.produto_id]) {
                consumoPorProduto[k.produto_id] = 0;
              }
              consumoPorProduto[k.produto_id] += Number(k.quantidade);
            });

          (racoesData || []).forEach(racao => {
            const consumoTotal = consumoPorProduto[racao.id] || 0;
            const consumoMedioDiario = consumoTotal / 15;
            const diasRestantes = consumoMedioDiario > 0
              ? Math.floor(racao.estoque_atual / consumoMedioDiario)
              : 999;
            const percentualTotal = estoqueRacao > 0 ? (racao.estoque_atual / estoqueRacao) * 100 : 0;

            racoesDetalhadasTemp.push({
              id: racao.id,
              nome: racao.nome,
              sku: racao.sku,
              estoque_atual: racao.estoque_atual,
              unidade_medida: racao.unidade_medida,
              consumo_medio_diario: consumoMedioDiario,
              dias_restantes: diasRestantes,
              percentual_total: percentualTotal,
            });
          });
        }
      }

      // Calculate consumption forecast based on lot ages and phases
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, quantidade_aves, data_alojamento, linhagem, sexo')
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');

      if (lotes && lotes.length > 0) {
        for (const lote of lotes) {
          if (!lote.data_alojamento || !lote.linhagem || !lote.sexo) continue;

          const dataAlojamento = new Date(lote.data_alojamento);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const idadeDias = Math.floor((hoje.getTime() - dataAlojamento.getTime()) / (1000 * 60 * 60 * 24));

          // Calculate consumption for next 3 days based on age
          for (let d = 1; d <= 3; d++) {
            const diaFuturo = idadeDias + d;

            const { data: desempenho } = await supabase
              .from('desempenho_aves')
              .select('consumo_diario_racao_kg')
              .eq('linhagem', lote.linhagem)
              .eq('sexo', lote.sexo)
              .eq('dia', diaFuturo)
              .maybeSingle();

            if (desempenho) {
              const consumoKg = Number(desempenho.consumo_diario_racao_kg) * lote.quantidade_aves;
              previsaoConsumo3d += consumoKg;
            }
          }
        }
      }

      // Calculate feed alerts (negative and critical stock)
      const racoesNegativas = racoesDetalhadasTemp.filter(r => r.estoque_atual < 0).length;
      const racoesCriticas = racoesDetalhadasTemp.filter(r => r.estoque_atual >= 0 && r.dias_restantes < 3 && r.dias_restantes !== 999).length;

      setRacoesDetalhadas(racoesDetalhadasTemp);
      setStats(prev => ({
        ...prev,
        ocsPendentes: ocs?.length || 0,
        estoqueRacao,
        previsaoConsumo3d,
        racoesNegativas,
        racoesCriticas
      }));
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchProdutosCriticos = async () => {
    if (!integradoId) return;
    setLoading(true);

    try {
      // Fetch products with stock info - only "Terceiros" category
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, sku, estoque_atual, estoque_minimo, unidade_medida, unidade_compra, fator_conversao, categorias!inner(tipo_origem)')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'terceiros');

      if (produtosError) throw produtosError;

      // Fetch products that already have approved/pending OCs - these should be filtered out
      const { data: produtosEmOCData } = await supabase
        .from('ordens_compra_itens')
        .select(`
          produto_id,
          ordens_compra!inner(status, integrado_id)
        `)
        .eq('ordens_compra.integrado_id', integradoId)
        .in('ordens_compra.status', ['pendente', 'aprovada']);

      const produtosJaEmOC = new Set((produtosEmOCData || []).map(item => item.produto_id));
      setProdutosEmOC(produtosJaEmOC);

      // Fetch OPs em aberto com seus insumos para calcular estoque comprometido
      const { data: opsItens, error: opsError } = await supabase
        .from('ordens_producao_itens')
        .select(`
          insumo_id,
          quantidade_necessaria,
          ordens_producao!inner(
            status,
            integrado_id
          )
        `)
        .eq('ordens_producao.integrado_id', integradoId)
        .in('ordens_producao.status', ['rascunho', 'pendente', 'aprovada', 'em_producao']);

      if (opsError) {
        console.error('Erro ao buscar OPs:', opsError);
      }

      // Calcular estoque comprometido por insumo e contar OPs
      const estoqueComprometido: Record<string, number> = {};
      const opsContagem: Record<string, Set<string>> = {};
      
      (opsItens || []).forEach(item => {
        const insumoId = item.insumo_id;
        if (!estoqueComprometido[insumoId]) {
          estoqueComprometido[insumoId] = 0;
          opsContagem[insumoId] = new Set();
        }
        estoqueComprometido[insumoId] += Number(item.quantidade_necessaria);
        // Contar OPs únicas por insumo
        const opId = (item as any).ordens_producao?.id;
        if (opId) {
          opsContagem[insumoId].add(opId);
        }
      });

      // Fetch kardex movements from last 15 days for consumption calculation
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data: kardexData, error: kardexError } = await supabase
        .from('kardex')
        .select('produto_id, quantidade, tipo_movimento, created_at')
        .eq('integrado_id', integradoId)
        .gte('created_at', fifteenDaysAgo.toISOString())
        .in('tipo_movimento', ['saida', 'ajuste_saida']);

      if (kardexError) throw kardexError;

      // Calculate average daily consumption per product
      const consumoPorProduto: Record<string, number> = {};
      kardexData?.forEach(mov => {
        if (!consumoPorProduto[mov.produto_id]) {
          consumoPorProduto[mov.produto_id] = 0;
        }
        consumoPorProduto[mov.produto_id] += Number(mov.quantidade);
      });

      // Calculate critical products - CONSIDERANDO ESTOQUE COMPROMETIDO
      const produtosAnalisados: ProdutoCritico[] = (produtos || []).map(produto => {
        const consumoTotal = consumoPorProduto[produto.id] || 0;
        const consumoMedioDiario = consumoTotal / 15;
        
        // Calcular estoque comprometido e disponível
        const comprometido = estoqueComprometido[produto.id] || 0;
        const estoqueDisponivel = produto.estoque_atual - comprometido;
        const opsVinculadas = opsContagem[produto.id]?.size || 0;
        
        // Usar estoque DISPONÍVEL para calcular dias restantes
        const diasRestantes = consumoMedioDiario > 0 
          ? Math.floor(estoqueDisponivel / consumoMedioDiario) 
          : 999;

        let nivelCritico: 'critico' | 'atencao' | 'ok' = 'ok';
        // Considerar estoque disponível, não o atual
        if (estoqueDisponivel < produto.estoque_minimo || diasRestantes < 3) {
          nivelCritico = 'critico';
        } else if (diasRestantes <= 7) {
          nivelCritico = 'atencao';
        }

        return {
          id: produto.id,
          nome: produto.nome,
          sku: produto.sku,
          estoque_atual: produto.estoque_atual,
          estoque_minimo: produto.estoque_minimo,
          unidade_medida: produto.unidade_medida,
          unidade_compra: produto.unidade_compra || 'UN',
          fator_conversao: produto.fator_conversao || 1,
          consumo_medio_diario: consumoMedioDiario,
          dias_restantes: diasRestantes,
          nivel_critico: nivelCritico,
          estoque_comprometido: comprometido,
          estoque_disponivel: estoqueDisponivel,
          ops_vinculadas: opsVinculadas
        };
      })
        .filter(p => p.nivel_critico !== 'ok')
        .filter(p => !produtosJaEmOC.has(p.id)) // Filter out products already in approved/pending OCs
        .sort((a, b) => a.dias_restantes - b.dias_restantes);

      setProdutosCriticos(produtosAnalisados);
      setStats(prev => ({
        ...prev,
        alertasCriticos: produtosAnalisados.filter(p => p.nivel_critico === 'critico').length,
        alertasAtencao: produtosAnalisados.filter(p => p.nivel_critico === 'atencao').length
      }));
    } catch (error) {
      console.error('Erro ao buscar produtos críticos:', error);
      toast.error('Erro ao carregar dados de estoque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Factory className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:inline">Fábrica de Ração</span>
            <span className="text-lg font-bold text-foreground sm:hidden">Fábrica</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchProdutosCriticos(); fetchStats(); }} className="h-9 px-2 sm:px-3">
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        <CommodityTicker integradoId={integradoId} />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-6">
            <TabsList className="inline-flex w-auto min-w-full sm:w-full sm:grid sm:grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="producao" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <Cog className="w-4 h-4" />
                <span className="hidden sm:inline">Produção</span>
              </TabsTrigger>
              <TabsTrigger value="compras" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Compras</span>
              </TabsTrigger>
              <TabsTrigger value="ordens" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Ordens</span>
              </TabsTrigger>
              <TabsTrigger value="recebimento" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Receb.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            {/* Stats Cards - Clickable */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <Card 
                className={`bg-card cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                  stats.racoesNegativas > 0 
                    ? 'border-destructive/50 hover:border-destructive' 
                    : stats.racoesCriticas > 0 
                      ? 'border-yellow-500/50 hover:border-yellow-500'
                      : 'border-green-500/50 hover:border-green-500'
                }`}
                onClick={() => setShowEstoqueRacao(true)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Estoque Ração</p>
                      <p className={`text-2xl font-bold ${
                        stats.racoesNegativas > 0 
                          ? 'text-destructive' 
                          : stats.racoesCriticas > 0 
                            ? 'text-yellow-500'
                            : 'text-green-500'
                      }`}>
                        {stats.estoqueRacao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                      </p>
                      {(stats.racoesNegativas > 0 || stats.racoesCriticas > 0) && (
                        <div className="flex gap-2 mt-2">
                          {stats.racoesNegativas > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              <AlertTriangle className="w-3 h-3" />
                              {stats.racoesNegativas} Neg
                            </span>
                          )}
                          {stats.racoesCriticas > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                              <AlertTriangle className="w-3 h-3" />
                              {stats.racoesCriticas} Crít
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <TrendingUp className={`w-8 h-8 ${
                      stats.racoesNegativas > 0 
                        ? 'text-destructive/50' 
                        : stats.racoesCriticas > 0 
                          ? 'text-yellow-500/50'
                          : 'text-green-500/50'
                    }`} />
                  </div>
                </CardContent>
              </Card>
              <Card 
                className="bg-card border-purple-500/50 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-purple-500"
                onClick={() => setShowPrevisaoConsumo(true)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Previsão Consumo (3d)</p>
                      <p className="text-2xl font-bold text-purple-500">
                        {stats.previsaoConsumo3d.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-purple-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card 
                className="bg-card border-destructive/50 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-destructive"
                onClick={() => setShowAlertasCriticos(true)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Alertas Críticos</p>
                      <p className="text-2xl font-bold text-destructive">{stats.alertasCriticos}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-destructive/50" />
                  </div>
                </CardContent>
              </Card>
              <Card 
                className="bg-card border-yellow-500/50 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-yellow-500"
                onClick={() => setShowAlertasAtencao(true)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Atenção</p>
                      <p className="text-2xl font-bold text-yellow-500">{stats.alertasAtencao}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-yellow-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card 
                className="bg-card border-primary/50 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary"
                onClick={() => setActiveTab('ordens')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">OCs Pendentes</p>
                      <p className="text-2xl font-bold text-primary">{stats.ocsPendentes}</p>
                    </div>
                    <FileText className="w-8 h-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Cards */}
            <Card className="bg-card border-border mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Alertas de Estoque
                </CardTitle>
                <CardDescription>
                  Produtos abaixo do mínimo ou com previsão de esgotamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : produtosCriticos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum produto em situação crítica
                  </p>
                ) : (
                  <div className="space-y-4">
                    <AlertaEstoqueCard produtos={produtosCriticos} />
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => setShowProdutosCriticos(true)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Iniciar Compra por Alerta
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="producao">
            <GestaoProducaoTab integradoId={integradoId || ''} />
          </TabsContent>

          <TabsContent value="compras">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Gestão de Compras
                </CardTitle>
                <CardDescription>
                  Inicie uma nova compra por alerta de estoque ou manualmente
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setShowProdutosCriticos(true)}
                  className="bg-primary hover:bg-primary/90"
                  disabled={produtosCriticos.length === 0}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Compra por Alerta
                  {produtosCriticos.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {produtosCriticos.length}
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowOCManual(true)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  OC Manual
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ordens">
            <OrdensCompraTable 
              integradoId={integradoId || ''} 
              onRefresh={() => { fetchStats(); fetchProdutosCriticos(); }}
            />
          </TabsContent>

          <TabsContent value="recebimento">
            <RecebimentosTable 
              integradoId={integradoId || ''} 
              onRefresh={() => { fetchStats(); fetchProdutosCriticos(); }}
            />
          </TabsContent>

        </Tabs>
      </main>

      <ProdutosCriticosDialog
        open={showProdutosCriticos}
        onOpenChange={setShowProdutosCriticos}
        produtos={produtosCriticos}
        integradoId={integradoId || ''}
        onSuccess={() => {
          fetchProdutosCriticos();
          fetchStats();
          setActiveTab('ordens');
        }}
      />

      {/* Analytical Dialogs */}
      <EstoqueRacaoDialog
        open={showEstoqueRacao}
        onOpenChange={setShowEstoqueRacao}
        racoes={racoesDetalhadas}
        totalEstoque={stats.estoqueRacao}
      />

      <PrevisaoConsumoDialog
        open={showPrevisaoConsumo}
        onOpenChange={setShowPrevisaoConsumo}
        integradoId={integradoId || ''}
        totalPrevisao={stats.previsaoConsumo3d}
      />

      <AlertasDetalheDialog
        open={showAlertasCriticos}
        onOpenChange={setShowAlertasCriticos}
        produtos={produtosCriticos}
        tipo="critico"
      />

      <AlertasDetalheDialog
        open={showAlertasAtencao}
        onOpenChange={setShowAlertasAtencao}
        produtos={produtosCriticos}
        tipo="atencao"
      />

      {/* OC Manual Dialogs */}
      <OCManualDialog
        open={showOCManual}
        onOpenChange={setShowOCManual}
        integradoId={integradoId || ''}
        onContinue={(produtos) => {
          setProdutosParaComparativo(produtos);
          setShowOCManual(false);
          setShowComparativo(true);
        }}
      />

      <ComparativoFornecedoresDialog
        open={showComparativo}
        onOpenChange={setShowComparativo}
        produtos={produtosParaComparativo}
        integradoId={integradoId || ''}
        onSuccess={() => {
          setShowComparativo(false);
          setProdutosParaComparativo([]);
          fetchProdutosCriticos();
          fetchStats();
          setActiveTab('ordens');
        }}
      />
    </div>
  );
}
