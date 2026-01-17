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
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const racoesNegativas = racoes.filter(r => r.estoque_atual < 0).length;
  const racoesCriticas = racoes.filter(r => r.estoque_atual >= 0 && r.dias_restantes < 3 && r.dias_restantes !== 999).length;

  const getRowStatus = (racao: RacaoDetalhe) => {
    if (racao.estoque_atual < 0) return 'negativo';
    if (racao.dias_restantes < 3 && racao.dias_restantes !== 999) return 'critico';
    if (racao.dias_restantes <= 7 && racao.dias_restantes !== 999) return 'atencao';
    return 'ok';
  };

  const getRowClassName = (racao: RacaoDetalhe) => {
    const status = getRowStatus(racao);
    switch (status) {
      case 'negativo': return 'bg-destructive/10';
      case 'critico': return 'bg-yellow-500/10';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Estoque de Ração - Detalhamento
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-3">
            <span>
              Total em estoque:{' '}
              <span className="font-bold text-green-500">
                {totalEstoque.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </span>
            </span>
            {racoesNegativas > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {racoesNegativas} Negativo{racoesNegativas > 1 ? 's' : ''}
              </Badge>
            )}
            {racoesCriticas > 0 && (
              <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500">
                <AlertTriangle className="w-3 h-3" />
                {racoesCriticas} Crítico{racoesCriticas > 1 ? 's' : ''}
              </Badge>
            )}
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
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {racoes.map((racao) => {
                const status = getRowStatus(racao);
                return (
                  <TableRow key={racao.id} className={getRowClassName(racao)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{racao.nome}</p>
                        <p className="text-xs text-muted-foreground">{racao.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${racao.estoque_atual < 0 ? 'text-destructive font-bold' : ''}`}>
                      {racao.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {racao.percentual_total.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {racao.consumo_medio_diario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                    </TableCell>
                    <TableCell className="text-right">
                      {status === 'negativo' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Negativo
                        </Badge>
                      ) : status === 'critico' ? (
                        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500 bg-yellow-500/10">
                          {racao.dias_restantes}d
                        </Badge>
                      ) : status === 'atencao' ? (
                        <span className="text-yellow-500 font-mono">
                          {racao.dias_restantes}d
                        </span>
                      ) : (
                        <span className="text-green-500 font-mono">
                          {racao.dias_restantes === 999 ? '∞' : `${racao.dias_restantes}d`}
                        </span>
                      )}
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
