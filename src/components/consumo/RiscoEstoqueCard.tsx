import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface LoteConsumo {
  id: string;
  diasEstoque?: number;
  diasDesdeAlojamento?: number;
}

interface RiscoEstoqueCardProps {
  lotes: LoteConsumo[];
  onClick?: () => void;
}

export function RiscoEstoqueCard({ lotes, onClick }: RiscoEstoqueCardProps) {
  // Count lots that will become critical within 3 days
  const lotesEmRisco = lotes.filter(l => {
    const diasEstoque = l.diasEstoque || 0;
    const diasDesdeAlojamento = l.diasDesdeAlojamento || 0;
    // Active lots with 1-3 days of stock (not critical yet, but at risk)
    return diasDesdeAlojamento > 0 && diasEstoque >= 1 && diasEstoque <= 3;
  });

  const hasRisk = lotesEmRisco.length > 0;

  return (
    <Card 
      className={`bg-card border-border cursor-pointer hover:border-primary/50 transition-colors ${hasRisk ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">⏳ Risco 3d</p>
            <p className={`text-2xl font-bold ${hasRisk ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {lotesEmRisco.length}
            </p>
          </div>
          <Clock className={`w-8 h-8 ${hasRisk ? 'text-amber-500' : 'text-muted-foreground/50'}`} />
        </div>
      </CardContent>
    </Card>
  );
}
