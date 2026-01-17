import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowRight, Check, Scale, Copy, Plus, Pencil, X, Link2 } from 'lucide-react';
import DivergenciasReportDialog from './DivergenciasReportDialog';
import { VinculoProdutoConferenciaDialog } from './VinculoProdutoConferenciaDialog';

interface RecebimentoItem {
  id: string;
  produto_id: string | null;
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
  gtin_nfe: string | null;
  gtin_esperado: string | null;
  produtos: {
    id: string;
    nome: string;
    sku: string;
    unidade_medida: string;
    unidade_compra: string | null;
    fator_conversao: number | null;
    codigo_barras_ean: string | null;
  } | null;
}

interface Produto {
  id: string;
  nome: string;
  sku: string;
  unidade_medida: string;
  unidade_compra: string | null;
  fator_conversao: number | null;
  codigo_barras_ean: string | null;
}

type GtinStatus = 'ok' | 'divergente' | 'sem_cadastro' | 'sem_gtin';

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
    quantidade_nfe: number;
    preco_nfe: number;
    lote_fornecedor: string;
    unidade_compra: string;
    fator_conversao: number;
  }>>({});
  const [showDivergencias, setShowDivergencias] = useState(false);
  
  // Add product state
  const [showAddProduto, setShowAddProduto] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedProduto, setSelectedProduto] = useState('');
  const [newProdutoQtd, setNewProdutoQtd] = useState('');
  const [newProdutoPreco, setNewProdutoPreco] = useState('');
  
  // Vinculação state
  const [showVinculo, setShowVinculo] = useState(false);
  const [itemParaVincular, setItemParaVincular] = useState<RecebimentoItem | null>(null);
  const [parceiroId, setParceiroId] = useState<string | null>(null);

  useEffect(() => {
    if (open && recebimentoId) {
      fetchItens();
      fetchProdutos();
    }
  }, [open, recebimentoId]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      // Fetch items
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
          produtos(id, nome, sku, unidade_medida, unidade_compra, fator_conversao, codigo_barras_ean)
        `)
        .eq('recebimento_id', recebimentoId);

      if (error) throw error;

      // Note: parceiro_id lookup handled separately to avoid type issues

      // Cast and add gtin fields (may not exist in DB yet)
      const itensWithGtin = (data || []).map((item: any) => ({
        ...item,
        gtin_nfe: item.gtin_nfe || null,
        gtin_esperado: item.gtin_esperado || null
      })) as RecebimentoItem[];

      setItens(itensWithGtin);
      
      const edited: Record<string, { 
        quantidade_fisica: number; 
        quantidade_nfe: number;
        preco_nfe: number;
        lote_fornecedor: string;
        unidade_compra: string;
        fator_conversao: number;
      }> = {};
      
      itensWithGtin.forEach(item => {
        const unidadeCompra = item.unidade_compra || item.produtos?.unidade_compra || item.produtos?.unidade_medida || 'UN';
        const fatorConversao = item.fator_conversao || item.produtos?.fator_conversao || 1;
        
        edited[item.id] = {
          quantidade_fisica: item.quantidade_fisica || 0,
          quantidade_nfe: item.quantidade_nfe || 0,
          preco_nfe: item.preco_nfe || 0,
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

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, sku, unidade_medida, unidade_compra, fator_conversao, codigo_barras_ean')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const getGtinStatus = (item: RecebimentoItem): GtinStatus => {
    const gtinNfe = item.gtin_nfe;
    const gtinEsperado = item.gtin_esperado || item.produtos?.codigo_barras_ean;

    if (!gtinNfe) return 'sem_gtin';
    if (!gtinEsperado) return 'sem_cadastro';
    if (gtinNfe === gtinEsperado) return 'ok';
    return 'divergente';
  };

  const handleQuantidadeFisicaChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedItens(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantidade_fisica: numValue }
    }));
  };

  const handleQuantidadeNfeChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedItens(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantidade_nfe: numValue }
    }));
  };

  const handlePrecoNfeChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedItens(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], preco_nfe: numValue }
    }));
  };

  const handleLoteChange = (itemId: string, value: string) => {
    setEditedItens(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], lote_fornecedor: value }
    }));
  };

  const handleCopiarNfeParaFisica = () => {
    const newEdited = { ...editedItens };
    Object.keys(newEdited).forEach(itemId => {
      newEdited[itemId] = {
        ...newEdited[itemId],
        quantidade_fisica: newEdited[itemId].quantidade_nfe
      };
    });
    setEditedItens(newEdited);
    toast.success('Quantidades da NF-e copiadas para a física');
  };

  const handleAddProduto = async () => {
    if (!selectedProduto || !newProdutoQtd) {
      toast.error('Selecione o produto e informe a quantidade');
      return;
    }

    const produto = produtos.find(p => p.id === selectedProduto);
    if (!produto) return;

    try {
      const unidadeCompra = produto.unidade_compra || produto.unidade_medida;
      const fatorConversao = produto.fator_conversao || 1;

      const { data, error } = await supabase
        .from('recebimento_itens')
        .insert({
          recebimento_id: recebimentoId,
          produto_id: produto.id,
          quantidade_oc: 0,
          quantidade_nfe: 0,
          quantidade_fisica: parseFloat(newProdutoQtd),
          preco_oc: 0,
          preco_nfe: parseFloat(newProdutoPreco) || 0,
          codigo_produto_nfe: produto.sku,
          descricao_produto_nfe: produto.nome,
          unidade_compra: unidadeCompra,
          fator_conversao: fatorConversao,
          quantidade_estoque: parseFloat(newProdutoQtd) * fatorConversao
        })
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
          produtos(id, nome, sku, unidade_medida, unidade_compra, fator_conversao, codigo_barras_ean)
        `)
        .single();

      if (error) throw error;

      // Add gtin fields to match interface
      const newItem: RecebimentoItem = {
        ...(data as any),
        gtin_nfe: null,
        gtin_esperado: produto.codigo_barras_ean || null
      };

      // Add to local state
      setItens([...itens, newItem]);
      setEditedItens({
        ...editedItens,
        [newItem.id]: {
          quantidade_fisica: newItem.quantidade_fisica,
          quantidade_nfe: newItem.quantidade_nfe,
          preco_nfe: newItem.preco_nfe,
          lote_fornecedor: '',
          unidade_compra: unidadeCompra,
          fator_conversao: fatorConversao
        }
      });

      setShowAddProduto(false);
      setSelectedProduto('');
      setNewProdutoQtd('');
      setNewProdutoPreco('');
      toast.success('Produto adicionado à conferência');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const getQuantidadeReferencia = (item: RecebimentoItem, editedQtdNfe: number): number => {
    return editedQtdNfe > 0 ? editedQtdNfe : item.quantidade_oc;
  };

  const getDivergenciaStatus = (item: RecebimentoItem, quantidadeFisica: number, qtdNfe: number) => {
    const referencia = getQuantidadeReferencia(item, qtdNfe);
    if (quantidadeFisica === 0) return 'pendente';
    if (referencia === 0) return 'extra'; // Produto não previsto
    
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
    // Block finalization if there are unlinked items
    const itensNaoVinculados = itens.filter(i => !i.produto_id);
    if (itensNaoVinculados.length > 0) {
      toast.error(
        `${itensNaoVinculados.length} item(ns) não vinculado(s). Vincule os produtos antes de prosseguir.`,
        { duration: 5000 }
      );
      return;
    }

    setSaving(true);

    try {
      for (const [itemId, values] of Object.entries(editedItens)) {
        const quantidadeEstoque = values.quantidade_fisica * values.fator_conversao;
        
        const { error } = await supabase
          .from('recebimento_itens')
          .update({
            quantidade_fisica: values.quantidade_fisica,
            quantidade_nfe: values.quantidade_nfe,
            preco_nfe: values.preco_nfe,
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
      const edited = editedItens[item.id];
      if (item.preco_oc > 0 && edited?.preco_nfe > 0) {
        const diferenca = Math.abs(edited.preco_nfe - item.preco_oc);
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
            quantidade_nfe: edited?.quantidade_nfe || item.quantidade_nfe,
            quantidade_fisica: edited?.quantidade_fisica || 0,
            preco_nfe: edited?.preco_nfe || item.preco_nfe,
            lote_fornecedor: edited?.lote_fornecedor || '',
            unidade_compra: edited?.unidade_compra || item.produtos?.unidade_medida || item.unidade_compra || 'UN',
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Conferência Física
          </DialogTitle>
          <DialogDescription>
            Informe a quantidade recebida fisicamente e o lote do fornecedor para cada item. 
            Você também pode editar os valores da NF-e se necessário.
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
            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleCopiarNfeParaFisica}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar NF-e → Física
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddProduto(!showAddProduto)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>

            {/* Add product form */}
            {showAddProduto && (
              <Card className="mb-4 border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Adicionar Produto Extra
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddProduto(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Produto</Label>
                      <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos.filter(p => !itens.some(i => i.produto_id === p.id)).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Qtd Física</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={newProdutoQtd}
                        onChange={(e) => setNewProdutoQtd(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Valor Unit.</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={newProdutoPreco}
                          onChange={(e) => setNewProdutoPreco(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                      <Button onClick={handleAddProduto} size="icon">
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">GTIN</TableHead>
                    <TableHead className="text-center">Qtd OC</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        Qtd NF-e
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        Valor NF-e
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Qtd Física</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const edited = editedItens[item.id];
                    const qtdFisica = edited?.quantidade_fisica || 0;
                    const qtdNfe = edited?.quantidade_nfe || 0;
                    const precoNfe = edited?.preco_nfe || 0;
                    const status = getDivergenciaStatus(item, qtdFisica, qtdNfe);
                    const unidadeCompra = edited?.unidade_compra || item.produtos?.unidade_medida || 'UN';
                    const fatorConversao = edited?.fator_conversao || 1;
                    const qtdEstoque = calcularQuantidadeEstoque(item.id);
                    const gtinStatus = getGtinStatus(item);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            {item.produtos ? (
                              <>
                                <div className="font-medium">{item.produtos.nome}</div>
                                <div className="text-xs text-muted-foreground">
                                  SKU: {item.produtos.sku}
                                </div>
                              </>
                            ) : (
                              <div className="text-yellow-600">
                                <div className="font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Produto não vinculado
                                </div>
                                <div className="text-xs mb-1">
                                  Cód: {item.codigo_produto_nfe}
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    setItemParaVincular(item);
                                    setShowVinculo(true);
                                  }}
                                >
                                  <Link2 className="w-3 h-3 mr-1" />
                                  Vincular
                                </Button>
                              </div>
                            )}
                            {item.descricao_produto_nfe && item.produtos && item.descricao_produto_nfe !== item.produtos.nome && (
                              <div className="text-xs text-blue-500">
                                NF-e: {item.descricao_produto_nfe}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {gtinStatus === 'ok' && (
                            <Badge className="bg-green-600 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              OK
                            </Badge>
                          )}
                          {gtinStatus === 'divergente' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs" title={`NF-e: ${item.gtin_nfe}\nEsperado: ${item.gtin_esperado || item.produtos?.codigo_barras_ean}`}>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Diferente
                            </Badge>
                          )}
                          {gtinStatus === 'sem_cadastro' && (
                            <Badge variant="secondary" className="text-xs" title="GTIN não cadastrado no sistema">
                              N/C
                            </Badge>
                          )}
                          {gtinStatus === 'sem_gtin' && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
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
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={qtdNfe || ''}
                              onChange={(e) => handleQuantidadeNfeChange(item.id, e.target.value)}
                              className="w-20 text-center"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">{unidadeCompra}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={precoNfe || ''}
                              onChange={(e) => handlePrecoNfeChange(item.id, e.target.value)}
                              className="w-20 text-center"
                              placeholder="0"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={qtdFisica || ''}
                              onChange={(e) => handleQuantidadeFisicaChange(item.id, e.target.value)}
                              className="w-20 text-center"
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">{unidadeCompra}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {fatorConversao > 1 && qtdFisica > 0 && item.produtos ? (
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
                            className="w-28"
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
                          {status === 'extra' && (
                            <Badge variant="outline" className="border-blue-500 text-blue-600">
                              <Plus className="w-3 h-3 mr-1" />
                              Extra
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

            {/* Vinculação Dialog */}
            <VinculoProdutoConferenciaDialog
              open={showVinculo}
              onOpenChange={setShowVinculo}
              item={itemParaVincular ? {
                id: itemParaVincular.id,
                descricao_nfe: itemParaVincular.descricao_produto_nfe || '',
                codigo_produto_nfe: itemParaVincular.codigo_produto_nfe,
                ncm_nfe: null,
                gtin_nfe: itemParaVincular.gtin_nfe,
                cest_nfe: null,
                unidade_compra: itemParaVincular.unidade_compra,
                preco_nfe: itemParaVincular.preco_nfe,
                quantidade_nfe: itemParaVincular.quantidade_nfe
              } : null}
              integradoId={integradoId}
              parceiroId={parceiroId}
              recebimentoId={recebimentoId}
              onVinculado={() => {
                fetchItens();
                setItemParaVincular(null);
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
