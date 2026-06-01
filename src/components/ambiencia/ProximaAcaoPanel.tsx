import { Card } from '@/components/ui/card';
import { Lightbulb, Wind } from 'lucide-react';
import {
  selecionarFaixa, calcularEstadoIluminacao, type FaixaIluminacao,
} from '@/lib/utils/calcularEstadoIluminacao';
import type { AmbienciaLoteData } from '@/types/ambienciaLote';

interface Props { data: AmbienciaLoteData; }

function descreverProximaClima(data: AmbienciaLoteData): string {
  const d = data.ultimaDecisaoClima;
  if (!d) return 'Brain aguardando leituras';
  const sp = d.setpoint_alvo;
  const t = d.temp_lida;
  if (sp == null || t == null) return d.estagio ? `Estágio atual: ${d.estagio}` : 'Brain monitorando';
  // próxima janela: assume histerese 1°C aproximada
  if (t < sp - 0.5) return `Aquecimento quando T < ${(sp - 1).toFixed(1)}°C`;
  if (t > sp + 0.8) return `Ventilação ↑ quando T > ${(sp + 1.5).toFixed(1)}°C`;
  return `Estável próximo do alvo ${sp.toFixed(1)}°C`;
}

function descreverProximaIluminacao(data: AmbienciaLoteData): string {
  if (!data.programa?.faixas?.length || !data.idadeDias) return 'Sem programa';
  const faixa = selecionarFaixa(data.programa.faixas as unknown as FaixaIluminacao[], data.idadeDias);
  if (!faixa) return 'Sem faixa para essa idade';
  const est = calcularEstadoIluminacao(faixa);
  if (est.proximo_evento_min == null) return `${est.intensidade_pct}% (estável)`;
  const h = new Date(Date.now() + est.proximo_evento_min * 60_000);
  const hhmm = h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const acao = est.proximo_evento_tipo === 'acender' ? 'Acender' : 'Apagar';
  return `${acao} ${hhmm} (em ${est.proximo_evento_min} min) → ${faixa.intensidade_pct}%`;
}

export function ProximaAcaoPanel({ data }: Props) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Próxima ação</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <Wind className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <div className="text-xs text-muted-foreground">Clima</div>
            <div className="text-sm font-medium">{descreverProximaClima(data)}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-accent mt-0.5" />
          <div>
            <div className="text-xs text-muted-foreground">Iluminação</div>
            <div className="text-sm font-medium">{descreverProximaIluminacao(data)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
