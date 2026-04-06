import { DiaTemperatura, Insight, UMIDADE_MAX, UMIDADE_MIN } from './types';

export function gerarInsights(dados: DiaTemperatura[]): Insight[] {
  const insights: Insight[] = [];
  if (dados.length < 2) return insights;

  // 1. Streak de dias fora da faixa de temperatura
  let streakFora = 0;
  let maxStreak = 0;
  let streakStart = 0;
  let maxStreakStart = 0;
  dados.forEach((d, i) => {
    if (d.dentroFaixa === false) {
      if (streakFora === 0) streakStart = i;
      streakFora++;
      if (streakFora > maxStreak) {
        maxStreak = streakFora;
        maxStreakStart = streakStart;
      }
    } else {
      streakFora = 0;
    }
  });
  if (maxStreak >= 3) {
    const de = dados[maxStreakStart].dia;
    const ate = dados[maxStreakStart + maxStreak - 1].dia;
    insights.push({
      id: 'streak-temp',
      severidade: maxStreak >= 5 ? 'critico' : 'atencao',
      titulo: `${maxStreak} dias consecutivos fora da faixa`,
      descricao: `Dias D${de} a D${ate} com temperatura fora do ideal. Verifique equipamentos de climatização.`,
      icone: 'alert',
    });
  }

  // 2. Temperatura consistentemente baixa (aquecimento)
  const diasBaixos = dados.filter(d => d.faixaMin != null && d.tempMin < d.faixaMin!);
  if (diasBaixos.length >= 3) {
    const mediaDesvio = diasBaixos.reduce((s, d) => s + (d.faixaMin! - d.tempMin), 0) / diasBaixos.length;
    insights.push({
      id: 'temp-baixa',
      severidade: mediaDesvio > 3 ? 'critico' : 'atencao',
      titulo: 'Temperatura mínima abaixo da faixa recorrente',
      descricao: `${diasBaixos.length} dias com mínima abaixo do ideal (desvio médio ${mediaDesvio.toFixed(1)}°C). Verificar aquecimento, especialmente à noite.`,
      icone: 'flame',
    });
  }

  // 3. Picos de calor
  const diasAltos = dados.filter(d => d.faixaMax != null && d.tempMax > d.faixaMax!);
  if (diasAltos.length >= 2) {
    const picoMax = Math.max(...diasAltos.map(d => d.tempMax - d.faixaMax!));
    const diaPico = diasAltos.find(d => d.tempMax - d.faixaMax! === picoMax);
    insights.push({
      id: 'temp-alta',
      severidade: picoMax > 4 ? 'critico' : 'atencao',
      titulo: 'Picos de calor detectados',
      descricao: `${diasAltos.length} dias com máxima acima do ideal. Maior pico: +${picoMax.toFixed(1)}°C no D${diaPico?.dia}. Avaliar ventilação e nebulização.`,
      icone: 'thermometer',
    });
  }

  // 4. Umidade alta
  const diasUmidosAlta = dados.filter(d => d.umidadeMax !== null && d.umidadeMax! > UMIDADE_MAX);
  if (diasUmidosAlta.length >= 3) {
    insights.push({
      id: 'umidade-alta',
      severidade: diasUmidosAlta.length >= 5 ? 'critico' : 'atencao',
      titulo: 'Umidade elevada recorrente',
      descricao: `${diasUmidosAlta.length} dias com umidade acima de ${UMIDADE_MAX}%. Risco de cama úmida e problemas respiratórios.`,
      icone: 'droplets',
    });
  }

  // 5. Umidade baixa
  const diasUmidosBaixa = dados.filter(d => d.umidadeMin !== null && d.umidadeMin! < UMIDADE_MIN);
  if (diasUmidosBaixa.length >= 3) {
    insights.push({
      id: 'umidade-baixa',
      severidade: 'atencao',
      titulo: 'Umidade baixa recorrente',
      descricao: `${diasUmidosBaixa.length} dias com umidade abaixo de ${UMIDADE_MIN}%. Risco de desidratação e poeira excessiva.`,
      icone: 'wind',
    });
  }

  // 6. Estresse térmico (alta temp + alta umidade)
  const diasEstresse = dados.filter(d =>
    d.faixaMax != null && d.tempMax > d.faixaMax! && d.umidadeMax !== null && d.umidadeMax! > 65
  );
  if (diasEstresse.length >= 2) {
    insights.push({
      id: 'estresse-termico',
      severidade: 'critico',
      titulo: 'Risco de estresse térmico',
      descricao: `${diasEstresse.length} dias com temperatura E umidade elevadas simultaneamente. Condição crítica para o bem-estar das aves.`,
      icone: 'alert',
    });
  }

  // 7. Amplitude térmica alta
  const diasAmplitude = dados.filter(d => (d.tempMax - d.tempMin) > 8);
  if (diasAmplitude.length >= 3) {
    insights.push({
      id: 'amplitude',
      severidade: 'atencao',
      titulo: 'Amplitude térmica elevada',
      descricao: `${diasAmplitude.length} dias com variação > 8°C entre mín/máx. Aves podem sofrer com oscilações bruscas. Melhorar isolamento.`,
      icone: 'thermometer',
    });
  }

  // 8. All good
  if (insights.length === 0) {
    insights.push({
      id: 'ok',
      severidade: 'info',
      titulo: 'Ambiente dentro dos parâmetros',
      descricao: 'Temperatura e umidade dentro das faixas ideais na maioria dos dias monitorados.',
      icone: 'thermometer',
    });
  }

  return insights;
}
