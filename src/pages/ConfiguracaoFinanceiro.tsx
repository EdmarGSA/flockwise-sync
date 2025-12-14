import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Landmark, FileText, Target, Receipt } from "lucide-react";
import ContasBancariasTab from "@/components/financeiro/ContasBancariasTab";
import PlanoContasTab from "@/components/financeiro/PlanoContasTab";
import CentroCustosTab from "@/components/financeiro/CentroCustosTab";
import TaxasBancariasTab from "@/components/financeiro/TaxasBancariasTab";

const ConfiguracaoFinanceiro = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Landmark className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Configuração Financeira</h1>
              <p className="text-muted-foreground">Contas bancárias, plano de contas, centros de custo e taxas</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="contas-bancarias" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="contas-bancarias" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Contas Bancárias</span>
              <span className="sm:hidden">Contas</span>
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
      </main>
    </div>
  );
};

export default ConfiguracaoFinanceiro;
