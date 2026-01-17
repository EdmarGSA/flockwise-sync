import { useEffect } from 'react';
import { useLoteAnalytics } from '@/hooks/useLoteAnalytics';
import { GestorCardsExecutivos } from './GestorCardsExecutivos';
import { GestorTabelaRisco } from './GestorTabelaRisco';
import { GestorIndicadoresEstrategicos } from './GestorIndicadoresEstrategicos';
import { GestorCentralAtencao } from './GestorCentralAtencao';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GestorDashboardProps {
  integradoId: string;
}

export function GestorDashboard({ integradoId }: GestorDashboardProps) {
  const { loading, analytics, summary, fetchAnalytics } = useLoteAnalytics();

  useEffect(() => {
    if (integradoId) {
      fetchAnalytics(integradoId);
    }
  }, [integradoId, fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics(integradoId);
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Dashboard de Gestor</h2>
          <p className="text-sm text-muted-foreground">
            Visão executiva de todos os lotes em produção
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Camada 1: Cards Executivos */}
      <GestorCardsExecutivos summary={summary} loading={loading} />

      {/* Camada 2: Tabela de Risco */}
      <GestorTabelaRisco analytics={analytics} loading={loading} />

      {/* Camada 3: Indicadores Estratégicos */}
      <GestorIndicadoresEstrategicos 
        summary={summary} 
        analytics={analytics} 
        loading={loading} 
      />

      {/* Camada 4: Central de Atenção */}
      <GestorCentralAtencao analytics={analytics} loading={loading} />
    </div>
  );
}
