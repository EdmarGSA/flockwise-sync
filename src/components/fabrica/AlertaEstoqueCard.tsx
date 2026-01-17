import { AlertTriangle, Package, Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  estoque_comprometido?: number;
  estoque_disponivel?: number;
  ops_vinculadas?: number;
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
    <TooltipProvider>
      <div className="space-y-3">
        {produtos.slice(0, 10).map((produto) => {
          const temComprometido = (produto.estoque_comprometido || 0) > 0;
          const estoqueDisponivel = produto.estoque_disponivel ?? produto.estoque_atual;
          
          return (
            <div 
              key={produto.id}
              className={`flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border gap-4 ${
                produto.nivel_critico === 'critico' 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : 'border-yellow-500/50 bg-yellow-500/5'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
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

              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm">
                {/* Estoque Atual */}
                <div className="text-right min-w-[80px]">
                  <p className="text-muted-foreground text-xs">Estoque Atual</p>
                  <p className="font-medium text-foreground">
                    {produto.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                  </p>
                </div>

                {/* Comprometido (OPs) - só mostra se tiver */}
                {temComprometido && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-right min-w-[80px] cursor-help">
                        <p className="text-muted-foreground text-xs flex items-center justify-end gap-1">
                          <FileText className="w-3 h-3" /> OPs
                        </p>
                        <p className="font-medium text-orange-500">
                          -{produto.estoque_comprometido?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{produto.ops_vinculadas || 0} OP(s) em aberto usando este insumo</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Disponível - só mostra se tiver comprometido */}
                {temComprometido && (
                  <div className="text-right min-w-[80px]">
                    <p className="text-muted-foreground text-xs">Disponível</p>
                    <p className={`font-medium ${
                      estoqueDisponivel < 0 
                        ? 'text-destructive' 
                        : estoqueDisponivel < produto.estoque_minimo
                          ? 'text-yellow-500'
                          : 'text-foreground'
                    }`}>
                      {estoqueDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                    </p>
                  </div>
                )}

                {/* Mínimo */}
                <div className="text-right min-w-[80px]">
                  <p className="text-muted-foreground text-xs">Mínimo</p>
                  <p className="font-medium text-foreground">
                    {produto.estoque_minimo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                  </p>
                </div>

                {/* Dias Restantes */}
                <div className="text-right min-w-[70px]">
                  <p className="text-muted-foreground text-xs flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> Dias
                  </p>
                  <p className={`font-medium ${
                    produto.dias_restantes < 0
                      ? 'text-destructive'
                      : produto.dias_restantes < 3 
                        ? 'text-destructive' 
                        : produto.dias_restantes <= 7 
                          ? 'text-yellow-500' 
                          : 'text-foreground'
                  }`}>
                    {produto.dias_restantes >= 999 ? '∞' : produto.dias_restantes}
                  </p>
                </div>

                {/* Consumo/Dia */}
                <div className="text-right min-w-[80px]">
                  <p className="text-muted-foreground text-xs">Consumo/Dia</p>
                  <p className="font-medium text-foreground">
                    {produto.consumo_medio_diario.toFixed(2)} {produto.unidade_medida}
                  </p>
                </div>

                {getNivelBadge(produto.nivel_critico)}
              </div>
            </div>
          );
        })}

        {produtos.length > 10 && (
          <p className="text-center text-muted-foreground text-sm">
            ... e mais {produtos.length - 10} produtos em alerta
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
