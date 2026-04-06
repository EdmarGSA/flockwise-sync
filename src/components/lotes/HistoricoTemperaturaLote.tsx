import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer } from 'lucide-react';
import { useHistoricoData } from './historico-temp/useHistoricoData';
import { DivergenciaKPIs } from './historico-temp/DivergenciaKPIs';
import { TemperaturaChart } from './historico-temp/TemperaturaChart';
import { UmidadeChart } from './historico-temp/UmidadeChart';
import { InsightsPanel } from './historico-temp/InsightsPanel';
import { HistoricoTable } from './historico-temp/HistoricoTable';
import { gerarInsights } from './historico-temp/gerarInsights';
import { useMemo } from 'react';

interface Props {
  galpaoId: string;
  dataAlojamento: string;
  linhagem?: string;
  sexo?: string;
}

export function HistoricoTemperaturaLote({ galpaoId, dataAlojamento }: Props) {
  const { dados, loading } = useHistoricoData({ galpaoId, dataAlojamento });
  const insights = useMemo(() => gerarInsights(dados), [dados]);

  if (loading || dados.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-primary" />
          Histórico de Temperatura e Umidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DivergenciaKPIs dados={dados} />
        <TemperaturaChart dados={dados} />
        <UmidadeChart dados={dados} />
        <InsightsPanel insights={insights} />
        <HistoricoTable dados={dados} />
      </CardContent>
    </Card>
  );
}
