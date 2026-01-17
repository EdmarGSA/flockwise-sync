import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Truck, CheckCircle, Package, RefreshCw, XCircle, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Solicitacao {
  id: string;
  lote_id: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  data_prevista_entrega: string | null;
  status: string;
  data_solicitacao: string;
  quantidade_recebida_kg: number | null;
  quantidade_devolvida_kg: number | null;
  devolucao_confirmada: boolean;
  urgente?: boolean;
  nucleo_nome?: string;
  galpao_nome?: string;
}

interface SolicitacoesFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: React.ReactNode;
  solicitacoes: Solicitacao[];
  onConfirmar?: (s: Solicitacao) => void;
  onEnviar?: (s: Solicitacao) => void;
  onConfirmarDevolucao?: (s: Solicitacao) => void;
}

export function SolicitacoesFilterDialog({ 
  open, 
  onOpenChange, 
  title,
  icon,
  solicitacoes,
  onConfirmar,
  onEnviar,
  onConfirmarDevolucao
}: SolicitacoesFilterDialogProps) {
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string, urgente?: boolean) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
      solicitado: { label: 'Solicitado', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      confirmado: { label: 'Confirmado', variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
      enviado: { label: 'Enviado', variant: 'destructive', icon: <Truck className="w-3 h-3" /> },
      recebido: { label: 'Recebido', variant: 'default', icon: <Package className="w-3 h-3" /> },
      parcialmente_devolvido: { label: 'Devol. Parcial', variant: 'secondary', icon: <RefreshCw className="w-3 h-3" /> },
      devolvido: { label: 'Devolvido', variant: 'outline', icon: <RefreshCw className="w-3 h-3" /> },
      cancelado: { label: 'Cancelado', variant: 'outline', icon: <XCircle className="w-3 h-3" /> },
    };
    const config = variants[status] || { label: status, variant: 'outline', icon: null };
    return (
      <div className="flex items-center gap-1">
        {urgente && (
          <Badge variant="destructive" className="gap-0.5 px-1.5 py-0.5">
            <Flame className="w-3 h-3" />
          </Badge>
        )}
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          {config.label}
        </Badge>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title} ({solicitacoes.length})
          </DialogTitle>
        </DialogHeader>

        {solicitacoes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Tipo Ração</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.nucleo_nome ? `${s.nucleo_nome} - ${s.galpao_nome}` : '-'}
                  </TableCell>
                  <TableCell>{s.tipo_racao}</TableCell>
                  <TableCell>{s.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</TableCell>
                  <TableCell className="text-sm">{formatDateTime(s.data_prevista_entrega)}</TableCell>
                  <TableCell>{getStatusBadge(s.status, s.urgente)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.status === 'solicitado' && onConfirmar && (
                        <Button size="sm" variant="outline" onClick={() => onConfirmar(s)}>
                          Confirmar
                        </Button>
                      )}
                      {s.status === 'confirmado' && onEnviar && (
                        <Button size="sm" variant="default" onClick={() => onEnviar(s)} className="gap-1">
                          <Truck className="w-4 h-4" />
                          Enviar
                        </Button>
                      )}
                      {s.quantidade_devolvida_kg && s.quantidade_devolvida_kg > 0 && !s.devolucao_confirmada && onConfirmarDevolucao && (
                        <Button size="sm" variant="secondary" onClick={() => onConfirmarDevolucao(s)} className="gap-1">
                          <RefreshCw className="w-4 h-4" />
                          Confirm. Devol.
                        </Button>
                      )}
                    </div>
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
