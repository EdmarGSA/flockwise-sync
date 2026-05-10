import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plane, RefreshCw } from 'lucide-react';
import { WarningLights, createWarningLights } from '@/components/cockpit/WarningLights';
import { ScoreOperacionalCard, calculateOperationalScore } from '@/components/cockpit/ScoreOperacionalCard';
import { ProducaoEstoquePanel } from '@/components/cockpit/ProducaoEstoquePanel';
import { FinanceiroPanel } from '@/components/cockpit/FinanceiroPanel';
import { ZootecnicoPanel } from '@/components/cockpit/ZootecnicoPanel';
import { Loader2 } from 'lucide-react';
import { calcularIdadeLote } from '@/lib/utils';

const CockpitThoth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all data for warning lights and score
  const { data: warningData, isLoading: loadingWarnings, refetch } = useQuery({
    queryKey: ['cockpit-warnings', integradoId, refreshKey],
    queryFn: async () => {
      if (!integradoId) return null;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(today.getDate() + 7);
      const futureStr = sevenDaysLater.toISOString().split('T')[0];

      // 1. Giro Estoque - Simplified for warning light
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, estoque_atual')
        .eq('integrado_id', integradoId)
        .gt('estoque_atual', 0);

      const giroEstoque = produtos && produtos.length > 0 ? 52 : 60; // Placeholder

      // 2. Status Fábrica
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: ordens } = await supabase
        .from('ordens_producao')
        .select('status')
        .eq('integrado_id', integradoId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const finalizadas = ordens?.filter(o => o.status === 'finalizada').length || 0;
      const totalOrdens = ordens?.length || 1;
      const statusFabrica = Math.round((finalizadas / totalOrdens) * 100);

      // 3. Qualidade MP
      const { data: kardexItems } = await supabase
        .from('kardex')
        .select('status_quarentena')
        .eq('integrado_id', integradoId)
        .not('status_quarentena', 'is', null);

      const liberados = kardexItems?.filter(k => k.status_quarentena === 'liberado').length || 0;
      const qualidadeMP = kardexItems && kardexItems.length > 0 
        ? Math.round((liberados / kardexItems.length) * 100) 
        : 100;

      // 4. Caixa 7 dias
      const { data: receber } = await supabase
        .from('contas_receber')
        .select('valor')
        .eq('integrado_id', integradoId)
        .in('status', ['previsao', 'pendente'])
        .gte('data_vencimento', todayStr)
        .lte('data_vencimento', futureStr);

      const { data: pagar } = await supabase
        .from('contas_pagar')
        .select('valor')
        .eq('integrado_id', integradoId)
        .in('status', ['previsto', 'pendente'])
        .gte('data_vencimento', todayStr)
        .lte('data_vencimento', futureStr);

      const entradas = receber?.reduce((acc, r) => acc + (r.valor || 0), 0) || 0;
      const saidas = pagar?.reduce((acc, p) => acc + (p.valor || 0), 0) || 0;
      const caixa7dias = entradas - saidas;

      // 5. Crédito Utilizado
      const { data: creditos } = await supabase
        .from('credito_cliente')
        .select('limite_credito, cliente_id')
        .eq('integrado_id', integradoId)
        .eq('ativo', true);

      let creditoUtilizado = 0;
      if (creditos && creditos.length > 0) {
        const totalLimite = creditos.reduce((acc, c) => acc + (c.limite_credito || 0), 0);
        const { data: pendentes } = await supabase
          .from('contas_receber')
          .select('cliente_id, valor')
          .eq('integrado_id', integradoId)
          .in('status', ['previsao', 'pendente', 'parcial']);

        let totalUtilizado = 0;
        const clienteIds = new Set(creditos.map(c => c.cliente_id));
        pendentes?.forEach(p => {
          if (p.cliente_id && clienteIds.has(p.cliente_id)) {
            totalUtilizado += p.valor || 0;
          }
        });

        creditoUtilizado = totalLimite > 0 ? (totalUtilizado / totalLimite) * 100 : 0;
      }

      // 6. Atraso CR
      const { data: todasCR } = await supabase
        .from('contas_receber')
        .select('id, data_vencimento')
        .eq('integrado_id', integradoId)
        .in('status', ['previsao', 'pendente', 'parcial']);

      const atrasadas = todasCR?.filter(c => c.data_vencimento < todayStr).length || 0;
      const atrasoCR = todasCR && todasCR.length > 0 
        ? (atrasadas / todasCR.length) * 100 
        : 0;

      // 7. GPD Performance
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, linhagem, sexo, data_alojamento')
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');

      let gpd = 100;
      if (lotes && lotes.length > 0) {
        // Simplified GPD calculation
        for (const lote of lotes) {
          if (lote.data_alojamento) {
            const diasVida = calcularIdadeLote(lote.data_alojamento);
            if (diasVida > 0) {
              const { data: metas } = await supabase
                .from('metas_peso')
                .select('peso_inicial_kg, gpd_kg')
                .eq('lote_id', lote.id)
                .single();

              const { data: ref } = await supabase
                .from('desempenho_aves')
                .select('peso_g')
                .eq('linhagem', lote.linhagem)
                .eq('sexo', lote.sexo)
                .eq('dia', diasVida)
                .single();

              if (metas && ref) {
                const pesoReal = (metas.peso_inicial_kg + (metas.gpd_kg * diasVida)) * 1000; // kg to g
                gpd = (pesoReal / ref.peso_g) * 100;
              }
            }
          }
        }
      }

      // 8. Mortalidade
      const { data: lotesAtivos } = await supabase
        .from('lotes')
        .select('id, quantidade_aves')
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');

      let mortalidade = 0;
      if (lotesAtivos && lotesAtivos.length > 0) {
        const totalAves = lotesAtivos.reduce((acc, l) => acc + (l.quantidade_aves || 0), 0);
        const loteIds = lotesAtivos.map(l => l.id);

        const { data: mortalidades } = await supabase
          .from('mortalidade')
          .select('id')
          .in('lote_id', loteIds)
          .eq('data_registro', todayStr);

        if (mortalidades && mortalidades.length > 0) {
          const mortIds = mortalidades.map(m => m.id);
          const { data: itens } = await supabase
            .from('mortalidade_itens')
            .select('quantidade')
            .in('mortalidade_id', mortIds);

          const totalMortos = itens?.reduce((acc, i) => acc + (i.quantidade || 0), 0) || 0;
          mortalidade = totalAves > 0 ? (totalMortos / totalAves) * 100 : 0;
        }
      }

      // 9. CA (Conversão Alimentar) - get average from recent fechamentos
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { data: fechamentos } = await supabase
        .from('fechamento_lotes')
        .select('conversao_alimentar')
        .eq('integrado_id', integradoId)
        .gte('created_at', sixtyDaysAgo.toISOString());

      const ca = fechamentos && fechamentos.length > 0
        ? fechamentos.reduce((acc, f) => acc + (f.conversao_alimentar || 0), 0) / fechamentos.length
        : 1.55;

      return {
        giroEstoque,
        statusFabrica,
        qualidadeMP,
        caixa7dias,
        creditoUtilizado,
        atrasoCR,
        gpd,
        mortalidade,
        ca
      };
    },
    enabled: !!integradoId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (!user || loadingIntegrado || !integradoId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const warningLights = warningData ? createWarningLights(warningData) : [];
  
  // Calculate operational score
  const scoreData = warningData ? calculateOperationalScore({
    gpd: warningData.gpd,
    ca: warningData.ca || 1.55,
    caMeta: 1.55,
    mortalidade: warningData.mortalidade,
    mortalidadeMeta: 0.15,
    giroEstoque: warningData.giroEstoque,
    caixa7dias: warningData.caixa7dias
  }) : { score: 0, indicators: [] };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold">Cockpit</h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Score Operacional - NEW */}
        <ScoreOperacionalCard 
          score={scoreData.score}
          indicators={scoreData.indicators}
          loading={loadingWarnings}
        />

        {/* Warning Lights Panel */}
        {loadingWarnings ? (
          <div className="bg-card rounded-lg border p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WarningLights lights={warningLights} />
        )}

        <ClimateBrainAlertCard integradoId={integradoId} />

        {/* Main Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Production & Stock Panel */}
          <ProducaoEstoquePanel userId={integradoId} />

          {/* Financial Panel */}
          <FinanceiroPanel userId={integradoId} />

          {/* Zootechnical Panel */}
          <ZootecnicoPanel userId={integradoId} />
        </div>
      </main>
    </div>
  );
};

export default CockpitThoth;
