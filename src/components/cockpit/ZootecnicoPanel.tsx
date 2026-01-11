import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompassIndicator } from './CompassIndicator';
import { GaugeChart } from './GaugeChart';
import { TachometerGauge } from './TachometerGauge';
import { Bird, Loader2 } from 'lucide-react';
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
          .select('peso_g, ganho_medio_diario_g')
          .eq('linhagem', lote.linhagem)
          .eq('sexo', lote.sexo)
          .eq('dia', diasVida)
          .single();

        if (refData && pesoAtual > 0) {
          const gpdReal = pesoAtual / diasVida; // kg per day
          const gpdRef = refData.ganho_medio_diario_g / 1000; // Convert g to kg

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

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bird className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Zootécnico</h3>
      </div>

      <div className="space-y-4">
        {/* Compass - GPD Performance */}
        <CompassIndicator
          percentage={gpdData?.percentage || 100}
          title="Performance GPD"
          subtitle="vs Curva de Referência"
          referenceValue={gpdData?.reference}
          actualValue={gpdData?.actual}
          unit=" kg/dia"
        />

        {/* Feed Conversion Gauge */}
        <div className="flex justify-center">
          <GaugeChart
            value={caData || 1.65}
            min={1.3}
            max={2.0}
            thresholds={{ danger: 1.7, warning: 1.6, ok: 1.55 }}
            title="Conversão Alimentar"
            unit=""
            inverted={true}
            size="lg"
          />
        </div>

        {/* Mortality Tachometer */}
        <TachometerGauge
          value={mortalidadeData || 0}
          max={0.5}
          zones={{ green: 0.15, yellow: 0.3 }}
          title="Mortalidade Diária"
          unit="%"
          decimals={3}
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
    return { gpd: 100, mortalidade: 0 };
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
    mortalidade
  };
};
