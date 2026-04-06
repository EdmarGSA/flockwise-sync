export interface DiaTemperatura {
  dia: number;
  data: string;
  tempMin: number;
  tempMax: number;
  horarioMin: string;
  horarioMax: string;
  faixaMin?: number;
  faixaMax?: number;
  dentroFaixa: boolean | null;
  umidadeMin: number | null;
  umidadeMax: number | null;
  umidadeDentroFaixa: boolean | null;
  desvioTemp: number | null; // max deviation from ideal range in °C
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
