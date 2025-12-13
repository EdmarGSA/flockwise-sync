import { AlertTriangle, Package, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProdutoCritico {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  consumo_medio_diario: number;
  dias_restantes: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
}

interface AlertaEstoqueCardProps {
  produtos: ProdutoCritico[];
}

export default function AlertaEstoqueCard({ produtos }: AlertaEstoqueCardProps) {
  const getNivelBadge = (nivel: string) => {
    switch (nivel) {
      case 'critico':
        return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
      case 'atencao':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">Atenção</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">OK</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {produtos.slice(0, 10).map((produto) => (
        <div 
          key={produto.id}
          className={`flex items-center justify-between p-4 rounded-lg border ${
            produto.nivel_critico === 'critico' 
              ? 'border-destructive/50 bg-destructive/5' 
              : 'border-yellow-500/50 bg-yellow-500/5'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              produto.nivel_critico === 'critico' 
                ? 'bg-destructive/20' 
                : 'bg-yellow-500/20'
            }`}>
              <Package className={`w-5 h-5 ${
                produto.nivel_critico === 'critico' 
                  ? 'text-destructive' 
                  : 'text-yellow-500'
              }`} />
            </div>
            <div>
              <p className="font-medium text-foreground">{produto.nome}</p>
              <p className="text-sm text-muted-foreground">SKU: {produto.sku}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground">Estoque Atual</p>
              <p className={`font-medium ${
                produto.estoque_atual < produto.estoque_minimo 
                  ? 'text-destructive' 
                  : 'text-foreground'
              }`}>
                {produto.estoque_atual.toLocaleString('pt-BR')} {produto.unidade_medida}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Mínimo</p>
              <p className="font-medium text-foreground">
                {produto.estoque_minimo.toLocaleString('pt-BR')} {produto.unidade_medida}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Dias Restantes
              </p>
              <p className={`font-medium ${
                produto.dias_restantes < 3 
                  ? 'text-destructive' 
                  : produto.dias_restantes <= 7 
                    ? 'text-yellow-500' 
                    : 'text-foreground'
              }`}>
                {produto.dias_restantes >= 999 ? '∞' : produto.dias_restantes}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Consumo/Dia</p>
              <p className="font-medium text-foreground">
                {produto.consumo_medio_diario.toFixed(2)} {produto.unidade_medida}
              </p>
            </div>
            {getNivelBadge(produto.nivel_critico)}
          </div>
        </div>
      ))}

      {produtos.length > 10 && (
        <p className="text-center text-muted-foreground text-sm">
          ... e mais {produtos.length - 10} produtos em alerta
        </p>
      )}
    </div>
  );
}
