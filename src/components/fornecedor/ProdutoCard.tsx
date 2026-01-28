import { Package, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ProdutoCatalogo } from './ProdutoCatalogoForm';

interface ProdutoCardProps {
  produto: ProdutoCatalogo;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  showStock?: boolean;
  showCost?: boolean;
}

export function ProdutoCard({ 
  produto, 
  onEdit, 
  onDelete, 
  showActions = true,
  showStock = true,
  showCost = false
}: ProdutoCardProps) {
  const getStockBadge = () => {
    if (!showStock) {
      return produto.estoque_proprio > 0 ? (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Disponível
        </Badge>
      ) : (
        <Badge variant="secondary">Sob consulta</Badge>
      );
    }

    if (produto.estoque_proprio <= 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    }
    if (produto.estoque_proprio <= produto.estoque_minimo) {
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Estoque Baixo ({produto.estoque_proprio})
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        {produto.estoque_proprio} disponíveis
      </Badge>
    );
  };

  return (
    <Card className={`group overflow-hidden transition-all hover:shadow-lg ${!produto.ativo ? 'opacity-60' : ''}`}>
      {/* Imagem */}
      <AspectRatio ratio={1} className="bg-muted">
        {produto.imagem_url ? (
          <img 
            src={produto.imagem_url} 
            alt={produto.nome}
            className="object-cover w-full h-full transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        {!produto.ativo && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="secondary">Inativo</Badge>
          </div>
        )}
      </AspectRatio>
      
      {/* Conteúdo */}
      <CardContent className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold line-clamp-2 min-h-[2.5rem]">{produto.nome}</h3>
          {produto.marca && (
            <p className="text-sm text-muted-foreground">{produto.marca}</p>
          )}
          {produto.categoria && (
            <p className="text-xs text-muted-foreground">{produto.categoria}</p>
          )}
        </div>
        
        {/* Preço */}
        <div className="pt-2">
          <p className="text-2xl font-bold text-primary">
            R$ {produto.preco_tabela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              /{produto.unidade_venda}
            </span>
          </p>
          {showCost && produto.custo && (
            <p className="text-xs text-muted-foreground">
              Custo: R$ {produto.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        
        {/* Badge de Estoque */}
        <div className="pt-1">
          {getStockBadge()}
        </div>

        {/* Código */}
        <p className="text-xs font-mono text-muted-foreground">
          SKU: {produto.codigo_interno}
        </p>
      </CardContent>
      
      {/* Ações (visíveis no hover) */}
      {showActions && (
        <CardFooter className="p-4 pt-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
