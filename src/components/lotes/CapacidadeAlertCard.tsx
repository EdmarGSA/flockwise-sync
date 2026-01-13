import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface CapacidadeAlertCardProps {
  nivelAtual: number;
  quantidadeSolicitada: number;
  consumoAteEntrega: number;
  capacidadeSilo: number;
  diasAteEntrega: number;
}

export function CapacidadeAlertCard({
  nivelAtual,
  quantidadeSolicitada,
  consumoAteEntrega,
  capacidadeSilo,
  diasAteEntrega,
}: CapacidadeAlertCardProps) {
  // Calculate projected level at delivery
  const nivelNaEntrega = Math.max(0, nivelAtual - consumoAteEntrega);
  const nivelAposRecebimento = nivelNaEntrega + quantidadeSolicitada;
  const excesso = nivelAposRecebimento - capacidadeSilo;
  const quantidadeMaxima = excesso > 0 ? quantidadeSolicitada - excesso : quantidadeSolicitada;

  const isOverCapacity = excesso > 0;
  const isLowOnFeed = nivelNaEntrega < capacidadeSilo * 0.1; // Less than 10% on delivery

  return (
    <div className="space-y-3">
      {/* Projection info */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nível atual:</span>
          <span className="font-medium">{nivelAtual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Consumo até entrega ({diasAteEntrega} dias):</span>
          <span className="font-medium text-orange-600">
            -{consumoAteEntrega.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
          </span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-muted-foreground">Nível projetado na entrega:</span>
          <span className={`font-medium ${nivelNaEntrega < capacidadeSilo * 0.1 ? 'text-red-600' : ''}`}>
            {nivelNaEntrega.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Quantidade solicitada:</span>
          <span className="font-medium text-green-600">
            +{quantidadeSolicitada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
          </span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-muted-foreground">Nível após recebimento:</span>
          <span className={`font-bold ${isOverCapacity ? 'text-red-600' : 'text-primary'}`}>
            {nivelAposRecebimento.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Capacidade do silo:</span>
          <span>{capacidadeSilo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
        </div>
      </div>

      {/* Alerts */}
      {isOverCapacity && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Excede capacidade do silo!</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>A quantidade solicitada excede a capacidade do silo em <strong>{excesso.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</strong>.</p>
            <p>Quantidade máxima recomendada: <strong>{Math.max(0, quantidadeMaxima).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</strong></p>
          </AlertDescription>
        </Alert>
      )}

      {!isOverCapacity && isLowOnFeed && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Atenção ao estoque</AlertTitle>
          <AlertDescription>
            O nível de ração estará baixo na data de entrega. Considere antecipar a entrega ou solicitar uma quantidade maior.
          </AlertDescription>
        </Alert>
      )}

      {!isOverCapacity && !isLowOnFeed && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Quantidade adequada</AlertTitle>
          <AlertDescription className="text-green-600/80">
            A quantidade solicitada está dentro da capacidade do silo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
