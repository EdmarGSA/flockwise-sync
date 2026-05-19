import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer } from 'lucide-react';
import { useHistoricoData } from './historico-temp/useHistoricoData';
import { DivergenciaKPIs } from './historico-temp/DivergenciaKPIs';
import { TemperaturaChart } from './historico-temp/TemperaturaChart';
import { UmidadeChart } from './historico-temp/UmidadeChart';
import { InsightsPanel } from './historico-temp/InsightsPanel';
import { HistoricoTable } from './historico-temp/HistoricoTable';
import { ModoAtivoBadge } from './historico-temp/ModoAtivoBadge';
import { gerarInsights } from './historico-temp/gerarInsights';
import { useMemo } from 'react';

interface Props {
  galpaoId: string;
  dataAlojamento: string;
  loteId?: string;
  linhagem?: string;
  sexo?: string;
}

export function HistoricoTemperaturaLote({ galpaoId, dataAlojamento, loteId }: Props) {
  const { dados, loading } = useHistoricoData({ galpaoId, dataAlojamento, loteId });
  const insights = useMemo(() => gerarInsights(dados), [dados]);

  if (loading || dados.length === 0) return null;

  const ultimo = dados[dados.length - 1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-primary" />
            Histórico de Temperatura e Umidade
          </CardTitle>
          <ModoAtivoBadge
            zonaAtiva={ultimo.zonaAtiva}
            sensoresUsados={ultimo.sensoresUsados}
            sensoresTotal={ultimo.sensoresTotal}
          />
        </div>
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
