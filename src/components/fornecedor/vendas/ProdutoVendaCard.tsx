import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Plus, Minus, ShoppingCart, Package, Percent } from 'lucide-react';
import { ProdutoCatalogo } from '@/hooks/useFornecedorData';

interface ProdutoVendaCardProps {
  produto: ProdutoCatalogo;
  precoFinal: number;
  emPromocao: boolean;
  percentualDesconto?: number;
  onAddCarrinho: (produto: ProdutoCatalogo, quantidade: number, precoPromocional?: number) => void;
}

export const ProdutoVendaCard = ({
  produto,
  precoFinal,
  emPromocao,
  percentualDesconto,
  onAddCarrinho
}: ProdutoVendaCardProps) => {
  const [quantidade, setQuantidade] = useState(1);
  const [showQuantidade, setShowQuantidade] = useState(false);

  const estoqueStatus = produto.estoque_proprio <= 0 
    ? 'esgotado' 
    : produto.estoque_proprio <= produto.estoque_minimo 
      ? 'baixo' 
      : 'ok';

  const handleAdd = () => {
    if (produto.estoque_proprio <= 0) return;
    
    onAddCarrinho(
      produto, 
      quantidade, 
      emPromocao ? precoFinal : undefined
    );
    setQuantidade(1);
    setShowQuantidade(false);
  };

  const handleQuickAdd = () => {
    if (produto.estoque_proprio <= 0) return;
    onAddCarrinho(produto, 1, emPromocao ? precoFinal : undefined);
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-200 border-border/50">
      {/* Imagem */}
      <div className="relative">
        <AspectRatio ratio={1}>
          {produto.imagem_url ? (
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </AspectRatio>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {emPromocao && (
            <Badge className="bg-destructive text-destructive-foreground gap-1">
              <Percent className="h-3 w-3" />
              -{percentualDesconto}%
            </Badge>
          )}
          
          {estoqueStatus === 'baixo' && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/50">
              Estoque baixo
            </Badge>
          )}
          
          {estoqueStatus === 'esgotado' && (
            <Badge variant="destructive">
              Esgotado
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Nome e Código */}
        <div>
          <p className="text-xs text-muted-foreground">{produto.codigo_interno}</p>
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
            {produto.nome}
          </h3>
        </div>

        {/* Preço */}
        <div className="space-y-1">
          {emPromocao && (
            <p className="text-xs text-muted-foreground line-through">
              R$ {produto.preco_tabela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className={`text-lg font-bold ${emPromocao ? 'text-primary' : 'text-foreground'}`}>
            R$ {precoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">
            por {produto.unidade_venda}
          </p>
        </div>

        {/* Estoque */}
        <p className="text-xs text-muted-foreground">
          Estoque: {produto.estoque_proprio} {produto.unidade_venda}
        </p>

        {/* Botões */}
        {estoqueStatus !== 'esgotado' && (
          <div className="space-y-2">
            {showQuantidade ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={produto.estoque_proprio}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.min(
                    produto.estoque_proprio,
                    Math.max(1, parseInt(e.target.value) || 1)
                  ))}
                  className="h-8 w-16 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantidade(Math.min(produto.estoque_proprio, quantidade + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex gap-2">
              {showQuantidade ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowQuantidade(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={handleAdd}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowQuantidade(true)}
                  >
                    Qtd
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={handleQuickAdd}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
