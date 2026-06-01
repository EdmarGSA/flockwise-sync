import { useParams } from 'react-router-dom';
import { useRef } from 'react';
import { useAmbienciaLote } from '@/hooks/useAmbienciaLote';
import { HeaderLoteAmbiencia } from '@/components/ambiencia/HeaderLoteAmbiencia';
import { BarraAlertasOperacionais } from '@/components/ambiencia/BarraAlertasOperacionais';
import { KpiClimaLote } from '@/components/ambiencia/KpiClimaLote';
import { ProximaAcaoPanel } from '@/components/ambiencia/ProximaAcaoPanel';
import { AtuadoresLiveRow } from '@/components/ambiencia/AtuadoresLiveRow';
import { ParametrosAtivosPanel } from '@/components/ambiencia/ParametrosAtivosPanel';
import { ProgramacaoDoDiaPanel } from '@/components/ambiencia/ProgramacaoDoDiaPanel';
import { DispositivosCanaisTable } from '@/components/ambiencia/DispositivosCanaisTable';
import { TimelineDecisoesBrain } from '@/components/ambiencia/TimelineDecisoesBrain';
import { Card } from '@/components/ui/card';

export default function LoteAmbienciaControle() {
  const { loteId } = useParams<{ loteId: string }>();
  const { data, isLoading, error } = useAmbienciaLote(loteId);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading || !data) {
    return (
      <div className="container max-w-7xl py-6">
        <Card className="p-12 text-center text-muted-foreground">Carregando ambiência…</Card>
      </div>
    );
  }
  if (error || !data.lote) {
    return (
      <div className="container max-w-7xl py-6">
        <Card className="p-12 text-center text-destructive">Lote não encontrado ou sem acesso.</Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="container max-w-7xl py-4 md:py-6 space-y-4">
      <HeaderLoteAmbiencia
        lote={data.lote}
        idadeDias={data.idadeDias}
        modoBrain={data.ultimaDecisaoClima?.modo_dominante ?? null}
        liveAtMs={Date.now()}
      />

      <BarraAlertasOperacionais data={data} onScrollTo={scrollTo} />

      <div id="kpis">
        <KpiClimaLote
          leiturasUltimas={data.leiturasUltimas}
          serieKpi={data.serieKpi}
          setpointAlvo={data.ultimaDecisaoClima?.setpoint_alvo ?? null}
        />
      </div>

      <ProximaAcaoPanel data={data} />

      <AtuadoresLiveRow data={data} />

      <div className="grid md:grid-cols-2 gap-4">
        <ParametrosAtivosPanel data={data} />
        <ProgramacaoDoDiaPanel data={data} />
      </div>

      <DispositivosCanaisTable dispositivos={data.dispositivos} canais={data.canais} />

      <TimelineDecisoesBrain decisoes={data.decisoes} />
    </div>
  );
}
