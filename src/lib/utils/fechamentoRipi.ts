// Cálculos do RIPI (Relatório de Informações da Produção Integrada)
// Partilha do integrado, condenações SIF e divergências sistema x frigorífico.
// Tudo determinístico e client-side.

export interface CargaAbate {
  id?: string;
  abatedouro: string;
  data_abate: string;
  quantidade: number;
  peso_total_kg: number;
  nota_produtor: string;
}

export interface CondenacaoItem {
  id?: string;
  tipo: 'FT' | 'FP';
  codigo: string;
  descricao: string;
  quantidade: number;
}

export interface DescontoItem {
  id?: string;
  descricao: string;
  debito: number;
  credito: number;
}

export interface PartilhaInput {
  pesoTotalKg: number;
  avesAbatidas: number;
  precoKgFrango: number;
  percentualBasico: number;
  avalConversao: number;
  avalCondenacao: number;
  avalCaloPata: number;
  avalChecklist: number;
}

export interface LinhaPartilha {
  label: string;
  percentual: number;
  kg: number;
  valor: number;
  porCabeca: number;
}

export interface PartilhaResultado {
  linhas: LinhaPartilha[];
  resultadoBruto: LinhaPartilha;
}

function linha(
  label: string,
  percentual: number,
  pesoTotalKg: number,
  precoKg: number,
  aves: number,
): LinhaPartilha {
  const kg = (pesoTotalKg * percentual) / 100;
  const valor = kg * precoKg;
  return {
    label,
    percentual,
    kg,
    valor,
    porCabeca: aves > 0 ? valor / aves : 0,
  };
}

export function calcularPartilha(input: PartilhaInput): PartilhaResultado {
  const { pesoTotalKg, avesAbatidas, precoKgFrango } = input;
  const linhas: LinhaPartilha[] = [
    linha('Percentual básico de partilha', input.percentualBasico, pesoTotalKg, precoKgFrango, avesAbatidas),
    linha('Avaliação conversão', input.avalConversao, pesoTotalKg, precoKgFrango, avesAbatidas),
    linha('Avaliação condenação', input.avalCondenacao, pesoTotalKg, precoKgFrango, avesAbatidas),
    linha('Avaliação calo de patas', input.avalCaloPata, pesoTotalKg, precoKgFrango, avesAbatidas),
    linha('Avaliação check-list', input.avalChecklist, pesoTotalKg, precoKgFrango, avesAbatidas),
  ];

  const totalPc = linhas.reduce((acc, l) => acc + l.percentual, 0);
  const resultadoBruto = linha('Resultado bruto do lote', totalPc, pesoTotalKg, precoKgFrango, avesAbatidas);

  return { linhas, resultadoBruto };
}

export function somarDescontos(descontos: DescontoItem[]) {
  const debito = descontos.reduce((acc, d) => acc + (Number(d.debito) || 0), 0);
  const credito = descontos.reduce((acc, d) => acc + (Number(d.credito) || 0), 0);
  return { debito, credito, subtotal: debito + credito };
}

export function calcularValoresFinais(rendaBruta: number, descontos: DescontoItem[]) {
  const { debito, credito, subtotal } = somarDescontos(descontos);
  return {
    debito,
    credito,
    subtotal,
    rendaBruta,
    totalDepositar: rendaBruta + subtotal,
  };
}

/** Percentual de condenação sobre as aves abatidas */
export function percentualCondenacao(quantidade: number, avesAbatidas: number): number {
  if (!avesAbatidas) return 0;
  return (quantidade / avesAbatidas) * 100;
}

export function totalizarCargas(cargas: CargaAbate[]) {
  const quantidade = cargas.reduce((a, c) => a + (Number(c.quantidade) || 0), 0);
  const pesoTotal = cargas.reduce((a, c) => a + (Number(c.peso_total_kg) || 0), 0);
  return {
    quantidade,
    pesoTotal,
    pesoMedio: quantidade > 0 ? pesoTotal / quantidade : 0,
  };
}

export function pesoMedioCarga(carga: CargaAbate): number {
  const q = Number(carga.quantidade) || 0;
  return q > 0 ? (Number(carga.peso_total_kg) || 0) / q : 0;
}

// ---------------------------------------------------------------------------
// Divergências: sistema x frigorífico
// ---------------------------------------------------------------------------

export interface DadosInternos {
  racaoConsumidaKg: number | null;
  mortalidadePercentual: number | null;
  pesoMedioKg: number | null;
  avesVivas: number | null;
}

export interface DadosOficiais {
  racaoConsumidaKg: number | null;
  mortalidadePercentual: number | null;
  pesoMedioKg: number | null;
  avesAbatidas: number | null;
}

export type SeveridadeDivergencia = 'ok' | 'atencao' | 'critico';

export interface Divergencia {
  indicador: string;
  unidade: string;
  sistema: number | null;
  oficial: number | null;
  diferenca: number | null;
  diferencaPercentual: number | null;
  severidade: SeveridadeDivergencia;
  observacao?: string;
}

interface LimiteDivergencia {
  atencao: number; // % de diferença relativa
  critico: number;
}

const LIMITES_PADRAO: Record<string, LimiteDivergencia> = {
  racao: { atencao: 2, critico: 5 },
  mortalidade: { atencao: 10, critico: 25 },
  peso: { atencao: 2, critico: 5 },
  aves: { atencao: 0.5, critico: 2 },
};

function severidade(difPercentual: number | null, limite: LimiteDivergencia): SeveridadeDivergencia {
  if (difPercentual === null) return 'ok';
  const abs = Math.abs(difPercentual);
  if (abs >= limite.critico) return 'critico';
  if (abs >= limite.atencao) return 'atencao';
  return 'ok';
}

function montar(
  indicador: string,
  unidade: string,
  sistema: number | null,
  oficial: number | null,
  limite: LimiteDivergencia,
  observacao?: string,
): Divergencia {
  const temAmbos = sistema !== null && oficial !== null && !Number.isNaN(sistema) && !Number.isNaN(oficial);
  const diferenca = temAmbos ? oficial! - sistema! : null;
  const diferencaPercentual = temAmbos && sistema !== 0 ? ((oficial! - sistema!) / Math.abs(sistema!)) * 100 : null;
  return {
    indicador,
    unidade,
    sistema,
    oficial,
    diferenca,
    diferencaPercentual,
    severidade: severidade(diferencaPercentual, limite),
    observacao,
  };
}

export function compararDados(
  internos: DadosInternos,
  oficiais: DadosOficiais,
  limites: Partial<Record<string, LimiteDivergencia>> = {},
): Divergencia[] {
  const lim = { ...LIMITES_PADRAO, ...limites };
  return [
    montar(
      'Ração consumida',
      'kg',
      internos.racaoConsumidaKg,
      oficiais.racaoConsumidaKg,
      lim.racao,
      'O total do frigorífico pode incluir sobras de lote anterior e devoluções.',
    ),
    montar('Mortalidade', '%', internos.mortalidadePercentual, oficiais.mortalidadePercentual, lim.mortalidade,
      'A viabilidade oficial inclui mortes no transporte e na plataforma.'),
    montar('Peso médio', 'kg', internos.pesoMedioKg, oficiais.pesoMedioKg, lim.peso,
      'A pesagem interna é amostral; o oficial é a média real de abate.'),
    montar('Aves entregues', 'aves', internos.avesVivas, oficiais.avesAbatidas, lim.aves,
      'Diferença indica erro de contagem ou mortes não registradas.'),
  ];
}

// ---------------------------------------------------------------------------
// Catálogo de condenações SIF mais comuns em frango de corte
// ---------------------------------------------------------------------------

export const CATALOGO_SIF: { tipo: 'FT' | 'FP'; codigo: string; descricao: string }[] = [
  { tipo: 'FT', codigo: '103', descricao: 'Aerossaculite' },
  { tipo: 'FT', codigo: '105', descricao: 'Caquexia' },
  { tipo: 'FT', codigo: '112', descricao: 'Aspecto repugnante' },
  { tipo: 'FT', codigo: '130', descricao: 'Septicemia' },
  { tipo: 'FT', codigo: '151', descricao: 'Lesão de pele' },
  { tipo: 'FT', codigo: '157', descricao: 'Síndrome ascite' },
  { tipo: 'FT', codigo: '160', descricao: 'Contaminação' },
  { tipo: 'FT', codigo: '170', descricao: 'Escaldagem excessiva' },
  { tipo: 'FP', codigo: '220', descricao: 'Aerossaculite' },
  { tipo: 'FP', codigo: '245', descricao: 'Celulite' },
  { tipo: 'FP', codigo: '251', descricao: 'Lesão de pele' },
  { tipo: 'FP', codigo: '253', descricao: 'Lesão inflamatória' },
  { tipo: 'FP', codigo: '256', descricao: 'Síndrome ascite' },
  { tipo: 'FP', codigo: '297', descricao: 'Má absorção de gema' },
  { tipo: 'FP', codigo: '299', descricao: 'Lesão traumática antiga' },
  { tipo: 'FP', codigo: '280', descricao: 'Contusão / fratura' },
];

export const formatMoeda = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export const formatNum = (v: number | null | undefined, casas = 2) =>
  (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
