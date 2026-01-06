import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

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

interface AlertasDetalheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoCritico[];
  tipo: 'critico' | 'atencao';
}

export default function AlertasDetalheDialog({
  open,
  onOpenChange,
  produtos,
  tipo,
}: AlertasDetalheDialogProps) {
  const produtosFiltrados = produtos.filter(p => p.nivel_critico === tipo);
  const isCritico = tipo === 'critico';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isCritico ? 'text-destructive' : 'text-yellow-500'}`} />
            {isCritico ? 'Alertas Críticos' : 'Alertas de Atenção'} - Detalhamento
          </DialogTitle>
          <DialogDescription>
            {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}{' '}
            {isCritico ? 'em situação crítica' : 'requerem atenção'}
          </DialogDescription>
        </DialogHeader>

        {produtosFiltrados.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum produto {isCritico ? 'em situação crítica' : 'requerendo atenção'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Estoque Atual</TableHead>
                <TableHead className="text-right">Estoque Mínimo</TableHead>
                <TableHead className="text-right">Consumo/Dia</TableHead>
                <TableHead className="text-right">Dias Restantes</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosFiltrados.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">{produto.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={produto.estoque_atual < produto.estoque_minimo ? 'text-destructive font-bold' : ''}>
                      {produto.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {produto.estoque_minimo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {produto.consumo_medio_diario.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono ${
                      produto.dias_restantes < 3 ? 'text-destructive font-bold' :
                      produto.dias_restantes <= 7 ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {produto.dias_restantes === 999 ? '∞' : `${produto.dias_restantes}d`}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isCritico ? 'destructive' : 'outline'} className={!isCritico ? 'border-yellow-500 text-yellow-500' : ''}>
                      {isCritico ? 'Crítico' : 'Atenção'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
