import { Badge } from '@/components/ui/badge';
import { Egg, Sprout, Baby } from 'lucide-react';

interface FasePosturaBadgeProps {
  semanasVida: number;
  showLabel?: boolean;
}

export function FasePosturaBadge({ semanasVida, showLabel = true }: FasePosturaBadgeProps) {
  const getFase = () => {
    if (semanasVida <= 6) {
      return {
        fase: 'cria',
        label: 'Cria',
        icon: Baby,
        variant: 'secondary' as const,
        color: 'text-amber-500',
      };
    }
    if (semanasVida <= 18) {
      return {
        fase: 'recria',
        label: 'Recria',
        icon: Sprout,
        variant: 'outline' as const,
        color: 'text-emerald-500',
      };
    }
    return {
      fase: 'producao',
      label: 'Produção',
      icon: Egg,
      variant: 'default' as const,
      color: 'text-primary',
    };
  };

  const { label, icon: Icon, variant, color } = getFase();

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={`w-3 h-3 ${color}`} />
      {showLabel && label}
    </Badge>
  );
}
