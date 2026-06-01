import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusCanalBadge } from './StatusCanalBadge';
import { isDispositivoOnline, statusCanal } from '@/lib/ambiencia/statusCanal';
import type { CanalDispositivo, DispositivoIot, StatusCanal } from '@/types/ambienciaLote';

interface Props {
  dispositivos: DispositivoIot[];
  canais: CanalDispositivo[];
}

function descricaoEstado(c: CanalDispositivo): string {
  if (c.tipo_equipamento === 'cortina' && c.posicao_atual_pct != null) {
    return `Posição ${c.posicao_atual_pct}%`;
  }
  if (c.intensidade_atual != null && c.estado_atual === 'on') {
    return `${c.intensidade_atual}% ligado`;
  }
  return (c.estado_atual ?? '—').toUpperCase();
}

function ackTexto(c: CanalDispositivo): string {
  const ts = c.ultimo_estado_persistido_em ?? c.ultimo_comando_em;
  if (!ts) return '—';
  try {
    return `há ${formatDistanceToNow(new Date(ts), { locale: ptBR })}`;
  } catch { return '—'; }
}

export function DispositivosCanaisTable({ dispositivos, canais }: Props) {
  const devMap = new Map(dispositivos.map((d) => [d.id, d]));

  const linhas = canais.map((c) => {
    const dev = devMap.get(c.dispositivo_id);
    const st: StatusCanal = statusCanal(c, dev);
    return { c, dev, st };
  });

  if (!dispositivos.length) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground" id="dispositivos">
        Nenhum dispositivo IoT vinculado a este galpão.
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden" id="dispositivos">
      <div className="flex items-center gap-2 p-4 border-b">
        <Cpu className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Dispositivos & canais</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {dispositivos.filter(isDispositivoOnline).length}/{dispositivos.length} online
        </span>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último ACK</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ c, dev, st }) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{dev?.nome ?? '?'}</TableCell>
                <TableCell>#{c.canal_numero} · {c.nome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.funcao_automacao}</TableCell>
                <TableCell>{descricaoEstado(c)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{ackTexto(c)}</TableCell>
                <TableCell className="text-right"><StatusCanalBadge status={st} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden divide-y">
        {linhas.map(({ c, dev, st }) => (
          <div key={c.id} className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm truncate">{dev?.nome ?? '?'}</div>
              <StatusCanalBadge status={st} />
            </div>
            <div className="text-xs text-muted-foreground">
              Canal #{c.canal_numero} · {c.nome} · {c.funcao_automacao}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{descricaoEstado(c)}</span>
              <span className="text-xs text-muted-foreground">ACK {ackTexto(c)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
