import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { DiaTemperatura, RegraTemp, UMIDADE_MIN, UMIDADE_MAX } from './types';

interface Props {
  galpaoId: string;
  dataAlojamento: string;
}

export function useHistoricoData({ galpaoId, dataAlojamento }: Props) {
  const [dados, setDados] = useState<DiaTemperatura[]>([]);
  const [loading, setLoading] = useState(true);
  const { integradoId } = useIntegradoId();

  useEffect(() => {
    if (galpaoId && dataAlojamento) fetchData();
  }, [galpaoId, dataAlojamento, integradoId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id')
      .eq('galpao_id', galpaoId)
      .eq('ativo', true);

    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    const deviceIds = devices.map(d => d.id);

    let regras: RegraTemp[] = [];
    if (integradoId) {
      const { data: regrasData } = await supabase
        .from('regras_temperatura_lote')
        .select('dia_inicio, dia_fim, temp_min_c, temp_max_c')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('dia_inicio');
      if (regrasData) regras = regrasData.map(r => ({
        dia_inicio: Number(r.dia_inicio),
        dia_fim: Number(r.dia_fim),
        temp_min_c: Number(r.temp_min_c),
        temp_max_c: Number(r.temp_max_c),
      }));
    }

    let allLeituras: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data: leituras } = await supabase
        .from('leituras_sensores')
        .select('temperatura_c, umidade_pct, created_at')
        .in('dispositivo_id', deviceIds)
        .gte('created_at', dataAlojamento)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!leituras || leituras.length === 0) break;
      allLeituras = [...allLeituras, ...leituras];
      if (leituras.length < pageSize) break;
      page++;
    }

    if (allLeituras.length === 0) {
      setLoading(false);
      return;
    }

    const porDia: Record<string, { temps: { temp: number; ts: string }[]; umids: number[] }> = {};
    allLeituras.forEach(l => {
      const dateStr = l.created_at.substring(0, 10);
      if (!porDia[dateStr]) porDia[dateStr] = { temps: [], umids: [] };
      if (l.temperatura_c != null) {
        porDia[dateStr].temps.push({ temp: Number(l.temperatura_c), ts: l.created_at });
      }
      if (l.umidade_pct != null) {
        porDia[dateStr].umids.push(Number(l.umidade_pct));
      }
    });

    const alojDate = new Date(dataAlojamento + 'T00:00:00');
    const resultado: DiaTemperatura[] = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, { temps, umids }]) => {
        const currentDate = new Date(dateStr + 'T00:00:00');
        const dia = Math.floor((currentDate.getTime() - alojDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        let minTemp = Infinity, maxTemp = -Infinity;
        let minTs = '', maxTs = '';
        temps.forEach(({ temp, ts }) => {
          if (temp < minTemp) { minTemp = temp; minTs = ts; }
          if (temp > maxTemp) { maxTemp = temp; maxTs = ts; }
        });

        const regra = regras.find(r => dia >= r.dia_inicio && dia <= r.dia_fim);
        const faixaMin = regra?.temp_min_c;
        const faixaMax = regra?.temp_max_c;

        let dentroFaixa: boolean | null = null;
        let desvioTemp: number | null = null;
        if (faixaMin !== undefined && faixaMax !== undefined && temps.length > 0) {
          dentroFaixa = minTemp >= faixaMin && maxTemp <= faixaMax;
          const desvioAbaixo = Math.max(0, faixaMin - minTemp);
          const desvioAcima = Math.max(0, maxTemp - faixaMax);
          desvioTemp = Number(Math.max(desvioAbaixo, desvioAcima).toFixed(1));
        }

        const umidadeMin = umids.length > 0 ? Number(Math.min(...umids).toFixed(1)) : null;
        const umidadeMax = umids.length > 0 ? Number(Math.max(...umids).toFixed(1)) : null;
        let umidadeDentroFaixa: boolean | null = null;
        if (umidadeMin !== null && umidadeMax !== null) {
          umidadeDentroFaixa = umidadeMin >= UMIDADE_MIN && umidadeMax <= UMIDADE_MAX;
        }

        return {
          dia,
          data: dateStr,
          tempMin: temps.length > 0 ? Number(minTemp.toFixed(1)) : 0,
          tempMax: temps.length > 0 ? Number(maxTemp.toFixed(1)) : 0,
          horarioMin: minTs,
          horarioMax: maxTs,
          faixaMin,
          faixaMax,
          dentroFaixa,
          umidadeMin,
          umidadeMax,
          umidadeDentroFaixa,
          desvioTemp,
        };
      });

    setDados(resultado);
    setLoading(false);
  };

  return { dados, loading };
}
