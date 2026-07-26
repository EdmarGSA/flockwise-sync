// Tipos e normalizações da importação do PDF do RIPI.
// Usado pela função de servidor `importar-ripi` (esquema) e pela tela de conferência.

export type Confianca = 'alta' | 'media' | 'baixa';

export interface RipiCargaLida {
  abatedouro?: string | null;
  data_abate?: string | null;
  quantidade?: number | null;
  peso_total_kg?: number | null;
  nota_produtor?: string | null;
}

export interface RipiCondenacaoLida {
  tipo?: 'FT' | 'FP' | null;
  codigo?: string | null;
  descricao?: string | null;
  quantidade?: number | null;
}

export interface RipiDescontoLido {
  descricao?: string | null;
  debito?: number | null;
  credito?: number | null;
}

export interface RipiOrigemPintoLida {
  lote_matriz?: string | null;
  idade_matriz?: number | null;
  linhagem?: string | null;
  incubatorio?: string | null;
  peso_pinto_g?: number | null;
  quantidade?: number | null;
}

export interface RipiExtracao {
  // Cabeçalho
  lote_integradora?: string | null;
  abatedouro?: string | null;
  data_abate?: string | null; // yyyy-MM-dd
  hora_media_abate?: string | null; // HH:mm
  idade_abate?: number | null;
  tipo_produto?: string | null;
  tecnico_responsavel?: string | null;
  aves_alojadas?: number | null;
  aves_abatidas?: number | null;
  peso_total_kg?: number | null;
  peso_medio_kg?: number | null;
  peso_projetado_kg?: number | null;
  consumo_total_racao_kg?: number | null;

  // Desempenho
  conversao_prevista?: number | null;
  conversao_real?: number | null;
  conversao_ajustada?: number | null;
  viabilidade_percentual?: number | null;
  mortalidade_prevista?: number | null;
  mortalidade_real?: number | null;
  pc_condenacao_previsto?: number | null;
  pc_condenacao_real?: number | null;
  pc_calo_pata_previsto?: number | null;
  pc_calo_pata_real?: number | null;
  aves_condenadas_total?: number | null;
  aves_condenadas_parcial?: number | null;
  calo_pata_quantidade?: number | null;

  // Partilha
  preco_kg_frango?: number | null;
  valor_racao?: number | null;
  percentual_basico?: number | null;
  aval_conversao?: number | null;
  aval_condenacao?: number | null;
  aval_calo_pata?: number | null;
  aval_checklist?: number | null;
  resultado_bruto_pc?: number | null;
  resultado_bruto_valor?: number | null;
  valor_total_depositar?: number | null;

  // Listas
  cargas?: RipiCargaLida[] | null;
  condenacoes?: RipiCondenacaoLida[] | null;
  descontos?: RipiDescontoLido[] | null;
  origem_pintos?: RipiOrigemPintoLida[] | null;

  // Metadados
  confianca?: Record<string, Confianca> | null;
  observacoes?: string | null;
}

/** Converte número no padrão brasileiro (1.234,5678) para Number. Aceita number puro. */
export function normalizarNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;

  let txt = valor.trim().replace(/[R$\s%]/g, '');
  if (!txt) return null;

  const negativo = /^\(.*\)$/.test(txt) || txt.startsWith('-');
  txt = txt.replace(/[()-]/g, '');

  const temVirgula = txt.includes(',');
  const temPonto = txt.includes('.');

  if (temVirgula && temPonto) {
    // 1.234,56 -> ponto é milhar
    txt = txt.replace(/\./g, '').replace(',', '.');
  } else if (temVirgula) {
    txt = txt.replace(',', '.');
  } else if (temPonto) {
    // 1.234 (milhar) x 1.234 (decimal): trata como milhar só se houver grupos de 3
    const partes = txt.split('.');
    const milhar = partes.length > 1 && partes.slice(1).every((p) => p.length === 3);
    if (milhar) txt = partes.join('');
  }

  const n = Number(txt);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** Converte data dd/mm/aaaa (ou dd-mm-aa) para yyyy-MM-dd. Passa adiante se já estiver ISO. */
export function normalizarData(valor: unknown): string | null {
  if (!valor || typeof valor !== 'string') return null;
  const txt = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;

  const m = txt.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  const dia = m[1].padStart(2, '0');
  const mes = m[2].padStart(2, '0');
  let ano = m[3];
  if (ano.length === 2) ano = `20${ano}`;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;
  return `${ano}-${mes}-${dia}`;
}

/** Normaliza hora para HH:mm */
export function normalizarHora(valor: unknown): string | null {
  if (!valor || typeof valor !== 'string') return null;
  const m = valor.trim().match(/^(\d{1,2})[:h.](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const CAMPOS_NUMERICOS: (keyof RipiExtracao)[] = [
  'idade_abate', 'aves_alojadas', 'aves_abatidas', 'peso_total_kg', 'peso_medio_kg',
  'peso_projetado_kg', 'consumo_total_racao_kg', 'conversao_prevista', 'conversao_real',
  'conversao_ajustada', 'viabilidade_percentual', 'mortalidade_prevista', 'mortalidade_real',
  'pc_condenacao_previsto', 'pc_condenacao_real', 'pc_calo_pata_previsto', 'pc_calo_pata_real',
  'aves_condenadas_total', 'aves_condenadas_parcial', 'calo_pata_quantidade', 'preco_kg_frango',
  'valor_racao', 'percentual_basico', 'aval_conversao', 'aval_condenacao', 'aval_calo_pata',
  'aval_checklist', 'resultado_bruto_pc', 'resultado_bruto_valor', 'valor_total_depositar',
];

/** Aplica normalização de números, datas e horas em todo o objeto lido do PDF. */
export function normalizarExtracao(bruto: Record<string, unknown>): RipiExtracao {
  const out: Record<string, unknown> = { ...bruto };

  for (const campo of CAMPOS_NUMERICOS) {
    out[campo] = normalizarNumero(bruto[campo]);
  }

  out.data_abate = normalizarData(bruto.data_abate);
  out.hora_media_abate = normalizarHora(bruto.hora_media_abate);

  out.cargas = Array.isArray(bruto.cargas)
    ? (bruto.cargas as Record<string, unknown>[]).map((c) => ({
        abatedouro: (c.abatedouro as string) ?? null,
        data_abate: normalizarData(c.data_abate),
        quantidade: normalizarNumero(c.quantidade),
        peso_total_kg: normalizarNumero(c.peso_total_kg),
        nota_produtor: (c.nota_produtor as string) ?? null,
      }))
    : [];

  out.condenacoes = Array.isArray(bruto.condenacoes)
    ? (bruto.condenacoes as Record<string, unknown>[]).map((c) => ({
        tipo: c.tipo === 'FP' ? 'FP' : 'FT',
        codigo: c.codigo != null ? String(c.codigo) : null,
        descricao: (c.descricao as string) ?? null,
        quantidade: normalizarNumero(c.quantidade),
      }))
    : [];

  out.descontos = Array.isArray(bruto.descontos)
    ? (bruto.descontos as Record<string, unknown>[]).map((d) => ({
        descricao: (d.descricao as string) ?? null,
        debito: normalizarNumero(d.debito),
        credito: normalizarNumero(d.credito),
      }))
    : [];

  out.origem_pintos = Array.isArray(bruto.origem_pintos)
    ? (bruto.origem_pintos as Record<string, unknown>[]).map((o) => ({
        lote_matriz: (o.lote_matriz as string) ?? null,
        idade_matriz: normalizarNumero(o.idade_matriz),
        linhagem: (o.linhagem as string) ?? null,
        incubatorio: (o.incubatorio as string) ?? null,
        peso_pinto_g: normalizarNumero(o.peso_pinto_g),
        quantidade: normalizarNumero(o.quantidade),
      }))
    : [];

  return out as RipiExtracao;
}

// ---------------------------------------------------------------------------
// Conferências automáticas após aplicar os dados lidos
// ---------------------------------------------------------------------------

export interface AvisoConferencia {
  bloco: string;
  mensagem: string;
}

export function conferirExtracao(e: RipiExtracao): AvisoConferencia[] {
  const avisos: AvisoConferencia[] = [];
  const cargas = e.cargas ?? [];

  if (cargas.length > 0) {
    const somaQtd = cargas.reduce((a, c) => a + (c.quantidade ?? 0), 0);
    const somaPeso = cargas.reduce((a, c) => a + (c.peso_total_kg ?? 0), 0);

    if (e.aves_abatidas && Math.abs(somaQtd - e.aves_abatidas) > 1) {
      avisos.push({
        bloco: 'Cargas',
        mensagem: `Soma das cargas (${somaQtd}) diferente das aves abatidas do cabeçalho (${e.aves_abatidas}).`,
      });
    }
    if (e.peso_total_kg && Math.abs(somaPeso - e.peso_total_kg) > 1) {
      avisos.push({
        bloco: 'Cargas',
        mensagem: `Peso somado das cargas (${somaPeso.toFixed(1)} kg) diferente do peso total (${e.peso_total_kg.toFixed(1)} kg).`,
      });
    }
  }

  const cond = e.condenacoes ?? [];
  if (cond.length > 0) {
    const somaFT = cond.filter((c) => c.tipo === 'FT').reduce((a, c) => a + (c.quantidade ?? 0), 0);
    const somaFP = cond.filter((c) => c.tipo === 'FP').reduce((a, c) => a + (c.quantidade ?? 0), 0);
    if (e.aves_condenadas_total && Math.abs(somaFT - e.aves_condenadas_total) > 1) {
      avisos.push({
        bloco: 'Condenações',
        mensagem: `Causas totais somam ${somaFT}, mas o total informado é ${e.aves_condenadas_total}.`,
      });
    }
    if (e.aves_condenadas_parcial && Math.abs(somaFP - e.aves_condenadas_parcial) > 1) {
      avisos.push({
        bloco: 'Condenações',
        mensagem: `Causas parciais somam ${somaFP}, mas o total informado é ${e.aves_condenadas_parcial}.`,
      });
    }
  }

  const somaAval =
    (e.percentual_basico ?? 0) + (e.aval_conversao ?? 0) + (e.aval_condenacao ?? 0) +
    (e.aval_calo_pata ?? 0) + (e.aval_checklist ?? 0);
  if (e.resultado_bruto_pc && Math.abs(somaAval - e.resultado_bruto_pc) > 0.01) {
    avisos.push({
      bloco: 'Partilha',
      mensagem: `Soma das avaliações (${somaAval.toFixed(3)}%) diferente do resultado bruto lido (${e.resultado_bruto_pc.toFixed(3)}%).`,
    });
  }

  if (e.aves_abatidas && e.peso_total_kg && e.peso_medio_kg) {
    const medio = e.peso_total_kg / e.aves_abatidas;
    if (Math.abs(medio - e.peso_medio_kg) > 0.05) {
      avisos.push({
        bloco: 'Abate',
        mensagem: `Peso médio calculado (${medio.toFixed(3)} kg) diverge do informado (${e.peso_medio_kg.toFixed(3)} kg).`,
      });
    }
  }

  return avisos;
}

export const str = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === '' ? '' : String(v);
