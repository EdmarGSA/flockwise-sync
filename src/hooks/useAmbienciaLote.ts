import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AmbienciaLoteData,
  CanalDispositivo,
  CortinaEstado,
  DecisaoBrain,
  DispositivoIot,
  FaixaIluminacaoDb,
  LeituraSensor,
  LoteAmbienciaCore,
  NebulizacaoConfig,
  OverrideBrain,
  OverrideCanal,
  ProgramaIluminacao,
  VentilacaoEstado,
} from '@/types/ambienciaLote';
import { idadeLoteDias } from '@/lib/utils/calcularEstadoIluminacao';

const STALE_MS = 30_000;
const DEBOUNCE_MS = 250;
const HEARTBEAT_MS = 60_000;

async function fetchAmbienciaLote(loteId: string): Promise<AmbienciaLoteData> {
  const empty: AmbienciaLoteData = {
    lote: null, idadeDias: null, dispositivos: [], canais: [], leiturasUltimas: [],
    serieKpi: [], decisoes: [], ultimaDecisaoClima: null, ventilacao: null,
    cortina: null, nebulizacao: null, programa: null, overrideBrainHoje: null,
    overridesCanais: [],
  };

  // 1) Lote + galpao/nucleo + programa
  const { data: loteRow, error: loteErr } = await supabase
    .from('lotes')
    .select(`
      id, integrado_id, galpao_id, data_alojamento, quantidade_aves,
      linhagem, linhagem_postura, sexo, programa_iluminacao_id, status,
      galpoes:galpao_id ( id, nome, nucleos:nucleo_id ( nome, tipo_producao ) )
    `)
    .eq('id', loteId)
    .maybeSingle();
  if (loteErr) throw loteErr;
  if (!loteRow) return empty;

  const galpao = (loteRow as any).galpoes;
  const lote: LoteAmbienciaCore = {
    id: loteRow.id,
    integrado_id: loteRow.integrado_id,
    galpao_id: loteRow.galpao_id,
    data_alojamento: loteRow.data_alojamento,
    quantidade_aves: loteRow.quantidade_aves,
    linhagem: loteRow.linhagem as any,
    linhagem_postura: (loteRow as any).linhagem_postura,
    sexo: loteRow.sexo as any,
    programa_iluminacao_id: (loteRow as any).programa_iluminacao_id,
    status: loteRow.status,
    galpao_nome: galpao?.nome ?? null,
    nucleo_nome: galpao?.nucleos?.nome ?? null,
    tipo_producao: galpao?.nucleos?.tipo_producao ?? null,
  };
  const idadeDias = lote.data_alojamento ? idadeLoteDias(lote.data_alojamento) : null;

  if (!lote.galpao_id) return { ...empty, lote, idadeDias };

  // 2) Dispositivos do galpão (paralelo com outras consultas independentes)
  const [
    devsRes, ventRes, cortRes, nebRes, decisaoRes, decisoesRes,
    overrideBrainRes, programaLoteRes,
  ] = await Promise.all([
    supabase
      .from('dispositivos_iot')
      .select('id, nome, device_id_ewelink, driver, online, ultimo_sync, galpao_id, ativo, num_canais, funcao_automacao')
      .eq('galpao_id', lote.galpao_id)
      .eq('ativo', true),
    supabase.from('estagio_ventilacao_estado').select('*').eq('galpao_id', lote.galpao_id).maybeSingle(),
    supabase.from('cortina_estado_atual').select('*').eq('galpao_id', lote.galpao_id).maybeSingle(),
    supabase.from('programa_nebulizacao_galpao').select('*').eq('galpao_id', lote.galpao_id).maybeSingle(),
    supabase
      .from('log_decisao_clima')
      .select('id, funcao_automacao, estado_decidido, estagio, temp_lida, ur_lida, ith_calc, setpoint_alvo, reason_chain, bloqueado_por, modo_dominante, offset_aprendido_aplicado_c, created_at')
      .eq('galpao_id', lote.galpao_id)
      .eq('funcao_automacao', 'climate_brain')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('log_decisao_clima')
      .select('id, funcao_automacao, estado_decidido, estagio, temp_lida, ur_lida, ith_calc, setpoint_alvo, reason_chain, bloqueado_por, modo_dominante, offset_aprendido_aplicado_c, created_at')
      .eq('galpao_id', lote.galpao_id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('override_iluminacao_brain')
      .select('*')
      .eq('galpao_id', lote.galpao_id)
      .eq('data_ref', new Date().toISOString().slice(0, 10))
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    lote.programa_iluminacao_id
      ? supabase
          .from('programa_iluminacao_lote')
          .select('id, nome, tipo_producao, programa_iluminacao_faixa(*)')
          .eq('id', lote.programa_iluminacao_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const dispositivos: DispositivoIot[] = (devsRes.data as any[]) ?? [];
  const devIds = dispositivos.map((d) => d.id);

  // 3) Canais + leituras + overrides canais — dependem de devIds
  let canais: CanalDispositivo[] = [];
  let leiturasUltimas: LeituraSensor[] = [];
  let serieKpi: LeituraSensor[] = [];
  let overridesCanais: OverrideCanal[] = [];

  if (devIds.length) {
    const [canRes, leiRes, ovrRes] = await Promise.all([
      supabase.from('canais_dispositivo').select('*').in('dispositivo_id', devIds).eq('ativo', true),
      supabase
        .from('leituras_sensores')
        .select('dispositivo_id, temperatura_c, umidade_pct, lido_em')
        .in('dispositivo_id', devIds)
        .gte('lido_em', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('lido_em', { ascending: false })
        .limit(200),
      supabase
        .from('override_iluminacao_canal')
        .select('id, canal_id, estado_forcado, intensidade_pct, ate_quando, motivo')
        .gt('ate_quando', new Date().toISOString()),
    ]);
    canais = (canRes.data as any[]) ?? [];
    const allReads = ((leiRes.data as any[]) ?? []) as LeituraSensor[];
    serieKpi = allReads;
    // Última leitura por dispositivo
    const seen = new Set<string>();
    for (const r of allReads) {
      if (!seen.has(r.dispositivo_id)) {
        seen.add(r.dispositivo_id);
        leiturasUltimas.push(r);
      }
    }
    const canIds = canais.map((c) => c.id);
    overridesCanais = ((ovrRes.data as any[]) ?? []).filter((o) => canIds.includes(o.canal_id));
  }

  // 4) Programa de iluminação
  let programa: ProgramaIluminacao | null = null;
  if (programaLoteRes.data) {
    const p: any = programaLoteRes.data;
    programa = {
      id: p.id, nome: p.nome, tipo_producao: p.tipo_producao,
      faixas: (p.programa_iluminacao_faixa as FaixaIluminacaoDb[]) ?? [],
    };
  }

  return {
    lote,
    idadeDias,
    dispositivos,
    canais,
    leiturasUltimas,
    serieKpi,
    decisoes: (decisoesRes.data as DecisaoBrain[]) ?? [],
    ultimaDecisaoClima: (decisaoRes.data as DecisaoBrain) ?? null,
    ventilacao: (ventRes.data as VentilacaoEstado) ?? null,
    cortina: (cortRes.data as CortinaEstado) ?? null,
    nebulizacao: (nebRes.data as NebulizacaoConfig) ?? null,
    programa,
    overrideBrainHoje: (overrideBrainRes.data as OverrideBrain) ?? null,
    overridesCanais,
  };
}

export function useAmbienciaLote(loteId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['ambiencia-lote', loteId] as const;
  const debounceRef = useRef<number | null>(null);
  const lastEventAt = useRef<number>(Date.now());

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAmbienciaLote(loteId!),
    enabled: !!loteId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });

  const galpaoId = query.data?.lote?.galpao_id ?? null;
  const integradoId = query.data?.lote?.integrado_id ?? null;

  const scheduleInvalidate = () => {
    lastEventAt.current = Date.now();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      queryClient.invalidateQueries({ queryKey });
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!galpaoId || !integradoId) return;
    const ch = supabase
      .channel(`ambiencia-lote-${loteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'log_decisao_clima', filter: `galpao_id=eq.${galpaoId}` }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canais_dispositivo' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos_iot', filter: `galpao_id=eq.${galpaoId}` }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cortina_estado_atual', filter: `galpao_id=eq.${galpaoId}` }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estagio_ventilacao_estado', filter: `galpao_id=eq.${galpaoId}` }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'override_iluminacao_brain', filter: `galpao_id=eq.${galpaoId}` }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'override_iluminacao_canal' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras_sensores' }, scheduleInvalidate)
      .subscribe();

    // Heartbeat: se não recebemos eventos em > 60s, refetcha
    const hb = window.setInterval(() => {
      if (Date.now() - lastEventAt.current > HEARTBEAT_MS) {
        queryClient.invalidateQueries({ queryKey });
        lastEventAt.current = Date.now();
      }
    }, HEARTBEAT_MS);

    return () => {
      supabase.removeChannel(ch);
      window.clearInterval(hb);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galpaoId, integradoId, loteId]);

  return query;
}
