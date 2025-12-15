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
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Módulo Financeiro</h1>
              <p className="text-muted-foreground">Gestão financeira completa</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="contas-pagar" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Contas a Pagar</span>
              <span className="sm:hidden">Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="contas-receber" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Contas a Receber</span>
              <span className="sm:hidden">Receber</span>
            </TabsTrigger>
            <TabsTrigger value="fluxo-caixa" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Fluxo de Caixa</span>
              <span className="sm:hidden">Fluxo</span>
            </TabsTrigger>
            <TabsTrigger value="conciliacao" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Conciliação</span>
              <span className="sm:hidden">Concil.</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Relat.</span>
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config.</span>
            </TabsTrigger>
          </TabsList>

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
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="contas-bancarias" className="flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Contas Bancárias</span>
                  <span className="sm:hidden">Bancos</span>
                </TabsTrigger>
                <TabsTrigger value="plano-contas" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Plano de Contas</span>
                  <span className="sm:hidden">Plano</span>
                </TabsTrigger>
                <TabsTrigger value="centro-custos" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Centro de Custos</span>
                  <span className="sm:hidden">Custos</span>
                </TabsTrigger>
                <TabsTrigger value="taxas" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Taxas Bancárias</span>
                  <span className="sm:hidden">Taxas</span>
                </TabsTrigger>
              </TabsList>

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
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Financeiro;
