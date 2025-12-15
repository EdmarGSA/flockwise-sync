import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PieChart, TrendingUp, ArrowRight } from "lucide-react";
import RelatorioDRE from "./RelatorioDRE";
import RelatorioCustoPorLote from "./RelatorioCustoPorLote";

interface RelatoriosTabProps {
  userId: string;
}

type RelatorioTipo = 'menu' | 'dre' | 'custo-lote';

const RelatoriosTab = ({ userId }: RelatoriosTabProps) => {
  const [relatorioAtivo, setRelatorioAtivo] = useState<RelatorioTipo>('menu');

  if (relatorioAtivo === 'dre') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setRelatorioAtivo('menu')}>
          ← Voltar aos Relatórios
        </Button>
        <RelatorioDRE userId={userId} />
      </div>
    );
  }

  if (relatorioAtivo === 'custo-lote') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setRelatorioAtivo('menu')}>
          ← Voltar aos Relatórios
        </Button>
        <RelatorioCustoPorLote userId={userId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Relatórios Financeiros</h2>
        <p className="text-sm text-muted-foreground">Análises e demonstrativos financeiros</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setRelatorioAtivo('dre')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">DRE</CardTitle>
                <CardDescription>Demonstrativo de Resultados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Análise de receitas, custos e despesas por período. Compare resultados mensais e identifique tendências.
            </p>
            <Button variant="outline" className="w-full">
              Gerar Relatório
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setRelatorioAtivo('custo-lote')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Custo por Lote</CardTitle>
                <CardDescription>Análise de rentabilidade</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Detalhamento de custos por lote de produção. Analise ração, medicamentos, mão de obra e margem.
            </p>
            <Button variant="outline" className="w-full">
              Gerar Relatório
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Comparativo</CardTitle>
                <CardDescription>Em breve</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Compare resultados entre períodos, lotes ou centros de custo. Identifique oportunidades de melhoria.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em Desenvolvimento
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatoriosTab;
