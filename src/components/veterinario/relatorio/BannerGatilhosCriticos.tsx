import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { GatilhoCritico } from '@/hooks/useRelatorioDiarioLote';

export default function BannerGatilhosCriticos({ gatilhos }: { gatilhos: GatilhoCritico[] }) {
  if (!gatilhos?.length) return null;

  return (
    <div className="space-y-2">
      {gatilhos.map((g) => {
        const variant = g.severidade === 'critico' ? 'destructive' : 'default';
        const Icon = g.severidade === 'critico' ? AlertCircle : g.severidade === 'alerta' ? AlertTriangle : Info;
        return (
          <Alert key={g.codigo} variant={variant as any}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{g.titulo}</AlertTitle>
            <AlertDescription>{g.acao_sugerida}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
