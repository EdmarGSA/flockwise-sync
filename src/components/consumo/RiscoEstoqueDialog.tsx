import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingDown } from 'lucide-react';

interface LoteRisco {
  id: string;
  nucleo_nome: string;
  galpao_nome: string;
  diasEstoque: number;
  nivelSilo: number;
  consumoDiarioKg: number;
}

interface RiscoEstoqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: LoteRisco[];
}

export function RiscoEstoqueDialog({ open, onOpenChange, lotes }: RiscoEstoqueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Lotes em Risco (1-3 dias de estoque)
          </DialogTitle>
        </DialogHeader>

        {lotes.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum lote em risco de desabastecimento.</p>
            <p className="text-xs text-muted-foreground mt-1">Lotes com 1-3 dias de estoque aparecerão aqui.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Dias Restantes</TableHead>
                <TableHead>Nível Silo</TableHead>
                <TableHead>Consumo/dia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-medium">
                    {lote.nucleo_nome} - {lote.galpao_nome}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className="bg-amber-500/20 text-amber-600 border-amber-500/30"
                    >
                      {lote.diasEstoque} dias
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lote.nivelSilo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-muted-foreground" />
                    {lote.consumoDiarioKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
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
