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
import { TrendingUp } from 'lucide-react';

export interface RacaoDetalhe {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  unidade_medida: string;
  consumo_medio_diario: number;
  dias_restantes: number;
  percentual_total: number;
}

interface EstoqueRacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racoes: RacaoDetalhe[];
  totalEstoque: number;
}

export default function EstoqueRacaoDialog({
  open,
  onOpenChange,
  racoes,
  totalEstoque,
}: EstoqueRacaoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Estoque de Ração - Detalhamento
          </DialogTitle>
          <DialogDescription>
            Total em estoque:{' '}
            <span className="font-bold text-green-500">
              {totalEstoque.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </span>
          </DialogDescription>
        </DialogHeader>

        {racoes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma ração cadastrada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">% do Total</TableHead>
                <TableHead className="text-right">Consumo Médio/Dia</TableHead>
                <TableHead className="text-right">Dias Restantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {racoes.map((racao) => (
                <TableRow key={racao.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{racao.nome}</p>
                      <p className="text-xs text-muted-foreground">{racao.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {racao.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {racao.percentual_total.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {racao.consumo_medio_diario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono ${
                      racao.dias_restantes < 3 ? 'text-destructive font-bold' :
                      racao.dias_restantes <= 7 ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {racao.dias_restantes === 999 ? '∞' : `${racao.dias_restantes}d`}
                    </span>
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
