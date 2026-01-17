import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bird } from 'lucide-react';

interface LoteAlarme {
  id: string;
  nucleo_nome: string;
  galpao_nome: string;
  quantidade_aves: number;
  idade: number;
  nivel_silo: number;
  dias_estoque: number;
}

interface LotesAlarmeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: LoteAlarme[];
}

export function LotesAlarmeDialog({ open, onOpenChange, lotes }: LotesAlarmeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Lotes em Alarme (Silo &lt; 1 dia)
          </DialogTitle>
        </DialogHeader>

        {lotes.length === 0 ? (
          <div className="text-center py-8">
            <Bird className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum lote em situação crítica</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Núcleo</TableHead>
                <TableHead>Galpão</TableHead>
                <TableHead>Aves</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Nível Silo</TableHead>
                <TableHead>Dias Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-medium">{lote.nucleo_nome}</TableCell>
                  <TableCell>{lote.galpao_nome}</TableCell>
                  <TableCell>{lote.quantidade_aves.toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lote.idade} dias</Badge>
                  </TableCell>
                  <TableCell>
                    {lote.nivel_silo < 0 ? (
                      <span className="text-destructive font-medium">Déficit</span>
                    ) : (
                      `${lote.nivel_silo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {lote.dias_estoque < 0 ? 'Déficit' : `${lote.dias_estoque}d`}
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
