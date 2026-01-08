import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Solicitacao {
  id: string;
  lote_nome: string;
  nucleo_nome: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  data_prevista: string | null;
  status: string;
  created_at: string;
  dias_aguardando: number;
  atrasada: boolean;
}

interface SolicitacoesAbertoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  totalSolicitado: number;
}

export default function SolicitacoesAbertoDialog({
  open,
  onOpenChange,
  integradoId,
  totalSolicitado
}: SolicitacoesAbertoDialogProps) {
  const [loading, setLoading] = useState(true);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);

  useEffect(() => {
    if (open && integradoId) {
      fetchSolicitacoes();
    }
  }, [open, integradoId]);

  const fetchSolicitacoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_racao')
        .select(`
          id, tipo_racao, quantidade_solicitada_kg, data_prevista_entrega, status, created_at, lote_id
        `)
        .eq('integrado_id', integradoId)
        .in('status', ['solicitado', 'confirmado'])
        .order('data_prevista_entrega', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const today = new Date();
      const items: Solicitacao[] = (data || []).map(s => {
        const diasAguardando = differenceInDays(today, parseISO(s.created_at));
        const atrasada = s.data_prevista_entrega ? parseISO(s.data_prevista_entrega) < today : false;
        
        return {
          id: s.id,
          lote_nome: '-',
          nucleo_nome: '-',
          tipo_racao: s.tipo_racao || '-',
          quantidade_solicitada_kg: s.quantidade_solicitada_kg,
          data_prevista: s.data_prevista_entrega,
          status: s.status || 'solicitado',
          created_at: s.created_at,
          dias_aguardando: diasAguardando,
          atrasada
        };
      });

      setSolicitacoes(items);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, atrasada: boolean) => {
    if (atrasada) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Atrasada</Badge>;
    }
    if (status === 'confirmado') {
      return <Badge variant="secondary">Confirmado</Badge>;
    }
    return <Badge variant="outline">Solicitado</Badge>;
  };

  const totalAtrasadas = solicitacoes.filter(s => s.atrasada).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Solicitações em Aberto
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">
              {totalSolicitado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </p>
            <p className="text-sm text-muted-foreground">Total Solicitado</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{solicitacoes.length}</p>
            <p className="text-sm text-muted-foreground">Solicitações</p>
          </div>
          <div className={`rounded-lg p-4 text-center ${totalAtrasadas > 0 ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
            <p className={`text-2xl font-bold ${totalAtrasadas > 0 ? 'text-destructive' : ''}`}>
              {totalAtrasadas}
            </p>
            <p className="text-sm text-muted-foreground">Atrasadas</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação em aberto
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote/Galpão</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead>Tipo Ração</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead className="text-center">Aguardando</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map(s => (
                  <TableRow key={s.id} className={s.atrasada ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{s.lote_nome}</TableCell>
                    <TableCell>{s.nucleo_nome}</TableCell>
                    <TableCell>{s.tipo_racao}</TableCell>
                    <TableCell className="text-right">
                      {s.quantidade_solicitada_kg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                    </TableCell>
                    <TableCell>
                      {s.data_prevista 
                        ? format(parseISO(s.data_prevista), "dd/MM/yyyy", { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.dias_aguardando}d
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(s.status, s.atrasada)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
