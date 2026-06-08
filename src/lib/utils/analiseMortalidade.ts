// Análise de peso na mortalidade: refugo vs ave em boa condição
// Tudo client-side, determinístico.

export interface PesagemPonto {
  dia: number;
  pesoMedioKg: number;
}

export interface RefCurvaPonto {
  dia: number;
  pesoKg: number;
}

export interface PesoRefCtx {
  pesoPintinhoKg: number;
  pesagensReais: PesagemPonto[]; // do lote
  curvaLinhagem: RefCurvaPonto[]; // desempenho_aves
}

export type ClassificacaoIR =
  | 'refugo_severo'
  | 'refugo'
  | 'normal'
  | 'acima';

export interface ClassificacaoInfo {
  key: ClassificacaoIR;
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  descricao: string;
}

const CLASS_MAP: Record<ClassificacaoIR, ClassificacaoInfo> = {
  refugo_severo: {
    key: 'refugo_severo',
    label: 'Refugo severo',
    tone: 'success',
    descricao: 'Aves muito abaixo do padrão — descarte seletivo coerente',
  },
  refugo: {
    key: 'refugo',
    label: 'Refugo',
    tone: 'info',
    descricao: 'Aves abaixo do padrão — descarte coerente',
  },
  normal: {
    key: 'normal',
    label: 'Peso normal',
    tone: 'warning',
    descricao: 'Perda de aves em peso normal — investigar causa sanitária/ambiental',
  },
  acima: {
    key: 'acima',
    label: 'Acima do padrão',
    tone: 'danger',
    descricao: 'Perda de aves de bom peso — possível causa aguda (calor, asfixia, ascite)',
  },
};

export function classificarIR(ir: number | null): ClassificacaoInfo | null {
  if (ir == null || !isFinite(ir) || ir <= 0) return null;
  if (ir <= 0.70) return CLASS_MAP.refugo_severo;
  if (ir <= 0.85) return CLASS_MAP.refugo;
  if (ir <= 1.10) return CLASS_MAP.normal;
  return CLASS_MAP.acima;
}

export interface PesoRefResultado {
  pesoKg: number;
  fonte: 'pesagem_real' | 'curva_linhagem' | 'interpolacao_pintinho' | 'nenhuma';
}

/**
 * Resolve o peso esperado da ave em um dia da vida do lote.
 * Prioridades:
 * 1. Pesagem real do lote em janela ±3 dias (média ponderada por proximidade).
 * 2. Curva da linhagem (desempenho_aves) — exato ou interpolado.
 * 3. Interpolação linear entre pintinho (dia 0) e o primeiro ponto disponível.
 */
export function pesoReferenciaPorDia(dia: number, ctx: PesoRefCtx): PesoRefResultado {
  // 1. Pesagem real próxima
  const proximos = ctx.pesagensReais
    .map(p => ({ ...p, distancia: Math.abs(p.dia - dia) }))
    .filter(p => p.distancia <= 3)
    .sort((a, b) => a.distancia - b.distancia);

  if (proximos.length > 0) {
    const pesos = proximos.map(p => 1 / (p.distancia + 0.5));
    const somaPesos = pesos.reduce((a, b) => a + b, 0);
    const media = proximos.reduce((acc, p, i) => acc + p.pesoMedioKg * pesos[i], 0) / somaPesos;
    return { pesoKg: media, fonte: 'pesagem_real' };
  }

  // 2. Curva da linhagem
  if (ctx.curvaLinhagem.length > 0) {
    const exato = ctx.curvaLinhagem.find(c => c.dia === dia);
    if (exato) return { pesoKg: exato.pesoKg, fonte: 'curva_linhagem' };

    const antes = [...ctx.curvaLinhagem].filter(c => c.dia < dia).sort((a, b) => b.dia - a.dia)[0];
    const depois = [...ctx.curvaLinhagem].filter(c => c.dia > dia).sort((a, b) => a.dia - b.dia)[0];

    if (antes && depois) {
      const frac = (dia - antes.dia) / (depois.dia - antes.dia);
      return {
        pesoKg: antes.pesoKg + (depois.pesoKg - antes.pesoKg) * frac,
        fonte: 'curva_linhagem',
      };
    }
    if (antes) return { pesoKg: antes.pesoKg, fonte: 'curva_linhagem' };
    if (depois) return { pesoKg: depois.pesoKg, fonte: 'curva_linhagem' };
  }

  // 3. Interpolação linear pintinho → primeiro ponto disponível
  const primeiroPonto =
    ctx.pesagensReais.sort((a, b) => a.dia - b.dia)[0] ||
    ctx.curvaLinhagem.sort((a, b) => a.dia - b.dia)[0];

  if (primeiroPonto) {
    const pesoFim = 'pesoMedioKg' in primeiroPonto ? primeiroPonto.pesoMedioKg : primeiroPonto.pesoKg;
    const diaFim = primeiroPonto.dia;
    if (diaFim > 0) {
      const frac = Math.min(1, dia / diaFim);
      return {
        pesoKg: ctx.pesoPintinhoKg + (pesoFim - ctx.pesoPintinhoKg) * frac,
        fonte: 'interpolacao_pintinho',
      };
    }
  }

  return { pesoKg: 0, fonte: 'nenhuma' };
}

export interface ResumoAnalise {
  totalAves: number;
  totalComPeso: number;
  pesoMedioMortoKg: number | null;
  pesoRefMedioKg: number | null;
  ir: number | null;
  classificacao: ClassificacaoInfo | null;
  percentSemPeso: number;
  porClassificacao: Record<ClassificacaoIR, number>;
  totalNatural: number;
  totalEliminado: number;
  totalNaturalAcimaNormal: number; // natural com IR >= 0.85
  totalEliminadoRefugo: number; // eliminado com IR <= 0.85
}

export function gerarInsight(r: ResumoAnalise): string | null {
  if (r.totalAves === 0) return null;
  if (r.totalComPeso === 0) {
    return 'Registre o peso das aves mortas/eliminadas para liberar a análise de refugo vs perda de aves boas.';
  }

  const linhas: string[] = [];

  const totalClass = (Object.values(r.porClassificacao) as number[]).reduce((a, b) => a + b, 0);
  const pctRefugo = totalClass > 0
    ? ((r.porClassificacao.refugo_severo + r.porClassificacao.refugo) / totalClass) * 100
    : 0;
  const pctAcima = totalClass > 0
    ? ((r.porClassificacao.acima + r.porClassificacao.normal) / totalClass) * 100
    : 0;

  if (pctRefugo >= 70) {
    linhas.push(
      `${pctRefugo.toFixed(0)}% das aves mortas estavam abaixo do padrão de peso — descarte seletivo coerente.`
    );
  } else if (pctAcima >= 50) {
    linhas.push(
      `Atenção: ${pctAcima.toFixed(0)}% da mortalidade ocorreu em aves de peso normal ou acima — investigar causa sanitária ou ambiental.`
    );
  }

  if (r.totalNatural > 0) {
    const pctNatNormal = (r.totalNaturalAcimaNormal / r.totalNatural) * 100;
    if (pctNatNormal >= 50) {
      linhas.push(
        `Mortalidade natural concentrada em aves de bom peso (${pctNatNormal.toFixed(0)}%) — checar temperatura, ventilação e ascite.`
      );
    }
  }

  if (r.totalEliminado > 0) {
    const pctElimRefugo = (r.totalEliminadoRefugo / r.totalEliminado) * 100;
    if (pctElimRefugo < 60 && r.totalEliminado >= 10) {
      linhas.push(
        `Apenas ${pctElimRefugo.toFixed(0)}% das eliminadas eram refugo — revisar critério de descarte.`
      );
    }
  }

  if (r.percentSemPeso >= 30) {
    linhas.push(
      `${r.percentSemPeso.toFixed(0)}% dos registros estão sem peso informado — preencha para análises mais precisas.`
    );
  }

  return linhas.length > 0 ? linhas.join(' ') : null;
}

export function classificacaoToClasses(tone: ClassificacaoInfo['tone']): string {
  switch (tone) {
    case 'success':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30';
    case 'info':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'warning':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'danger':
      return 'bg-destructive/10 text-destructive border-destructive/30';
  }
}
