// Padrões zootécnicos de referência (Cobb 500, Ross 308, Hubbard, Lohmann LSL)
// Pesos em kg, mortalidade acumulada em %, semana de vida (1..N)

export interface PadraoSemanal {
  semana: number;
  peso_kg: number;
  mortalidade_acum_pct: number;
  temp_min: number;
  temp_max: number;
}

export type LinhagemKey = string;

const COBB_500: PadraoSemanal[] = [
  { semana: 1, peso_kg: 0.190, mortalidade_acum_pct: 0.7, temp_min: 30, temp_max: 32 },
  { semana: 2, peso_kg: 0.500, mortalidade_acum_pct: 1.2, temp_min: 28, temp_max: 30 },
  { semana: 3, peso_kg: 0.960, mortalidade_acum_pct: 1.8, temp_min: 26, temp_max: 28 },
  { semana: 4, peso_kg: 1.560, mortalidade_acum_pct: 2.4, temp_min: 24, temp_max: 26 },
  { semana: 5, peso_kg: 2.230, mortalidade_acum_pct: 3.1, temp_min: 22, temp_max: 25 },
  { semana: 6, peso_kg: 2.930, mortalidade_acum_pct: 3.8, temp_min: 20, temp_max: 24 },
  { semana: 7, peso_kg: 3.620, mortalidade_acum_pct: 4.5, temp_min: 20, temp_max: 24 },
];

const ROSS_308: PadraoSemanal[] = [
  { semana: 1, peso_kg: 0.195, mortalidade_acum_pct: 0.7, temp_min: 30, temp_max: 32 },
  { semana: 2, peso_kg: 0.510, mortalidade_acum_pct: 1.2, temp_min: 28, temp_max: 30 },
  { semana: 3, peso_kg: 0.980, mortalidade_acum_pct: 1.8, temp_min: 26, temp_max: 28 },
  { semana: 4, peso_kg: 1.580, mortalidade_acum_pct: 2.4, temp_min: 24, temp_max: 26 },
  { semana: 5, peso_kg: 2.250, mortalidade_acum_pct: 3.1, temp_min: 22, temp_max: 25 },
  { semana: 6, peso_kg: 2.950, mortalidade_acum_pct: 3.8, temp_min: 20, temp_max: 24 },
  { semana: 7, peso_kg: 3.650, mortalidade_acum_pct: 4.5, temp_min: 20, temp_max: 24 },
];

const HUBBARD: PadraoSemanal[] = [
  { semana: 1, peso_kg: 0.180, mortalidade_acum_pct: 0.7, temp_min: 30, temp_max: 32 },
  { semana: 2, peso_kg: 0.480, mortalidade_acum_pct: 1.2, temp_min: 28, temp_max: 30 },
  { semana: 3, peso_kg: 0.920, mortalidade_acum_pct: 1.8, temp_min: 26, temp_max: 28 },
  { semana: 4, peso_kg: 1.500, mortalidade_acum_pct: 2.4, temp_min: 24, temp_max: 26 },
  { semana: 5, peso_kg: 2.150, mortalidade_acum_pct: 3.1, temp_min: 22, temp_max: 25 },
  { semana: 6, peso_kg: 2.830, mortalidade_acum_pct: 3.8, temp_min: 20, temp_max: 24 },
];

const LOHMANN_LSL: PadraoSemanal[] = [
  { semana: 1, peso_kg: 0.070, mortalidade_acum_pct: 0.5, temp_min: 32, temp_max: 34 },
  { semana: 4, peso_kg: 0.260, mortalidade_acum_pct: 1.0, temp_min: 24, temp_max: 28 },
  { semana: 8, peso_kg: 0.620, mortalidade_acum_pct: 1.5, temp_min: 20, temp_max: 24 },
  { semana: 12, peso_kg: 0.950, mortalidade_acum_pct: 2.0, temp_min: 18, temp_max: 24 },
  { semana: 16, peso_kg: 1.250, mortalidade_acum_pct: 2.5, temp_min: 18, temp_max: 24 },
  { semana: 20, peso_kg: 1.500, mortalidade_acum_pct: 3.0, temp_min: 18, temp_max: 24 },
  { semana: 30, peso_kg: 1.750, mortalidade_acum_pct: 4.0, temp_min: 18, temp_max: 26 },
  { semana: 50, peso_kg: 1.850, mortalidade_acum_pct: 6.0, temp_min: 18, temp_max: 26 },
];

export function getPadraoLinhagem(linhagem: string | null | undefined): PadraoSemanal[] {
  const key = (linhagem || '').toLowerCase();
  if (key.includes('ross')) return ROSS_308;
  if (key.includes('hubbard')) return HUBBARD;
  if (key.includes('lohmann') || key.includes('lsl') || key.includes('postura')) return LOHMANN_LSL;
  return COBB_500;
}

export function padraoNaSemana(linhagem: string | null | undefined, semana: number): PadraoSemanal | null {
  const tabela = getPadraoLinhagem(linhagem);
  if (!tabela.length) return null;
  // Interpolação simples: pega o ponto mais próximo
  let mais_proximo = tabela[0];
  for (const p of tabela) {
    if (Math.abs(p.semana - semana) < Math.abs(mais_proximo.semana - semana)) mais_proximo = p;
  }
  return mais_proximo;
}

export function faixaTemperaturaIdeal(idadeDias: number): { min: number; max: number } {
  if (idadeDias <= 3) return { min: 32, max: 34 };
  if (idadeDias <= 7) return { min: 30, max: 32 };
  if (idadeDias <= 14) return { min: 28, max: 30 };
  if (idadeDias <= 21) return { min: 26, max: 28 };
  if (idadeDias <= 28) return { min: 24, max: 26 };
  if (idadeDias <= 35) return { min: 22, max: 25 };
  return { min: 20, max: 24 };
}
