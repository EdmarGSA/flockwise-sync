export type SeveridadeGatilho = 'critico' | 'alerta' | 'info';

export interface GatilhoCritico {
  codigo: string;
  severidade: SeveridadeGatilho;
  titulo: string;
  descricao: string;
  acao_sugerida: string;
}

export interface DiaRelatorio {
  data: string;
  idade_dias: number;
  semana: number;
  temp_min: number | null;
  temp_max: number | null;
  temp_med: number | null;
  umid_min: number | null;
  umid_max: number | null;
  faixa_temp_min: number;
  faixa_temp_max: number;
  fora_da_faixa: boolean;
  horas_luz: number | null;
  acender: string | null;
  apagar: string | null;
  mortalidade_natural: number;
  mortalidade_eliminada: number;
  mortalidade_total: number;
  mortalidade_pct_dia: number;
  mortalidade_pct_acum: number;
  peso_medio_kg: number | null;
  cv_pct: number | null;
  padrao_peso_kg: number | null;
  padrao_mort_acum_pct: number | null;
  delta_peso_pct: number | null;
}

export interface ContextoGatilhos {
  dias: DiaRelatorio[];
  limite_mort_diaria_pct: number; // ex 0.5
  tratamentos_carencia_dias_proximos: number; // ex 2
  data_prevista_saida: string | null;
  autopsias_infecciosas: number;
}

export function detectarGatilhosCriticos(ctx: ContextoGatilhos): GatilhoCritico[] {
  const out: GatilhoCritico[] = [];
  const dias = ctx.dias;
  if (!dias.length) return out;

  const hoje = dias[dias.length - 1];

  // 1. Mortalidade diária > limiar
  if (hoje.mortalidade_pct_dia > ctx.limite_mort_diaria_pct) {
    out.push({
      codigo: 'mort_diaria_alta',
      severidade: 'critico',
      titulo: `Mortalidade diária acima do limite (${hoje.mortalidade_pct_dia.toFixed(2)}%)`,
      descricao: `Hoje registrou ${hoje.mortalidade_total} aves mortas (${hoje.mortalidade_pct_dia.toFixed(2)}% do plantel), acima do limite de ${ctx.limite_mort_diaria_pct}%.`,
      acao_sugerida: 'Coletar amostras imediatamente para análise laboratorial. Revisar clima, água e ração nas últimas 48h.',
    });
  }

  // 2. Mortalidade acumulada > 1.5x padrão
  if (hoje.padrao_mort_acum_pct && hoje.mortalidade_pct_acum > hoje.padrao_mort_acum_pct * 1.5) {
    out.push({
      codigo: 'mort_acum_alta',
      severidade: 'alerta',
      titulo: 'Mortalidade acumulada acima da linhagem',
      descricao: `Acumulado de ${hoje.mortalidade_pct_acum.toFixed(2)}% contra padrão de ${hoje.padrao_mort_acum_pct.toFixed(2)}%.`,
      acao_sugerida: 'Revisar histórico climático e programa sanitário das últimas semanas.',
    });
  }

  // 3. 3+ dias consecutivos fora da faixa térmica
  let consec = 0;
  let max_consec = 0;
  for (const d of dias) {
    if (d.fora_da_faixa) {
      consec++;
      if (consec > max_consec) max_consec = consec;
    } else consec = 0;
  }
  if (max_consec >= 3) {
    out.push({
      codigo: 'temp_fora_faixa',
      severidade: 'alerta',
      titulo: `${max_consec} dias consecutivos fora da faixa térmica`,
      descricao: 'Temperaturas registradas saíram da faixa ideal da linhagem em sequência.',
      acao_sugerida: 'Auditar ventilação, aquecimento e curva climática programada.',
    });
  }

  // 4. Peso < 90% do padrão
  if (hoje.peso_medio_kg && hoje.padrao_peso_kg && hoje.peso_medio_kg < hoje.padrao_peso_kg * 0.9) {
    out.push({
      codigo: 'peso_abaixo_padrao',
      severidade: 'alerta',
      titulo: `Peso ${((hoje.peso_medio_kg / hoje.padrao_peso_kg) * 100).toFixed(0)}% do padrão`,
      descricao: `Peso médio ${hoje.peso_medio_kg.toFixed(3)}kg contra padrão ${hoje.padrao_peso_kg.toFixed(3)}kg.`,
      acao_sugerida: 'Auditar consumo de ração, qualidade do alimento e bebedouros.',
    });
  }

  // 5. Carência próxima do abate
  if (ctx.data_prevista_saida && ctx.tratamentos_carencia_dias_proximos > 0
      && ctx.tratamentos_carencia_dias_proximos <= 2) {
    out.push({
      codigo: 'carencia_proxima',
      severidade: 'critico',
      titulo: 'Medicação com carência próxima do abate',
      descricao: `Existem tratamentos cuja data de liberação está a ${ctx.tratamentos_carencia_dias_proximos} dias do abate previsto.`,
      acao_sugerida: 'Confirmar liberação antes do abate. Bloquear envio se necessário.',
    });
  }

  // 6. Autópsia infecciosa
  if (ctx.autopsias_infecciosas > 0) {
    out.push({
      codigo: 'autopsia_infecciosa',
      severidade: 'critico',
      titulo: `${ctx.autopsias_infecciosas} autópsia(s) com achado infeccioso`,
      descricao: 'Necropsias registradas com indicação de processo infeccioso.',
      acao_sugerida: 'Notificar veterinário responsável e isolar lote se aplicável.',
    });
  }

  return out;
}
