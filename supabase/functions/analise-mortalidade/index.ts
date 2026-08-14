import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Temperature ranges by age (days)
function faixaTemperaturaIdeal(idadeDias: number): { min: number; max: number } {
  if (idadeDias <= 3) return { min: 32, max: 34 };
  if (idadeDias <= 7) return { min: 30, max: 32 };
  if (idadeDias <= 14) return { min: 28, max: 30 };
  if (idadeDias <= 21) return { min: 26, max: 28 };
  if (idadeDias <= 28) return { min: 24, max: 26 };
  return { min: 20, max: 26 };
}

function classificarIndicador(valor: number, okMax: number, alertaMax: number): "ok" | "atencao" | "critico" {
  if (valor <= okMax) return "ok";
  if (valor <= alertaMax) return "atencao";
  return "critico";
}

function calcTendencia(registros: { data_registro: string; total: number }[]): "estavel" | "subindo" | "descendo" {
  if (registros.length < 2) return "estavel";
  const sorted = [...registros].sort((a, b) => a.data_registro.localeCompare(b.data_registro));
  const mid = Math.floor(sorted.length / 2);
  const primeiraMet = sorted.slice(0, mid).reduce((s, r) => s + r.total, 0) / mid;
  const segundaMet = sorted.slice(mid).reduce((s, r) => s + r.total, 0) / (sorted.length - mid);
  const ratio = segundaMet / (primeiraMet || 1);
  if (ratio > 1.3) return "subindo";
  if (ratio < 0.7) return "descendo";
  return "estavel";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Exige usuário autenticado (a função roda com verify_jwt = false)
  const auth = await authenticate(req);
  if (!auth) return unauthorized(corsHeaders);

  try {

    const { mortalidade_id, lote_id } = await req.json();
    if (!mortalidade_id || !lote_id) {
      return new Response(JSON.stringify({ error: "mortalidade_id e lote_id obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch mortalidade + items
    const { data: mortalidade } = await supabase
      .from("mortalidade")
      .select("*, mortalidade_itens(*)")
      .eq("id", mortalidade_id)
      .single();

    if (!mortalidade) {
      return new Response(JSON.stringify({ error: "Mortalidade não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch lote
    const { data: lote } = await supabase
      .from("lotes")
      .select("*, galpoes(nome), nucleos(nome)")
      .eq("id", lote_id)
      .single();

    if (!lote) {
      return new Response(JSON.stringify({ error: "Lote não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataAloj = new Date(lote.data_alojamento);
    const dataReg = new Date(mortalidade.data_registro);
    const idadeDias = Math.max(1, Math.round((dataReg.getTime() - dataAloj.getTime()) / 86400000));

    // 3. Fetch desempenho_aves reference (closest day)
    const { data: desempenhoRef } = await supabase
      .from("desempenho_aves")
      .select("dia, peso_kg, ganho_medio_diario_kg, consumo_diario_racao_kg, conversao_alimentar_acumulada")
      .eq("linhagem", lote.linhagem || "cobb_500")
      .eq("sexo", lote.sexo || "misto")
      .gte("dia", Math.max(1, idadeDias - 2))
      .lte("dia", idadeDias + 2)
      .order("dia", { ascending: true })
      .limit(5);

    const refDia = desempenhoRef?.reduce((best: any, d: any) =>
      !best || Math.abs(d.dia - idadeDias) < Math.abs(best.dia - idadeDias) ? d : best, null);

    // 4. Fetch last pesagens for GPD
    const { data: pesagens } = await supabase
      .from("pesagens")
      .select("data_pesagem, pesagem_itens(quantidade_aves, peso_bruto_kg, peso_tara_kg)")
      .eq("lote_id", lote_id)
      .order("data_pesagem", { ascending: false })
      .limit(5);

    let pesoMedioReal = 0;
    let gpdReal = 0;
    if (pesagens && pesagens.length > 0) {
      const calcPeso = (p: any) => {
        const items = p.pesagem_itens || [];
        if (!items.length) return 0;
        const totalPeso = items.reduce((s: number, i: any) => s + (i.peso_bruto_kg - i.peso_tara_kg), 0);
        const totalAves = items.reduce((s: number, i: any) => s + i.quantidade_aves, 0);
        return totalAves > 0 ? totalPeso / totalAves : 0;
      };
      pesoMedioReal = calcPeso(pesagens[0]);
      if (pesagens.length >= 2) {
        const pesoAnterior = calcPeso(pesagens[1]);
        const diasDiff = Math.max(1, Math.round(
          (new Date(pesagens[0].data_pesagem).getTime() - new Date(pesagens[1].data_pesagem).getTime()) / 86400000
        ));
        gpdReal = (pesoMedioReal - pesoAnterior) / diasDiff;
      }
    }

    // 5. Fetch mortalidade_media reference
    const { data: mortMedia } = await supabase
      .from("mortalidade_media")
      .select("*")
      .eq("integrado_id", lote.integrado_id)
      .eq("linhagem", lote.linhagem || "cobb_500")
      .eq("sexo", lote.sexo || "misto")
      .limit(1)
      .maybeSingle();

    // 6. Fetch all mortality for this lote (for accumulated + trend)
    const { data: histMort } = await supabase
      .from("mortalidade")
      .select("data_registro, mortalidade_itens(quantidade, motivo)")
      .eq("lote_id", lote_id)
      .order("data_registro", { ascending: true });

    let totalMortAcum = 0;
    let totalEliminados = 0;
    let totalNatural = 0;
    const registrosTrend: { data_registro: string; total: number }[] = [];

    (histMort || []).forEach((m: any) => {
      let totalReg = 0;
      (m.mortalidade_itens || []).forEach((i: any) => {
        totalReg += i.quantidade || 0;
        if (i.motivo === "eliminado") totalEliminados += i.quantidade || 0;
        else totalNatural += i.quantidade || 0;
      });
      totalMortAcum += totalReg;
      registrosTrend.push({ data_registro: m.data_registro, total: totalReg });
    });

    const mortPercentual = lote.quantidade_aves > 0 ? (totalMortAcum / lote.quantidade_aves) * 100 : 0;

    // 7. IoT sensor data — fetch 3-day history instead of just latest
    let tempAtual: number | null = mortalidade.temperatura_c;
    let umidAtual: number | null = mortalidade.umidade_pct;
    let diasForaFaixa = 0;
    let amplitudeTermica = 0;
    let tempMedia3d: number | null = null;

    if (lote.galpao_id) {
      const { data: devices } = await supabase
        .from("dispositivos_iot")
        .select("id")
        .eq("galpao_id", lote.galpao_id)
        .eq("ativo", true);

      if (devices && devices.length > 0) {
        const deviceIds = devices.map((d: any) => d.id);
        const threeDaysAgo = new Date(dataReg);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data: leituras3d } = await supabase
          .from("leituras_sensores")
          .select("temperatura_c, umidade_pct, created_at")
          .in("dispositivo_id", deviceIds)
          .gte("created_at", threeDaysAgo.toISOString())
          .lte("created_at", dataReg.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        if (leituras3d && leituras3d.length > 0) {
          // Set current temp/humidity from latest reading if not already set
          if (!tempAtual) tempAtual = leituras3d[0].temperatura_c;
          if (!umidAtual) umidAtual = leituras3d[0].umidade_pct;

          // Calculate 3-day stats
          const temps = leituras3d.filter((l: any) => l.temperatura_c != null).map((l: any) => Number(l.temperatura_c));
          if (temps.length > 0) {
            tempMedia3d = temps.reduce((s: number, t: number) => s + t, 0) / temps.length;
            amplitudeTermica = Math.max(...temps) - Math.min(...temps);
          }

          // Group by day and check against ideal range
          const byDay: Record<string, number[]> = {};
          leituras3d.forEach((l: any) => {
            if (l.temperatura_c == null) return;
            const dateStr = l.created_at.substring(0, 10);
            if (!byDay[dateStr]) byDay[dateStr] = [];
            byDay[dateStr].push(Number(l.temperatura_c));
          });

          // Fetch regras for this integrado
          const { data: regras } = await supabase
            .from("regras_temperatura_lote")
            .select("dia_inicio, dia_fim, temp_min_c, temp_max_c")
            .eq("integrado_id", lote.integrado_id)
            .eq("ativo", true)
            .order("dia_inicio");

          const alojDate = new Date(lote.data_alojamento);
          Object.entries(byDay).forEach(([dateStr, dayTemps]) => {
            const currentDate = new Date(dateStr + "T00:00:00");
            const dia = Math.max(1, Math.round((currentDate.getTime() - alojDate.getTime()) / 86400000));
            const regra = (regras || []).find((r: any) => dia >= Number(r.dia_inicio) && dia <= Number(r.dia_fim));
            const faixa = regra
              ? { min: Number(regra.temp_min_c), max: Number(regra.temp_max_c) }
              : faixaTemperaturaIdeal(dia);
            const minT = Math.min(...dayTemps);
            const maxT = Math.max(...dayTemps);
            if (minT < faixa.min || maxT > faixa.max) diasForaFaixa++;
          });
        }
      }
    }

    // 7b. Compare peso_kg from mortality item vs lote average
    let pesoMortVsLote: { pesoMort: number; pesoLote: number; desvio: number } | null = null;
    const itensComPeso = (mortalidade.mortalidade_itens || []).filter((i: any) => i.peso_kg && i.peso_kg > 0);
    if (itensComPeso.length > 0 && pesoMedioReal > 0) {
      const pesoMortMedio = itensComPeso.reduce((s: number, i: any) => s + i.peso_kg * (i.quantidade || 1), 0) /
        itensComPeso.reduce((s: number, i: any) => s + (i.quantidade || 1), 0);
      const pesoMortG = pesoMortMedio * 1000; // kg to g
      const desvio = ((pesoMortG - pesoMedioReal) / pesoMedioReal) * 100;
      pesoMortVsLote = { pesoMort: pesoMortG, pesoLote: pesoMedioReal, desvio };
    }

    // ========== DETERMINISTIC ANALYSIS ==========
    const alertas: string[] = [];
    const causas: string[] = [];
    const sugestoes: string[] = [];
    let pontuacaoRisco = 0; // 0-10

    // A) Weight comparison
    const pesoEsperado = refDia?.peso_kg || 0;
    let pesoStatus = "sem_dados";
    if (pesoMedioReal > 0 && pesoEsperado > 0) {
      const ratioPeso = pesoMedioReal / pesoEsperado;
      if (ratioPeso >= 0.95) {
        pesoStatus = "ok";
      } else if (ratioPeso >= 0.80) {
        pesoStatus = "atencao";
        pontuacaoRisco += 2;
        alertas.push(`Peso ${((1 - ratioPeso) * 100).toFixed(1)}% abaixo do esperado (${(pesoMedioReal).toFixed(0)}g vs ${pesoEsperado.toFixed(0)}g ref.)`);
        sugestoes.push("Revisar qualidade e quantidade da ração fornecida");
      } else {
        pesoStatus = "critico";
        pontuacaoRisco += 4;
        causas.push("Peso significativamente abaixo do padrão da linhagem — possível problema nutricional ou sanitário");
        sugestoes.push("Avaliar formulação de ração e verificar presença de doenças subclínicas");
        sugestoes.push("Realizar exame laboratorial de amostras de ração");
      }
    }

    // B) GPD comparison
    const gpdRef = refDia?.ganho_medio_diario_kg || 0;
    if (gpdReal > 0 && gpdRef > 0) {
      const ratioGpd = gpdReal / gpdRef;
      if (ratioGpd < 0.80) {
        pontuacaoRisco += 2;
        alertas.push(`GPD real ${gpdReal.toFixed(1)}g/dia vs ${gpdRef.toFixed(1)}g/dia esperado`);
        causas.push("Ganho de peso diário abaixo do esperado");
      }
    }

    // C) Mortality vs reference
    let mortEsperada = 0;
    if (mortMedia) {
      if (idadeDias <= 7) mortEsperada = mortMedia.mortalidade_7_dias || 0;
      else if (idadeDias <= 14) mortEsperada = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0);
      else if (idadeDias <= 21) mortEsperada = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0);
      else if (idadeDias <= 28) mortEsperada = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0) + (mortMedia.mortalidade_28_dias || 0);
      else if (idadeDias <= 35) mortEsperada = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0) + (mortMedia.mortalidade_28_dias || 0) + (mortMedia.mortalidade_35_dias || 0);
      else mortEsperada = (mortMedia.mortalidade_7_dias || 0) + (mortMedia.mortalidade_14_dias || 0) + (mortMedia.mortalidade_21_dias || 0) + (mortMedia.mortalidade_28_dias || 0) + (mortMedia.mortalidade_35_dias || 0) + (mortMedia.mortalidade_42_dias || 0);
    }

    if (mortEsperada > 0) {
      const ratioMort = mortPercentual / mortEsperada;
      if (ratioMort > 1.5) {
        pontuacaoRisco += 3;
        causas.push(`Mortalidade acumulada ${mortPercentual.toFixed(2)}% está ${((ratioMort - 1) * 100).toFixed(0)}% acima da referência (${mortEsperada.toFixed(2)}%)`);
        sugestoes.push("Investigar causas sanitárias — considerar necropsia e exames laboratoriais");
      } else if (ratioMort > 1.0) {
        pontuacaoRisco += 1;
        alertas.push(`Mortalidade acumulada ${mortPercentual.toFixed(2)}% levemente acima da referência (${mortEsperada.toFixed(2)}%)`);
      }
    }

    // D) Temperature
    if (tempAtual != null) {
      const faixa = faixaTemperaturaIdeal(idadeDias);
      if (tempAtual > faixa.max + 5) {
        pontuacaoRisco += 3;
        causas.push(`Temperatura ${tempAtual}°C muito acima da faixa ideal (${faixa.min}-${faixa.max}°C) — estresse térmico por calor`);
        sugestoes.push("Ativar ventiladores e nebulizadores; verificar sistema de resfriamento");
      } else if (tempAtual > faixa.max) {
        pontuacaoRisco += 1;
        alertas.push(`Temperatura ${tempAtual}°C acima da faixa ideal (${faixa.min}-${faixa.max}°C)`);
        sugestoes.push("Monitorar temperatura e ajustar ventilação");
      } else if (tempAtual < faixa.min - 5) {
        pontuacaoRisco += 3;
        causas.push(`Temperatura ${tempAtual}°C muito abaixo da faixa ideal (${faixa.min}-${faixa.max}°C) — hipotermia`);
        sugestoes.push("Verificar sistema de aquecimento; ajustar campânulas/fornalhas");
      } else if (tempAtual < faixa.min) {
        pontuacaoRisco += 1;
        alertas.push(`Temperatura ${tempAtual}°C abaixo da faixa ideal (${faixa.min}-${faixa.max}°C)`);
        sugestoes.push("Aumentar aquecimento no galpão");
      }
    }

    // E-bis) Environmental history (3-day window)
    if (diasForaFaixa > 0) {
      if (diasForaFaixa >= 3) {
        pontuacaoRisco += 3;
        causas.push(`Ambiente esteve fora da faixa em ${diasForaFaixa} dos últimos 3 dias — estresse ambiental persistente`);
        sugestoes.push("Revisão urgente do sistema de climatização. Verificar automação de ventiladores e aquecedores.");
      } else {
        pontuacaoRisco += 1;
        alertas.push(`Temperatura fora da faixa em ${diasForaFaixa} dos últimos 3 dias`);
        sugestoes.push("Monitorar condições ambientais mais frequentemente");
      }
    }

    if (amplitudeTermica > 8) {
      pontuacaoRisco += 1;
      alertas.push(`Amplitude térmica de ${amplitudeTermica.toFixed(1)}°C nos últimos 3 dias — pode causar estresse`);
    }

    // E-ter) Peso mortalidade vs lote
    if (pesoMortVsLote) {
      if (pesoMortVsLote.desvio < -20) {
        pontuacaoRisco += 2;
        causas.push(`Peso das aves mortas (${(pesoMortVsLote.pesoMort).toFixed(0)}g) é ${Math.abs(pesoMortVsLote.desvio).toFixed(1)}% menor que o peso médio do lote (${pesoMortVsLote.pesoLote.toFixed(0)}g) — mortalidade seletiva em aves menores`);
        sugestoes.push("Avaliar uniformidade do lote. Aves menores podem ter dificuldade de acesso a comedouros/bebedouros.");
      } else if (pesoMortVsLote.desvio > 20) {
        pontuacaoRisco += 1;
        alertas.push(`Peso das aves mortas ${pesoMortVsLote.desvio.toFixed(1)}% maior que a média do lote — aves maiores morrendo`);
        sugestoes.push("Investigar síndrome de morte súbita ou problemas cardiovasculares em aves de maior peso.");
      }
    }

    // E) Humidity
    if (umidAtual != null) {
      if (umidAtual > 80) {
        pontuacaoRisco += 1;
        alertas.push(`Umidade ${umidAtual}% acima do ideal (máx 70%)`);
        sugestoes.push("Melhorar ventilação para reduzir umidade da cama");
      } else if (umidAtual < 40) {
        alertas.push(`Umidade ${umidAtual}% abaixo do ideal (mín 40%)`);
      }
    }

    // F) Mortality trend
    const tendencia = calcTendencia(registrosTrend);
    if (tendencia === "subindo") {
      pontuacaoRisco += 2;
      causas.push("Tendência de mortalidade crescente nos últimos registros");
      sugestoes.push("Intensificar monitoramento diário e investigar mudanças recentes no manejo");
    }

    // G) Eliminados vs Natural ratio
    if (totalEliminados > 0 && totalNatural > 0 && totalEliminados > totalNatural * 1.5) {
      alertas.push("Proporção de eliminados muito maior que mortes naturais");
      causas.push("Padrão de descarte elevado — revisar critérios de seleção e manejo sanitário");
    }

    // Build classification
    let classificacao_risco: "baixo" | "moderado" | "alto" | "critico";
    if (pontuacaoRisco <= 1) classificacao_risco = "baixo";
    else if (pontuacaoRisco <= 4) classificacao_risco = "moderado";
    else if (pontuacaoRisco <= 7) classificacao_risco = "alto";
    else classificacao_risco = "critico";

    // Default messages if nothing flagged
    if (causas.length === 0 && alertas.length === 0) {
      causas.push("Nenhuma anomalia significativa identificada com os dados disponíveis");
    }
    if (sugestoes.length === 0) {
      sugestoes.push("Manter monitoramento padrão de manejo");
      sugestoes.push("Continuar pesagens regulares para acompanhar desempenho");
    }

    // Build summary
    const partes: string[] = [];
    partes.push(`Lote com ${idadeDias} dias de idade (${lote.linhagem || "N/I"}, ${lote.sexo || "N/I"}).`);
    partes.push(`Mortalidade acumulada: ${totalMortAcum} aves (${mortPercentual.toFixed(2)}%).`);
    if (pesoMedioReal > 0) partes.push(`Peso médio atual: ${pesoMedioReal.toFixed(0)}g${pesoEsperado > 0 ? ` (ref: ${pesoEsperado.toFixed(0)}g)` : ""}.`);
    if (tendencia !== "estavel") partes.push(`Tendência de mortalidade: ${tendencia}.`);
    if (diasForaFaixa > 0) partes.push(`Ambiente fora da faixa em ${diasForaFaixa}/3 dias.`);
    if (amplitudeTermica > 5) partes.push(`Amplitude térmica: ${amplitudeTermica.toFixed(1)}°C.`);
    if (pesoMortVsLote) partes.push(`Peso mortalidade ${pesoMortVsLote.desvio > 0 ? '+' : ''}${pesoMortVsLote.desvio.toFixed(1)}% vs lote.`);

    // GPD evaluation
    let gpd_avaliacao: string | undefined;
    if (gpdReal > 0) {
      gpd_avaliacao = `GPD real: ${gpdReal.toFixed(1)}g/dia`;
      if (gpdRef > 0) gpd_avaliacao += ` | Referência: ${gpdRef.toFixed(1)}g/dia (${((gpdReal / gpdRef) * 100).toFixed(0)}%)`;
    }

    const analise = {
      resumo: partes.join(" "),
      causas_provaveis: [...causas, ...alertas],
      classificacao_risco,
      sugestoes_acao: sugestoes,
      gpd_avaliacao,
    };

    // Save to DB
    await supabase
      .from("mortalidade")
      .update({ analise_ia: analise })
      .eq("id", mortalidade_id);

    return new Response(JSON.stringify({ analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analise-mortalidade error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
