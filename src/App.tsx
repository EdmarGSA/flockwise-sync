import "@/hooks/useTheme"; // Initialize theme before first render
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useSupplierCheck } from "@/hooks/useSupplierCheck";
import { ModuleProtectedRoute } from "@/components/ModuleProtectedRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { DemoProvider } from "@/contexts/DemoContext";
import DemoBanner from "@/components/DemoBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import GestaoCampo from "./pages/GestaoCampo";
import MeusLotes from "./pages/MeusLotes";
import MetasPesoLote from "./pages/MetasPesoLote";
import LoteDetalhe from "./pages/LoteDetalhe";
import MetasPosturaLote from "./pages/MetasPosturaLote";
import GestaoConsumo from "./pages/GestaoConsumo";
import Configuracoes from "./pages/Configuracoes";
import CadastroOrganizacao from "./pages/CadastroOrganizacao";
import CadastroMembros from "./pages/CadastroMembros";
import CadastroProdutos from "./pages/CadastroProdutos";
import CadastroGruposAnimal from "./pages/CadastroGruposAnimal";
import CadastroDesempenhoAves from "./pages/CadastroDesempenhoAves";
import CadastroParceiros from "./pages/CadastroParceiros";
import CadastroMortalidadeMedia from "./pages/CadastroMortalidadeMedia";
import ConfiguracaoSilo from "./pages/ConfiguracaoSilo";
import ConfiguracaoFechamento from "./pages/ConfiguracaoFechamento";
import CadastroSilos from "./pages/CadastroSilos";
import FabricaRacao from "./pages/FabricaRacao";
import Veterinario from "./pages/Veterinario";
import VeterinarioLote from "./pages/VeterinarioLote";
import ConfiguracaoFinanceiro from "./pages/ConfiguracaoFinanceiro";
import Comercial from "./pages/Comercial";
import CadastroProdutosAnimais from "./pages/CadastroProdutosAnimais";
import Financeiro from "./pages/Financeiro";
import CockpitThoth from "./pages/CockpitThoth";
import CadastroProdutosOvos from "./pages/CadastroProdutosOvos";
import EstoqueOvos from "./pages/EstoqueOvos";
import CadastroMetasZootecnicas from "./pages/CadastroMetasZootecnicas";
import OrdensProducao from "./pages/OrdensProducao";
import PortalFornecedor from "./pages/PortalFornecedor";
import MeusPedidosFornecedor from "./pages/MeusPedidosFornecedor";
import VitrineFornecedor from "./pages/VitrineFornecedor";
import RastreioOvos from "./pages/RastreioOvos";
import CriadorPainel from "./pages/CriadorPainel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-foreground">Carregando...</p>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Wrapper that redirects suppliers away from regular routes to portal
function SupplierRedirectWrapper({ children }: { children: React.ReactNode }) {
  const { isSupplier, loading } = useSupplierCheck();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is a supplier, redirect to portal
  if (isSupplier) {
    return <Navigate to="/portal-fornecedor" replace />;
  }

  return <>{children}</>;
}

// Wrapper that ensures only suppliers can access the portal
function SupplierOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isSupplier, loading } = useSupplierCheck();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is NOT a supplier, redirect to home
  if (isSupplier === false) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

// Public route - redirects to appropriate page based on user type
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isSupplier, loading: supplierLoading } = useSupplierCheck();

  if (authLoading || (user && supplierLoading)) {
    return <LoadingScreen />;
  }

  if (user) {
    // Redirect suppliers to portal, others to home
    return <Navigate to={isSupplier ? "/portal-fornecedor" : "/home"} replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes - redirect to /home if logged in */}
    <Route path="/" element={
      <PublicRoute>
        <Index />
      </PublicRoute>
    } />
    <Route path="/auth" element={
      <PublicRoute>
        <Auth />
      </PublicRoute>
    } />
    
    {/* Protected routes - Home (blocks suppliers) */}
    <Route path="/home" element={
      <ProtectedRoute>
        <SupplierRedirectWrapper>
          <Home />
        </SupplierRedirectWrapper>
      </ProtectedRoute>
    } />
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <SupplierRedirectWrapper>
          <Dashboard />
        </SupplierRedirectWrapper>
      </ProtectedRoute>
    } />

    {/* Module-protected routes */}
    <Route path="/gestao-campo" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="gestao-campo">
          <GestaoCampo />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/meus-lotes" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="lotes">
          <MeusLotes />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/meus-lotes/:loteId" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="lotes">
          <LoteDetalhe />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/meus-lotes/:loteId/metas" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="lotes">
          <MetasPesoLote />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/meus-lotes/:loteId/metas-postura" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="lotes">
          <MetasPosturaLote />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/gestao-consumo" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="gestao-consumo">
          <GestaoConsumo />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/fabrica-racao" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="fabrica-racao">
          <FabricaRacao />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/ordens-producao" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="fabrica-racao">
          <OrdensProducao />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/veterinario" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="veterinario">
          <Veterinario />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/veterinario/:loteId" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="veterinario">
          <VeterinarioLote />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/comercial" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="comercial">
          <Comercial />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/financeiro" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="financeiro">
          <Financeiro />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/cockpit" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="cockpit">
          <CockpitThoth />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/estoque-ovos" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="estoque-ovos">
          <EstoqueOvos />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />

    {/* Painel do Criador */}
    <Route path="/criador" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="lotes" requiredLevel="edit">
          <CriadorPainel />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />

    {/* Configuration routes - protected by configuracoes module */}
    <Route path="/configuracoes" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <Configuracoes />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/organizacao" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroOrganizacao />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/membros" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroMembros />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/produtos" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroProdutos />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/grupos-animal" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroGruposAnimal />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/desempenho-aves" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroDesempenhoAves />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/parceiros" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroParceiros />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/mortalidade-media" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroMortalidadeMedia />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/silos" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroSilos />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/silo" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <ConfiguracaoSilo />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/fechamento" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <ConfiguracaoFechamento />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/financeiro" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <ConfiguracaoFinanceiro />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/produtos-animais" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroProdutosAnimais />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/metas-zootecnicas" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroMetasZootecnicas />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/produtos-ovos" element={
      <ProtectedRoute>
        <ModuleProtectedRoute moduleCode="configuracoes">
          <CadastroProdutosOvos />
        </ModuleProtectedRoute>
      </ProtectedRoute>
    } />
    
    {/* Portal do Fornecedor - apenas fornecedores */}
    <Route path="/portal-fornecedor" element={
      <ProtectedRoute>
        <SupplierOnlyRoute>
          <PortalFornecedor />
        </SupplierOnlyRoute>
      </ProtectedRoute>
    } />
    
    {/* Meus Pedidos do Fornecedor */}
    <Route path="/meus-pedidos-fornecedor" element={
      <ProtectedRoute>
        <SupplierOnlyRoute>
          <MeusPedidosFornecedor />
        </SupplierOnlyRoute>
      </ProtectedRoute>
    } />
    
    {/* Vitrine pública do fornecedor */}
    <Route path="/vitrine/:id" element={<VitrineFornecedor />} />
    
    {/* Rastreio público de ovos */}
    <Route path="/rastreio/:lote" element={<RastreioOvos />} />
    
    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <DemoProvider>
            <DemoBanner />
            <Toaster />
            <Sonner />
            <AppRoutes />
            <PWAInstallPrompt />
          </DemoProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
