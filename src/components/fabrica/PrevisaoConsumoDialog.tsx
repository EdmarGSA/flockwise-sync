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
import { Calendar } from 'lucide-react';
import type { RacaoDetalhe } from './EstoqueRacaoDialog';

interface PrevisaoConsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racoes: RacaoDetalhe[];
  totalPrevisao: number;
}

export default function PrevisaoConsumoDialog({
  open,
  onOpenChange,
  racoes,
  totalPrevisao,
}: PrevisaoConsumoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Previsão de Consumo (3 dias) - Detalhamento
          </DialogTitle>
          <DialogDescription>
            Total previsto:{' '}
            <span className="font-bold text-purple-500">
              {totalPrevisao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
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
                <TableHead className="text-right">Consumo/Dia</TableHead>
                <TableHead className="text-right">Previsão 3d</TableHead>
                <TableHead className="text-right">Estoque Atual</TableHead>
                <TableHead className="text-right">Dias Restantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {racoes.map((racao) => {
                const previsao3d = racao.consumo_medio_diario * 3;
                return (
                  <TableRow key={racao.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{racao.nome}</p>
                        <p className="text-xs text-muted-foreground">{racao.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {racao.consumo_medio_diario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                    </TableCell>
                    <TableCell className="text-right font-mono text-purple-500">
                      {previsao3d.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {racao.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
