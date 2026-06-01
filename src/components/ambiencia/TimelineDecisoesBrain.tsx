import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DecisaoBrain } from '@/types/ambienciaLote';

interface Props { decisoes: DecisaoBrain[]; }

export function TimelineDecisoesBrain({ decisoes }: Props) {
  return (
    <Card className="p-4" id="timeline">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Decisões do Brain</h3>
        <span className="ml-auto text-xs text-muted-foreground">últimas {decisoes.length}</span>
      </div>
      {decisoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem decisões registradas ainda.</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-auto pr-1">
          {decisoes.map((d) => (
            <li key={d.id} className="flex gap-3 text-sm border-l-2 border-border pl-3 py-1">
              <div className="text-xs text-muted-foreground tabular-nums shrink-0 min-w-[64px]">
                {formatDistanceToNow(new Date(d.created_at), { locale: ptBR, addSuffix: false })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 items-center">
                  {d.funcao_automacao && <Badge variant="outline" className="text-xs">{d.funcao_automacao}</Badge>}
                  {d.estagio && <Badge variant="secondary" className="text-xs">{d.estagio}</Badge>}
                  {d.estado_decidido && <span className="text-xs font-medium">{d.estado_decidido}</span>}
                  {d.bloqueado_por && <Badge variant="destructive" className="text-xs">bloq: {d.bloqueado_por}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {d.temp_lida != null && `T ${d.temp_lida.toFixed(1)}°C `}
                  {d.ur_lida != null && `· UR ${d.ur_lida.toFixed(0)}% `}
                  {d.setpoint_alvo != null && `· alvo ${d.setpoint_alvo.toFixed(1)}°C`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
