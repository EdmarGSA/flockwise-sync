// Templates de programas de iluminação para criação rápida.
// Baseados em recomendações de manuais (Cobb 500, Ross 308, Lohmann LSL/Brown).

export interface TemplateFaixa {
  dia_inicio: number;
  dia_fim: number;
  horas_luz: number;
  blocos: { acender: string; apagar: string; intensidade_pct?: number }[];
  ramp_up_min: number;
  ramp_down_min: number;
  intensidade_pct: number;
}

export interface TemplatePrograma {
  id: string;
  label: string;
  tipo_producao: 'frango_corte' | 'postura' | 'matriz';
  descricao: string;
  faixas: TemplateFaixa[];
}

export const TEMPLATES_PROGRAMAS: TemplatePrograma[] = [
  {
    id: 'cobb500',
    label: 'Frango Cobb 500 (padrão)',
    tipo_producao: 'frango_corte',
    descricao: 'Cobb 500 — fotoperíodo decrescente clássico (23h → 18h).',
    faixas: [
      { dia_inicio: 1, dia_fim: 7, horas_luz: 23, blocos: [{ acender: '00:00', apagar: '23:00', intensidade_pct: 100 }], ramp_up_min: 0, ramp_down_min: 15, intensidade_pct: 100 },
      { dia_inicio: 8, dia_fim: 14, horas_luz: 20, blocos: [{ acender: '04:00', apagar: '00:00', intensidade_pct: 50 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 50 },
      { dia_inicio: 15, dia_fim: 28, horas_luz: 18, blocos: [{ acender: '05:00', apagar: '23:00', intensidade_pct: 30 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 30 },
      { dia_inicio: 29, dia_fim: 60, horas_luz: 20, blocos: [{ acender: '04:00', apagar: '00:00', intensidade_pct: 30 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 30 },
    ],
  },
  {
    id: 'ross308',
    label: 'Frango Ross 308',
    tipo_producao: 'frango_corte',
    descricao: 'Ross 308 — programa de luz com escotofase para bem-estar.',
    faixas: [
      { dia_inicio: 1, dia_fim: 3, horas_luz: 23, blocos: [{ acender: '00:00', apagar: '23:00', intensidade_pct: 100 }], ramp_up_min: 0, ramp_down_min: 15, intensidade_pct: 100 },
      { dia_inicio: 4, dia_fim: 7, horas_luz: 20, blocos: [{ acender: '04:00', apagar: '00:00', intensidade_pct: 60 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 60 },
      { dia_inicio: 8, dia_fim: 21, horas_luz: 18, blocos: [{ acender: '05:00', apagar: '23:00', intensidade_pct: 30 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 30 },
      { dia_inicio: 22, dia_fim: 60, horas_luz: 20, blocos: [{ acender: '04:00', apagar: '00:00', intensidade_pct: 30 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 30 },
    ],
  },
  {
    id: 'lohmann_postura',
    label: 'Postura Lohmann LSL/Brown',
    tipo_producao: 'postura',
    descricao: 'Recria + estímulo gradual até 16h de luz na produção.',
    faixas: [
      { dia_inicio: 1, dia_fim: 3, horas_luz: 23, blocos: [{ acender: '00:00', apagar: '23:00', intensidade_pct: 100 }], ramp_up_min: 0, ramp_down_min: 15, intensidade_pct: 100 },
      { dia_inicio: 4, dia_fim: 14, horas_luz: 16, blocos: [{ acender: '06:00', apagar: '22:00', intensidade_pct: 40 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 40 },
      { dia_inicio: 15, dia_fim: 70, horas_luz: 10, blocos: [{ acender: '07:00', apagar: '17:00', intensidade_pct: 20 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 20 },
      { dia_inicio: 71, dia_fim: 119, horas_luz: 11, blocos: [{ acender: '06:30', apagar: '17:30', intensidade_pct: 25 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 25 },
      { dia_inicio: 120, dia_fim: 140, horas_luz: 13, blocos: [{ acender: '06:00', apagar: '19:00', intensidade_pct: 30 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 30 },
      { dia_inicio: 141, dia_fim: 160, horas_luz: 15, blocos: [{ acender: '05:00', apagar: '20:00', intensidade_pct: 35 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 35 },
      { dia_inicio: 161, dia_fim: 600, horas_luz: 16, blocos: [{ acender: '04:30', apagar: '20:30', intensidade_pct: 40 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 40 },
    ],
  },
  {
    id: 'matriz_pesada',
    label: 'Matriz pesada Cobb',
    tipo_producao: 'matriz',
    descricao: 'Recria controlada e estímulo na produção (14h luz).',
    faixas: [
      { dia_inicio: 1, dia_fim: 3, horas_luz: 23, blocos: [{ acender: '00:00', apagar: '23:00', intensidade_pct: 100 }], ramp_up_min: 0, ramp_down_min: 15, intensidade_pct: 100 },
      { dia_inicio: 4, dia_fim: 21, horas_luz: 12, blocos: [{ acender: '06:00', apagar: '18:00', intensidade_pct: 40 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 40 },
      { dia_inicio: 22, dia_fim: 140, horas_luz: 8, blocos: [{ acender: '08:00', apagar: '16:00', intensidade_pct: 25 }], ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 25 },
      { dia_inicio: 141, dia_fim: 168, horas_luz: 13, blocos: [{ acender: '06:00', apagar: '19:00', intensidade_pct: 35 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 35 },
      { dia_inicio: 169, dia_fim: 500, horas_luz: 14, blocos: [{ acender: '05:00', apagar: '19:00', intensidade_pct: 40 }], ramp_up_min: 20, ramp_down_min: 20, intensidade_pct: 40 },
    ],
  },
];
