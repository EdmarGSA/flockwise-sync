import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, AlertTriangle, Calendar } from 'lucide-react';

interface DemandaProducaoCardProps {
  totalSolicitado: number;
  previsaoConsumo3d: number;
  estoqueDisponivel: number;
  demandaTotal: number;
  loading?: boolean;
}

export default function DemandaProducaoCard({
  totalSolicitado,
  previsaoConsumo3d,
  estoqueDisponivel,
  demandaTotal,
  loading = false
}: DemandaProducaoCardProps) {
  const saldo = estoqueDisponivel - demandaTotal;
  const isCritico = saldo < 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-card animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-card border-blue-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Solicitado</p>
              <p className="text-2xl font-bold text-blue-500">
                {totalSolicitado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pedidos em aberto</p>
            </div>
            <Package className="w-8 h-8 text-blue-500/50" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-purple-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Previsão Consumo (3d)</p>
              <p className="text-2xl font-bold text-purple-500">
                {previsaoConsumo3d.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </p>
              <p className="text-xs text-muted-foreground mt-1">Próximos 3 dias</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500/50" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-green-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Estoque Disponível</p>
              <p className="text-2xl font-bold text-green-500">
                {estoqueDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </p>
              <p className="text-xs text-muted-foreground mt-1">Rações fabricadas</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500/50" />
          </div>
        </CardContent>
      </Card>

      <Card className={`bg-card ${isCritico ? 'border-destructive/50' : 'border-amber-500/50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Demanda Total</p>
              <p className={`text-2xl font-bold ${isCritico ? 'text-destructive' : 'text-amber-500'}`}>
                {demandaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </p>
              <p className={`text-xs mt-1 ${isCritico ? 'text-destructive' : 'text-muted-foreground'}`}>
                Saldo: {saldo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${isCritico ? 'text-destructive/50' : 'text-amber-500/50'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
