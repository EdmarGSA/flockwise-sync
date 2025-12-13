import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import GestaoCampo from "./pages/GestaoCampo";
import MeusLotes from "./pages/MeusLotes";
import MetasPesoLote from "./pages/MetasPesoLote";
import GestaoConsumo from "./pages/GestaoConsumo";
import Configuracoes from "./pages/Configuracoes";
import CadastroOrganizacao from "./pages/CadastroOrganizacao";
import CadastroMembros from "./pages/CadastroMembros";
import CadastroProdutos from "./pages/CadastroProdutos";
import CadastroGruposAnimal from "./pages/CadastroGruposAnimal";
import CadastroDesempenhoAves from "./pages/CadastroDesempenhoAves";
import CadastroParceiros from "./pages/CadastroParceiros";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  return <>{children}</>;
}

// Public route - redirects to home if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
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
    
    {/* Protected routes */}
    <Route path="/home" element={
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    } />
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } />
    <Route path="/gestao-campo" element={
      <ProtectedRoute>
        <GestaoCampo />
      </ProtectedRoute>
    } />
    <Route path="/meus-lotes" element={
      <ProtectedRoute>
        <MeusLotes />
      </ProtectedRoute>
    } />
    <Route path="/meus-lotes/:loteId/metas" element={
      <ProtectedRoute>
        <MetasPesoLote />
      </ProtectedRoute>
    } />
    <Route path="/gestao-consumo" element={
      <ProtectedRoute>
        <GestaoConsumo />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes" element={
      <ProtectedRoute>
        <Configuracoes />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/organizacao" element={
      <ProtectedRoute>
        <CadastroOrganizacao />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/membros" element={
      <ProtectedRoute>
        <CadastroMembros />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/produtos" element={
      <ProtectedRoute>
        <CadastroProdutos />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/grupos-animal" element={
      <ProtectedRoute>
        <CadastroGruposAnimal />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/desempenho-aves" element={
      <ProtectedRoute>
        <CadastroDesempenhoAves />
      </ProtectedRoute>
    } />
    <Route path="/configuracoes/parceiros" element={
      <ProtectedRoute>
        <CadastroParceiros />
      </ProtectedRoute>
    } />
    
    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
