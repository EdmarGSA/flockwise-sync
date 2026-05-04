// weather-alertas: avalia previsões de cada lote ativo, aplica conforto por idade
// e inércia térmica do galpão para gerar alertas com horário de ação recomendado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const idadeDias = (dataAlojamento: string) =>
  Math.max(1, Math.floor((Date.now() - new Date(dataAlojamento).getTime()) / 86400000) + 1);

interface Conforto {
  temp_min_critico: number; temp_max_critico: number;
  ith_max_critico: number; ith_max_ok: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const log: any[] = [];
  let alertasGerados = 0;

  try {
    // 1) Lotes ativos com galpão e núcleo
    const { data: lotes } = await supabase
      .from("lotes")
      .select(`
        id, integrado_id, data_alojamento, galpao_id,
        galpoes!inner(id, nome, nucleo_id, tipo_pressao, inercia_termica_min,
          nucleos!inner(id, tipo_producao, weather_ativo))
      `)
      .eq("status", "alojado")
      .not("data_alojamento", "is", null);

    if (!lotes?.length) {
      return new Response(JSON.stringify({ ok: true, alertas: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Confortos por tipo_producao (cache)
    const { data: confortos } = await supabase.from("conforto_termico_ave").select("*");
    const getConforto = (tp: string, idade: number): Conforto | null => {
      const row = confortos?.find(c => c.tipo_producao === tp && idade >= c.idade_dia_inicio && idade <= c.idade_dia_fim);
      return row ?? null;
    };

    // 3) Para cada lote, busca previsão 24h do núcleo
    const agora = Date.now();
    const limite24h = agora + 24 * 3600 * 1000;

    for (const lote of lotes as any[]) {
      const galpao = lote.galpoes;
      const nucleo = galpao?.nucleos;
      if (!nucleo?.weather_ativo) continue;

      const idade = idadeDias(lote.data_alojamento);
      const conforto = getConforto(nucleo.tipo_producao, idade);
      if (!conforto) continue;

      const { data: forecast } = await supabase
        .from("weather_forecast_horario")
        .select("hora_prevista, temperatura_c, umidade_pct, vento_kmh, ith")
        .eq("nucleo_id", nucleo.id)
        .gte("hora_prevista", new Date(agora).toISOString())
        .lte("hora_prevista", new Date(limite24h).toISOString())
        .order("hora_prevista", { ascending: true });

      if (!forecast?.length) continue;

      const inercia = (galpao.inercia_termica_min ?? 90) + (idade < 14 ? 30 : 0);

      // Detecta o primeiro pico de cada categoria
      const picoCalor = forecast.find(f => Number(f.temperatura_c) >= conforto.temp_max_critico);
      const picoFrio = forecast.find(f => Number(f.temperatura_c) <= conforto.temp_min_critico);
      const picoITH = forecast.find(f => Number(f.ith ?? 0) >= conforto.ith_max_critico);
      const picoVento = forecast.find(f => Number(f.vento_kmh ?? 0) >= 50);

      const inserts: any[] = [];
      const acaoStr = (evento: Date) => {
        const acao = new Date(evento.getTime() - inercia * 60000);
        const hh = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        return { acao, hhEvento: hh(evento), hhAcao: hh(acao) };
      };

      if (picoCalor) {
        const evt = new Date(picoCalor.hora_prevista);
        const { acao, hhEvento, hhAcao } = acaoStr(evt);
        inserts.push({
          integrado_id: lote.integrado_id, nucleo_id: nucleo.id, lote_id: lote.id, galpao_id: galpao.id,
          tipo: "clima_calor_critico", severidade: "critical",
          titulo: `Onda de calor: ${picoCalor.temperatura_c}°C às ${hhEvento}`,
          mensagem: `${galpao.nome}: pico previsto de ${picoCalor.temperatura_c}°C às ${hhEvento}. Inicie resfriamento preventivo às ${hhAcao} (${inercia} min antes).`,
          horario_evento: evt.toISOString(), horario_acao: acao.toISOString(),
          contexto: { idade_dias: idade, inercia_min: inercia, ur: picoCalor.umidade_pct },
        });
      }
      if (picoFrio) {
        const evt = new Date(picoFrio.hora_prevista);
        const { acao, hhEvento, hhAcao } = acaoStr(evt);
        inserts.push({
          integrado_id: lote.integrado_id, nucleo_id: nucleo.id, lote_id: lote.id, galpao_id: galpao.id,
          tipo: "clima_frio_critico", severidade: "critical",
          titulo: `Onda de frio: ${picoFrio.temperatura_c}°C às ${hhEvento}`,
          mensagem: `${galpao.nome}: temperatura mínima prevista de ${picoFrio.temperatura_c}°C às ${hhEvento}. Aqueça o galpão a partir de ${hhAcao}.`,
          horario_evento: evt.toISOString(), horario_acao: acao.toISOString(),
          contexto: { idade_dias: idade, inercia_min: inercia },
        });
      }
      if (picoITH && (!picoCalor || picoITH.hora_prevista !== picoCalor.hora_prevista)) {
        const evt = new Date(picoITH.hora_prevista);
        const { acao, hhEvento, hhAcao } = acaoStr(evt);
        inserts.push({
          integrado_id: lote.integrado_id, nucleo_id: nucleo.id, lote_id: lote.id, galpao_id: galpao.id,
          tipo: "clima_ith_alto", severidade: "warning",
          titulo: `ITH ${picoITH.ith} previsto às ${hhEvento}`,
          mensagem: `${galpao.nome}: ITH de ${picoITH.ith} (${picoITH.temperatura_c}°C / ${picoITH.umidade_pct}% UR) às ${hhEvento}. Aumente ventilação a partir de ${hhAcao}.`,
          horario_evento: evt.toISOString(), horario_acao: acao.toISOString(),
          contexto: { idade_dias: idade },
        });
      }
      if (picoVento) {
        const evt = new Date(picoVento.hora_prevista);
        inserts.push({
          integrado_id: lote.integrado_id, nucleo_id: nucleo.id, lote_id: lote.id, galpao_id: galpao.id,
          tipo: "clima_vento_forte", severidade: "warning",
          titulo: `Vento forte: ${picoVento.vento_kmh} km/h`,
          mensagem: `${galpao.nome}: rajadas de ${picoVento.vento_kmh} km/h previstas às ${evt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}. Verifique cortinas e estruturas.`,
          horario_evento: evt.toISOString(), horario_acao: evt.toISOString(),
          contexto: {},
        });
      }

      for (const ins of inserts) {
        const { error } = await supabase.from("alertas_climaticos").insert(ins);
        if (!error) {
          alertasGerados++;
          await supabase.rpc("dispatch_notificacao", {
            p_codigo: ins.tipo, p_integrado_id: ins.integrado_id,
            p_titulo: ins.titulo, p_mensagem: ins.mensagem,
            p_contexto: ins.contexto, p_link: `/gestao-campo`,
            p_severidade: ins.severidade,
          }).catch(() => null);
        }
      }
      log.push({ lote: lote.id, gerados: inserts.length });
    }

    return new Response(JSON.stringify({ ok: true, alertas: alertasGerados, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("weather-alertas", err);
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
