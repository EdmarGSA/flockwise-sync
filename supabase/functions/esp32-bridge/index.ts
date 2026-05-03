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
  deviceId: string;            // device_id_ewelink (reaproveitando o campo)
  temperature?: number | null;
  humidity?: number | null;
  online?: boolean;
  channels?: Array<{
    canal: number;
    estado: "on" | "off";
  }>;
  raw?: Record<string, unknown>;
}

interface CommandPayload {
  dispositivoId?: string;      // public.dispositivos_iot.id
  canalId?: string;            // public.canais_dispositivo.id
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
        .select("id, nome, num_canais, auth_token, galpao_id")
        .eq("device_id_ewelink", deviceId)
        .eq("ativo", true)
        .maybeSingle();

      if (!device) return json({ error: "Dispositivo não registrado" }, 404);

      const { data: canais } = await supabase
        .from("canais_dispositivo")
        .select("canal_numero, nome, tipo_equipamento, funcao_automacao, automacao_ativa, estado_atual")
        .eq("dispositivo_id", device.id)
        .eq("ativo", true)
        .order("canal_numero");

      // Fallback offline: timers de segurança baseados na idade do lote ativo
      let safety_timers: Array<{
        canal: number;
        funcao: string;
        hora_inicio: string;
        hora_fim: string;
        estado: "on" | "off";
      }> = [];

      if (device.galpao_id) {
        const { data: lote } = await supabase
          .from("lotes")
          .select("data_alojamento")
          .eq("galpao_id", device.galpao_id)
          .eq("status", "alojado")
          .not("data_alojamento", "is", null)
          .maybeSingle();

        if (lote?.data_alojamento) {
          const idade = Math.max(
            1,
            Math.floor((Date.now() - new Date(lote.data_alojamento).getTime()) / 86400000) + 1,
          );
          for (const c of canais ?? []) {
            const t = calcularTimerSeguranca(idade, (c as any).funcao_automacao);
            if (t) safety_timers.push({ canal: (c as any).canal_numero, ...t });
          }
        }
      }

      return json({
        device: { id: device.id, nome: device.nome, galpao_id: device.galpao_id },
        canais: canais || [],
        intervalo_telemetria_seg: 60,
        safety_timers,
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
        .select("id, nome, auth_token")
        .eq("device_id_ewelink", body.deviceId)
        .eq("ativo", true)
        .maybeSingle();

      if (!device) {
        return json({ message: "Dispositivo não registrado, ignorando" }, 200);
      }

      // Validação simples de token (opcional, recomendado em produção)
      if (device.auth_token) {
        const provided = req.headers.get("x-device-token");
        if (provided !== device.auth_token) {
          return json({ error: "Token inválido" }, 401);
        }
      }

      // 1. Persistir leitura ambiental (compartilha tabela com Sonoff)
      if (body.temperature !== undefined || body.humidity !== undefined) {
        await supabase.from("leituras_sensores").insert({
          dispositivo_id: device.id,
          temperatura_c: body.temperature ?? null,
          umidade_pct: body.humidity ?? null,
          online: body.online ?? true,
          raw_data: body.raw ?? body,
        });
      }

      // 2. Atualizar estado de cada canal
      if (body.channels && body.channels.length > 0) {
        await Promise.all(
          body.channels.map((ch) =>
            supabase
              .from("canais_dispositivo")
              .update({
                estado_atual: ch.estado,
                ultimo_comando_em: new Date().toISOString(),
              })
              .eq("dispositivo_id", device.id)
              .eq("canal_numero", ch.canal),
          ),
        );
      }

      // 3. Marcar último sync no dispositivo
      await supabase
        .from("dispositivos_iot")
        .update({ ultimo_sync: new Date().toISOString() })
        .eq("id", device.id);

      return json({ ok: true, device: device.nome });
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
