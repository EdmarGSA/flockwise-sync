import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularIdadeLote } from '@/lib/utils';
import {
  gerarSugestao,
  calcularStatus,
  type SetpointCurva,
  type SugestaoOutput,
  type SensorOfflineInfo,
} from '@/lib/clima/sugestaoTemperatura';

export interface SensorInfo {
  id: string;
  nome: string;
  ultimoSync: string | null;
  online: boolean;
  ultimaTemp: number | null;
  ultimaUR: number | null;
  ultimaLeituraEm: string | null;
  minDiaC: number | null;
  maxDiaC: number | null;
}

export interface LeituraPonto {
  ts: string;
  t: number | null;
  u: number | null;
}

export interface MinMaxDia {
  min: number | null;
  max: number | null;
  media: number | null;
  count: number;
}

export interface UseTemperaturaLoteResult {
  loading: boolean;
  loteInfo: { galpaoId: string | null; idadeDias: number | null; linhagem: string | null; sexo: string | null; tipoProducao: string | null } | null;
  sensores: SensorInfo[];
  leiturasPorSensor: Record<string, LeituraPonto[]>; // últimas 24h compactadas
  minMaxDia: MinMaxDia;
  setpointCurva: SetpointCurva | null;
  statusGeral: ReturnType<typeof calcularStatus>;
  sugestao: SugestaoOutput;
  refetch: () => Promise<void>;
  fetchHistoricoExtendido: (sensorId: string, dias: number) => Promise<LeituraPonto[]>;
}

const SP_TZ = 'America/Sao_Paulo';

function startOfDayInSP(): Date {
  // Aproximação suficiente: pega meia-noite SP em UTC.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SP_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  // Meia-noite em SP é 03:00 UTC
  return new Date(`${y}-${m}-${d}T03:00:00Z`);
}

function compactSeries(arr: LeituraPonto[], maxPoints = 96): LeituraPonto[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export function useTemperaturaLote(loteId: string | undefined): UseTemperaturaLoteResult {
  const [loading, setLoading] = useState(true);
  const [loteInfo, setLoteInfo] = useState<UseTemperaturaLoteResult['loteInfo']>(null);
  const [sensores, setSensores] = useState<SensorInfo[]>([]);
  const [leiturasPorSensor, setLeiturasPorSensor] = useState<Record<string, LeituraPonto[]>>({});
  const [minMaxDia, setMinMaxDia] = useState<MinMaxDia>({ min: null, max: null, media: null, count: 0 });
  const [setpointCurva, setSetpointCurva] = useState<SetpointCurva | null>(null);

  const sensorIdsKey = useMemo(() => sensores.map(s => s.id).sort().join(','), [sensores]);
  const refetchTimer = useRef<number | null>(null);

  const fetchAll = async () => {
    if (!loteId) return;
    setLoading(true);

    // 1. Lote + galpão + curva
    const { data: lote, error } = await supabase
      .from('lotes')
      .select(`
        id, galpao_id, data_alojamento, linhagem, sexo, curva_climatica_id,
        nucleo:nucleos(tipo_producao)
      `)
      .eq('id', loteId)
      .maybeSingle();

    if (error || !lote) {
      setLoading(false);
      return;
    }

    const idadeDias = lote.data_alojamento ? calcularIdadeLote(lote.data_alojamento) : null;
    const tipoProducao = (lote.nucleo as any)?.tipo_producao ?? null;
    setLoteInfo({
      galpaoId: lote.galpao_id,
      idadeDias,
      linhagem: lote.linhagem,
      sexo: lote.sexo,
      tipoProducao,
    });

    // 2. Setpoint da curva (com fallback para curva pública por linhagem)
    let curvaId = lote.curva_climatica_id;
    if (!curvaId && lote.linhagem) {
      const { data: ref } = await supabase
        .from('curva_climatica_referencia')
        .select('id')
        .eq('linhagem', lote.linhagem)
        .eq('publica', true)
        .limit(1)
        .maybeSingle();
      curvaId = ref?.id ?? null;
    }
    if (curvaId && idadeDias != null) {
      const { data: ponto } = await supabase
        .from('curva_climatica_ponto')
        .select('temp_alvo_c, temp_min_alarme_c, temp_max_alarme_c')
        .eq('curva_id', curvaId)
        .lte('dia_idade', idadeDias)
        .order('dia_idade', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ponto) {
        setSetpointCurva({
          temp_alvo_c: Number(ponto.temp_alvo_c),
          temp_min_alarme_c: Number(ponto.temp_min_alarme_c),
          temp_max_alarme_c: Number(ponto.temp_max_alarme_c),
        });
      } else {
        setSetpointCurva(null);
      }
    } else {
      setSetpointCurva(null);
    }

    // 3. Dispositivos do galpão
    if (!lote.galpao_id) {
      setSensores([]);
      setLeiturasPorSensor({});
      setMinMaxDia({ min: null, max: null, media: null, count: 0 });
      setLoading(false);
      return;
    }

    const { data: devices } = await supabase
      .from('dispositivos_iot')
      .select('id, nome, ultimo_sync')
      .eq('galpao_id', lote.galpao_id)
      .eq('ativo', true);

    const devs = devices ?? [];
    if (!devs.length) {
      setSensores([]);
      setLeiturasPorSensor({});
      setMinMaxDia({ min: null, max: null, media: null, count: 0 });
      setLoading(false);
      return;
    }

    const devIds = devs.map(d => d.id);
    const sinceDay = startOfDayInSP().toISOString();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sinceFetch = sinceDay < since24h ? sinceDay : since24h;

    // 4. Leituras (1 query) — cobre dia + 24h
    const { data: leits } = await supabase
      .from('leituras_sensores')
      .select('dispositivo_id, temperatura_c, umidade_pct, lido_em, online')
      .in('dispositivo_id', devIds)
      .gte('lido_em', sinceFetch)
      .order('lido_em', { ascending: true });

    const leitsArr = leits ?? [];
    const todasDoDiaTemps: number[] = [];
    const seriesMap: Record<string, LeituraPonto[]> = {};
    const ultimaPorDev = new Map<string, { t: number | null; u: number | null; ts: string }>();
    const minMaxPorDev = new Map<string, { min: number; max: number }>();

    leitsArr.forEach((l: any) => {
      const t = l.temperatura_c == null ? null : Number(l.temperatura_c);
      const u = l.umidade_pct == null ? null : Number(l.umidade_pct);
      // série 24h
      if (l.lido_em >= since24h) {
        (seriesMap[l.dispositivo_id] ||= []).push({ ts: l.lido_em, t, u });
      }
      // última do dispositivo
      ultimaPorDev.set(l.dispositivo_id, { t, u, ts: l.lido_em });
      // min/max do dia
      if (l.lido_em >= sinceDay && t != null) {
        todasDoDiaTemps.push(t);
        const cur = minMaxPorDev.get(l.dispositivo_id);
        if (!cur) minMaxPorDev.set(l.dispositivo_id, { min: t, max: t });
        else minMaxPorDev.set(l.dispositivo_id, { min: Math.min(cur.min, t), max: Math.max(cur.max, t) });
      }
    });

    // Compactar séries
    Object.keys(seriesMap).forEach(k => {
      seriesMap[k] = compactSeries(seriesMap[k]);
    });

    const now = Date.now();
    const sensoresInfo: SensorInfo[] = devs.map(d => {
      const ultima = ultimaPorDev.get(d.id);
      const mm = minMaxPorDev.get(d.id);
      const ageMs = d.ultimo_sync ? now - new Date(d.ultimo_sync).getTime() : Infinity;
      return {
        id: d.id,
        nome: d.nome,
        ultimoSync: d.ultimo_sync,
        online: ageMs < 10 * 60 * 1000,
        ultimaTemp: ultima?.t ?? null,
        ultimaUR: ultima?.u ?? null,
        ultimaLeituraEm: ultima?.ts ?? null,
        minDiaC: mm?.min ?? null,
        maxDiaC: mm?.max ?? null,
      };
    });

    // 5. Min/Máx do dia agregados
    if (todasDoDiaTemps.length) {
      const min = Math.min(...todasDoDiaTemps);
      const max = Math.max(...todasDoDiaTemps);
      const media = todasDoDiaTemps.reduce((a, b) => a + b, 0) / todasDoDiaTemps.length;
      setMinMaxDia({ min, max, media, count: todasDoDiaTemps.length });
    } else {
      setMinMaxDia({ min: null, max: null, media: null, count: 0 });
    }

    setSensores(sensoresInfo);
    setLeiturasPorSensor(seriesMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId]);

  // Realtime — atualizar com buffer de 5s
  useEffect(() => {
    if (!sensorIdsKey) return;
    const ids = sensorIdsKey.split(',').filter(Boolean);
    if (!ids.length) return;
    const channel = supabase
      .channel(`leituras_lote_${loteId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leituras_sensores' },
        (payload: any) => {
          if (!ids.includes(payload.new?.dispositivo_id)) return;
          if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
          refetchTimer.current = window.setTimeout(() => fetchAll(), 5000);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorIdsKey, loteId]);

  // Cálculos derivados
  const sensoresOffline: SensorOfflineInfo[] = useMemo(() => {
    const now = Date.now();
    return sensores
      .filter(s => !s.online && s.ultimoSync)
      .map(s => ({
        nome: s.nome,
        minutosOffline: (now - new Date(s.ultimoSync!).getTime()) / 60000,
      }));
  }, [sensores]);

  const sugestao = useMemo(
    () =>
      gerarSugestao({
        mediaC: minMaxDia.media,
        minC: minMaxDia.min,
        maxC: minMaxDia.max,
        setpoint: setpointCurva,
        sensoresOffline,
      }),
    [minMaxDia, setpointCurva, sensoresOffline]
  );

  const statusGeral = sugestao.status;

  const fetchHistoricoExtendido = async (sensorId: string, dias: number): Promise<LeituraPonto[]> => {
    const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('leituras_sensores')
      .select('temperatura_c, umidade_pct, lido_em')
      .eq('dispositivo_id', sensorId)
      .gte('lido_em', since)
      .order('lido_em', { ascending: true });
    const arr: LeituraPonto[] = (data ?? []).map((d: any) => ({
      ts: d.lido_em,
      t: d.temperatura_c == null ? null : Number(d.temperatura_c),
      u: d.umidade_pct == null ? null : Number(d.umidade_pct),
    }));
    return compactSeries(arr, dias <= 1 ? 96 : dias <= 7 ? 168 : 280);
  };

  return {
    loading,
    loteInfo,
    sensores,
    leiturasPorSensor,
    minMaxDia,
    setpointCurva,
    statusGeral,
    sugestao,
    refetch: fetchAll,
    fetchHistoricoExtendido,
  };
}
