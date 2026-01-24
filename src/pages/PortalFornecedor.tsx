import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFornecedorData } from '@/hooks/useFornecedorData';
import { useTermoAceite } from '@/hooks/useTermoAceite';
import { TermoBloqueante } from '@/components/termos/TermoBloqueante';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Truck, 
  Package, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  Bell,
  TrendingUp,
  ClipboardList,
  History,
  LogOut,
  RefreshCw,
  Building2,
  Settings,
  ShoppingBag,
  Contact
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoGSA from "@/assets/logo-gsa.png";
import { FornecedorEstoqueTab } from '@/components/fornecedor/FornecedorEstoqueTab';
import { FornecedorPedidosTab } from '@/components/fornecedor/FornecedorPedidosTab';
import { FornecedorHistoricoTab } from '@/components/fornecedor/FornecedorHistoricoTab';
import { FornecedorNotificacoesTab } from '@/components/fornecedor/FornecedorNotificacoesTab';
import { FornecedorConfigTab } from '@/components/fornecedor/FornecedorConfigTab';
import { FornecedorCatalogoTab } from '@/components/fornecedor/FornecedorCatalogoTab';
import { FornecedorClientesTab } from '@/components/fornecedor/FornecedorClientesTab';

const PortalFornecedor = () => {
  const { signOut } = useAuth();
  const { 
    loading, 
    fornecedorGlobalId,
    clientes,
    clienteSelecionado,
    setClienteSelecionado,
    stats, 
    clientesEstoque, 
    pedidos, 
    historicoPrecos, 
    notificacoes,
    meusClientes,
    produtosCatalogo,
    marcarNotificacaoLida,
    confirmarPedido,
    informarEnvio,
    refetch 
  } = useFornecedorData();
  
  // Verificar aceite do termo de fornecedor
  const { jaAceitou, loading: loadingTermo } = useTermoAceite({ tipo: 'fornecedor_adesao' });
  const [termoAceito, setTermoAceito] = useState(false);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  // Loading state
  if (loading || loadingTermo) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  // Verificar se precisa aceitar termo (bloqueante)
  if (!jaAceitou && !termoAceito) {
    return (
      <TermoBloqueante 
        tipo="fornecedor_adesao" 
        onAceite={() => setTermoAceito(true)} 
      />
    );
  }

  // Verifica se tem fornecedor configurado
  if (!fornecedorGlobalId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Acesso Não Configurado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Sua conta ainda não está vinculada a um cadastro de fornecedor global. 
              Entre em contato com o administrador do sistema para configurar seu acesso.
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verifica se tem clientes ativos
  if (clientes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Acesso Bloqueado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Seu acesso ao portal foi suspenso. Nenhum cliente ativo está vinculado à sua conta.
              Entre em contato com seu cliente para reativar o acesso.
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logoGSA} alt="Logo" className="h-10 w-auto" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Portal do Fornecedor</h1>
                <p className="text-xs text-muted-foreground">Gestão de vendas e estoque</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Client filter */}
              {clientes.length > 1 && (
                <Select 
                  value={clienteSelecionado || 'all'} 
                  onValueChange={(v) => setClienteSelecionado(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.integrado_id} value={c.integrado_id}>
                        {c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setActiveTab('notificacoes')}
              >
                <Bell className="h-4 w-4" />
                {notificacoesNaoLidas > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {notificacoesNaoLidas}
                  </span>
                )}
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 lg:w-[800px]">
            <TabsTrigger value="dashboard" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Preços</span>
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Catálogo</span>
            </TabsTrigger>
            <TabsTrigger value="meusclientes" className="gap-2">
              <Contact className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => setActiveTab('estoque')}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Clientes Ativos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalClientes}</div>
                  <p className="text-xs text-muted-foreground">
                    empresas comprando seus produtos
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => setActiveTab('estoque')}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Produtos Vinculados
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.produtosVinculados}</div>
                  <p className="text-xs text-muted-foreground">
                    em todos os clientes
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => setActiveTab('pedidos')}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pedidos Pendentes
                  </CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pedidosPendentes}</div>
                  <p className="text-xs text-muted-foreground">
                    R$ {stats.valorPedidosPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-shadow hover:shadow-lg ${stats.alertasEstoque > 0 ? 'border-destructive' : ''}`}
                onClick={() => setActiveTab('estoque')}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Alertas de Estoque
                  </CardTitle>
                  <AlertTriangle className={`h-4 w-4 ${stats.alertasEstoque > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.alertasEstoque > 0 ? 'text-destructive' : ''}`}>
                    {stats.alertasEstoque}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    produtos abaixo do mínimo
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pedidos Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
                <CardDescription>Últimos pedidos recebidos dos clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {pedidos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum pedido recebido ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pedidos.slice(0, 5).map(pedido => (
                      <div 
                        key={pedido.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pedido.numero_pedido}</span>
                            <Badge variant={
                              pedido.status_fornecedor === 'pendente_confirmacao' ? 'destructive' :
                              pedido.status_fornecedor === 'confirmado' ? 'default' :
                              pedido.status_fornecedor === 'enviado' ? 'secondary' : 'outline'
                            }>
                              {pedido.status_fornecedor === 'pendente_confirmacao' ? 'Aguardando Confirmação' :
                               pedido.status_fornecedor === 'confirmado' ? 'Confirmado' : 'Enviado'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {pedido.integrado_nome} • {pedido.itens_count} itens
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alertas de Estoque Baixo */}
            {stats.alertasEstoque > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Estoque Baixo nos Clientes
                  </CardTitle>
                  <CardDescription>
                    Produtos abaixo do estoque mínimo - oportunidade de venda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clientesEstoque
                      .filter(e => e.estoque_atual <= e.estoque_minimo)
                      .slice(0, 5)
                      .map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                        >
                          <div>
                            <p className="font-medium">{item.produto_nome}</p>
                            <p className="text-sm text-muted-foreground">{item.integrado_nome}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-destructive">
                              {item.estoque_atual.toLocaleString('pt-BR')} {item.unidade}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Mín: {item.estoque_minimo.toLocaleString('pt-BR')} {item.unidade}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Estoque Tab */}
          <TabsContent value="estoque">
            <FornecedorEstoqueTab clientesEstoque={clientesEstoque} />
          </TabsContent>

          {/* Pedidos Tab */}
          <TabsContent value="pedidos">
            <FornecedorPedidosTab 
              pedidos={pedidos} 
              onConfirmar={confirmarPedido}
              onEnviar={informarEnvio}
            />
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico">
            <FornecedorHistoricoTab historicoPrecos={historicoPrecos} />
          </TabsContent>

          {/* Notificações Tab */}
          <TabsContent value="notificacoes">
            <FornecedorNotificacoesTab 
              notificacoes={notificacoes}
              onMarcarLida={marcarNotificacaoLida}
            />
          </TabsContent>

          {/* Catálogo Tab */}
          <TabsContent value="catalogo">
            <FornecedorCatalogoTab 
              produtos={produtosCatalogo}
              fornecedorGlobalId={fornecedorGlobalId!}
              onRefresh={refetch}
            />
          </TabsContent>

          {/* Meus Clientes Tab */}
          <TabsContent value="meusclientes">
            <FornecedorClientesTab 
              clientes={meusClientes}
              fornecedorGlobalId={fornecedorGlobalId!}
              onRefresh={refetch}
            />
          </TabsContent>

          {/* Configurações Tab */}
          <TabsContent value="configuracoes">
            <FornecedorConfigTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PortalFornecedor;