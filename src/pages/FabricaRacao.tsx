import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Factory, 
  AlertTriangle, 
  ShoppingCart, 
  FileText, 
  DollarSign,
  RefreshCw,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AlertaEstoqueCard from '@/components/fabrica/AlertaEstoqueCard';
import ProdutosCriticosDialog from '@/components/fabrica/ProdutosCriticosDialog';
import OrdensCompraTable from '@/components/fabrica/OrdensCompraTable';
import ContasPagarTable from '@/components/fabrica/ContasPagarTable';
import RecebimentosTable from '@/components/fabrica/RecebimentosTable';

interface ProdutoCritico {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  consumo_medio_diario: number;
  dias_restantes: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
}

export default function FabricaRacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [produtosCriticos, setProdutosCriticos] = useState<ProdutoCritico[]>([]);
  const [showProdutosCriticos, setShowProdutosCriticos] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    alertasCriticos: 0,
    alertasAtencao: 0,
    ocsPendentes: 0,
    contasVencer: 0
  });

  useEffect(() => {
    if (user) {
      fetchProdutosCriticos();
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Count pending purchase orders
      const { data: ocs, error: ocsError } = await supabase
        .from('ordens_compra')
        .select('id')
        .eq('integrado_id', user.id)
        .in('status', ['pendente', 'aprovada']);

      if (ocsError) throw ocsError;

      // Count accounts payable due in next 7 days
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const { data: contas, error: contasError } = await supabase
        .from('contas_pagar')
        .select('id')
        .eq('integrado_id', user.id)
        .eq('status', 'pendente')
        .lte('data_vencimento', nextWeek.toISOString().split('T')[0]);

      if (contasError) throw contasError;

      setStats(prev => ({
        ...prev,
        ocsPendentes: ocs?.length || 0,
        contasVencer: contas?.length || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchProdutosCriticos = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch products with stock info - only "Terceiros" category
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, sku, estoque_atual, estoque_minimo, unidade_medida, categorias!inner(tipo_origem)')
        .eq('integrado_id', user.id)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'terceiros');

      if (produtosError) throw produtosError;

      // Fetch kardex movements from last 15 days for consumption calculation
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data: kardexData, error: kardexError } = await supabase
        .from('kardex')
        .select('produto_id, quantidade, tipo_movimento, created_at')
        .eq('integrado_id', user.id)
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

      // Calculate critical products
      const produtosAnalisados: ProdutoCritico[] = (produtos || []).map(produto => {
        const consumoTotal = consumoPorProduto[produto.id] || 0;
        const consumoMedioDiario = consumoTotal / 15;
        const diasRestantes = consumoMedioDiario > 0 
          ? Math.floor(produto.estoque_atual / consumoMedioDiario) 
          : 999;

        let nivelCritico: 'critico' | 'atencao' | 'ok' = 'ok';
        if (produto.estoque_atual < produto.estoque_minimo || diasRestantes < 3) {
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
          consumo_medio_diario: consumoMedioDiario,
          dias_restantes: diasRestantes,
          nivel_critico: nivelCritico
        };
      }).filter(p => p.nivel_critico !== 'ok')
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
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Fábrica de Ração</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchProdutosCriticos(); fetchStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="compras" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Gestão de Compras
            </TabsTrigger>
            <TabsTrigger value="ordens" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ordens de Compra
            </TabsTrigger>
            <TabsTrigger value="recebimento" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Recebimento
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Contas a Pagar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border-destructive/50">
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
              <Card className="bg-card border-yellow-500/50">
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
              <Card className="bg-card border-primary/50">
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
              <Card className="bg-card border-orange-500/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Contas a Vencer (7d)</p>
                      <p className="text-2xl font-bold text-orange-500">{stats.contasVencer}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-orange-500/50" />
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

          <TabsContent value="compras">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Gestão de Compras
                </CardTitle>
                <CardDescription>
                  Inicie uma nova compra selecionando produtos críticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowProdutosCriticos(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Iniciar Nova Compra
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ordens">
            <OrdensCompraTable 
              integradoId={user?.id || ''} 
              onRefresh={() => { fetchStats(); fetchProdutosCriticos(); }}
            />
          </TabsContent>

          <TabsContent value="recebimento">
            <RecebimentosTable 
              integradoId={user?.id || ''} 
              onRefresh={() => { fetchStats(); fetchProdutosCriticos(); }}
            />
          </TabsContent>

          <TabsContent value="financeiro">
            <ContasPagarTable 
              integradoId={user?.id || ''} 
              onRefresh={fetchStats}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ProdutosCriticosDialog
        open={showProdutosCriticos}
        onOpenChange={setShowProdutosCriticos}
        produtos={produtosCriticos}
        integradoId={user?.id || ''}
        onSuccess={() => {
          fetchProdutosCriticos();
          fetchStats();
          setActiveTab('ordens');
        }}
      />
    </div>
  );
}
