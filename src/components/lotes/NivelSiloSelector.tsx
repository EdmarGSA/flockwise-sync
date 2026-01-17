import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface NivelSiloSelectorProps {
  numeroAneis: number;
  capacidadeToneladas: number;
  nivelFunil: number;
  nivelAneis: number;
  onNivelFunilChange: (value: number) => void;
  onNivelAneisChange: (value: number) => void;
}

export function NivelSiloSelector({
  numeroAneis,
  capacidadeToneladas,
  nivelFunil,
  nivelAneis,
  onNivelFunilChange,
  onNivelAneisChange,
}: NivelSiloSelectorProps) {
  // Generate ring options from 0 to numeroAneis in 0.5 increments
  const opcoesAneis = useMemo(() => {
    const opcoes: { value: number; label: string }[] = [];
    for (let i = 0; i <= numeroAneis; i += 0.5) {
      const label = i === 0 ? 'Vazio (0)' : 
                    i === 0.5 ? '½ anel' :
                    i % 1 === 0 ? `${i} ${i === 1 ? 'anel' : 'anéis'}` : 
                    `${Math.floor(i)} ½ anéis`;
      opcoes.push({ value: i, label });
    }
    return opcoes;
  }, [numeroAneis]);

  // Calculate estimated remaining feed in kg
  // Formula: funil = ~15% of capacity, anéis = ~85% distributed evenly
  const capacidadeKg = capacidadeToneladas * 1000;
  const capacidadeFunil = capacidadeKg * 0.15;
  const capacidadeAneis = capacidadeKg * 0.85;

  const volumeEstimado = useMemo(() => {
    const volumeFunil = nivelFunil * capacidadeFunil;
    const volumeAneis = numeroAneis > 0 
      ? (nivelAneis / numeroAneis) * capacidadeAneis 
      : 0;
    return volumeFunil + volumeAneis;
  }, [nivelFunil, nivelAneis, capacidadeFunil, capacidadeAneis, numeroAneis]);

  // Visual representation: calculate fill percentage
  const percentualPreenchido = capacidadeKg > 0 ? (volumeEstimado / capacidadeKg) * 100 : 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Package className="w-4 h-4" />
          <span>Nível Atual do Silo</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Funil</Label>
            <Select 
              value={nivelFunil.toString()} 
              onValueChange={(v) => onNivelFunilChange(parseFloat(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Vazio (0)</SelectItem>
                <SelectItem value="0.5">Meio (½)</SelectItem>
                <SelectItem value="1">Cheio (1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Anéis preenchidos</Label>
            <Select 
              value={nivelAneis.toString()} 
              onValueChange={(v) => {
                const aneis = parseFloat(v);
                onNivelAneisChange(aneis);
                // Se tem ração nos anéis, funil está necessariamente cheio (gravidade)
                if (aneis > 0) {
                  onNivelFunilChange(1);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcoesAneis.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value.toString()}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Visual silo representation */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-20 flex flex-col">
            {/* Silo body (rings) */}
            <div className="flex-1 bg-muted rounded-t-sm border border-border overflow-hidden flex flex-col-reverse">
              <div 
                className="bg-amber-500/70 transition-all duration-300"
                style={{ height: `${Math.min(percentualPreenchido, 100)}%` }}
              />
            </div>
            {/* Funnel */}
            <div 
              className="h-4 border-l border-r border-b border-border"
              style={{
                clipPath: 'polygon(0% 0%, 100% 0%, 70% 100%, 30% 100%)',
                background: nivelFunil > 0 
                  ? `linear-gradient(to bottom, hsl(var(--amber-500) / 0.7) ${nivelFunil * 100}%, hsl(var(--muted)) ${nivelFunil * 100}%)`
                  : 'hsl(var(--muted))'
              }}
            />
          </div>

          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Estimativa de ração restante:</p>
            <p className="text-xl font-bold text-primary">
              {volumeEstimado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </p>
            <p className="text-xs text-muted-foreground">
              (~{percentualPreenchido.toFixed(0)}% do silo)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
