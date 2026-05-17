import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MetricaExecutivaCard } from './MetricaExecutivaCard';
import { Bird, TrendingUp, Skull, Utensils, Loader2 } from 'lucide-react';
import { calcularIdadeLote } from '@/lib/utils';

interface ZootecnicoPanelProps {
  userId: string;
}

export const ZootecnicoPanel = ({ userId }: ZootecnicoPanelProps) => {
  // Fetch GPD performance vs reference
  const { data: gpdData, isLoading: loadingGpd } = useQuery({
    queryKey: ['cockpit-gpd', userId],
    queryFn: async () => {
      // Get active batches
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, linhagem, sexo, data_alojamento, quantidade_aves')
        .eq('integrado_id', userId)
        .eq('status', 'alojado');

      if (!lotes || lotes.length === 0) {
        return { percentage: 100, reference: 0, actual: 0 };
      }

      let totalGpdReal = 0;
      let totalGpdRef = 0;
      let count = 0;

      for (const lote of lotes) {
        if (!lote.data_alojamento) continue;

        const diasVida = calcularIdadeLote(lote.data_alojamento);
        if (diasVida <= 0) continue;

        // Get last weighing - using metas_peso for reference instead
        const { data: metas } = await supabase
          .from('metas_peso')
          .select('peso_inicial_kg, gpd_kg')
          .eq('lote_id', lote.id)
          .single();

        const pesoAtual = metas ? metas.peso_inicial_kg + (metas.gpd_kg * diasVida) : 0;

        // Get reference weight for this day
        const { data: refData } = await supabase
          .from('desempenho_aves')
          .select('peso_kg, ganho_medio_diario_kg')
          .eq('linhagem', lote.linhagem)
          .eq('sexo', lote.sexo)
          .eq('dia', diasVida)
          .single();

        if (refData && pesoAtual > 0) {
          const gpdReal = pesoAtual / diasVida; // kg per day
          const gpdRef = refData.ganho_medio_diario_kg / 1000; // Convert g to kg

          totalGpdReal += gpdReal;
          totalGpdRef += gpdRef;
          count++;
        }
      }

      if (count === 0) return { percentage: 100, reference: 0, actual: 0 };

      const avgGpdReal = totalGpdReal / count;
      const avgGpdRef = totalGpdRef / count;
      const percentage = avgGpdRef > 0 ? (avgGpdReal / avgGpdRef) * 100 : 100;

      return {
        percentage: Math.min(percentage, 120),
        reference: avgGpdRef,
        actual: avgGpdReal
      };
    },
    refetchInterval: 60000
  });

  // Fetch feed conversion data
  const { data: caData, isLoading: loadingCa } = useQuery({
    queryKey: ['cockpit-ca', userId],
    queryFn: async () => {
      // Get closed batches from last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: fechamentos } = await supabase
        .from('fechamento_lotes')
        .select('conversao_alimentar')
        .eq('integrado_id', userId)
        .gte('created_at', sixtyDaysAgo.toISOString());

      if (!fechamentos || fechamentos.length === 0) return 1.65;

      const avgCa = fechamentos.reduce((acc, f) => acc + (f.conversao_alimentar || 0), 0) / fechamentos.length;
      return avgCa;
    },
    refetchInterval: 60000
  });

  // Fetch daily mortality
  const { data: mortalidadeData, isLoading: loadingMort } = useQuery({
    queryKey: ['cockpit-mortalidade', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Get active batches
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, quantidade_aves')
        .eq('integrado_id', userId)
        .eq('status', 'alojado');

      if (!lotes || lotes.length === 0) return 0;

      const totalAves = lotes.reduce((acc, l) => acc + (l.quantidade_aves || 0), 0);
      const loteIds = lotes.map(l => l.id);

      // Get today's mortality
      const { data: mortalidades } = await supabase
        .from('mortalidade')
        .select('id')
        .in('lote_id', loteIds)
        .eq('data_registro', today);

      if (!mortalidades || mortalidades.length === 0) return 0;

      const mortalidadeIds = mortalidades.map(m => m.id);

      const { data: itens } = await supabase
        .from('mortalidade_itens')
        .select('quantidade')
        .in('mortalidade_id', mortalidadeIds);

      const totalMortos = itens?.reduce((acc, i) => acc + (i.quantidade || 0), 0) || 0;

      return totalAves > 0 ? (totalMortos / totalAves) * 100 : 0;
    },
    refetchInterval: 60000
  });

  const isLoading = loadingGpd || loadingCa || loadingMort;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bird className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Zootécnico</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const gpdPercentage = gpdData?.percentage || 100;
  const gpdStatus = gpdPercentage >= 98 ? 'ok' : gpdPercentage >= 90 ? 'warning' : 'danger';

  const caValue = caData || 1.65;
  const caMeta = 1.55;
  const caStatus = caValue <= caMeta ? 'ok' : caValue <= 1.65 ? 'warning' : 'danger';

  const mortValue = mortalidadeData || 0;
  const mortMeta = 0.15;
  const mortStatus = mortValue <= mortMeta ? 'ok' : mortValue <= 0.3 ? 'warning' : 'danger';

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bird className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Zootécnico</h3>
      </div>

      <div className="space-y-3">
        {/* GPD Performance */}
        <MetricaExecutivaCard
          title="Performance GPD"
          value={gpdPercentage}
          unit="%"
          decimals={0}
          status={gpdStatus}
          statusLabel={gpdStatus === 'ok' ? 'EXCELENTE' : gpdStatus === 'warning' ? 'ABAIXO' : 'CRÍTICO'}
          referencia={gpdData?.reference ? gpdData.reference * 1000 : 0}
          referenciaLabel="Ref (g/dia)"
          meta={98}
          metaLabel="Meta"
          progressValue={gpdPercentage}
          progressMax={120}
          trend={gpdPercentage >= 100 ? 'up' : 'down'}
          icon={<TrendingUp className="w-4 h-4" />}
        />

        {/* Feed Conversion */}
        <MetricaExecutivaCard
          title="Conversão Alimentar"
          value={caValue}
          unit=""
          decimals={2}
          status={caStatus}
          statusLabel={caStatus === 'ok' ? 'NA META' : caStatus === 'warning' ? 'ACIMA' : 'CRÍTICO'}
          meta={caMeta}
          metaLabel="Meta CA"
          progressValue={2 - caValue}
          progressMax={0.7}
          detalhe={caValue > caMeta ? `Excesso: +${(caValue - caMeta).toFixed(2)}` : 'Dentro da meta'}
          icon={<Utensils className="w-4 h-4" />}
        />

        {/* Mortality */}
        <MetricaExecutivaCard
          title="Mortalidade Diária"
          value={mortValue}
          unit="%"
          decimals={3}
          status={mortStatus}
          statusLabel={mortStatus === 'ok' ? 'NORMAL' : mortStatus === 'warning' ? 'ELEVADA' : 'CRÍTICA'}
          meta={mortMeta}
          metaLabel="Alerta"
          progressValue={mortValue}
          progressMax={0.5}
          detalhe="Hoje"
          icon={<Skull className="w-4 h-4" />}
        />
      </div>
    </div>
  );
};

export const getZootecnicoData = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];

  // Get active batches
  const { data: lotes } = await supabase
    .from('lotes')
    .select('id, quantidade_aves')
    .eq('integrado_id', userId)
    .eq('status', 'alojado');

  if (!lotes || lotes.length === 0) {
    return { gpd: 100, mortalidade: 0, ca: 1.55 };
  }

  const totalAves = lotes.reduce((acc, l) => acc + (l.quantidade_aves || 0), 0);
  const loteIds = lotes.map(l => l.id);

  // Get today's mortality
  const { data: mortalidades } = await supabase
    .from('mortalidade')
    .select('id')
    .in('lote_id', loteIds)
    .eq('data_registro', today);

  let mortalidade = 0;
  if (mortalidades && mortalidades.length > 0) {
    const mortalidadeIds = mortalidades.map(m => m.id);
    const { data: itens } = await supabase
      .from('mortalidade_itens')
      .select('quantidade')
      .in('mortalidade_id', mortalidadeIds);

    const totalMortos = itens?.reduce((acc, i) => acc + (i.quantidade || 0), 0) || 0;
    mortalidade = totalAves > 0 ? (totalMortos / totalAves) * 100 : 0;
  }

  return {
    gpd: 98, // Would need full GPD calculation
    mortalidade,
    ca: 1.55
  };
};
