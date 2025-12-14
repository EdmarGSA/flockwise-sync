import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Factory, Package, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  custo_total_estimado?: number;
  custo_total_real?: number;
  custo_por_kg?: number;
  nutricao_id?: string | null;
  produto?: {
    nome: string;
    unidade_medida: string;
  };
  nutricao?: {
    nome: string;
  } | null;
}

interface ItemOP {
  id: string;
  insumo_id: string;
  quantidade_necessaria: number;
  quantidade_utilizada: number;
  unidade_medida: string;
  estoque_disponivel: number | null;
  custo_unitario?: number;
  custo_total?: number;
  insumo?: {
    nome: string;
  };
}

interface OrdemProducaoViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
}

export default function OrdemProducaoViewDialog({
  open,
  onOpenChange,
  ordem
}: OrdemProducaoViewDialogProps) {
  const [itens, setItens] = useState<ItemOP[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ordem) {
      fetchItens();
    }
  }, [open, ordem]);

  const fetchItens = async () => {
    if (!ordem) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ordens_producao_itens')
        .select(`
          *,
          insumo:produtos!ordens_producao_itens_insumo_id_fkey(nome)
        `)
        .eq('ordem_producao_id', ordem.id);

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    } finally {
      setLoading(false);
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

  if (!ordem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            Ordem de Produção #{ordem.numero_op}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {ordem.produto?.nome}
            {ordem.nutricao && (
              <Badge variant="outline" className="ml-2">
                Nutrição: {ordem.nutricao.nome}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Info */}
          <div className="flex items-center justify-between">
            {getStatusBadge(ordem.status)}
            <span className="text-sm text-muted-foreground">
              Criado em {format(new Date(ordem.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Main Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Qtd. Planejada</p>
                <p className="text-xl font-bold">
                  {ordem.quantidade_planejada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem.produto?.unidade_medida || 'kg'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Qtd. Produzida</p>
                <p className="text-xl font-bold text-green-500">
                  {ordem.quantidade_produzida.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem.produto?.unidade_medida || 'kg'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data Prevista
                </p>
                <p className="text-lg font-bold">
                  {ordem.data_prevista_producao 
                    ? format(new Date(ordem.data_prevista_producao), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Info */}
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <DollarSign className="w-3 h-3" /> Custo Estimado
                  </p>
                  <p className="text-lg font-bold text-muted-foreground">
                    R$ {(ordem.custo_total_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <DollarSign className="w-3 h-3" /> Custo Real
                  </p>
                  <p className="text-lg font-bold text-green-500">
                    R$ {(ordem.custo_total_real || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo/kg</p>
                  <p className="text-lg font-bold text-amber-500">
                    R$ {(ordem.custo_por_kg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Insumos da Fórmula
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : itens.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum insumo registrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Qtd. Necessária</TableHead>
                      <TableHead className="text-right">Qtd. Utilizada</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.insumo?.nome || '-'}</TableCell>
                        <TableCell className="text-right">
                          {item.quantidade_necessaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {item.unidade_medida}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantidade_utilizada > 0 
                            ? `${item.quantidade_utilizada.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${item.unidade_medida}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          R$ {(item.custo_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {(item.custo_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Observations */}
          {ordem.observacoes && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{ordem.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
