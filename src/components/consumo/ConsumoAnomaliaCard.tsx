import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface LoteConsumo {
  id: string;
  nucleo?: { nome: string } | null;
  galpao?: { nome: string } | null;
  consumoRealKg?: number;
  consumoEsperadoKg?: number;
  diasDesdeAlojamento?: number;
}

interface ConsumoAnomaliaCardProps {
  lotes: LoteConsumo[];
  onClick?: () => void;
}

export function ConsumoAnomaliaCard({ lotes, onClick }: ConsumoAnomaliaCardProps) {
  // Count lots with consumption anomaly (>15% deviation)
  const lotesComAnomalia = lotes.filter(l => {
    if (!l.consumoRealKg || !l.consumoEsperadoKg || (l.diasDesdeAlojamento || 0) <= 0) return false;
    const desvio = Math.abs(((l.consumoRealKg - l.consumoEsperadoKg) / l.consumoEsperadoKg) * 100);
    return desvio > 15;
  });

  const hasAnomalies = lotesComAnomalia.length > 0;

  return (
    <Card 
      className={`bg-card border-border cursor-pointer hover:border-primary/50 transition-colors ${hasAnomalies ? 'border-orange-500/50 bg-orange-500/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">⚠️ Anômalo</p>
            <p className={`text-2xl font-bold ${hasAnomalies ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {lotesComAnomalia.length}
            </p>
          </div>
          <Activity className={`w-8 h-8 ${hasAnomalies ? 'text-orange-500' : 'text-muted-foreground/50'}`} />
        </div>
      </CardContent>
    </Card>
  );
}
