import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, Check, Scale } from 'lucide-react';
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
  unidade_compra: string | null;
  fator_conversao: number | null;
  quantidade_estoque: number | null;
  produtos: {
    id: string;
    nome: string;
    sku: string;
    unidade_medida: string;
    unidade_compra: string | null;
    fator_conversao: number | null;
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
  const [editedItens, setEditedItens] = useState<Record<string, { 
    quantidade_fisica: number; 
    lote_fornecedor: string;
    unidade_compra: string;
    fator_conversao: number;
  }>>({});
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
          unidade_compra,
          fator_conversao,
          quantidade_estoque,
          produtos(id, nome, sku, unidade_medida, unidade_compra, fator_conversao)
        `)
        .eq('recebimento_id', recebimentoId);

      if (error) throw error;

      setItens(data || []);
      
      // Initialize edited values with conversion data
      const edited: Record<string, { 
        quantidade_fisica: number; 
        lote_fornecedor: string;
        unidade_compra: string;
        fator_conversao: number;
      }> = {};
      
      data?.forEach(item => {
        // Use item conversion data if available, otherwise fallback to product data
        const unidadeCompra = item.unidade_compra || item.produtos.unidade_compra || item.produtos.unidade_medida;
        const fatorConversao = item.fator_conversao || item.produtos.fator_conversao || 1;
        
        edited[item.id] = {
          quantidade_fisica: item.quantidade_fisica || 0,
          lote_fornecedor: item.lote_fornecedor || '',
          unidade_compra: unidadeCompra,
          fator_conversao: fatorConversao
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

  const calcularQuantidadeEstoque = (itemId: string): number => {
    const edited = editedItens[itemId];
    if (!edited) return 0;
    return edited.quantidade_fisica * edited.fator_conversao;
  };

  const handleSalvarConferencia = async () => {
    setSaving(true);

    try {
      // Update each item with physical quantity, lot, and stock quantity
      for (const [itemId, values] of Object.entries(editedItens)) {
        const quantidadeEstoque = values.quantidade_fisica * values.fator_conversao;
        
        const { error } = await supabase
          .from('recebimento_itens')
          .update({
            quantidade_fisica: values.quantidade_fisica,
            lote_fornecedor: values.lote_fornecedor || null,
            unidade_compra: values.unidade_compra,
            fator_conversao: values.fator_conversao,
            quantidade_estoque: quantidadeEstoque
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
        itens={itens.map(item => {
          const edited = editedItens[item.id];
          return {
            ...item,
            quantidade_fisica: edited?.quantidade_fisica || 0,
            lote_fornecedor: edited?.lote_fornecedor || '',
            unidade_compra: edited?.unidade_compra || item.produtos.unidade_medida,
            fator_conversao: edited?.fator_conversao || 1,
            quantidade_estoque: (edited?.quantidade_fisica || 0) * (edited?.fator_conversao || 1)
          };
        })}
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
            Informe a quantidade recebida fisicamente (em unidade de compra) e o lote do fornecedor para cada item
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
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead>Lote Fornecedor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const edited = editedItens[item.id];
                    const qtdFisica = edited?.quantidade_fisica || 0;
                    const status = getDivergenciaStatus(item, qtdFisica);
                    const unidadeCompra = edited?.unidade_compra || item.produtos.unidade_medida;
                    const fatorConversao = edited?.fator_conversao || 1;
                    const qtdEstoque = calcularQuantidadeEstoque(item.id);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.produtos.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {item.produtos.sku}
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
                            <div>
                              <span className="font-medium">{item.quantidade_oc}</span>
                              <span className="text-xs text-muted-foreground ml-1">{unidadeCompra}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantidade_nfe > 0 ? (
                            <div>
                              <span className="font-medium">{item.quantidade_nfe}</span>
                              <span className="text-xs text-muted-foreground ml-1">{unidadeCompra}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={qtdFisica || ''}
                              onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                              className="w-20 text-center"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">{unidadeCompra}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {fatorConversao > 1 && qtdFisica > 0 ? (
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium text-green-600">{qtdEstoque.toFixed(0)}</span>
                              <span className="text-xs text-muted-foreground">{item.produtos.unidade_medida}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={edited?.lote_fornecedor || ''}
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

            {/* Conversion info */}
            {itens.some(item => (editedItens[item.id]?.fator_conversao || 1) > 1) && (
              <Card className="border-blue-500/50 bg-blue-50/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-600">
                    <ArrowRight className="w-4 h-4" />
                    Conversão Automática
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    A quantidade física informada será automaticamente convertida para a unidade de estoque usando o fator de conversão do produto.
                  </p>
                </CardContent>
              </Card>
            )}

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
