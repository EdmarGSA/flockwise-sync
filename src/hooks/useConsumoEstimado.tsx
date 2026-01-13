import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

interface ConsumoEstimadoParams {
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento: number;
  avesVivas: number;
  dataEntrega: Date;
}

interface ConsumoEstimadoResult {
  consumoAteEntrega: number;
  diasAteEntrega: number;
}

export function useConsumoEstimado() {
  const [loading, setLoading] = useState(false);

  const calcularConsumoAteEntrega = useCallback(async ({
    linhagem,
    sexo,
    diasDesdeAlojamento,
    avesVivas,
    dataEntrega,
  }: ConsumoEstimadoParams): Promise<ConsumoEstimadoResult | null> => {
    setLoading(true);

    try {
      const diasAteEntrega = differenceInDays(dataEntrega, new Date());
      
      if (diasAteEntrega <= 0) {
        return { consumoAteEntrega: 0, diasAteEntrega: 0 };
      }

      // Get consumption data from desempenho_aves for the days between now and delivery
      const diaInicio = diasDesdeAlojamento + 1;
      const diaFim = diasDesdeAlojamento + diasAteEntrega;

      const { data: consumoData, error } = await supabase
        .from('desempenho_aves')
        .select('dia, consumo_diario_racao_g')
        .eq('linhagem', linhagem)
        .eq('sexo', sexo)
        .gte('dia', diaInicio)
        .lte('dia', diaFim)
        .order('dia');

      if (error) {
        console.error('Erro ao buscar consumo:', error);
        return null;
      }

      if (!consumoData || consumoData.length === 0) {
        // Fallback: estimate based on last available day or average
        const { data: lastDay } = await supabase
          .from('desempenho_aves')
          .select('consumo_diario_racao_g')
          .eq('linhagem', linhagem)
          .eq('sexo', sexo)
          .lte('dia', diasDesdeAlojamento)
          .order('dia', { ascending: false })
          .limit(1)
          .maybeSingle();

        const consumoDiario = lastDay?.consumo_diario_racao_g || 150; // 150g default
        const consumoTotal = (consumoDiario * avesVivas * diasAteEntrega) / 1000;
        
        return { consumoAteEntrega: consumoTotal, diasAteEntrega };
      }

      // Calculate total consumption in kg
      const consumoTotalGramas = consumoData.reduce((sum, d) => sum + d.consumo_diario_racao_g, 0);
      const consumoAteEntrega = (consumoTotalGramas * avesVivas) / 1000;

      return { consumoAteEntrega, diasAteEntrega };
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { calcularConsumoAteEntrega, loading };
}
