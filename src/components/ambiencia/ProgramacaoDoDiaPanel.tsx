import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock } from 'lucide-react';
import {
  selecionarFaixa, type FaixaIluminacao,
} from '@/lib/utils/calcularEstadoIluminacao';
import type { AmbienciaLoteData } from '@/types/ambienciaLote';

interface Props { data: AmbienciaLoteData; }

export function ProgramacaoDoDiaPanel({ data }: Props) {
  const idade = data.idadeDias;
  const faixa = data.programa?.faixas?.length && idade
    ? selecionarFaixa(data.programa.faixas as unknown as FaixaIluminacao[], idade)
    : null;

  const blocos: Array<{ acender: string; apagar: string; intensidade_pct?: number }> = Array.isArray(faixa?.blocos)
    ? (faixa!.blocos as any[])
    : [];

  return (
    <Card className="p-4" id="programacao">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Programação do dia</h3>
        {data.overrideBrainHoje && (
          <Badge variant="outline" className="ml-auto text-xs border-primary text-primary">
            Override Brain ativo
          </Badge>
        )}
      </div>
      {!faixa ? (
        <p className="text-sm text-muted-foreground">Sem programação para a idade atual.</p>
      ) : (
        <>
          <div className="text-sm mb-3 text-muted-foreground">
            Faixa {faixa.dia_inicio}-{faixa.dia_fim}d · {faixa.horas_luz}h luz · ramp ↑{faixa.ramp_up_min}min ↓{faixa.ramp_down_min}min
          </div>
          <div className="space-y-1.5">
            {(data.overrideBrainHoje?.blocos?.length ? data.overrideBrainHoje.blocos : blocos).map((b: any, i: number) => (
              <BarraBloco key={i} acender={b.acender} apagar={b.apagar} intensidade={b.intensidade_pct ?? faixa.intensidade_pct} />
            ))}
          </div>
          {data.overrideBrainHoje && (
            <p className="mt-3 text-xs text-muted-foreground">
              {data.overrideBrainHoje.motivo} · confiança {(data.overrideBrainHoje.score_confianca * 100).toFixed(0)}%
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function BarraBloco({ acender, apagar, intensidade }: { acender: string; apagar: string; intensidade: number }) {
  const ace = toMin(acender);
  const apa = toMin(apagar);
  const cruza = ace > apa;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium tabular-nums">{acender} → {apagar}</span>
        <span className="text-muted-foreground">{intensidade}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        {!cruza ? (
          <div
            className="absolute h-full bg-accent"
            style={{ left: `${(ace / 1440) * 100}%`, width: `${((apa - ace) / 1440) * 100}%`, opacity: intensidade / 100 }}
          />
        ) : (
          <>
            <div className="absolute h-full bg-accent" style={{ left: `${(ace / 1440) * 100}%`, width: `${((1440 - ace) / 1440) * 100}%`, opacity: intensidade / 100 }} />
            <div className="absolute h-full bg-accent" style={{ left: 0, width: `${(apa / 1440) * 100}%`, opacity: intensidade / 100 }} />
          </>
        )}
      </div>
    </div>
  );
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
