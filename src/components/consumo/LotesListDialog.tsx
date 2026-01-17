import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bird, Package, AlertTriangle } from 'lucide-react';

interface LoteInfo {
  id: string;
  nucleo_nome: string;
  galpao_nome: string;
  quantidade_aves: number;
  idade: number;
  status: string;
  nivel_silo: number;
  dias_estoque: number;
}

interface LotesListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: LoteInfo[];
  onSolicitarRacao?: (loteId: string) => void;
}

export function LotesListDialog({ open, onOpenChange, lotes, onSolicitarRacao }: LotesListDialogProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'destructive' },
      alojado: { label: 'Alojado', variant: 'default' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDiasEstoqueBadge = (dias: number, nivel: number) => {
    if (nivel < 0 || dias < 1) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {nivel < 0 ? 'Déficit' : `${dias}d`}
        </Badge>
      );
    }
    if (dias <= 3) {
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
          {dias}d
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30">
        {dias}d
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bird className="w-5 h-5 text-primary" />
            Todos os Lotes ({lotes.length})
          </DialogTitle>
        </DialogHeader>

        {lotes.length === 0 ? (
          <div className="text-center py-8">
            <Bird className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum lote encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Núcleo</TableHead>
                <TableHead>Galpão</TableHead>
                <TableHead>Aves</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Nível Silo</TableHead>
                <TableHead>Dias Estoque</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell>{getStatusBadge(lote.status)}</TableCell>
                  <TableCell className="font-medium">{lote.nucleo_nome}</TableCell>
                  <TableCell>{lote.galpao_nome}</TableCell>
                  <TableCell>{lote.quantidade_aves.toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    {lote.idade > 0 ? (
                      <Badge variant="secondary">{lote.idade} dias</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {lote.nivel_silo < 0 ? (
                      <span className="text-destructive font-medium">Déficit</span>
                    ) : (
                      `${lote.nivel_silo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    )}
                  </TableCell>
                  <TableCell>
                    {lote.idade > 0 ? getDiasEstoqueBadge(lote.dias_estoque, lote.nivel_silo) : '-'}
                  </TableCell>
                  <TableCell>
                    {onSolicitarRacao && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onSolicitarRacao(lote.id)}
                        className="gap-1"
                      >
                        <Package className="w-4 h-4" />
                        Ração
                      </Button>
                    )}
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
