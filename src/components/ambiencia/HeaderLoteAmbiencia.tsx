import { Link } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LoteAmbienciaCore } from '@/types/ambienciaLote';

interface Props {
  lote: LoteAmbienciaCore;
  idadeDias: number | null;
  modoBrain?: string | null;
  liveAtMs: number;
}

export function HeaderLoteAmbiencia({ lote, idadeDias, modoBrain, liveAtMs }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Link to={`/meus-lotes/${lote.id}`}>
          <Button variant="ghost" size="icon" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold truncate flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Ambiência & Iluminação
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {lote.nucleo_nome ? `${lote.nucleo_nome} · ` : ''}
            {lote.galpao_nome ?? 'Galpão'} ·{' '}
            {idadeDias ? `${idadeDias}d` : 's/ alojamento'} ·{' '}
            {(lote.linhagem_postura || lote.linhagem || '').toString().replace('_', ' ')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {modoBrain && (
          <Badge variant="outline" className="gap-1">
            <Lightbulb className="h-3 w-3" />
            Brain · {modoBrain}
          </Badge>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          ao vivo
        </span>
      </div>
    </div>
  );
}
