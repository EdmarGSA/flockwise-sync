import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutDashboard, TrendingUp, RefreshCw, FileText, CreditCard, Wallet, Settings, Landmark, Target, Receipt } from "lucide-react";
import DashboardFinanceiroCards from "@/components/financeiro/DashboardFinanceiroCards";
import FluxoCaixaTab from "@/components/financeiro/FluxoCaixaTab";
import ConciliacaoTab from "@/components/financeiro/ConciliacaoTab";
import RelatoriosTab from "@/components/financeiro/RelatoriosTab";
import ContasPagarFinanceiroTab from "@/components/financeiro/ContasPagarFinanceiroTab";
import ContasReceberFinanceiroTab from "@/components/financeiro/ContasReceberFinanceiroTab";
import ContasBancariasTab from "@/components/financeiro/ContasBancariasTab";
import PlanoContasTab from "@/components/financeiro/PlanoContasTab";
import CentroCustosTab from "@/components/financeiro/CentroCustosTab";
import TaxasBancariasTab from "@/components/financeiro/TaxasBancariasTab";
import FormasPagamentoTab from "@/components/financeiro/FormasPagamentoTab";
import CreditoClienteTab from "@/components/financeiro/CreditoClienteTab";

const Financeiro = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [configTab, setConfigTab] = useState("contas-bancarias");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
              <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">Gestão financeira completa</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="contas-pagar" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <CreditCard className="h-4 w-4" />
                <span className="hidden md:inline">Pagar</span>
              </TabsTrigger>
              <TabsTrigger value="contas-receber" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <Wallet className="h-4 w-4" />
                <span className="hidden md:inline">Receber</span>
              </TabsTrigger>
              <TabsTrigger value="fluxo-caixa" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden md:inline">Fluxo</span>
              </TabsTrigger>
              <TabsTrigger value="conciliacao" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden md:inline">Concil.</span>
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Relat.</span>
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Config.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <DashboardFinanceiroCards userId={user.id} />
          </TabsContent>

          <TabsContent value="contas-pagar">
            <ContasPagarFinanceiroTab userId={user.id} />
          </TabsContent>

          <TabsContent value="contas-receber">
            <ContasReceberFinanceiroTab userId={user.id} />
          </TabsContent>

          <TabsContent value="fluxo-caixa">
            <FluxoCaixaTab userId={user.id} />
          </TabsContent>

          <TabsContent value="conciliacao">
            <ConciliacaoTab userId={user.id} />
          </TabsContent>

          <TabsContent value="relatorios">
            <RelatoriosTab userId={user.id} />
          </TabsContent>

          <TabsContent value="configuracoes">
            <Tabs value={configTab} onValueChange={setConfigTab} className="space-y-4">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
                  <TabsTrigger value="contas-bancarias" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                    <Landmark className="h-4 w-4" />
                    <span className="hidden md:inline">Bancos</span>
                  </TabsTrigger>
                  <TabsTrigger value="plano-contas" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                    <FileText className="h-4 w-4" />
                    <span className="hidden md:inline">Plano</span>
                  </TabsTrigger>
                  <TabsTrigger value="centro-custos" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                    <Target className="h-4 w-4" />
                    <span className="hidden md:inline">Custos</span>
                  </TabsTrigger>
                  <TabsTrigger value="taxas" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                    <Receipt className="h-4 w-4" />
                    <span className="hidden md:inline">Taxas</span>
                  </TabsTrigger>
                  <TabsTrigger value="formas-pagamento" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden md:inline">Formas</span>
                  </TabsTrigger>
                  <TabsTrigger value="credito-cliente" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden md:inline">Crédito</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="contas-bancarias">
                <ContasBancariasTab userId={user.id} />
              </TabsContent>
              
              <TabsContent value="plano-contas">
                <PlanoContasTab userId={user.id} />
              </TabsContent>
              
              <TabsContent value="centro-custos">
                <CentroCustosTab userId={user.id} />
              </TabsContent>
              
              <TabsContent value="taxas">
                <TaxasBancariasTab userId={user.id} />
              </TabsContent>
              
              <TabsContent value="formas-pagamento">
                <FormasPagamentoTab userId={user.id} />
              </TabsContent>

              <TabsContent value="credito-cliente">
                <CreditoClienteTab userId={user.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Financeiro;
