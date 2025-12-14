import { Badge } from '@/components/ui/badge';
import { useSiloLevel } from './NivelSiloCard';
import { Package, AlertTriangle } from 'lucide-react';

interface SiloBadgeProps {
  loteId: string;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento: number;
  avesVivas: number;
}

export function SiloBadge({ loteId, linhagem, sexo, diasDesdeAlojamento, avesVivas }: SiloBadgeProps) {
  const { diasRestantes, nivelSilo, loading } = useSiloLevel(
    loteId,
    linhagem,
    sexo,
    diasDesdeAlojamento,
    avesVivas
  );

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1 animate-pulse">
        <Package className="w-3 h-3" />
        ...
      </Badge>
    );
  }

  if (diasDesdeAlojamento <= 0 || avesVivas <= 0) {
    return null;
  }

  // Critical: less than 2 days or deficit
  if (diasRestantes < 2 || nivelSilo < 0) {
    return (
      <Badge variant="destructive" className="gap-1 relative">
        <AlertTriangle className="w-3 h-3" />
        {nivelSilo < 0 ? 'Déficit' : `${diasRestantes}d`}
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground"></span>
        </span>
      </Badge>
    );
  }

  // Warning: 2-4 days
  if (diasRestantes <= 4) {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
        <Package className="w-3 h-3" />
        {diasRestantes}d
      </Badge>
    );
  }

  // OK: more than 5 days
  return (
    <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30">
      <Package className="w-3 h-3" />
      OK
    </Badge>
  );
}
