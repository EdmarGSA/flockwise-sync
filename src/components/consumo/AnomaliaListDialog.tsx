import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface LoteAnomalia {
  id: string;
  nucleo_nome: string;
  galpao_nome: string;
  consumoRealKg: number;
  consumoEsperadoKg: number;
  desvioPercent: number;
}

interface AnomaliaListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: LoteAnomalia[];
}

export function AnomaliaListDialog({ open, onOpenChange, lotes }: AnomaliaListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Lotes com Consumo Anômalo
          </DialogTitle>
        </DialogHeader>

        {lotes.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum lote com anomalia de consumo detectada.</p>
            <p className="text-xs text-muted-foreground mt-1">Desvios acima de 15% são considerados anômalos.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Consumo Real</TableHead>
                <TableHead>Esperado</TableHead>
                <TableHead>Desvio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-medium">
                    {lote.nucleo_nome} - {lote.galpao_nome}
                  </TableCell>
                  <TableCell>
                    {lote.consumoRealKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                  </TableCell>
                  <TableCell>
                    {lote.consumoEsperadoKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={lote.desvioPercent > 0 ? 'destructive' : 'secondary'}
                      className="gap-1"
                    >
                      {lote.desvioPercent > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {lote.desvioPercent > 0 ? '+' : ''}{lote.desvioPercent}%
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
