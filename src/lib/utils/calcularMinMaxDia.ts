export interface LeituraSensor {
  temperatura_c: number | null;
  umidade_pct: number | null;
  lido_em: string;
}

export interface MinMaxValor {
  min: number | null;
  max: number | null;
  horarioMin: string | null;
  horarioMax: string | null;
  atual: number | null;
  horarioAtual: string | null;
}

export interface MinMaxDia {
  temp: MinMaxValor;
  umid: MinMaxValor;
  totalLeituras: number;
}

const empty = (): MinMaxValor => ({
  min: null,
  max: null,
  horarioMin: null,
  horarioMax: null,
  atual: null,
  horarioAtual: null,
});

export function calcularMinMaxDia(leituras: LeituraSensor[]): MinMaxDia {
  const temp = empty();
  const umid = empty();

  if (!leituras.length) {
    return { temp, umid, totalLeituras: 0 };
  }

  // Ordered ascending by lido_em — última posição = mais recente
  const ordenadas = [...leituras].sort(
    (a, b) => new Date(a.lido_em).getTime() - new Date(b.lido_em).getTime()
  );

  for (const l of ordenadas) {
    if (l.temperatura_c != null && !Number.isNaN(l.temperatura_c)) {
      if (temp.min == null || l.temperatura_c < temp.min) {
        temp.min = l.temperatura_c;
        temp.horarioMin = l.lido_em;
      }
      if (temp.max == null || l.temperatura_c > temp.max) {
        temp.max = l.temperatura_c;
        temp.horarioMax = l.lido_em;
      }
    }
    if (l.umidade_pct != null && !Number.isNaN(l.umidade_pct)) {
      if (umid.min == null || l.umidade_pct < umid.min) {
        umid.min = l.umidade_pct;
        umid.horarioMin = l.lido_em;
      }
      if (umid.max == null || l.umidade_pct > umid.max) {
        umid.max = l.umidade_pct;
        umid.horarioMax = l.lido_em;
      }
    }
  }

  const ultima = ordenadas[ordenadas.length - 1];
  temp.atual = ultima.temperatura_c ?? null;
  temp.horarioAtual = ultima.lido_em;
  umid.atual = ultima.umidade_pct ?? null;
  umid.horarioAtual = ultima.lido_em;

  return { temp, umid, totalLeituras: ordenadas.length };
}

export function formatarHora(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
