import { cn } from '@/lib/utils';
import { 
  Package, 
  Factory, 
  FlaskConical, 
  Wallet, 
  CreditCard, 
  TrendingUp,
  AlertTriangle,
  Skull
} from 'lucide-react';

interface WarningLight {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'danger';
  icon: React.ReactNode;
  tooltip?: string;
  value?: string; // Numeric value to display
}

interface WarningLightsProps {
  lights: WarningLight[];
}

export const WarningLights = ({ lights }: WarningLightsProps) => {
  const getStatusColor = (status: WarningLight['status']) => {
    switch (status) {
      case 'ok': return 'hsl(var(--chart-2))';
      case 'warning': return 'hsl(var(--chart-4))';
      case 'danger': return 'hsl(var(--destructive))';
    }
  };

  const getStatusBg = (status: WarningLight['status']) => {
    switch (status) {
      case 'ok': return 'bg-chart-2/20';
      case 'warning': return 'bg-chart-4/20';
      case 'danger': return 'bg-destructive/20';
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Painel de Alertas</span>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {lights.map((light) => (
          <div 
            key={light.id}
            className="flex flex-col items-center gap-1 group relative"
            title={light.tooltip}
          >
            {/* Light bulb */}
            <div 
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                getStatusBg(light.status),
                light.status === 'danger' && "animate-pulse"
              )}
              style={{ 
                boxShadow: `0 0 12px ${getStatusColor(light.status)}50`
              }}
            >
              <div 
                className="w-6 h-6"
                style={{ color: getStatusColor(light.status) }}
              >
                {light.icon}
              </div>
            </div>

            {/* Label */}
            <span className="text-[10px] font-medium text-muted-foreground text-center">
              {light.label}
            </span>

            {/* Numeric Value */}
            {light.value && (
              <span 
                className="text-[9px] font-mono font-bold"
                style={{ color: getStatusColor(light.status) }}
              >
                {light.value}
              </span>
            )}

            {/* Tooltip on hover */}
            {light.tooltip && (
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  {light.tooltip}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Default warning lights configuration with values
export const createWarningLights = (data: {
  giroEstoque: number;
  statusFabrica: number;
  qualidadeMP: number;
  caixa7dias: number;
  creditoUtilizado: number;
  atrasoCR: number;
  gpd: number;
  mortalidade: number;
}): WarningLight[] => [
  {
    id: 'estoque',
    label: 'EST',
    icon: <Package className="w-full h-full" />,
    status: data.giroEstoque <= 60 ? 'ok' : data.giroEstoque <= 90 ? 'warning' : 'danger',
    tooltip: `Giro Estoque: ${data.giroEstoque} dias`,
    value: `${data.giroEstoque}d`
  },
  {
    id: 'fabrica',
    label: 'FAB',
    icon: <Factory className="w-full h-full" />,
    status: data.statusFabrica >= 90 ? 'ok' : data.statusFabrica >= 70 ? 'warning' : 'danger',
    tooltip: `Status Fábrica: ${data.statusFabrica}%`,
    value: `${data.statusFabrica}%`
  },
  {
    id: 'qualidade',
    label: 'QUA',
    icon: <FlaskConical className="w-full h-full" />,
    status: data.qualidadeMP >= 95 ? 'ok' : data.qualidadeMP >= 80 ? 'warning' : 'danger',
    tooltip: `Qualidade MP: ${data.qualidadeMP}% liberado`,
    value: `${data.qualidadeMP}%`
  },
  {
    id: 'caixa',
    label: 'CX',
    icon: <Wallet className="w-full h-full" />,
    status: data.caixa7dias >= 0 ? 'ok' : data.caixa7dias >= -10000 ? 'warning' : 'danger',
    tooltip: `Caixa 7 dias: R$ ${data.caixa7dias.toLocaleString()}`,
    value: data.caixa7dias >= 0 ? '↑' : '↓'
  },
  {
    id: 'credito',
    label: 'CR$',
    icon: <CreditCard className="w-full h-full" />,
    status: data.creditoUtilizado <= 50 ? 'ok' : data.creditoUtilizado <= 70 ? 'warning' : 'danger',
    tooltip: `Crédito Utilizado: ${Math.round(data.creditoUtilizado)}%`,
    value: `${Math.round(data.creditoUtilizado)}%`
  },
  {
    id: 'atraso',
    label: 'ATR',
    icon: <AlertTriangle className="w-full h-full" />,
    status: data.atrasoCR <= 5 ? 'ok' : data.atrasoCR <= 15 ? 'warning' : 'danger',
    tooltip: `Atraso CR: ${Math.round(data.atrasoCR)}%`,
    value: `${Math.round(data.atrasoCR)}%`
  },
  {
    id: 'gpd',
    label: 'GPD',
    icon: <TrendingUp className="w-full h-full" />,
    status: data.gpd >= 98 ? 'ok' : data.gpd >= 90 ? 'warning' : 'danger',
    tooltip: `GPD Performance: ${Math.round(data.gpd)}%`,
    value: `${Math.round(data.gpd)}%`
  },
  {
    id: 'mortalidade',
    label: 'MOR',
    icon: <Skull className="w-full h-full" />,
    status: data.mortalidade <= 0.15 ? 'ok' : data.mortalidade <= 0.3 ? 'warning' : 'danger',
    tooltip: `Mortalidade: ${data.mortalidade.toFixed(2)}%`,
    value: `${data.mortalidade.toFixed(2)}%`
  }
];
