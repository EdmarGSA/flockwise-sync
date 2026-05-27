// ESP32 Bridge — recebe telemetria e envia comandos para dispositivos ESP32-S3
// Endpoints:
//   POST /telemetry — ESP32 envia leituras + status dos canais
//   POST /command   — backend envia comando ON/OFF para um canal
//   GET  /config?deviceId=...  — ESP32 busca configuração inicial (canais, regras)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface TelemetryPayload {
  deviceId: string;
  temperature?: number | null;
  humidity?: number | null;
  online?: boolean;
  channels?: Array<{
    canal: number;
    estado: "on" | "off";
    intensidade_pct?: number;
  }>;
  boot_reason?: "power_on" | "watchdog" | "manual" | "software" | "brownout" | "unknown";
  uptime_s?: number;
  programa_versao_aplicada?: string;
  // Sensor externo (ex.: SM-WT RS485 lido pelo ESP32 como gateway Modbus)
  sensor?: {
    temperature?: number | null;
    humidity?: number | null;
    modbus_error?: boolean;
    modbus_slave_id?: number;
  };
  raw?: Record<string, unknown>;
}

interface CommandPayload {
  dispositivoId?: string;
  canalId?: string;
  acao: "ligar" | "desligar";
}

// Timers de segurança offline calculados pela idade do lote e função do canal.
// O ESP32 grava esses timers no firmware e executa localmente caso perca conexão.
function calcularTimerSeguranca(
  idade: number,
  funcao: string,
): { funcao: string; hora_inicio: string; hora_fim: string; estado: "on" | "off" } | null {
  if (funcao === "aquecimento") {
    if (idade <= 7) return { funcao, hora_inicio: "18:00", hora_fim: "06:00", estado: "on" };
    if (idade <= 14) return { funcao, hora_inicio: "20:00", hora_fim: "05:00", estado: "on" };
    if (idade <= 21) return { funcao, hora_inicio: "22:00", hora_fim: "04:00", estado: "on" };
    return { funcao, hora_inicio: "00:00", hora_fim: "23:59", estado: "off" };
  }
  if (funcao === "ventilacao") {
    if (idade <= 14) return null;
    if (idade <= 21) return { funcao, hora_inicio: "11:00", hora_fim: "15:00", estado: "on" };
    if (idade <= 28) return { funcao, hora_inicio: "10:00", hora_fim: "16:00", estado: "on" };
    return { funcao, hora_inicio: "09:00", hora_fim: "18:00", estado: "on" };
  }
  if (funcao === "iluminacao") {
    // Programa de luz mínimo: dia inteiro nos primeiros 7 dias, 12h depois
    if (idade <= 7) return { funcao, hora_inicio: "00:00", hora_fim: "23:00", estado: "on" };
    return { funcao, hora_inicio: "06:00", hora_fim: "18:00", estado: "on" };
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Schedule 24h por canal — fonte da verdade offline para o ESP32
// ────────────────────────────────────────────────────────────
interface Bloco { acender: string; apagar: string; intensidade_pct?: number }
interface Faixa {
  dia_inicio: number; dia_fim: number; horas_luz: number;
  blocos: Bloco[]; ramp_up_min: number; ramp_down_min: number; intensidade_pct: number;
}
interface ScheduleSlot { hora_inicio: string; hora_fim: string; intensidade_pct: number }

function montarSchedule24h(faixa: Faixa | null): ScheduleSlot[] {
  if (!faixa || !faixa.blocos?.length) return [];
  const out: ScheduleSlot[] = [];
  for (const b of faixa.blocos) {
    out.push({
      hora_inicio: b.acender,
      hora_fim: b.apagar,
      intensidade_pct: Math.min(b.intensidade_pct ?? faixa.intensidade_pct, faixa.intensidade_pct),
    });
  }
  return out;
}

async function carregarFaixaAtiva(
  supabase: any,
  loteId: string,
  integradoId: string,
  programaIdLote: string | null,
  idadeDias: number,
): Promise<Faixa | null> {
  let programaId = programaIdLote;
  if (!programaId) {
    const { data: defp } = await supabase
      .from("programa_iluminacao_lote")
      .select("id")
      .eq("integrado_id", integradoId)
      .eq("tipo_producao", "frango_corte")
      .eq("is_default", true)
      .eq("ativo", true)
      .maybeSingle();
    programaId = defp?.id ?? null;
  }
  if (!programaId) return null;
  const { data: faixa } = await supabase
    .from("programa_iluminacao_faixa")
    .select("*")
    .eq("programa_id", programaId)
    .lte("dia_inicio", idadeDias)
    .gte("dia_fim", idadeDias)
    .maybeSingle();
  return (faixa as Faixa) ?? null;
}

function gerarVersaoSchedule(slots: Record<string, ScheduleSlot[]>): string {
  const json = JSON.stringify(slots);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) - hash + json.charCodeAt(i)) | 0;
  }
  return `v${Math.abs(hash).toString(36)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean).pop() || "";

    // ──────────────────────────────────────────────
    // GET /config?deviceId=XXX  → ESP32 busca configuração
    // ──────────────────────────────────────────────
    if (req.method === "GET" && path === "config") {
      const deviceId = url.searchParams.get("deviceId");
      if (!deviceId) return json({ error: "deviceId obrigatório" }, 400);

      const { data: device } = await supabase
        .from("dispositivos_iot")
        .select("id, nome, num_canais, auth_token, galpao_id, integrado_id, online")
        .eq("device_id_ewelink", deviceId)
        .eq("ativo", true)
        .maybeSingle();

      if (!device) return json({ error: "Dispositivo não registrado" }, 404);

      // Marca online + atualiza ultimo_sync
      const wasOffline = device.online === false;
      await supabase
        .from("dispositivos_iot")
        .update({ ultimo_sync: new Date().toISOString(), online: true })
        .eq("id", device.id);

      if (wasOffline) {
        await supabase.from("eventos_dispositivo_iot").insert({
          dispositivo_id: device.id,
          integrado_id: device.integrado_id,
          tipo: "online",
          detalhes: { fonte: "config_poll" },
        });
      }

      const { data: canais } = await supabase
        .from("canais_dispositivo")
        .select("id, canal_numero, nome, tipo_equipamento, funcao_automacao, automacao_ativa, estado_atual, suporta_dimer, intensidade_atual, integrado_id")
        .eq("dispositivo_id", device.id)
        .eq("ativo", true)
        .order("canal_numero");

      let safety_timers: Array<{
        canal: number;
        funcao: string;
        hora_inicio: string;
        hora_fim: string;
        estado: "on" | "off";
      }> = [];
      // Novo formato: regras por canal com prioridade temperatura > horário
      const safety_rules: Array<{
        canal: number;
        funcao: string;
        modo: "temperatura" | "horario" | "hibrido";
        temp_liga_c: number | null;
        temp_desliga_c: number | null;
        umidade_max_pct: number | null;
        janela_horaria: { inicio: string; fim: string } | null;
        fallback_horario: { hora_inicio: string; hora_fim: string; estado: "on" | "off" } | null;
        origem: "curva" | "manual";
      }> = [];
      const schedule_24h: Record<string, ScheduleSlot[]> = {};
      let lote: any = null;

      // Carrega regras de proteção offline (com setpoints) para todos os canais deste dispositivo
      const { data: protRows } = await supabase
        .from("timers_seguranca_iot")
        .select("canal_id, dispositivo_id, modo, temp_liga_c, temp_desliga_c, umidade_max_pct, janela_horaria_inicio, janela_horaria_fim, hora_inicio, hora_fim, estado_desejado, origem_setpoint")
        .eq("dispositivo_id", device.id);
      const protByCanal = new Map<string, any>();
      for (const r of protRows ?? []) {
        if ((r as any).canal_id) protByCanal.set((r as any).canal_id, r);
      }

      if (device.galpao_id) {
        const { data: l } = await supabase
          .from("lotes")
          .select("id, integrado_id, data_alojamento, programa_iluminacao_id")
          .eq("galpao_id", device.galpao_id)
          .eq("status", "alojado")
          .not("data_alojamento", "is", null)
          .maybeSingle();
        lote = l;

        if (lote?.data_alojamento) {
          const idade = Math.max(
            1,
            Math.floor((Date.now() - new Date(lote.data_alojamento).getTime()) / 86400000) + 1,
          );
          for (const c of canais ?? []) {
            const canalAny = c as any;
            const t = calcularTimerSeguranca(idade, canalAny.funcao_automacao);
            if (t) safety_timers.push({ canal: canalAny.canal_numero, ...t });

            // Monta safety_rule por canal a partir de timers_seguranca_iot (quando vinculado por canal_id)
            const prot = protByCanal.get(canalAny.id);
            if (prot) {
              safety_rules.push({
                canal: canalAny.canal_numero,
                funcao: canalAny.funcao_automacao,
                modo: prot.modo ?? "horario",
                temp_liga_c: prot.temp_liga_c ?? null,
                temp_desliga_c: prot.temp_desliga_c ?? null,
                umidade_max_pct: prot.umidade_max_pct ?? null,
                janela_horaria: prot.janela_horaria_inicio && prot.janela_horaria_fim
                  ? { inicio: prot.janela_horaria_inicio, fim: prot.janela_horaria_fim }
                  : null,
                fallback_horario: t
                  ? { hora_inicio: t.hora_inicio, hora_fim: t.hora_fim, estado: t.estado }
                  : null,
                origem: prot.origem_setpoint ?? "curva",
              });
            } else if (t) {
              // sem registro específico do canal — emite regra horário a partir do cálculo padrão
              safety_rules.push({
                canal: canalAny.canal_numero,
                funcao: canalAny.funcao_automacao,
                modo: "horario",
                temp_liga_c: null,
                temp_desliga_c: null,
                umidade_max_pct: null,
                janela_horaria: null,
                fallback_horario: { hora_inicio: t.hora_inicio, hora_fim: t.hora_fim, estado: t.estado },
                origem: "curva",
              });
            }

            // Schedule 24h apenas para canais de iluminação com automação ativa
            if (canalAny.tipo_equipamento === "iluminacao" && canalAny.automacao_ativa) {
              const faixa = await carregarFaixaAtiva(
                supabase, lote.id, lote.integrado_id,
                lote.programa_iluminacao_id, idade,
              );
              schedule_24h[String(canalAny.canal_numero)] = montarSchedule24h(faixa);
            }
          }
        }
      }

      const programa_versao = gerarVersaoSchedule(schedule_24h);

      // Persiste versão (se mudou) para que o ESP32 saiba quando regravar a NVS
      if (programa_versao && (device as any).programa_versao !== programa_versao) {
        await supabase
          .from("dispositivos_iot")
          .update({ programa_versao })
          .eq("id", device.id);
      }

      const now = new Date();
      return json({
        device: { id: device.id, nome: device.nome, galpao_id: device.galpao_id },
        canais: canais || [],
        intervalo_telemetria_seg: 60,
        safety_timers,        // legado — manter para compatibilidade firmware antigo
        safety_rules,         // novo: prioridade temperatura > horário
        schedule_24h,
        programa_versao,
        rtc: {
          utc_iso: now.toISOString(),
          utc_epoch_s: Math.floor(now.getTime() / 1000),
          tz: "America/Sao_Paulo",
          tz_offset_min: -180,
        },
        politica_recuperacao: {
          restaurar_ultimo_estado: true,
          aplicar_schedule_offline: true,
          max_horas_sem_sync_para_safety: 24,
          sensor_falho_fallback: "horario",   // se sensor local falhar, usa fallback_horario
        },
      });
    }

    // ──────────────────────────────────────────────
    // POST /telemetry  → ESP32 envia leituras
    // ──────────────────────────────────────────────
    if (req.method === "POST" && path === "telemetry") {
      const body = (await req.json()) as TelemetryPayload;
      if (!body.deviceId) return json({ error: "deviceId obrigatório" }, 400);

      const { data: device } = await supabase
        .from("dispositivos_iot")
        .select("id, nome, auth_token, integrado_id, online, boot_count, ultima_inicializacao")
        .eq("device_id_ewelink", body.deviceId)
        .eq("ativo", true)
        .maybeSingle();

      if (!device) {
        return json({ message: "Dispositivo não registrado, ignorando" }, 200);
      }

      if (device.auth_token) {
        const provided = req.headers.get("x-device-token");
        if (provided !== device.auth_token) {
          return json({ error: "Token inválido" }, 401);
        }
      }

      // 0. Detecta boot/recuperação após queda
      const isBoot = body.boot_reason && body.boot_reason !== "unknown" && (body.uptime_s ?? 9999) < 120;
      if (isBoot) {
        await supabase.from("eventos_dispositivo_iot").insert({
          dispositivo_id: device.id,
          integrado_id: device.integrado_id,
          tipo: "boot",
          detalhes: {
            boot_reason: body.boot_reason,
            uptime_s: body.uptime_s,
            programa_versao_aplicada: body.programa_versao_aplicada,
          },
        });
        await supabase
          .from("dispositivos_iot")
          .update({
            ultima_inicializacao: new Date().toISOString(),
            boot_count: (device.boot_count ?? 0) + 1,
            ultimo_boot_reason: body.boot_reason,
          })
          .eq("id", device.id);
        // marca todos os canais para reconciliação no próximo cron
        await supabase
          .from("canais_dispositivo")
          .update({ recuperacao_apos_falha: true })
          .eq("dispositivo_id", device.id)
          .eq("ativo", true);
      } else if (device.online === false) {
        // voltou online sem boot (perdeu apenas internet)
        await supabase.from("eventos_dispositivo_iot").insert({
          dispositivo_id: device.id,
          integrado_id: device.integrado_id,
          tipo: "online",
          detalhes: { fonte: "telemetry" },
        });
        await supabase
          .from("canais_dispositivo")
          .update({ recuperacao_apos_falha: true })
          .eq("dispositivo_id", device.id)
          .eq("ativo", true);
      }

      // 1. Persistir leitura ambiental
      if (body.temperature !== undefined || body.humidity !== undefined) {
        await supabase.from("leituras_sensores").insert({
          dispositivo_id: device.id,
          temperatura_c: body.temperature ?? null,
          umidade_pct: body.humidity ?? null,
          online: body.online ?? true,
          raw_data: body.raw ?? body,
        });
      }

      // 2. Atualizar estado de cada canal (firmware confirma o que aplicou)
      if (body.channels && body.channels.length > 0) {
        await Promise.all(
          body.channels.map((ch) =>
            supabase
              .from("canais_dispositivo")
              .update({
                estado_atual: ch.estado,
                intensidade_atual: ch.intensidade_pct ?? undefined,
                ultimo_estado_persistido: ch.estado,
                ultimo_estado_persistido_em: new Date().toISOString(),
                ultimo_comando_em: new Date().toISOString(),
              })
              .eq("dispositivo_id", device.id)
              .eq("canal_numero", ch.canal),
          ),
        );
      }

      // 3. Marcar último sync + online
      await supabase
        .from("dispositivos_iot")
        .update({ ultimo_sync: new Date().toISOString(), online: true })
        .eq("id", device.id);

      return json({ ok: true, device: device.nome, boot_detectado: !!isBoot });
    }

    // ──────────────────────────────────────────────
    // POST /command  → backend envia comando para canal
    // (chamado pela UI; ESP32 faz polling em /pending-commands)
    // ──────────────────────────────────────────────
    if (req.method === "POST" && path === "command") {
      const body = (await req.json()) as CommandPayload;
      if (!body.canalId || !body.acao) {
        return json({ error: "canalId e acao obrigatórios" }, 400);
      }

      const { data: canal } = await supabase
        .from("canais_dispositivo")
        .select("id, dispositivo_id, canal_numero, nome, integrado_id")
        .eq("id", body.canalId)
        .maybeSingle();

      if (!canal) return json({ error: "Canal não encontrado" }, 404);

      const novoEstado = body.acao === "ligar" ? "on" : "off";

      const { error: upErr } = await supabase
        .from("canais_dispositivo")
        .update({
          estado_atual: novoEstado,
          ultimo_comando_em: new Date().toISOString(),
        })
        .eq("id", canal.id);

      if (upErr) return json({ error: upErr.message }, 500);

      // O ESP32 deve fazer polling em GET /config para buscar o novo estado_atual
      // ou (futuro) podemos publicar via MQTT broker.
      return json({
        ok: true,
        canal: canal.nome,
        canal_numero: canal.canal_numero,
        novo_estado: novoEstado,
      });
    }

    return json({ error: "Endpoint não encontrado", path }, 404);
  } catch (e) {
    console.error("esp32-bridge erro:", e);
    return json({ error: e instanceof Error ? e.message : "erro interno" }, 500);
  }
});
