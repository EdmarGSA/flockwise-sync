import { Card } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
import type { AmbienciaLoteData } from '@/types/ambienciaLote';

interface Props { data: AmbienciaLoteData; }

export function ParametrosAtivosPanel({ data }: Props) {
  const d = data.ultimaDecisaoClima;
  const sp = d?.setpoint_alvo;
  const ofs = d?.offset_aprendido_aplicado_c;
  const modo = d?.modo_dominante;
  const neb = data.nebulizacao;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Parâmetros ativos</h3>
      </div>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Setpoint</dt>
        <dd className="font-medium">{sp != null ? `${sp.toFixed(1)}°C` : '—'}</dd>

        <dt className="text-muted-foreground">Offset aprendido</dt>
        <dd className="font-medium">{ofs != null ? `${ofs > 0 ? '+' : ''}${ofs.toFixed(2)}°C` : '—'}</dd>

        <dt className="text-muted-foreground">Modo dominante</dt>
        <dd className="font-medium">{modo ?? '—'}</dd>

        {neb && (
          <>
            <dt className="text-muted-foreground">Nebulização aciona</dt>
            <dd className="font-medium">T &gt; alvo+{neb.delta_temp_acionar_c}°C · UR &lt; {neb.ur_max_pct}%</dd>
            <dt className="text-muted-foreground">Ciclo nebulizador</dt>
            <dd className="font-medium">{neb.ciclo_on_seg}s on / {neb.ciclo_off_seg}s off</dd>
          </>
        )}

        {data.programa && (
          <>
            <dt className="text-muted-foreground">Programa iluminação</dt>
            <dd className="font-medium truncate">{data.programa.nome}</dd>
          </>
        )}
      </dl>
    </Card>
  );
}
