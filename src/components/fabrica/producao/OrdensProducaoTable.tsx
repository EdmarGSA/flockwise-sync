import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Factory, 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  Play, 
  X, 
  Loader2,
  FileText,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FinalizarOPDialog from './FinalizarOPDialog';
import OrdemProducaoViewDialog from './OrdemProducaoViewDialog';

interface OrdemProducao {
  id: string;
  numero_op: number;
  produto_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  status: string;
  data_prevista_producao: string | null;
  data_inicio_producao: string | null;
  data_finalizacao: string | null;
  observacoes: string | null;
  created_at: string;
  produto?: {
    nome: string;
    unidade_medida: string;
  };
}

interface OrdensProducaoTableProps {
  integradoId: string;
  onRefresh: () => void;
}

export default function OrdensProducaoTable({ integradoId, onRefresh }: OrdensProducaoTableProps) {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizandoOP, setFinalizandoOP] = useState<OrdemProducao | null>(null);
  const [viewingOP, setViewingOP] = useState<OrdemProducao | null>(null);

  useEffect(() => {
    fetchOrdens();
  }, [integradoId]);

  const fetchOrdens = async () => {
    if (!integradoId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ordens_producao')
        .select(`
          *,
          produto:produtos!ordens_producao_produto_id_fkey(nome, unidade_medida)
        `)
        .eq('integrado_id', integradoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdens(data || []);
    } catch (error) {
      console.error('Erro ao buscar ordens:', error);
      toast.error('Erro ao carregar ordens de produção');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (ordem: OrdemProducao) => {
    try {
      const { error } = await supabase
        .from('ordens_producao')
        .update({ 
          status: 'aprovada',
          aprovado_por: integradoId,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', ordem.id);

      if (error) throw error;

      toast.success(`OP #${ordem.numero_op} aprovada!`);
      fetchOrdens();
      onRefresh();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar ordem de produção');
    }
  };

  const handleIniciarProducao = async (ordem: OrdemProducao) => {
    try {
      const { error } = await supabase
        .from('ordens_producao')
        .update({ 
          status: 'em_producao',
          data_inicio_producao: new Date().toISOString()
        })
        .eq('id', ordem.id);

      if (error) throw error;

      toast.success(`Produção iniciada para OP #${ordem.numero_op}!`);
      fetchOrdens();
      onRefresh();
    } catch (error) {
      console.error('Erro ao iniciar produção:', error);
      toast.error('Erro ao iniciar produção');
    }
  };

  const handleCancelar = async (ordem: OrdemProducao) => {
    try {
      const { error } = await supabase
        .from('ordens_producao')
        .update({ status: 'cancelada' })
        .eq('id', ordem.id);

      if (error) throw error;

      toast.success(`OP #${ordem.numero_op} cancelada`);
      fetchOrdens();
      onRefresh();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar ordem de produção');
    }
  };

  const handleEnviarAprovacao = async (ordem: OrdemProducao) => {
    try {
      const { error } = await supabase
        .from('ordens_producao')
        .update({ status: 'pendente' })
        .eq('id', ordem.id);

      if (error) throw error;

      toast.success(`OP #${ordem.numero_op} enviada para aprovação`);
      fetchOrdens();
    } catch (error) {
      console.error('Erro ao enviar para aprovação:', error);
      toast.error('Erro ao enviar para aprovação');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      pendente: { label: 'Pendente', variant: 'outline' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      em_producao: { label: 'Em Produção', variant: 'default' },
      finalizada: { label: 'Finalizada', variant: 'default' },
      cancelada: { label: 'Cancelada', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    
    return (
      <Badge 
        variant={config.variant}
        className={status === 'aprovada' ? 'bg-blue-600' : status === 'em_producao' ? 'bg-amber-600' : status === 'finalizada' ? 'bg-green-600' : ''}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            Ordens de Produção
          </CardTitle>
          <CardDescription>
            Gerencie as ordens de produção de ração
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : ordens.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma ordem de produção encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OP</TableHead>
                  <TableHead>Ração</TableHead>
                  <TableHead className="text-right">Qtd. Planejada</TableHead>
                  <TableHead className="text-right">Qtd. Produzida</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map(ordem => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-medium">#{ordem.numero_op}</TableCell>
                    <TableCell>{ordem.produto?.nome || '-'}</TableCell>
                    <TableCell className="text-right">
                      {ordem.quantidade_planejada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem.produto?.unidade_medida || 'kg'}
                    </TableCell>
                    <TableCell className="text-right">
                      {ordem.quantidade_produzida.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem.produto?.unidade_medida || 'kg'}
                    </TableCell>
                    <TableCell>{getStatusBadge(ordem.status)}</TableCell>
                    <TableCell>
                      {ordem.data_prevista_producao 
                        ? format(new Date(ordem.data_prevista_producao), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingOP(ordem)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>

                          {ordem.status === 'rascunho' && (
                            <>
                              <DropdownMenuItem onClick={() => handleEnviarAprovacao(ordem)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Enviar para Aprovação
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancelar(ordem)}
                                className="text-destructive"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}

                          {ordem.status === 'pendente' && (
                            <>
                              <DropdownMenuItem onClick={() => handleAprovar(ordem)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancelar(ordem)}
                                className="text-destructive"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}

                          {ordem.status === 'aprovada' && (
                            <>
                              <DropdownMenuItem onClick={() => handleIniciarProducao(ordem)}>
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Iniciar Produção
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancelar(ordem)}
                                className="text-destructive"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}

                          {ordem.status === 'em_producao' && (
                            <DropdownMenuItem onClick={() => setFinalizandoOP(ordem)}>
                              <StopCircle className="w-4 h-4 mr-2" />
                              Finalizar Produção
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FinalizarOPDialog
        open={!!finalizandoOP}
        onOpenChange={(open) => !open && setFinalizandoOP(null)}
        ordem={finalizandoOP}
        integradoId={integradoId}
        onSuccess={() => {
          setFinalizandoOP(null);
          fetchOrdens();
          onRefresh();
        }}
      />

      <OrdemProducaoViewDialog
        open={!!viewingOP}
        onOpenChange={(open) => !open && setViewingOP(null)}
        ordem={viewingOP}
      />
    </>
  );
}
