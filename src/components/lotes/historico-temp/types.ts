export interface DiaTemperatura {
  dia: number;
  data: string;
  tempMin: number;      // mantido para compat (min sustentado ou mediana se nenhum pico durou)
  tempMax: number;      // idem
  tempMediana: number | null;
  tempP5: number | null;
  tempP95: number | null;
  tempMinAbsoluto: number | null; // pico real (tooltip "Picos do dia")
  tempMaxAbsoluto: number | null;
  minutosForaFaixa: number; // min/dia fora da faixa de referência
  horarioMin: string;
  horarioMax: string;
  faixaMin?: number;
  faixaMax?: number;
  dentroFaixa: boolean | null;
  umidadeMin: number | null;
  umidadeMax: number | null;
  umidadeMediana: number | null;
  umidadeDentroFaixa: boolean | null;
  desvioTemp: number | null;
  sensoresUsados: number;
  sensoresTotal: number;
  zonaAtiva: string;
}

export interface RegraTemp {
  dia_inicio: number;
  dia_fim: number;
  temp_min_c: number;
  temp_max_c: number;
}

export interface Insight {
  id: string;
  severidade: 'info' | 'atencao' | 'critico';
  titulo: string;
  descricao: string;
  icone: 'thermometer' | 'droplets' | 'wind' | 'flame' | 'alert';
}

export const UMIDADE_MIN = 50;
export const UMIDADE_MAX = 70;
