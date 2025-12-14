import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, X, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RecebimentoItem {
  id: string;
  produto_id: string;
  quantidade_nfe: number;
  preco_nfe: number;
  preco_oc: number;
  produtos?: {
    nome: string;
    sku: string;
  };
}

interface LiberacaoPrecoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recebimentoId: string;
  integradoId: string;
  onSuccess: () => void;
}

export default function LiberacaoPrecoDialog({
  open,
  onOpenChange,
  recebimentoId,
  integradoId,
  onSuccess
}: LiberacaoPrecoDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<RecebimentoItem[]>([]);
  const [recebimento, setRecebimento] = useState<any>(null);
  const [justificativa, setJustificativa] = useState('');
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    if (open && recebimentoId) {
      fetchData();
      checkUserRole();
    }
  }, [open, recebimentoId]);

  const checkUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'comprador']);

    setHasRole((data && data.length > 0) || false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch recebimento
      const { data: recData } = await supabase
        .from('recebimentos_mercadoria')
        .select('*, ordens_compra(numero_oc, parceiros(razao_social_nome))')
        .eq('id', recebimentoId)
        .single();

      if (recData) {
        setRecebimento(recData);
      }

      // Fetch items with price divergence
      const { data: itensData } = await supabase
        .from('recebimento_itens')
        .select('*, produtos(nome, sku)')
        .eq('recebimento_id', recebimentoId);

      if (itensData) {
        // Filter items with price divergence
        const itensComDivergencia = itensData.filter(
          item => item.preco_nfe !== item.preco_oc && item.preco_oc > 0
        );
        setItens(itensComDivergencia);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do recebimento');
    } finally {
      setLoading(false);
    }
  };

  const calcularDiferenca = (precoNfe: number, precoOc: number) => {
    if (precoOc === 0) return 0;
    return ((precoNfe - precoOc) / precoOc) * 100;
  };

  const handleLiberar = async () => {
    if (!justificativa.trim()) {
      toast.error('Informe a justificativa para liberação');
      return;
    }

    setLoading(true);
    try {
      // Update recebimento status
      const { error: updateError } = await supabase
        .from('recebimentos_mercadoria')
        .update({
          status: 'em_conferencia',
          liberado_por: user?.id,
          data_liberacao: new Date().toISOString(),
          justificativa_autorizacao: justificativa
        })
        .eq('id', recebimentoId);

      if (updateError) throw updateError;

      // Create divergencias records
      for (const item of itens) {
        await supabase.from('divergencias_recebimento').insert({
          recebimento_id: recebimentoId,
          recebimento_item_id: item.id,
          tipo: 'preco',
          descricao: `Divergência de preço: OC R$ ${item.preco_oc.toFixed(2)} vs NF-e R$ ${item.preco_nfe.toFixed(2)}`,
          valor_oc: item.preco_oc,
          valor_nfe: item.preco_nfe,
          percentual_diferenca: calcularDiferenca(item.preco_nfe, item.preco_oc),
          status: 'aceita_com_autorizacao',
          aceita: true,
          resolvido_por: user?.id,
          data_resolucao: new Date().toISOString(),
          resolucao: justificativa
        });
      }

      toast.success('Divergência de preço liberada com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao liberar:', error);
      toast.error('Erro ao liberar divergência');
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitar = async () => {
    if (!justificativa.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('recebimentos_mercadoria')
        .update({
          status: 'cancelado',
          observacoes: `Rejeitado por divergência de preço: ${justificativa}`
        })
        .eq('id', recebimentoId);

      if (updateError) throw updateError;

      toast.success('Recebimento rejeitado');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar recebimento');
    } finally {
      setLoading(false);
    }
  };

  const totalDiferencaValor = itens.reduce((acc, item) => {
    return acc + ((item.preco_nfe - item.preco_oc) * item.quantidade_nfe);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-destructive" />
            Liberação de Divergência de Preço
          </DialogTitle>
          <DialogDescription>
            Este recebimento possui divergências de preço que precisam de autorização do comprador
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recebimento Info */}
            {recebimento && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dados do Recebimento</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NF-e:</span>
                    <span className="font-medium">{recebimento.numero_nfe || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <span className="font-medium">
                      {recebimento.razao_social_fornecedor || 
                       recebimento.ordens_compra?.parceiros?.razao_social_nome || 'N/A'}
                    </span>
                  </div>
                  {recebimento.ordens_compra && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OC:</span>
                      <span className="font-medium">#{recebimento.ordens_compra.numero_oc}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Divergences Table */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Divergências de Preço ({itens.length} itens)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço OC</TableHead>
                      <TableHead className="text-right">Preço NF-e</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-right">Impacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map(item => {
                      const diferenca = calcularDiferenca(item.preco_nfe, item.preco_oc);
                      const impacto = (item.preco_nfe - item.preco_oc) * item.quantidade_nfe;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.produtos?.nome}</div>
                              <div className="text-xs text-muted-foreground">{item.produtos?.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantidade_nfe}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_oc)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_nfe)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={diferenca > 0 ? 'destructive' : 'default'}>
                              {diferenca > 0 ? '+' : ''}{diferenca.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={impacto > 0 ? 'text-destructive' : 'text-green-600'}>
                              {impacto > 0 ? '+' : ''}
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impacto)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={5} className="text-right">
                        Impacto Total:
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={totalDiferencaValor > 0 ? 'text-destructive' : 'text-green-600'}>
                          {totalDiferencaValor > 0 ? '+' : ''}
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDiferencaValor)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Justificativa */}
            <div className="space-y-2">
              <Label>Justificativa *</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Informe a justificativa para liberação ou rejeição..."
                rows={3}
              />
            </div>

            {/* Permission Warning */}
            {!hasRole && (
              <Card className="border-amber-500/50 bg-amber-500/10">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">
                      Você não possui permissão para liberar divergências de preço. 
                      Apenas usuários com papel de Comprador ou Administrador podem aprovar.
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejeitar}
                disabled={loading || !hasRole}
              >
                <X className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
              <Button 
                onClick={handleLiberar}
                disabled={loading || !hasRole}
              >
                <Check className="w-4 h-4 mr-2" />
                Liberar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
