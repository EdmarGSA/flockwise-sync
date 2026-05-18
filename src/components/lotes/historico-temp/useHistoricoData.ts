import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useConfigZonas } from '@/hooks/useConfigZonas';
import { DiaTemperatura, RegraTemp, UMIDADE_MIN, UMIDADE_MAX } from './types';
import {
  mediana,
  percentil,
  minMaxSustentado,
  tempoForaFaixa,
  zonasAtivasPara,
  type LeituraTemporal,
  type ZonaSensor,
} from '@/lib/utils/agregarLeituras';

interface Props {
  galpaoId: string;
  dataAlojamento: string;
  loteId?: string;
}

export function useHistoricoData({ galpaoId, dataAlojamento, loteId }: Props) {
  const [dados, setDados] = useState<DiaTemperatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [loteCtx, setLoteCtx] = useState<{ diasFimPinteiro: number | null; tipoProducao: string | null }>(
    { diasFimPinteiro: null, tipoProducao: null }
  );
  const { integradoId } = useIntegradoId();
  const { config } = useConfigZonas(loteCtx.diasFimPinteiro);

  useEffect(() => {
    if (galpaoId && dataAlojamento) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galpaoId, dataAlojamento, integradoId, loteId, config.diasFimPinteiro, config.minMinutosSustentado]);

  const fetchData = async () => {
    setLoading(true);

    // Contexto do lote (dias_fim_pinteiro e tipo_producao)
    let diasFimPinteiroLote: number | null = null;
    let tipoProducao: string | null = null;
    if (loteId) {
      const { data: lote } = await supabase
        .from('lotes')
        .select('dias_fim_pinteiro, nucleo:nucleos(tipo_producao)')
        .eq('id', loteId)
        .maybeSingle();
      diasFimPinteiroLote = (lote as any)?.dias_fim_pinteiro ?? null;
      tipoProducao = (lote as any)?.nucleo?.tipo_producao ?? null;
      if (
        diasFimPinteiroLote !== loteCtx.diasFimPinteiro ||
        tipoProducao !== loteCtx.tipoProducao
      ) {
        setLoteCtx({ diasFimPinteiro: diasFimPinteiroLote, tipoProducao });
      }
    }

    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id, zona')
      .eq('galpao_id', galpaoId)
      .eq('ativo', true);

    if (!devices || devices.length === 0) {
      setDados([]);
      setLoading(false);
      return;
    }

    const sensoresTotal = devices.length;
    const zonaDoDevice = new Map<string, ZonaSensor>(
      devices.map(d => [d.id, (d.zona ?? 'geral') as ZonaSensor])
    );
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
        .select('dispositivo_id, temperatura_c, umidade_pct, created_at')
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
      setDados([]);
      setLoading(false);
      return;
    }

    const porDia: Record<string, {
      tempsPorZona: Map<ZonaSensor, LeituraTemporal[]>;
      umidsPorZona: Map<ZonaSensor, number[]>;
      sensoresDoDia: Set<string>;
    }> = {};

    allLeituras.forEach(l => {
      const dateStr = l.created_at.substring(0, 10);
      const zona = zonaDoDevice.get(l.dispositivo_id) ?? 'geral';
      if (!porDia[dateStr]) {
        porDia[dateStr] = {
          tempsPorZona: new Map(),
          umidsPorZona: new Map(),
          sensoresDoDia: new Set(),
        };
      }
      porDia[dateStr].sensoresDoDia.add(l.dispositivo_id);
      if (l.temperatura_c != null) {
        const arr = porDia[dateStr].tempsPorZona.get(zona) ?? [];
        arr.push({ valor: Number(l.temperatura_c), ts: l.created_at });
        porDia[dateStr].tempsPorZona.set(zona, arr);
      }
      if (l.umidade_pct != null) {
        const arr = porDia[dateStr].umidsPorZona.get(zona) ?? [];
        arr.push(Number(l.umidade_pct));
        porDia[dateStr].umidsPorZona.set(zona, arr);
      }
    });

    const alojDate = new Date(dataAlojamento + 'T00:00:00');
    const resultado: DiaTemperatura[] = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, ctx]) => {
        const currentDate = new Date(dateStr + 'T00:00:00');
        const dia = Math.floor((currentDate.getTime() - alojDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const zonasAtivas = zonasAtivasPara(dia, tipoProducao, config.diasFimPinteiro);
        const zonaPrincipal = zonasAtivas[0];

        const temps: LeituraTemporal[] = [];
        const umids: number[] = [];
        const sensoresUsadosSet = new Set<string>();
        zonasAtivas.forEach(z => {
          const t = ctx.tempsPorZona.get(z) ?? [];
          temps.push(...t);
          const u = ctx.umidsPorZona.get(z) ?? [];
          umids.push(...u);
        });
        // Conta sensores usados (que pertencem a alguma zona ativa)
        ctx.sensoresDoDia.forEach(devId => {
          const z = zonaDoDevice.get(devId) ?? 'geral';
          if (zonasAtivas.includes(z)) sensoresUsadosSet.add(devId);
        });

        const tempValores = temps.map(t => t.valor);
        const tempMediana = mediana(tempValores);
        const tempP5 = percentil(tempValores, 5);
        const tempP95 = percentil(tempValores, 95);
        const sustentado = minMaxSustentado(temps, config.minMinutosSustentado);

        const tempMinAbs = tempValores.length ? Math.min(...tempValores) : null;
        const tempMaxAbs = tempValores.length ? Math.max(...tempValores) : null;

        const regra = regras.find(r => dia >= r.dia_inicio && dia <= r.dia_fim);
        const faixaMin = regra?.temp_min_c;
        const faixaMax = regra?.temp_max_c;

        let dentroFaixa: boolean | null = null;
        let desvioTemp: number | null = null;
        let minutosFora = 0;
        if (faixaMin !== undefined && faixaMax !== undefined && temps.length > 0) {
          const refMin = sustentado.min ?? tempMediana ?? 0;
          const refMax = sustentado.max ?? tempMediana ?? 0;
          dentroFaixa = refMin >= faixaMin && refMax <= faixaMax;
          const desvioAbaixo = Math.max(0, faixaMin - refMin);
          const desvioAcima = Math.max(0, refMax - faixaMax);
          desvioTemp = Number(Math.max(desvioAbaixo, desvioAcima).toFixed(1));
          minutosFora = tempoForaFaixa(temps, faixaMin, faixaMax);
        }

        const umidadeMin = umids.length > 0 ? Number(Math.min(...umids).toFixed(1)) : null;
        const umidadeMax = umids.length > 0 ? Number(Math.max(...umids).toFixed(1)) : null;
        const umidadeMedianaVal = mediana(umids);
        let umidadeDentroFaixa: boolean | null = null;
        if (umidadeMedianaVal != null) {
          umidadeDentroFaixa = umidadeMedianaVal >= UMIDADE_MIN && umidadeMedianaVal <= UMIDADE_MAX;
        }

        return {
          dia,
          data: dateStr,
          tempMin: sustentado.min != null ? Number(sustentado.min.toFixed(1)) : 0,
          tempMax: sustentado.max != null ? Number(sustentado.max.toFixed(1)) : 0,
          tempMediana: tempMediana != null ? Number(tempMediana.toFixed(1)) : null,
          tempP5: tempP5 != null ? Number(tempP5.toFixed(1)) : null,
          tempP95: tempP95 != null ? Number(tempP95.toFixed(1)) : null,
          tempMinAbsoluto: tempMinAbs != null ? Number(tempMinAbs.toFixed(1)) : null,
          tempMaxAbsoluto: tempMaxAbs != null ? Number(tempMaxAbs.toFixed(1)) : null,
          minutosForaFaixa: minutosFora,
          horarioMin: sustentado.horarioMin ?? '',
          horarioMax: sustentado.horarioMax ?? '',
          faixaMin,
          faixaMax,
          dentroFaixa,
          umidadeMin,
          umidadeMax,
          umidadeMediana: umidadeMedianaVal != null ? Number(umidadeMedianaVal.toFixed(1)) : null,
          umidadeDentroFaixa,
          desvioTemp,
          sensoresUsados: sensoresUsadosSet.size,
          sensoresTotal,
          zonaAtiva: zonaPrincipal,
        };
      });

    setDados(resultado);
    setLoading(false);
  };

  return { dados, loading };
}
