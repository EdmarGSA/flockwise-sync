import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Flame, CheckCircle, XCircle, Truck, RefreshCw, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SolicitacaoRacao {
  id: string;
  lote_id: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  quantidade_recebida_kg?: number | null;
  quantidade_devolvida_kg?: number | null;
  data_prevista_entrega: string;
  status: string;
  urgente?: boolean;
  devolucao_confirmada?: boolean;
}

interface LoteConsumo {
  id: string;
  nucleo?: { nome: string } | null;
  galpao?: { nome: string } | null;
}

type SolicitacaoFilter = 'todos' | 'a_confirmar' | 'a_enviar' | 'enviados' | 'urgentes';

interface SolicitacoesRacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacoes: SolicitacaoRacao[];
  lotes: LoteConsumo[];
  filter: SolicitacaoFilter;
  onFilterChange: (filter: SolicitacaoFilter) => void;
  urgentesCount: number;
  onConfirmar?: (solicitacao: SolicitacaoRacao) => void;
  onEnviar?: (solicitacao: SolicitacaoRacao) => void;
  onCancelar?: (solicitacao: SolicitacaoRacao) => void;
  onConfirmarDevolucao?: (solicitacao: SolicitacaoRacao) => void;
}

export function SolicitacoesRacaoDialog({
  open,
  onOpenChange,
  solicitacoes,
  lotes,
  filter,
  onFilterChange,
  urgentesCount,
  onConfirmar,
  onEnviar,
  onCancelar,
  onConfirmarDevolucao,
}: SolicitacoesRacaoDialogProps) {
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getSolicitacaoStatusBadge = (status: string, urgente?: boolean) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'solicitado': { label: 'Pendente', variant: 'outline' },
      'confirmado': { label: 'Confirmado', variant: 'secondary' },
      'enviado': { label: 'Enviado', variant: 'default' },
      'recebido': { label: 'Recebido', variant: 'default' },
      'cancelado': { label: 'Cancelado', variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    
    return (
      <div className="flex items-center gap-1">
        {urgente && <Flame className="w-4 h-4 text-destructive" />}
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
    );
  };

  const getLoteInfo = (loteId: string) => {
    const lote = lotes.find(l => l.id === loteId);
    if (!lote) return '-';
    return `${lote.nucleo?.nome || '-'} - ${lote.galpao?.nome || '-'}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Solicitações de Ração
          </DialogTitle>
        </DialogHeader>

        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as SolicitacaoFilter)} className="mb-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="a_confirmar">A Confirmar</TabsTrigger>
            <TabsTrigger value="a_enviar">A Enviar</TabsTrigger>
            <TabsTrigger value="enviados">Enviados</TabsTrigger>
            <TabsTrigger value="urgentes" className="gap-1">
              <Flame className="w-3 h-3" />
              Urgentes {urgentesCount > 0 && `(${urgentesCount})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {solicitacoes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação de ração encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Tipo Ração</TableHead>
                  <TableHead>Qtd. Solicitada</TableHead>
                  <TableHead>Previsão Entrega</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Devolvido</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map((solicitacao) => (
                  <TableRow key={solicitacao.id}>
                    <TableCell className="font-medium">
                      {getLoteInfo(solicitacao.lote_id)}
                    </TableCell>
                    <TableCell>{solicitacao.tipo_racao}</TableCell>
                    <TableCell>{solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</TableCell>
                    <TableCell>{formatDateTime(solicitacao.data_prevista_entrega)}</TableCell>
                    <TableCell>{getSolicitacaoStatusBadge(solicitacao.status, solicitacao.urgente)}</TableCell>
                    <TableCell>
                      {solicitacao.quantidade_recebida_kg 
                        ? `${solicitacao.quantidade_recebida_kg.toLocaleString('pt-BR')} kg` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {solicitacao.quantidade_devolvida_kg && solicitacao.quantidade_devolvida_kg > 0 ? (
                        <div className="flex items-center gap-1">
                          <span>{solicitacao.quantidade_devolvida_kg.toLocaleString('pt-BR')} kg</span>
                          {solicitacao.devolucao_confirmada && (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {solicitacao.status === 'solicitado' && (
                          <>
                            {onConfirmar && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onConfirmar(solicitacao)}
                              >
                                Confirmar
                              </Button>
                            )}
                            {onCancelar && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja cancelar esta solicitação de {solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg de {solicitacao.tipo_racao}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => onCancelar(solicitacao)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Confirmar Cancelamento
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
                        )}
                        {solicitacao.status === 'confirmado' && (
                          <>
                            {onEnviar && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => onEnviar(solicitacao)}
                                className="gap-1"
                              >
                                <Truck className="w-4 h-4" />
                                Enviar
                              </Button>
                            )}
                            {onCancelar && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja cancelar esta solicitação de {solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg de {solicitacao.tipo_racao}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => onCancelar(solicitacao)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Confirmar Cancelamento
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
                        )}
                        {solicitacao.quantidade_devolvida_kg && 
                         solicitacao.quantidade_devolvida_kg > 0 && 
                         !solicitacao.devolucao_confirmada && 
                         onConfirmarDevolucao && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => onConfirmarDevolucao(solicitacao)}
                            className="gap-1"
                          >
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
