export type StatusCanal = 'online' | 'offline' | 'sem_ack';

export interface LoteAmbienciaCore {
  id: string;
  integrado_id: string;
  galpao_id: string | null;
  data_alojamento: string | null;
  quantidade_aves: number | null;
  linhagem: string | null;
  linhagem_postura: string | null;
  sexo: string | null;
  programa_iluminacao_id: string | null;
  status: string;
  nucleo_nome?: string | null;
  galpao_nome?: string | null;
  tipo_producao?: string | null;
}

export interface DispositivoIot {
  id: string;
  nome: string;
  device_id_ewelink: string;
  driver: string;
  online: boolean;
  ultimo_sync: string | null;
  galpao_id: string | null;
  ativo: boolean;
  num_canais: number;
  funcao_automacao: string;
}

export interface CanalDispositivo {
  id: string;
  dispositivo_id: string;
  canal_numero: number;
  nome: string;
  tipo_equipamento: string;
  funcao_automacao: string;
  automacao_ativa: boolean;
  estado_atual: string | null;
  ultimo_comando_em: string | null;
  ultimo_estado_persistido: string | null;
  ultimo_estado_persistido_em: string | null;
  intensidade_atual: number | null;
  posicao_atual_pct: number | null;
  ativo: boolean;
  ultimo_on_em: string | null;
  ultimo_off_em: string | null;
}

export interface DecisaoBrain {
  id: string;
  funcao_automacao: string | null;
  estado_decidido: string | null;
  estagio: string | null;
  temp_lida: number | null;
  ur_lida: number | null;
  ith_calc: number | null;
  setpoint_alvo: number | null;
  reason_chain: any;
  bloqueado_por: string | null;
  modo_dominante: string | null;
  offset_aprendido_aplicado_c: number | null;
  created_at: string;
}

export interface VentilacaoEstado {
  estagio_atual: string;
  velocidade_estimada_ms: number | null;
  cfm_total_ativo: number | null;
  pressao_estatica_pa: number | null;
  ultima_transicao_em: string;
  reason: any;
}

export interface CortinaEstado {
  posicao_atual_pct: number | null;
  posicao_alvo_pct: number | null;
  ultima_movimentacao_em: string | null;
  ultimo_motivo: string | null;
  reason_chain: any;
}

export interface NebulizacaoConfig {
  ativo: boolean;
  ur_max_pct: number;
  ciclo_on_seg: number;
  ciclo_off_seg: number;
  cooldown_seg: number;
  idade_minima_dias: number;
  ventilacao_min_pct: number;
  delta_temp_acionar_c: number;
  ultimo_acionamento_em: string | null;
  ultimo_estado: string | null;
}

export interface LeituraSensor {
  dispositivo_id: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  lido_em: string;
}

export interface FaixaIluminacaoDb {
  id: string;
  programa_id: string;
  dia_inicio: number;
  dia_fim: number;
  horas_luz: number;
  blocos: any;
  ramp_up_min: number;
  ramp_down_min: number;
  intensidade_pct: number;
}

export interface ProgramaIluminacao {
  id: string;
  nome: string;
  tipo_producao: string;
  faixas: FaixaIluminacaoDb[];
}

export interface OverrideBrain {
  id: string;
  data_ref: string;
  horas_luz: number;
  acender_hhmm: string;
  apagar_hhmm: string;
  intensidade_pct: number;
  blocos: any;
  ramp_up_min: number;
  ramp_down_min: number;
  motivo: string;
  score_confianca: number;
  status: string;
  expira_em: string;
  created_at: string;
}

export interface OverrideCanal {
  id: string;
  canal_id: string;
  estado_forcado: string;
  intensidade_pct: number | null;
  ate_quando: string;
  motivo: string | null;
}

export interface AmbienciaLoteData {
  lote: LoteAmbienciaCore | null;
  idadeDias: number | null;
  dispositivos: DispositivoIot[];
  canais: CanalDispositivo[];
  leiturasUltimas: LeituraSensor[]; // 1 por dispositivo (mais recente)
  serieKpi: LeituraSensor[]; // últimas leituras 1h (para sparkline / tendência)
  decisoes: DecisaoBrain[]; // últimas 30
  ultimaDecisaoClima: DecisaoBrain | null;
  ventilacao: VentilacaoEstado | null;
  cortina: CortinaEstado | null;
  nebulizacao: NebulizacaoConfig | null;
  programa: ProgramaIluminacao | null;
  overrideBrainHoje: OverrideBrain | null;
  overridesCanais: OverrideCanal[];
}
