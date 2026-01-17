import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bird, Package, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LoteConsumo {
  id: string;
  status: string;
  quantidade_aves: number;
  quantidadeAlojada?: number;
  diasDesdeAlojamento?: number;
  nivelSilo?: number;
  diasEstoque?: number;
  consumoDiario?: number;
  tendencia?: 'up' | 'down' | 'stable';
  nucleo?: { nome: string } | null;
  galpao?: { nome: string } | null;
}

interface LotesAbertoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: LoteConsumo[];
  loading?: boolean;
  onRacao?: (lote: LoteConsumo) => void;
}

export function LotesAbertoDialog({ 
  open, 
  onOpenChange, 
  lotes, 
  loading = false,
  onRacao 
}: LotesAbertoDialogProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'agendado': { label: 'Agendado', variant: 'outline' },
      'alojado': { label: 'Alojado', variant: 'default' },
      'em_producao': { label: 'Em Produção', variant: 'default' },
      'saida_programada': { label: 'Saída Prog.', variant: 'secondary' },
      'fechado': { label: 'Fechado', variant: 'secondary' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDiasEstoqueBadge = (dias: number, nivelSilo: number) => {
    if (nivelSilo < 0) {
      return <Badge variant="destructive">Déficit</Badge>;
    }
    if (dias < 1) {
      return <Badge variant="destructive">&lt; 1 dia</Badge>;
    }
    if (dias <= 3) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">{dias.toFixed(1)} dias</Badge>;
    }
    return <Badge variant="secondary" className="bg-primary/10 text-primary">{dias.toFixed(1)} dias</Badge>;
  };

  const getTrendIcon = (tendencia?: 'up' | 'down' | 'stable') => {
    if (!tendencia) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (tendencia === 'up') return <span title="Consumo aumentando"><TrendingUp className="w-4 h-4 text-destructive" /></span>;
    if (tendencia === 'down') return <span title="Consumo diminuindo"><TrendingDown className="w-4 h-4 text-primary" /></span>;
    return <span title="Consumo estável"><Minus className="w-4 h-4 text-muted-foreground" /></span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bird className="w-5 h-5" />
            Lotes em Aberto
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : lotes.length === 0 ? (
          <div className="text-center py-12">
            <Bird className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum lote ativo encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead>Galpão</TableHead>
                  <TableHead>Qtd. Aves</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Nível Silo</TableHead>
                  <TableHead>Dias Estoque</TableHead>
                  <TableHead>Tend.</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => (
                  <TableRow key={lote.id} className={(lote.diasEstoque || 0) < 1 && (lote.diasDesdeAlojamento || 0) > 0 ? 'bg-destructive/5' : ''}>
                    <TableCell>{getStatusBadge(lote.status)}</TableCell>
                    <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                    <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                    <TableCell>
                      {(lote.quantidadeAlojada ?? lote.quantidade_aves).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {lote.diasDesdeAlojamento !== undefined && lote.diasDesdeAlojamento > 0 ? (
                        <Badge variant="secondary">{lote.diasDesdeAlojamento} dias</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {lote.diasDesdeAlojamento && lote.diasDesdeAlojamento > 0 ? (
                        lote.nivelSilo !== undefined && lote.nivelSilo < 0 ? (
                          <span className="text-destructive font-medium">Déficit</span>
                        ) : (
                          `${(lote.nivelSilo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                        )
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {lote.diasDesdeAlojamento && lote.diasDesdeAlojamento > 0 ? (
                        getDiasEstoqueBadge(lote.diasEstoque || 0, lote.nivelSilo || 0)
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {lote.diasDesdeAlojamento && lote.diasDesdeAlojamento > 0 ? (
                        getTrendIcon(lote.tendencia)
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {onRacao && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onRacao(lote)}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
