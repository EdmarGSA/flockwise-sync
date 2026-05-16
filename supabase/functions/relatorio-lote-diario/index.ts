import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function faixaTempIdeal(idadeDias: number): { min: number; max: number } {
  if (idadeDias <= 3) return { min: 32, max: 34 };
  if (idadeDias <= 7) return { min: 30, max: 32 };
  if (idadeDias <= 14) return { min: 28, max: 30 };
  if (idadeDias <= 21) return { min: 26, max: 28 };
  if (idadeDias <= 28) return { min: 24, max: 26 };
  if (idadeDias <= 35) return { min: 22, max: 25 };
  return { min: 20, max: 24 };
}

function padraoLinhagem(linhagem: string, semana: number): { peso_kg: number; mort_acum_pct: number } | null {
  const TABS: Record<string, Array<[number, number, number]>> = {
    cobb: [[1,0.19,0.7],[2,0.5,1.2],[3,0.96,1.8],[4,1.56,2.4],[5,2.23,3.1],[6,2.93,3.8],[7,3.62,4.5]],
    ross: [[1,0.195,0.7],[2,0.51,1.2],[3,0.98,1.8],[4,1.58,2.4],[5,2.25,3.1],[6,2.95,3.8],[7,3.65,4.5]],
    hubbard: [[1,0.18,0.7],[2,0.48,1.2],[3,0.92,1.8],[4,1.5,2.4],[5,2.15,3.1],[6,2.83,3.8]],
    lohmann: [[1,0.07,0.5],[4,0.26,1.0],[8,0.62,1.5],[12,0.95,2.0],[16,1.25,2.5],[20,1.5,3.0],[30,1.75,4.0],[50,1.85,6.0]],
  };
  const k = (linhagem || '').toLowerCase();
  let tab = TABS.cobb;
  if (k.includes('ross')) tab = TABS.ross;
  else if (k.includes('hubbard')) tab = TABS.hubbard;
  else if (k.includes('lohmann') || k.includes('lsl') || k.includes('postura')) tab = TABS.lohmann;
  if (!tab.length) return null;
  let mp = tab[0];
  for (const p of tab) if (Math.abs(p[0] - semana) < Math.abs(mp[0] - semana)) mp = p;
  return { peso_kg: mp[1], mort_acum_pct: mp[2] };
}

async function buildDiario(supabase: any, loteId: string) {
  const { data: lote, error: errLote } = await supabase
    .from("lotes")
    .select("*, nucleo:nucleo_id(nome), galpao:galpao_id(nome)")
    .eq("id", loteId)
    .single();
  if (errLote || !lote) throw new Error("Lote não encontrado");
  if (!lote.data_alojamento) throw new Error("Lote sem data de alojamento");

  const dataAloj = new Date(lote.data_alojamento);
  const hoje = new Date();
  const totalDias = Math.min(60, Math.floor((+hoje - +dataAloj) / 86400000) + 1);
  const linhagem = lote.linhagem || lote.linhagem_postura || "";

  const inicioISO = dataAloj.toISOString();
  const fimISO = new Date(+hoje + 86400000).toISOString();

  // Buscas paralelas
  const [devsRes, leiturasRes, mortRes, pesRes, faixasRes, tratRes, autRes] = await Promise.all([
    supabase.from("dispositivos_iot").select("id,nome,tipo,galpao_id")
      .eq("integrado_id", lote.integrado_id).eq("galpao_id", lote.galpao_id),
    supabase.from("leituras_sensores").select("dispositivo_id,temperatura_c,umidade_pct,lido_em")
      .gte("lido_em", inicioISO).lt("lido_em", fimISO),
    supabase.from("mortalidade").select("id,data_registro,mortalidade_itens(motivo,quantidade)")
      .eq("lote_id", loteId).order("data_registro"),
    supabase.from("pesagens").select("id,data_pesagem,consumo_real_kg,conversao_alimentar,pesagem_itens(quantidade_aves,peso_bruto_g,peso_tara_g)")
      .eq("lote_id", loteId).order("data_pesagem"),
    lote.programa_iluminacao_id
      ? supabase.from("programa_iluminacao_faixa").select("dia_inicio,dia_fim,horas_luz,blocos")
          .eq("programa_id", lote.programa_iluminacao_id)
      : Promise.resolve({ data: [] }),
    supabase.from("tratamentos_lote").select("data_inicio,data_fim,data_liberacao_abate,carencia_dias,status,motivo")
      .eq("lote_id", loteId),
    supabase.from("autopsias").select("id,data_autopsia,diagnostico_presuntivo,causa_morte")
      .eq("lote_id", loteId),
  ]);

  const devices = devsRes.data || [];
  const devIds = new Set(devices.map((d: any) => d.id));

  // Agrupar leituras por dia
  const climaPorDia: Record<string, { min: number; max: number; med: number; n: number; umid_min: number; umid_max: number }> = {};
  for (const l of leiturasRes.data || []) {
    if (!devIds.has(l.dispositivo_id)) continue;
    const dia = new Date(l.lido_em).toISOString().slice(0, 10);
    const t = Number(l.temperatura_c);
    const u = Number(l.umidade_pct);
    if (!climaPorDia[dia]) climaPorDia[dia] = { min: Infinity, max: -Infinity, med: 0, n: 0, umid_min: Infinity, umid_max: -Infinity };
    const c = climaPorDia[dia];
    if (!Number.isNaN(t)) {
      if (t < c.min) c.min = t;
      if (t > c.max) c.max = t;
      c.med += t; c.n++;
    }
    if (!Number.isNaN(u)) {
      if (u < c.umid_min) c.umid_min = u;
      if (u > c.umid_max) c.umid_max = u;
    }
  }

  // Mortalidade por dia
  const mortPorDia: Record<string, { nat: number; elim: number }> = {};
  let mortAcum = 0;
  for (const m of mortRes.data || []) {
    const d = m.data_registro;
    if (!mortPorDia[d]) mortPorDia[d] = { nat: 0, elim: 0 };
    for (const it of m.mortalidade_itens || []) {
      if (it.motivo === 'natural') mortPorDia[d].nat += it.quantidade;
      else mortPorDia[d].elim += it.quantidade;
    }
  }

  // Pesagem por dia (média kg + CV)
  const pesoPorDia: Record<string, { peso_kg: number; cv_pct: number | null }> = {};
  for (const p of pesRes.data || []) {
    const itens = p.pesagem_itens || [];
    if (!itens.length) continue;
    const medias = itens.map((it: any) => (it.peso_bruto_g - it.peso_tara_g) / (it.quantidade_aves || 1) / 1000);
    const media = medias.reduce((a: number, b: number) => a + b, 0) / medias.length;
    let cv: number | null = null;
    if (medias.length > 1) {
      const variance = medias.reduce((s: number, x: number) => s + (x - media) ** 2, 0) / medias.length;
      cv = (Math.sqrt(variance) / media) * 100;
    }
    pesoPorDia[p.data_pesagem] = { peso_kg: media, cv_pct: cv };
  }

  // Iluminação por dia
  const faixas = faixasRes.data || [];
  function ilumDoDia(idade: number) {
    const f = faixas.find((x: any) => idade >= x.dia_inicio && idade <= x.dia_fim);
    if (!f) return { horas_luz: null, acender: null, apagar: null };
    const bloco = (f.blocos || [])[0] || {};
    return { horas_luz: f.horas_luz, acender: bloco.acender || null, apagar: bloco.apagar || null };
  }

  const dias = [];
  for (let i = 0; i < totalDias; i++) {
    const dt = new Date(+dataAloj + i * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    const idade = i + 1;
    const semana = Math.floor(i / 7) + 1;
    const clima = climaPorDia[iso];
    const mort = mortPorDia[iso] || { nat: 0, elim: 0 };
    const totalMort = mort.nat + mort.elim;
    mortAcum += totalMort;
    const faixa = faixaTempIdeal(idade);
    const peso = pesoPorDia[iso] || { peso_kg: null, cv_pct: null };
    const ilum = ilumDoDia(idade);
    const padrao = padraoLinhagem(linhagem, semana);
    const tempMed = clima && clima.n ? clima.med / clima.n : null;
    const foraDaFaixa = !!(clima && (clima.min < faixa.min || clima.max > faixa.max));
    const mortPctDia = (totalMort / lote.quantidade_aves) * 100;
    const mortPctAcum = (mortAcum / lote.quantidade_aves) * 100;
    const deltaPeso = peso.peso_kg && padrao ? ((peso.peso_kg - padrao.peso_kg) / padrao.peso_kg) * 100 : null;

    dias.push({
      data: iso, idade_dias: idade, semana,
      temp_min: clima?.min === Infinity ? null : clima?.min ?? null,
      temp_max: clima?.max === -Infinity ? null : clima?.max ?? null,
      temp_med: tempMed,
      umid_min: clima?.umid_min === Infinity ? null : clima?.umid_min ?? null,
      umid_max: clima?.umid_max === -Infinity ? null : clima?.umid_max ?? null,
      faixa_temp_min: faixa.min, faixa_temp_max: faixa.max,
      fora_da_faixa: foraDaFaixa,
      horas_luz: ilum.horas_luz, acender: ilum.acender, apagar: ilum.apagar,
      mortalidade_natural: mort.nat,
      mortalidade_eliminada: mort.elim,
      mortalidade_total: totalMort,
      mortalidade_pct_dia: mortPctDia,
      mortalidade_pct_acum: mortPctAcum,
      peso_medio_kg: peso.peso_kg,
      cv_pct: peso.cv_pct,
      padrao_peso_kg: padrao?.peso_kg ?? null,
      padrao_mort_acum_pct: padrao?.mort_acum_pct ?? null,
      delta_peso_pct: deltaPeso,
      sensor_disponivel: !!clima && clima.n > 0,
    });
  }

  // Gatilhos críticos
  const hojeRel = dias[dias.length - 1];
  const gatilhos: any[] = [];
  if (hojeRel && hojeRel.mortalidade_pct_dia > 0.5) {
    gatilhos.push({ codigo: 'mort_diaria_alta', severidade: 'critico',
      titulo: `Mortalidade diária acima do limite (${hojeRel.mortalidade_pct_dia.toFixed(2)}%)`,
      acao_sugerida: 'Coletar amostras para análise laboratorial. Revisar clima, água e ração das últimas 48h.' });
  }
  if (hojeRel?.padrao_mort_acum_pct && hojeRel.mortalidade_pct_acum > hojeRel.padrao_mort_acum_pct * 1.5) {
    gatilhos.push({ codigo: 'mort_acum_alta', severidade: 'alerta',
      titulo: 'Mortalidade acumulada acima da linhagem',
      acao_sugerida: 'Revisar histórico climático e programa sanitário.' });
  }
  let consec = 0, maxc = 0;
  for (const d of dias) { if (d.fora_da_faixa) { consec++; if (consec > maxc) maxc = consec; } else consec = 0; }
  if (maxc >= 3) {
    gatilhos.push({ codigo: 'temp_fora_faixa', severidade: 'alerta',
      titulo: `${maxc} dias consecutivos fora da faixa térmica`,
      acao_sugerida: 'Auditar ventilação, aquecimento e curva climática.' });
  }
  if (hojeRel?.peso_medio_kg && hojeRel.padrao_peso_kg && hojeRel.peso_medio_kg < hojeRel.padrao_peso_kg * 0.9) {
    gatilhos.push({ codigo: 'peso_abaixo_padrao', severidade: 'alerta',
      titulo: `Peso em ${((hojeRel.peso_medio_kg / hojeRel.padrao_peso_kg) * 100).toFixed(0)}% do padrão`,
      acao_sugerida: 'Auditar consumo de ração e bebedouros.' });
  }

  // Carência próxima
  if (lote.data_prevista_saida) {
    const saida = new Date(lote.data_prevista_saida);
    for (const t of tratRes.data || []) {
      if (!t.data_liberacao_abate) continue;
      const lib = new Date(t.data_liberacao_abate);
      const diff = Math.ceil((+saida - +lib) / 86400000);
      if (diff <= 2 && diff >= 0) {
        gatilhos.push({ codigo: 'carencia_proxima', severidade: 'critico',
          titulo: 'Medicação com carência próxima do abate',
          acao_sugerida: 'Confirmar liberação antes do abate. Bloquear envio se necessário.' });
        break;
      }
    }
  }

  const autInfecciosas = (autRes.data || []).filter((a: any) =>
    /infec|colibac|salmon|coriza|new ?castle|gumboro/i.test(a.diagnostico_presuntivo || a.causa_morte || '')).length;
  if (autInfecciosas > 0) {
    gatilhos.push({ codigo: 'autopsia_infecciosa', severidade: 'critico',
      titulo: `${autInfecciosas} autópsia(s) com achado infeccioso`,
      acao_sugerida: 'Notificar veterinário responsável.' });
  }

  return {
    lote: {
      id: lote.id, quantidade_aves: lote.quantidade_aves, linhagem,
      sexo: lote.sexo, data_alojamento: lote.data_alojamento,
      data_prevista_saida: lote.data_prevista_saida,
      nucleo: lote.nucleo?.nome, galpao: lote.galpao?.nome,
      status: lote.status,
    },
    devices,
    dias,
    gatilhos,
    tratamentos_ativos: (tratRes.data || []).filter((t: any) => t.status === 'ativo').length,
    autopsias_total: (autRes.data || []).length,
  };
}

async function chamarIA(diario: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "IA indisponível: chave não configurada.";

  // Resumo compactado para o prompt
  const dias = diario.dias;
  const hoje = dias[dias.length - 1];
  const inicio = dias[0];
  const semanas: Record<number, { mort: number; peso: number | null; temp_med: number | null; n_temp: number }> = {};
  for (const d of dias) {
    if (!semanas[d.semana]) semanas[d.semana] = { mort: 0, peso: null, temp_med: null, n_temp: 0 };
    semanas[d.semana].mort += d.mortalidade_total;
    if (d.peso_medio_kg) semanas[d.semana].peso = d.peso_medio_kg;
    if (d.temp_med != null) { semanas[d.semana].temp_med = (semanas[d.semana].temp_med || 0) + d.temp_med; semanas[d.semana].n_temp++; }
  }
  const semanasArr = Object.entries(semanas).map(([s, v]) => ({
    semana: Number(s), mort: v.mort, peso_kg: v.peso,
    temp_med: v.n_temp ? (v.temp_med! / v.n_temp).toFixed(1) : null,
  }));

  const dadosFatuais = {
    lote: diario.lote,
    inicio: inicio.data, hoje: hoje.data,
    semanas: semanasArr,
    indicadores_hoje: {
      idade_dias: hoje.idade_dias,
      mortalidade_acum_pct: hoje.mortalidade_pct_acum.toFixed(2),
      padrao_mort_acum_pct: hoje.padrao_mort_acum_pct,
      peso_medio_kg: hoje.peso_medio_kg,
      padrao_peso_kg: hoje.padrao_peso_kg,
      delta_peso_pct: hoje.delta_peso_pct?.toFixed(1),
    },
    gatilhos_criticos: diario.gatilhos,
    tratamentos_ativos: diario.tratamentos_ativos,
    autopsias_total: diario.autopsias_total,
  };

  const systemPrompt = `Você é um analista técnico em avicultura. Analise EXCLUSIVAMENTE os dados fornecidos em JSON. Regras absolutas:
- NUNCA prescreva dosagens, medicamentos por marca ou produtos comerciais. Sempre sugerir "consultar veterinário responsável".
- NÃO invente números. Se um dado estiver ausente (null), diga "não disponível".
- NÃO especule sobre causas sem suporte nos dados.
- Use markdown com as seções: Resumo executivo, Performance vs linhagem, Mortalidade e clima, Iluminação, Sanidade, Recomendações priorizadas, Riscos próximos 7 dias.
- Os gatilhos críticos JÁ FORAM DETECTADOS — apenas contextualize-os, sem repriorizar.
- Seja conciso e técnico. Português brasileiro.`;

  const userPrompt = `Dados fatuais do lote (JSON):\n\`\`\`json\n${JSON.stringify(dadosFatuais, null, 2)}\n\`\`\``;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`IA falhou (${resp.status}): ${txt.slice(0, 200)}`);
  }
  const json = await resp.json();
  const md = json?.choices?.[0]?.message?.content || "";

  // Anti-delírio: bloqueia recomendações com marca/dosagem específica
  if (/\b\d+\s?(mg|ml|g)\/(kg|l|ave)\b/i.test(md)) {
    return md + "\n\n> ⚠️ Algumas dosagens foram detectadas e devem ser ignoradas — sempre consulte o veterinário responsável.";
  }
  return md;
}

async function hashJson(obj: any): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "diario";
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const loteId = body.loteId || url.searchParams.get("loteId");
    if (!loteId) {
      return new Response(JSON.stringify({ error: "loteId obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const diario = await buildDiario(supabase, loteId);

    if (action === "diario") {
      return new Response(JSON.stringify(diario),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ia") {
      // Cache via hash dos dados
      const hash = await hashJson({ dias: diario.dias, gatilhos: diario.gatilhos });
      const { data: cacheLote } = await supabase.from("lotes")
        .select("analise_ia_relatorio").eq("id", loteId).single();
      const cache = cacheLote?.analise_ia_relatorio as any;
      if (cache?.hash === hash && cache?.markdown) {
        return new Response(JSON.stringify({ ...diario, ia: { markdown: cache.markdown, cached: true, gerado_em: cache.gerado_em } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const markdown = await chamarIA(diario);
      const novoCache = { hash, markdown, gerado_em: new Date().toISOString() };
      await supabase.from("lotes").update({ analise_ia_relatorio: novoCache }).eq("id", loteId);
      return new Response(JSON.stringify({ ...diario, ia: { markdown, cached: false, gerado_em: novoCache.gerado_em } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "action inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
