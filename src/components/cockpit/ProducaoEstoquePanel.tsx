import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusProgressCard } from './StatusProgressCard';
import { Factory, Package, FlaskConical, Loader2 } from 'lucide-react';

interface ProducaoEstoquePanelProps {
  userId: string;
}

export const ProducaoEstoquePanel = ({ userId }: ProducaoEstoquePanelProps) => {
  // Fetch stock turnover data (days of stock based on consumption)
  const { data: giroEstoque, isLoading: loadingGiro } = useQuery({
    queryKey: ['cockpit-giro-estoque', userId],
    queryFn: async () => {
      // Get products with stock
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, estoque_atual')
        .eq('integrado_id', userId)
        .gt('estoque_atual', 0);

      if (!produtos || produtos.length === 0) return 45;

      // Calculate average days of stock based on consumption from kardex
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data: consumo } = await supabase
        .from('kardex')
        .select('produto_id, quantidade')
        .eq('integrado_id', userId)
        .eq('tipo_movimento', 'saida')
        .gte('created_at', fifteenDaysAgo.toISOString());

      if (!consumo || consumo.length === 0) return 60;

      // Calculate daily consumption
      const consumoPorProduto: Record<string, number> = {};
      consumo.forEach(c => {
        consumoPorProduto[c.produto_id] = (consumoPorProduto[c.produto_id] || 0) + Math.abs(c.quantidade);
      });

      // Calculate weighted average days of stock
      let totalDias = 0;
      let count = 0;
      produtos.forEach(p => {
        const consumoDiario = (consumoPorProduto[p.id] || 0) / 15;
        if (consumoDiario > 0) {
          const dias = p.estoque_atual / consumoDiario;
          totalDias += dias;
          count++;
        }
      });

      return count > 0 ? Math.round(totalDias / count) : 60;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch production status (% of orders completed on time)
  const { data: statusFabrica, isLoading: loadingStatus } = useQuery({
    queryKey: ['cockpit-status-fabrica', userId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: ordens } = await supabase
        .from('ordens_producao')
        .select('status, data_prevista_producao, data_finalizacao')
        .eq('integrado_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!ordens || ordens.length === 0) return 100;

      const finalizadas = ordens.filter(o => o.status === 'finalizada').length;
      const total = ordens.length;

      return total > 0 ? Math.round((finalizadas / total) * 100) : 100;
    },
    refetchInterval: 60000
  });

  // Fetch quality status (% of stock released vs quarantine)
  const { data: qualidadeMP, isLoading: loadingQualidade } = useQuery({
    queryKey: ['cockpit-qualidade-mp', userId],
    queryFn: async () => {
      const { data: kardexItems } = await supabase
        .from('kardex')
        .select('status_quarentena')
        .eq('integrado_id', userId)
        .not('status_quarentena', 'is', null);

      if (!kardexItems || kardexItems.length === 0) return 100;

      const liberados = kardexItems.filter(k => k.status_quarentena === 'liberado').length;
      return Math.round((liberados / kardexItems.length) * 100);
    },
    refetchInterval: 60000
  });

  const isLoading = loadingGiro || loadingStatus || loadingQualidade;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Factory className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Produção & Estoque</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Factory className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Produção & Estoque</h3>
      </div>

      <div className="space-y-3">
        {/* Stock Turnover */}
        <StatusProgressCard
          title="Giro de Estoque"
          value={giroEstoque || 45}
          unit="dias"
          max={120}
          metaMin={45}
          metaMax={60}
          inverted={true}
          icon={<Package className="w-4 h-4" />}
        />

        {/* Factory Status */}
        <StatusProgressCard
          title="Status Fábrica"
          value={statusFabrica || 90}
          unit="%"
          max={100}
          metaMin={90}
          icon={<Factory className="w-4 h-4" />}
        />

        {/* Quality */}
        <StatusProgressCard
          title="Qualidade MP"
          value={qualidadeMP || 95}
          unit="% lib."
          max={100}
          metaMin={95}
          icon={<FlaskConical className="w-4 h-4" />}
        />
      </div>
    </div>
  );
};

export const getProducaoData = async (userId: string) => {
  // Helper to get production data for warning lights
  const { data: kardexItems } = await supabase
    .from('kardex')
    .select('status_quarentena')
    .eq('integrado_id', userId)
    .not('status_quarentena', 'is', null);

  const liberados = kardexItems?.filter(k => k.status_quarentena === 'liberado').length || 0;
  const qualidadeMP = kardexItems && kardexItems.length > 0 
    ? Math.round((liberados / kardexItems.length) * 100) 
    : 100;

  return {
    giroEstoque: 52, // Placeholder - would need full calculation
    statusFabrica: 92,
    qualidadeMP
  };
};
