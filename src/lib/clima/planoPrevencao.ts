// Plano de prevenção determinístico - regras baseadas em conforto térmico
// e previsão climática. Não aciona equipamentos automaticamente.

export interface ContextoConforto {
  temp_min_ok: number;
  temp_max_ok: number;
  temp_min_critico: number;
  temp_max_critico: number;
  ith_max_ok?: number | null;
  ith_max_critico?: number | null;
  ur_max_ok?: number | null;
}

export interface SensorGalpao {
  dispositivo_id: string;
  nome: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  ultima_leitura: string | null;
  suspeito?: boolean;
  motivo_suspeita?: string;
}

export interface LeituraGalpao {
  galpao_id: string;
  galpao_nome: string;
  /** Pior caso (máxima entre sensores) — usado para alertas de calor */
  temperatura_c: number | null;
  /** Mínima entre sensores — usado para alertas de frio */
  temperatura_min_c?: number | null;
  /** Média das temperaturas válidas */
  temperatura_media_c?: number | null;
  /** Diferença entre o sensor mais quente e o mais frio */
  divergencia_c?: number | null;
  umidade_pct: number | null;
  ultima_leitura: string | null;
  inercia_min: number;
  ventilador_qtd: number;
  sensores?: SensorGalpao[];
  sensores_suspeitos?: number;
}

export interface ForecastPonto {
  hora_prevista: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  ith: number | null;
  vento_kmh: number | null;
  prob_chuva_pct: number | null;
}

export interface PlanoAcao {
  id: string;
  prioridade: 'critica' | 'alta' | 'media' | 'baixa';
  quando: string; // texto: "Imediato", "12:30 (T-2h)", etc
  horarioISO?: string;
  galpao?: string;
  acao: string;
  motivo: string;
  categoria: 'calor' | 'frio' | 'umidade' | 'vento' | 'chuva' | 'sensor' | 'manejo';
}

const fmtHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const subtrairMin = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() - min * 60_000).toISOString();

export function gerarPlanoPrevencao(params: {
  idadeDias: number | null;
  conforto: ContextoConforto | null;
  leituras: LeituraGalpao[];
  forecast: ForecastPonto[];
  observacao?: { temperatura_c: number | null; umidade_pct: number | null } | null;
}): PlanoAcao[] {
  const { conforto, leituras, forecast } = params;
  const acoes: PlanoAcao[] = [];

  // 1) Sensores offline (>15 min)
  const agora = Date.now();
  leituras.forEach((l) => {
    const ageMin = l.ultima_leitura ? (agora - new Date(l.ultima_leitura).getTime()) / 60_000 : Infinity;
    if (ageMin > 15) {
      acoes.push({
        id: `sensor-${l.galpao_id}`,
        prioridade: 'alta',
        quando: 'Imediato',
        galpao: l.galpao_nome,
        acao: 'Inspeção física do sensor / verificar energia e rede',
        motivo: `Sem leitura há ${isFinite(ageMin) ? Math.round(ageMin) + ' min' : 'tempo indeterminado'}`,
        categoria: 'sensor',
      });
    }
  });

  // 2) Galpão fora do conforto AGORA
  if (conforto) {
    leituras.forEach((l) => {
      if (l.temperatura_c == null) return;
      const t = l.temperatura_c;
      if (t >= conforto.temp_max_critico) {
        acoes.push({
          id: `quente-${l.galpao_id}`,
          prioridade: 'critica',
          quando: 'Imediato',
          galpao: l.galpao_nome,
          acao: '100% exaustão + nebulização contínua, abrir cortinas a sotavento, água gelada',
          motivo: `Temperatura ${t.toFixed(1)}°C ≥ crítico ${conforto.temp_max_critico}°C`,
          categoria: 'calor',
        });
      } else if (t > conforto.temp_max_ok) {
        acoes.push({
          id: `quente-at-${l.galpao_id}`,
          prioridade: 'alta',
          quando: 'Imediato',
          galpao: l.galpao_nome,
          acao: 'Aumentar ventilação progressiva e iniciar nebulização cíclica (30s on / 2min off)',
          motivo: `Temperatura ${t.toFixed(1)}°C acima do conforto (${conforto.temp_max_ok}°C)`,
          categoria: 'calor',
        });
      } else if (t <= conforto.temp_min_critico) {
        acoes.push({
          id: `frio-${l.galpao_id}`,
          prioridade: 'critica',
          quando: 'Imediato',
          galpao: l.galpao_nome,
          acao: 'Aquecedores ON, fechar cortinas, reduzir ventilação à mínima de higiene',
          motivo: `Temperatura ${t.toFixed(1)}°C ≤ crítico ${conforto.temp_min_critico}°C`,
          categoria: 'frio',
        });
      } else if (t < conforto.temp_min_ok) {
        acoes.push({
          id: `frio-at-${l.galpao_id}`,
          prioridade: 'media',
          quando: 'Imediato',
          galpao: l.galpao_nome,
          acao: 'Verificar aquecimento e pontos de corrente de ar',
          motivo: `Temperatura ${t.toFixed(1)}°C abaixo do conforto (${conforto.temp_min_ok}°C)`,
          categoria: 'frio',
        });
      }
      if (conforto.ur_max_ok && l.umidade_pct != null && l.umidade_pct > conforto.ur_max_ok && t > conforto.temp_max_ok) {
        acoes.push({
          id: `ur-${l.galpao_id}`,
          prioridade: 'media',
          quando: 'Imediato',
          galpao: l.galpao_nome,
          acao: 'Priorizar ventilação sobre nebulização (UR alta inibe evaporação)',
          motivo: `UR ${l.umidade_pct.toFixed(0)}% > ${conforto.ur_max_ok}% com calor`,
          categoria: 'umidade',
        });
      }
    });
  }

  // 3) Picos previstos (próximas 12h)
  const inerciaMaxima = Math.max(60, ...leituras.map(l => l.inercia_min || 60));
  const proxJanela = forecast.slice(0, 12);

  // pico de calor
  if (conforto) {
    const picoCalor = proxJanela
      .filter(f => f.temperatura_c != null && f.temperatura_c >= conforto.temp_max_critico)
      .sort((a, b) => (b.temperatura_c! - a.temperatura_c!))[0];
    if (picoCalor) {
      const horarioAcao = subtrairMin(picoCalor.hora_prevista, inerciaMaxima);
      acoes.push({
        id: 'pico-calor',
        prioridade: 'alta',
        quando: `${fmtHora(horarioAcao)} (T-${inerciaMaxima}min)`,
        horarioISO: horarioAcao,
        acao: `Pré-resfriar galpões: nebulização + 100% exaustão antes do pico (${picoCalor.temperatura_c!.toFixed(1)}°C às ${fmtHora(picoCalor.hora_prevista)})`,
        motivo: `Pico de calor previsto`,
        categoria: 'calor',
      });
    }

    // ITH
    const picoITH = proxJanela
      .filter(f => f.ith != null && (conforto.ith_max_critico ? f.ith >= conforto.ith_max_critico : f.ith >= 78))
      .sort((a, b) => (b.ith! - a.ith!))[0];
    if (picoITH) {
      const sev = picoITH.ith! >= 82 ? 'critica' : 'alta';
      acoes.push({
        id: 'pico-ith',
        prioridade: sev,
        quando: `${fmtHora(subtrairMin(picoITH.hora_prevista, 120))} (T-2h)`,
        horarioISO: subtrairMin(picoITH.hora_prevista, 120),
        acao: picoITH.ith! >= 82
          ? 'Liberar água gelada, suspender manejo, aumentar trocas de ar e monitorar ofegação'
          : 'Aumentar ventilação progressiva e preparar nebulização',
        motivo: `ITH previsto ${picoITH.ith!.toFixed(0)} às ${fmtHora(picoITH.hora_prevista)}`,
        categoria: 'calor',
      });
    }
  }

  // vento forte
  const ventoForte = proxJanela.find(f => (f.vento_kmh ?? 0) >= 50);
  if (ventoForte) {
    acoes.push({
      id: 'vento',
      prioridade: 'media',
      quando: `${fmtHora(subtrairMin(ventoForte.hora_prevista, 180))} (T-3h)`,
      horarioISO: subtrairMin(ventoForte.hora_prevista, 180),
      acao: 'Verificar fixação de cortinas, telhas e estruturas. Reduzir abertura a barlavento',
      motivo: `Vento ${ventoForte.vento_kmh!.toFixed(0)} km/h previsto às ${fmtHora(ventoForte.hora_prevista)}`,
      categoria: 'vento',
    });
  }

  // chuva forte com lote jovem
  if (params.idadeDias != null && params.idadeDias < 14) {
    const chuva = proxJanela.find(f => (f.prob_chuva_pct ?? 0) >= 70);
    if (chuva) {
      acoes.push({
        id: 'chuva-jovem',
        prioridade: 'alta',
        quando: `${fmtHora(subtrairMin(chuva.hora_prevista, 120))} (T-2h)`,
        horarioISO: subtrairMin(chuva.hora_prevista, 120),
        acao: 'Reforçar aquecimento, fechar cortinas e checar cama (umidade)',
        motivo: `Chuva ${chuva.prob_chuva_pct}% prevista — lote com ${params.idadeDias}d`,
        categoria: 'chuva',
      });
    }
  }

  // frio previsto crítico
  if (conforto) {
    const frio = proxJanela.find(f => f.temperatura_c != null && f.temperatura_c <= conforto.temp_min_critico);
    if (frio) {
      acoes.push({
        id: 'frio-prev',
        prioridade: 'alta',
        quando: `${fmtHora(subtrairMin(frio.hora_prevista, inerciaMaxima))} (T-${inerciaMaxima}min)`,
        horarioISO: subtrairMin(frio.hora_prevista, inerciaMaxima),
        acao: 'Pré-aquecer galpões antes da queda, vedar entradas de ar não controladas',
        motivo: `Mínima ${frio.temperatura_c!.toFixed(1)}°C prevista às ${fmtHora(frio.hora_prevista)}`,
        categoria: 'frio',
      });
    }
  }

  // ordenar por prioridade
  const ordem = { critica: 0, alta: 1, media: 2, baixa: 3 };
  return acoes.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
}
