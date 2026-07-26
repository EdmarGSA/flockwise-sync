// brain-dispatcher — executa comandos aprovados/auto do Climate Brain
// Lê comando_brain elegíveis, valida travas (drift, cooldown, online), atua
// via esp32-bridge ou eWeLink (sync-sensors), e atualiza o status.
//
// Roda via cron a cada 15s. Também pode ser invocado on-demand pela UI
// quando o usuário aprova uma sugestão.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function chamarEsp32(canalId: string, acao: "ligar" | "desligar") {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/esp32-bridge/command`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ canalId, acao }),
  });
  if (!r.ok) throw new Error(`esp32-bridge ${r.status}: ${await r.text()}`);
  return r.json();
}

async function chamarEwelink(
  integradoId: string,
  deviceIdEwelink: string,
  canalNumero: number,
  numCanais: number,
  acao: "ligar" | "desligar",
) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-sensors`;
  const body: Record<string, unknown> = {
    action: "control-device",
    integrado_id: integradoId,
    device_id: deviceIdEwelink,
    switch: acao === "ligar" ? "on" : "off",
  };
  // Multi-canal: eWeLink usa outlet 0-indexed
  if (numCanais > 1) body.outlet = Math.max(0, (canalNumero ?? 1) - 1);
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`sync-sensors ${r.status}: ${await r.text()}`);
  return r.json();
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Feature flag: smart_commands (não reenvia comando cujo estado já é o vigente)
  let smartCommands = false;
  try {
    const { data: flag } = await supabase
      .from("feature_flags_sistema")
      .select("ativo")
      .eq("chave", "smart_commands")
      .maybeSingle();
    smartCommands = flag?.ativo === true;
  } catch (_e) { /* off por padrão */ }

  // 1) Comandos elegíveis:
  //    - status=aprovado (sempre executa)
  //    - status=sugerido AND galpao.automacao_brain='auto'
  const { data: aprovados } = await supabase
    .from("comando_brain")
    .select("*")
    .in("status", ["aprovado"])
    .order("created_at", { ascending: true })
    .limit(50);

  const { data: sugeridos } = await supabase
    .from("comando_brain")
    .select("*, galpoes!inner(automacao_brain)")
    .eq("status", "sugerido")
    .eq("galpoes.automacao_brain", "auto")
    .order("created_at", { ascending: true })
    .limit(50);

  const pendentes = [...(aprovados ?? []), ...(sugeridos ?? [])];
  const resultados: any[] = [];
  let ignorados = 0;

  for (const cmd of pendentes) {
    try {
      // Resolver canal (se vier null, pega canal ativo do galpão pela função)
      let canalId = cmd.canal_id;
      let canal: any = null;

      const CANAL_COLS = "id, dispositivo_id, canal_numero, cooldown_seg, ultimo_comando_em, ultimo_estado_persistido, ultimo_estado_persistido_em, canal_redundante_id, dispositivos_iot!inner(driver, ultimo_sync, ativo, galpao_id, device_id_ewelink, num_canais)";

      if (canalId) {
        const { data, error } = await supabase
          .from("canais_dispositivo")
          .select(CANAL_COLS)

          .eq("id", canalId)
          .maybeSingle();
        if (error) console.error("[brain-dispatcher] erro select canal por id", canalId, error);
        canal = data;
      } else {
        const { data, error } = await supabase
          .from("canais_dispositivo")
          .select("id, dispositivo_id, canal_numero, cooldown_seg, ultimo_comando_em, canal_redundante_id, dispositivos_iot!inner(driver, ultimo_sync, ativo, galpao_id, device_id_ewelink, num_canais)")
          .eq("integrado_id", cmd.integrado_id)
          .eq("funcao_automacao", cmd.funcao)
          .eq("automacao_ativa", true)
          .eq("ativo", true)
          .eq("dispositivos_iot.galpao_id", cmd.galpao_id)
          .limit(1)
          .maybeSingle();
        if (error) console.error("[brain-dispatcher] erro select canal por funcao", cmd.funcao, error);
        canal = data;
        if (canal) canalId = canal.id;
      }

      if (!canal) {
        console.warn("[brain-dispatcher] canal não encontrado", { cmd_id: cmd.id, canal_id: cmd.canal_id, funcao: cmd.funcao, galpao_id: cmd.galpao_id });
        await supabase.from("comando_brain").update({
          status: "falhou", erro: "Canal não encontrado para função",
        }).eq("id", cmd.id);
        resultados.push({ id: cmd.id, skip: "sem_canal" });
        continue;
      }

      // Trava: cooldown
      if (canal.ultimo_comando_em) {
        const ageSec = (Date.now() - new Date(canal.ultimo_comando_em).getTime()) / 1000;
        if (ageSec < (canal.cooldown_seg ?? 90)) {
          resultados.push({ id: cmd.id, skip: `cooldown_${Math.round((canal.cooldown_seg ?? 90) - ageSec)}s` });
          continue;
        }
      }

      const dev = canal.dispositivos_iot;
      // Online derivado de ultimo_sync (heartbeat ≤ 10 min). Sem coluna `online` na tabela.
      const ultimoSyncMs = dev?.ultimo_sync ? new Date(dev.ultimo_sync).getTime() : 0;
      const isOnline = !!dev?.ativo && ultimoSyncMs > 0 && (Date.now() - ultimoSyncMs) < 10 * 60_000;
      // Trava: dispositivo offline → tentar redundância
      if (!isOnline) {
        console.warn("[brain-dispatcher] dispositivo offline", { cmd_id: cmd.id, ultimo_sync: dev?.ultimo_sync });
        if (canal.canal_redundante_id) {
          await supabase.from("comando_brain").update({
            canal_id: canal.canal_redundante_id,
            motivo: (cmd.motivo ?? "") + " [fallback redundante]",
          }).eq("id", cmd.id);
          resultados.push({ id: cmd.id, retry: "fallback_redundante" });
          continue;
        }
        await supabase.from("comando_brain").update({
          status: "falhou", erro: "Dispositivo offline",
        }).eq("id", cmd.id);
        await supabase.rpc("dispatch_notificacao", {
          p_codigo: "brain_atuador_offline",
          p_integrado_id: cmd.integrado_id,
          p_titulo: `Atuador offline: ${cmd.funcao}`,
          p_mensagem: `Brain tentou comandar ${cmd.funcao} no galpão mas o dispositivo está offline.`,
          p_severidade: "critical",
        });
        resultados.push({ id: cmd.id, skip: "offline" });
        continue;
      }

      // Despachar
      const acao = (cmd.estado_desejado?.acao ?? cmd.estado_desejado?.estado ?? "desligar") as "ligar" | "desligar";
      let driverRes: any;
      if (dev.driver === "esp32_http") {
        driverRes = await chamarEsp32(canalId, acao);
      } else {
        driverRes = await chamarEwelink(
          cmd.integrado_id,
          dev.device_id_ewelink,
          canal.canal_numero,
          dev.num_canais ?? 1,
          acao,
        );
      }

      // Registra envio + estado e cooldown no canal
      const nowIso = new Date().toISOString();
      await supabase.from("comando_brain").update({
        status: "enviado",
        enviado_em: nowIso,
      }).eq("id", cmd.id);
      const estadoFinal = acao === "ligar" ? "on" : "off";
      const updateCanal: Record<string, unknown> = {
        estado_atual: estadoFinal,
        ultimo_comando_em: nowIso,
      };
      // eWeLink confirma o comando de forma síncrona — sucesso da chamada já é ACK.
      // ESP32 envia ACK real via /esp32-bridge/telemetry, então não preenchemos aqui.
      if (dev.driver !== "esp32_http") {
        updateCanal.ultimo_estado_persistido = estadoFinal;
        updateCanal.ultimo_estado_persistido_em = nowIso;
      }
      await supabase.from("canais_dispositivo").update(updateCanal).eq("id", canalId);

      resultados.push({ id: cmd.id, ok: true, driver: dev.driver, res: driverRes });

    } catch (e: any) {
      await supabase.from("comando_brain").update({
        status: "falhou", erro: e?.message ?? String(e),
      }).eq("id", cmd.id);
      resultados.push({ id: cmd.id, error: e?.message });
    }
  }

  // 2) Timeout de comandos enviados sem confirmação > 60s → falhou + alerta
  const { data: travados } = await supabase
    .from("comando_brain")
    .select("id, integrado_id, funcao")
    .eq("status", "enviado")
    .lt("enviado_em", new Date(Date.now() - 60_000).toISOString());

  for (const t of travados ?? []) {
    await supabase.from("comando_brain").update({
      status: "falhou", erro: "Sem confirmação de telemetria em 60s",
    }).eq("id", t.id);
    await supabase.rpc("dispatch_notificacao", {
      p_codigo: "brain_comando_falhou",
      p_integrado_id: t.integrado_id,
      p_titulo: `Comando ${t.funcao} não confirmado`,
      p_mensagem: `O dispositivo recebeu o comando mas não confirmou a execução em 60s.`,
      p_severidade: "warning",
    });
  }

  return json({ ok: true, processados: resultados.length, resultados, timeouts: travados?.length ?? 0 });
});
