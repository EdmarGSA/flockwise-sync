import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Package, Scale } from 'lucide-react';
import DivergenciasReportDialog from './DivergenciasReportDialog';

interface RecebimentoItem {
  id: string;
  produto_id: string;
  quantidade_oc: number;
  quantidade_nfe: number;
  quantidade_fisica: number;
  preco_oc: number;
  preco_nfe: number;
  lote_fornecedor: string | null;
  codigo_produto_nfe: string | null;
  descricao_produto_nfe: string | null;
  produtos: {
    id: string;
    nome: string;
    sku: string;
    unidade_medida: string;
  };
}

interface ConferenciaFisicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recebimentoId: string;
  integradoId: string;
  onSuccess: () => void;
}

export default function ConferenciaFisicaDialog({
  open,
  onOpenChange,
  recebimentoId,
  integradoId,
  onSuccess
}: ConferenciaFisicaDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itens, setItens] = useState<RecebimentoItem[]>([]);
  const [editedItens, setEditedItens] = useState<Record<string, { quantidade_fisica: number; lote_fornecedor: string }>>({});
  const [showDivergencias, setShowDivergencias] = useState(false);

  useEffect(() => {
    if (open && recebimentoId) {
      fetchItens();
    }
  }, [open, recebimentoId]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recebimento_itens')
        .select(`
          id,
          produto_id,
          quantidade_oc,
          quantidade_nfe,
          quantidade_fisica,
          preco_oc,
          preco_nfe,
          lote_fornecedor,
          codigo_produto_nfe,
          descricao_produto_nfe,
          produtos(id, nome, sku, unidade_medida)
        `)
        .eq('recebimento_id', recebimentoId);

      if (error) throw error;

      setItens(data || []);
      
      // Initialize edited values
      const edited: Record<string, { quantidade_fisica: number; lote_fornecedor: string }> = {};
      data?.forEach(item => {
        edited[item.id] = {
          quantidade_fisica: item.quantidade_fisica || 0,
          lote_fornecedor: item.lote_fornecedor || ''
        };
      });
      setEditedItens(edited);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      toast.error('Erro ao carregar itens do recebimento');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantidadeChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedItens(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantidade_fisica: numValue }
    }));
  };

  const handleLoteChange = (itemId: string, value: string) => {
    setEditedItens(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], lote_fornecedor: value }
    }));
  };

  const getQuantidadeReferencia = (item: RecebimentoItem): number => {
    // Use NF-e quantity as reference if available, otherwise OC
    return item.quantidade_nfe > 0 ? item.quantidade_nfe : item.quantidade_oc;
  };

  const getDivergenciaStatus = (item: RecebimentoItem, quantidadeFisica: number) => {
    const referencia = getQuantidadeReferencia(item);
    if (quantidadeFisica === 0) return 'pendente';
    
    const diferenca = Math.abs(quantidadeFisica - referencia);
    const percentual = (diferenca / referencia) * 100;
    
    if (percentual > 5) return 'divergente';
    if (percentual > 0) return 'atencao';
    return 'ok';
  };

  const handleSalvarConferencia = async () => {
    setSaving(true);

    try {
      // Update each item with physical quantity and lot
      for (const [itemId, values] of Object.entries(editedItens)) {
        const { error } = await supabase
          .from('recebimento_itens')
          .update({
            quantidade_fisica: values.quantidade_fisica,
            lote_fornecedor: values.lote_fornecedor || null
          })
          .eq('id', itemId);

        if (error) throw error;
      }

      toast.success('Conferência salva com sucesso!');
      setShowDivergencias(true);
    } catch (error) {
      console.error('Erro ao salvar conferência:', error);
      toast.error('Erro ao salvar conferência');
    } finally {
      setSaving(false);
    }
  };

  const hasDivergencias = () => {
    return itens.some(item => {
      const qtdFisica = editedItens[item.id]?.quantidade_fisica || 0;
      const status = getDivergenciaStatus(item, qtdFisica);
      return status === 'divergente';
    });
  };

  const hasPrecosDivergentes = () => {
    return itens.some(item => {
      if (item.preco_oc > 0 && item.preco_nfe > 0) {
        const diferenca = Math.abs(item.preco_nfe - item.preco_oc);
        const percentual = (diferenca / item.preco_oc) * 100;
        return percentual > 1;
      }
      return false;
    });
  };

  if (showDivergencias) {
    return (
      <DivergenciasReportDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setShowDivergencias(false);
            onOpenChange(false);
          }
        }}
        recebimentoId={recebimentoId}
        integradoId={integradoId}
        itens={itens.map(item => ({
          ...item,
          quantidade_fisica: editedItens[item.id]?.quantidade_fisica || 0,
          lote_fornecedor: editedItens[item.id]?.lote_fornecedor || ''
        }))}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Conferência Física
          </DialogTitle>
          <DialogDescription>
            Informe a quantidade recebida fisicamente e o lote do fornecedor para cada item
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando itens...</div>
        ) : itens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum item encontrado para conferência
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd OC</TableHead>
                    <TableHead className="text-center">Qtd NF-e</TableHead>
                    <TableHead className="text-center">Qtd Física</TableHead>
                    <TableHead>Lote Fornecedor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const qtdFisica = editedItens[item.id]?.quantidade_fisica || 0;
                    const status = getDivergenciaStatus(item, qtdFisica);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.produtos.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {item.produtos.sku} | {item.produtos.unidade_medida}
                            </div>
                            {item.descricao_produto_nfe && item.descricao_produto_nfe !== item.produtos.nome && (
                              <div className="text-xs text-blue-500">
                                NF-e: {item.descricao_produto_nfe}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantidade_oc > 0 ? (
                            <span className="font-medium">{item.quantidade_oc}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantidade_nfe > 0 ? (
                            <span className="font-medium">{item.quantidade_nfe}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedItens[item.id]?.quantidade_fisica || ''}
                            onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                            className="w-24 text-center"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={editedItens[item.id]?.lote_fornecedor || ''}
                            onChange={(e) => handleLoteChange(item.id, e.target.value)}
                            className="w-32"
                            placeholder="Lote"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {status === 'pendente' && (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                          {status === 'ok' && (
                            <Badge variant="default" className="bg-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              OK
                            </Badge>
                          )}
                          {status === 'atencao' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Atenção
                            </Badge>
                          )}
                          {status === 'divergente' && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Divergente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Price comparison alert */}
            {hasPrecosDivergentes() && (
              <Card className="border-yellow-500/50 bg-yellow-50/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    Atenção: Divergências de Preço Detectadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Alguns itens possuem preço na NF-e diferente do negociado na OC. 
                    Isso será analisado no relatório de divergências.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarConferencia} disabled={saving}>
                {saving ? 'Salvando...' : 'Conferir e Analisar Divergências'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
