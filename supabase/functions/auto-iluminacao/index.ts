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
        id, dispositivo_id, integrado_id, estado_atual, intensidade_atual, suporta_dimer,
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
      .select("id, galpao_id, integrado_id, data_alojamento, programa_iluminacao_id")
      .in("galpao_id", galpaoIds)
      .eq("status", "alojado")
      .not("data_alojamento", "is", null);

    const loteByGalpao = new Map<string, any>();
    for (const l of lotes ?? []) loteByGalpao.set(l.galpao_id, l);

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

    const defaultByOrg = new Map<string, string>(); // integrado_id -> programa_id default
    for (const p of programas ?? []) {
      if (p.is_default && p.tipo_producao === "frango_corte" && !defaultByOrg.has(p.integrado_id)) {
        defaultByOrg.set(p.integrado_id, p.id);
      }
    }

    // 4) Overrides ativos
    const canalIds = canais.map((c) => c.id);
    const { data: overrides } = await supabase
      .from("override_iluminacao_canal")
      .select("canal_id, estado_forcado, intensidade_pct, ate_quando")
      .in("canal_id", canalIds)
      .gt("ate_quando", new Date().toISOString())
      .order("created_at", { ascending: false });

    const overrideByCanal = new Map<string, any>();
    for (const o of overrides ?? []) if (!overrideByCanal.has(o.canal_id)) overrideByCanal.set(o.canal_id, o);

    // 5) Decidir e aplicar para cada canal
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
        const programaId = lote.programa_iluminacao_id ?? defaultByOrg.get(lote.integrado_id);
        const programaFaixas = programaId ? faixasByPrograma.get(programaId) : null;
        if (programaFaixas?.length) {
          const idade = idadeLoteDias(lote.data_alojamento);
          const faixa = programaFaixas.find((f) => idade >= f.dia_inicio && idade <= f.dia_fim);
          if (faixa) {
            const r = calcular(faixa);
            estadoDesejado = r.ligado ? "on" : "off";
            intensidade = r.intensidade;
            motivo = `idade ${idade}d, faixa ${faixa.dia_inicio}-${faixa.dia_fim}, ${r.intensidade}%`;
          }
        }
      }

      const mudouEstado = canal.estado_atual !== estadoDesejado;
      const mudouIntensidade = canal.suporta_dimer && (canal.intensidade_atual ?? 0) !== intensidade;
      if (!mudouEstado && !mudouIntensidade) continue;

      acoes++;
      log.push({ canal: canal.id, motivo, estado: estadoDesejado, intensidade });

      // Enviar comando conforme driver
      if (dev.driver === "esp32_http") {
        await supabase.functions.invoke("esp32-bridge/command", {
          body: {
            canalId: canal.id,
            acao: estadoDesejado === "on" ? "ligar" : "desligar",
            intensidade_pct: canal.suporta_dimer ? intensidade : undefined,
          },
        });
      } else {
        // eWeLink: on/off apenas (sem dimer)
        await supabase.functions.invoke("sync-sensors", {
          body: {
            action: "control-device",
            integrado_id: canal.integrado_id,
            device_id: dev.device_id_ewelink,
            switch: estadoDesejado,
          },
        });
        await supabase.from("canais_dispositivo")
          .update({ estado_atual: estadoDesejado, ultimo_comando_em: new Date().toISOString() })
          .eq("id", canal.id);
      }
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
