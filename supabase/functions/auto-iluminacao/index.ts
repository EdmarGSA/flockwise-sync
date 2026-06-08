// auto-iluminacao: roda a cada 1 min via pg_cron
// Para cada canal de iluminação com automacao_ativa, calcula o estado desejado
// baseado no programa de luz vinculado ao lote ativo do galpão e envia comando.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Bloco { acender: string; apagar: string; intensidade_pct?: number }
interface Faixa {
  dia_inicio: number; dia_fim: number; horas_luz: number;
  blocos: Bloco[]; ramp_up_min: number; ramp_down_min: number; intensidade_pct: number;
  modo_horario?: 'fixo' | 'solar';
  acender_offset_min?: number;
  apagar_offset_min?: number;
}

const TZ = "America/Sao_Paulo";

function minutosNoDia(d = new Date()): number {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

const hhmmToMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};

function avaliarBloco(b: Bloco, agoraMin: number, rampUp: number, rampDown: number, intMax: number) {
  const acender = hhmmToMin(b.acender);
  const apagar = hhmmToMin(b.apagar);
  const cap = Math.min(b.intensidade_pct ?? intMax, intMax);
  const cruza = acender > apagar || apagar === acender;
  const dentro = cruza ? agoraMin >= acender || agoraMin < apagar : agoraMin >= acender && agoraMin < apagar;

  if (!dentro) {
    if (rampUp > 0) {
      const inicioRamp = (acender - rampUp + 1440) % 1440;
      const noRamp = inicioRamp < acender
        ? agoraMin >= inicioRamp && agoraMin < acender
        : agoraMin >= inicioRamp || agoraMin < acender;
      if (noRamp) {
        const progresso = ((agoraMin - inicioRamp + 1440) % 1440) / rampUp;
        return { ligado: true, intensidade: Math.max(1, Math.round(cap * progresso)) };
      }
    }
    return { ligado: false, intensidade: 0 };
  }
  if (rampDown > 0) {
    const inicioRD = (apagar - rampDown + 1440) % 1440;
    const noRD = inicioRD < apagar
      ? agoraMin >= inicioRD && agoraMin < apagar
      : agoraMin >= inicioRD || agoraMin < apagar;
    if (noRD) {
      const progresso = 1 - ((agoraMin - inicioRD + 1440) % 1440) / rampDown;
      return { ligado: true, intensidade: Math.max(1, Math.round(cap * progresso)) };
    }
  }
  return { ligado: true, intensidade: cap };
}

function calcular(faixa: Faixa) {
  const agoraMin = minutosNoDia();
  const blocos = (faixa.blocos?.length ? faixa.blocos : [{ acender: "00:00", apagar: "00:00" }]) as Bloco[];
  let melhor = { ligado: false, intensidade: 0 };
  for (const b of blocos) {
    const r = avaliarBloco(b, agoraMin, faixa.ramp_up_min, faixa.ramp_down_min, faixa.intensidade_pct);
    if (r.ligado && r.intensidade > melhor.intensidade) melhor = r;
  }
  return melhor;
}

function idadeLoteDias(dataAlojamento: string): number {
  const ini = new Date(dataAlojamento);
  const ms = Date.now() - ini.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const log: any[] = [];
  let acoes = 0;

  try {
    // 1) Carrega canais de iluminação ativos
    const { data: canais, error: e1 } = await supabase
      .from("canais_dispositivo")
      .select(`
        id, dispositivo_id, integrado_id, estado_atual, intensidade_atual, suporta_dimer, recuperacao_apos_falha,
        dispositivos_iot!inner(id, device_id_ewelink, driver, galpao_id, ativo)
      `)
      .eq("tipo_equipamento", "iluminacao")
      .eq("automacao_ativa", true)
      .eq("ativo", true);

    if (e1) throw new Error(`canais: ${e1.message}`);
    if (!canais?.length) {
      return new Response(JSON.stringify({ message: "Nenhum canal de luz ativo", acoes: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Lotes ativos por galpão
    const galpaoIds = [...new Set(canais.map((c: any) => c.dispositivos_iot?.galpao_id).filter(Boolean))];
    const { data: lotes } = await supabase
      .from("lotes")
      .select("id, galpao_id, integrado_id, data_alojamento, programa_iluminacao_id, galpoes!inner(nucleo_id)")
      .in("galpao_id", galpaoIds)
      .eq("status", "alojado")
      .not("data_alojamento", "is", null);

    const loteByGalpao = new Map<string, any>();
    const nucleoByGalpao = new Map<string, string>();
    for (const l of (lotes ?? []) as any[]) {
      loteByGalpao.set(l.galpao_id, l);
      if (l.galpoes?.nucleo_id) nucleoByGalpao.set(l.galpao_id, l.galpoes.nucleo_id);
    }

    // Solar de hoje por núcleo
    const hoje = new Date().toISOString().slice(0, 10);
    const nucleoIds = [...new Set([...nucleoByGalpao.values()])];
    const { data: solarHoje } = nucleoIds.length
      ? await supabase.from("solar_diario").select("nucleo_id, nascer_sol, por_sol").eq("data", hoje).in("nucleo_id", nucleoIds)
      : { data: [] as any[] };
    const solarByNucleo = new Map<string, { nascer: Date | null; por: Date | null }>();
    for (const s of (solarHoje ?? []) as any[]) {
      solarByNucleo.set(s.nucleo_id, {
        nascer: s.nascer_sol ? new Date(s.nascer_sol) : null,
        por: s.por_sol ? new Date(s.por_sol) : null,
      });
    }


    // 3) Programas e faixas (carrega todos de uma vez)
    const integradoIds = [...new Set(canais.map((c: any) => c.integrado_id))];
    const { data: programas } = await supabase
      .from("programa_iluminacao_lote")
      .select("id, integrado_id, tipo_producao, is_default, ativo")
      .in("integrado_id", integradoIds)
      .eq("ativo", true);

    const programaIds = (programas ?? []).map((p) => p.id);
    const { data: faixas } = await supabase
      .from("programa_iluminacao_faixa")
      .select("*")
      .in("programa_id", programaIds);

    const faixasByPrograma = new Map<string, Faixa[]>();
    for (const f of (faixas ?? []) as any[]) {
      const arr = faixasByPrograma.get(f.programa_id) ?? [];
      arr.push(f as Faixa);
      faixasByPrograma.set(f.programa_id, arr);
    }

    // Default por (integrado_id + tipo_producao) — corte e postura têm programas distintos.
    // Antes, postura caía no default de corte e ficava sempre OFF (ref. auditoria C3).
    const defaultByOrgTipo = new Map<string, string>(); // `${integrado_id}|${tipo}` -> programa_id
    for (const p of programas ?? []) {
      const key = `${p.integrado_id}|${p.tipo_producao}`;
      if (p.is_default && !defaultByOrgTipo.has(key)) {
        defaultByOrgTipo.set(key, p.id);
      }
    }

    // Tipo de produção por galpão (via núcleo)
    const tipoByGalpao = new Map<string, string>();
    if (galpaoIds.length) {
      const { data: galpoesTipo } = await supabase
        .from("galpoes")
        .select("id, nucleos!inner(tipo_producao)")
        .in("id", galpaoIds);
      for (const g of (galpoesTipo ?? []) as any[]) {
        if (g.nucleos?.tipo_producao) tipoByGalpao.set(g.id, g.nucleos.tipo_producao);
      }
    }

    // 4) Overrides manuais por canal
    const canalIds = canais.map((c) => c.id);
    const { data: overrides } = await supabase
      .from("override_iluminacao_canal")
      .select("canal_id, estado_forcado, intensidade_pct, ate_quando")
      .in("canal_id", canalIds)
      .gt("ate_quando", new Date().toISOString())
      .order("created_at", { ascending: false });

    const overrideByCanal = new Map<string, any>();
    for (const o of overrides ?? []) if (!overrideByCanal.has(o.canal_id)) overrideByCanal.set(o.canal_id, o);

    // 4b) Overrides do Brain AI (por galpão, válidos para o dia)
    const hojeRef = new Date().toISOString().slice(0, 10);
    const { data: brainOvrs } = galpaoIds.length
      ? await supabase
          .from("override_iluminacao_brain")
          .select("galpao_id, horas_luz, acender_hhmm, apagar_hhmm, intensidade_pct, ramp_up_min, ramp_down_min, blocos")
          .in("galpao_id", galpaoIds)
          .eq("data_ref", hojeRef)
          .eq("status", "ativo")
          .gt("expira_em", new Date().toISOString())
      : { data: [] as any[] };
    const brainByGalpao = new Map<string, any>();
    for (const b of brainOvrs ?? []) brainByGalpao.set(b.galpao_id, b);


    // 5) Decidir para cada canal e colecionar tarefas a executar em paralelo
    type Tarefa = () => Promise<unknown>;
    const tarefas: Tarefa[] = [];

    for (const canal of canais as any[]) {
      const dev = canal.dispositivos_iot;
      if (!dev?.ativo || !dev.galpao_id) continue;
      const lote = loteByGalpao.get(dev.galpao_id);
      if (!lote) continue;

      let estadoDesejado: "on" | "off" = "off";
      let intensidade = 0;
      let motivo = "sem programa";

      const ovr = overrideByCanal.get(canal.id);
      if (ovr && ovr.estado_forcado !== "auto") {
        estadoDesejado = ovr.estado_forcado as "on" | "off";
        intensidade = ovr.intensidade_pct ?? (estadoDesejado === "on" ? 100 : 0);
        motivo = `override até ${ovr.ate_quando}`;
      } else {
        const tipo = tipoByGalpao.get(dev.galpao_id) ?? "frango_corte";
        const programaId = lote.programa_iluminacao_id
          ?? defaultByOrgTipo.get(`${lote.integrado_id}|${tipo}`);
        const programaFaixas = programaId ? faixasByPrograma.get(programaId) : null;
        if (!programaFaixas?.length) {
          motivo = `sem_programa: lote sem programa_iluminacao_id e sem default para tipo=${tipo}`;
          log.push({ canal: canal.id, skip: motivo });
        } else {
          const idade = idadeLoteDias(lote.data_alojamento);
          const faixa = programaFaixas.find((f) => idade >= f.dia_inicio && idade <= f.dia_fim);
          if (!faixa) {
            motivo = `sem_faixa: idade=${idadeLoteDias(lote.data_alojamento)}d fora das faixas do programa`;
            log.push({ canal: canal.id, skip: motivo });
          }
          if (faixa) {
            let faixaEfetiva = faixa as Faixa;
            if (faixa.modo_horario === "solar") {
              const nucleoId = nucleoByGalpao.get(dev.galpao_id);
              const sol = nucleoId ? solarByNucleo.get(nucleoId) : null;
              if (sol?.nascer && sol?.por) {
                const ofA = faixa.acender_offset_min ?? 0;
                const ofP = faixa.apagar_offset_min ?? 0;
                const fmt = (d: Date) => {
                  const dl = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
                  return `${dl.find(p => p.type === "hour")?.value}:${dl.find(p => p.type === "minute")?.value}`;
                };
                const nascerOff = new Date(sol.nascer.getTime() + ofA * 60000);
                const porOff = new Date(sol.por.getTime() + ofP * 60000);
                faixaEfetiva = { ...faixa, blocos: [{ acender: fmt(nascerOff), apagar: fmt(porOff), intensidade_pct: faixa.intensidade_pct }] };
              }
            }

            const brainOvr = brainByGalpao.get(dev.galpao_id);
            if (brainOvr) {
              faixaEfetiva = {
                ...faixaEfetiva,
                blocos: (Array.isArray(brainOvr.blocos) && brainOvr.blocos.length)
                  ? brainOvr.blocos as Bloco[]
                  : [{ acender: brainOvr.acender_hhmm, apagar: brainOvr.apagar_hhmm, intensidade_pct: brainOvr.intensidade_pct }],
                intensidade_pct: brainOvr.intensidade_pct,
                ramp_up_min: brainOvr.ramp_up_min ?? faixaEfetiva.ramp_up_min,
                ramp_down_min: brainOvr.ramp_down_min ?? faixaEfetiva.ramp_down_min,
                horas_luz: Number(brainOvr.horas_luz),
              };
            }

            const r = calcular(faixaEfetiva);
            estadoDesejado = r.ligado ? "on" : "off";
            intensidade = r.intensidade;
            const tagBrain = brainOvr ? " 🧠brain" : "";
            motivo = `idade ${idade}d, faixa ${faixa.dia_inicio}-${faixa.dia_fim}${faixa.modo_horario === "solar" ? " (solar)" : ""}${tagBrain}, ${r.intensidade}%`;
          }
        }
      }

      const mudouEstado = canal.estado_atual !== estadoDesejado;
      const mudouIntensidade = canal.suporta_dimer && (canal.intensidade_atual ?? 0) !== intensidade;
      const precisaReconciliar = canal.recuperacao_apos_falha === true;
      if (!mudouEstado && !mudouIntensidade && !precisaReconciliar) continue;

      acoes++;
      log.push({ canal: canal.id, motivo, estado: estadoDesejado, intensidade, reconciliacao: precisaReconciliar });

      // Snapshot para a closure
      const estadoFinal = estadoDesejado;
      const intensidadeFinal = intensidade;
      const motivoFinal = motivo;
      const reconciliar = precisaReconciliar;
      const _mudouEstado = mudouEstado;
      const _ovr = ovr;

      tarefas.push(async () => {
        if (_mudouEstado || reconciliar) {
          await supabase.from("historico_estado_canal").insert({
            canal_id: canal.id,
            integrado_id: canal.integrado_id,
            estado: estadoFinal,
            ligado_em: estadoFinal === "on" ? new Date().toISOString() : null,
            desligado_em: estadoFinal === "off" ? new Date().toISOString() : null,
            motivo: reconciliar ? "reconciliacao_pos_falha" : (_ovr ? "override" : "programa"),
            contexto: { motivo: motivoFinal, intensidade: intensidadeFinal, lote_id: lote.id, reconciliacao: reconciliar },
          });
        }

        if (dev.driver === "esp32_http") {
          await supabase.functions.invoke("esp32-bridge/command", {
            body: {
              canalId: canal.id,
              acao: estadoFinal === "on" ? "ligar" : "desligar",
              intensidade_pct: canal.suporta_dimer ? intensidadeFinal : undefined,
            },
          });
        } else {
          await supabase.functions.invoke("sync-sensors", {
            body: {
              action: "control-device",
              integrado_id: canal.integrado_id,
              device_id: dev.device_id_ewelink,
              switch: estadoFinal,
            },
          });
          const nowIsoEw = new Date().toISOString();
          // eWeLink confirma o comando de forma síncrona — sucesso = ACK.
          await supabase.from("canais_dispositivo")
            .update({
              estado_atual: estadoFinal,
              ultimo_comando_em: nowIsoEw,
              ultimo_estado_persistido: estadoFinal,
              ultimo_estado_persistido_em: nowIsoEw,
            })
            .eq("id", canal.id);
        }

        if (reconciliar) {
          await supabase.from("canais_dispositivo")
            .update({ recuperacao_apos_falha: false })
            .eq("id", canal.id);
          await supabase.from("eventos_dispositivo_iot").insert({
            dispositivo_id: dev.id,
            integrado_id: canal.integrado_id,
            tipo: "reconciliacao",
            detalhes: { canal_id: canal.id, estado: estadoFinal, intensidade: intensidadeFinal, motivo: motivoFinal },
          });
        }
      });
    }

    // Executa todas as tarefas em paralelo, tolerando falhas individuais
    const resultados = await Promise.allSettled(tarefas.map((t) => t()));
    const falhas = resultados.filter((r) => r.status === "rejected").length;
    if (falhas > 0) {
      log.push({ falhas_paralelas: falhas, total: tarefas.length });
    }


    return new Response(
      JSON.stringify({ ok: true, acoes, duracao_ms: Date.now() - startedAt, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("auto-iluminacao error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
