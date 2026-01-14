import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, Package, Save, Send, ArrowRight } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  unidade_compra: string | null;
  fator_conversao: number | null;
  consumo_medio_diario: number;
  dias_restantes: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
}

interface FornecedorAgrupado {
  parceiro_id: string;
  razao_social_nome: string;
  produtos: {
    produto: Produto;
    preco_compra: number;
    prazo_entrega_dias: number;
  }[];
}

interface ItemOC {
  produto_id: string;
  nome: string;
  unidade_compra: string;
  unidade_estoque: string;
  fator_conversao: number;
  quantidade: number;
  quantidade_estoque: number;
  preco_unitario: number;
  preco_total: number;
}

interface NovaOrdemCompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor: FornecedorAgrupado;
  integradoId: string;
  onSuccess: () => void;
}

export default function NovaOrdemCompraDialog({
  open,
  onOpenChange,
  fornecedor,
  integradoId,
  onSuccess
}: NovaOrdemCompraDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<ItemOC[]>([]);
  const [outrosProdutos, setOutrosProdutos] = useState<any[]>([]);
  const [selectedProduto, setSelectedProduto] = useState('');
  const [formData, setFormData] = useState({
    data_prevista_entrega: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    forma_pagamento: 'boleto',
    prazo_pagamento_dias: 30,
    tipo_frete: 'cif',
    valor_frete: 0,
    desconto: 0,
    observacoes: ''
  });

  useEffect(() => {
    if (open) {
      // Initialize items from fornecedor produtos (if any)
      if (fornecedor.produtos.length > 0) {
        const initialItems: ItemOC[] = fornecedor.produtos.map(({ produto, preco_compra }) => {
          const unidadeCompra = produto.unidade_compra || produto.unidade_medida;
          const fatorConversao = produto.fator_conversao || 1;
          
          // Calculate suggested quantity in stock units, then convert to purchase units
          const qtdEstoqueNecessaria = Math.max(
            produto.estoque_minimo - produto.estoque_atual,
            produto.consumo_medio_diario * 15 // 15 days supply
          );
          
          // Convert to purchase units (round up)
          const qtdCompra = Math.ceil(qtdEstoqueNecessaria / fatorConversao);
          const qtdEstoque = qtdCompra * fatorConversao;
          
          return {
            produto_id: produto.id,
            nome: produto.nome,
            unidade_compra: unidadeCompra,
            unidade_estoque: produto.unidade_medida,
            fator_conversao: fatorConversao,
            quantidade: qtdCompra,
            quantidade_estoque: qtdEstoque,
            preco_unitario: preco_compra,
            preco_total: qtdCompra * preco_compra
          };
        });
        setItens(initialItems);
      } else {
        // Manual mode - start with empty items
        setItens([]);
      }
      fetchOutrosProdutos();
    }
  }, [open, fornecedor]);

  const fetchOutrosProdutos = async () => {
    try {
      // Fetch all products from this supplier that aren't in the initial list
      const produtoIds = fornecedor.produtos.map(p => p.produto.id);
      
      const { data, error } = await supabase
        .from('produto_fornecedor')
        .select(`
          produto_id,
          preco_compra,
          produtos!inner(id, nome, sku, unidade_medida, unidade_compra, fator_conversao, estoque_atual, categorias!inner(tipo_origem))
        `)
        .eq('parceiro_id', fornecedor.parceiro_id)
        .eq('ativo', true)
        .eq('produtos.categorias.tipo_origem', 'terceiros');

      if (error) throw error;

      const outros = (data || [])
        .filter(p => !produtoIds.includes(p.produto_id))
        .map(p => ({
          id: (p.produtos as any).id,
          nome: (p.produtos as any).nome,
          sku: (p.produtos as any).sku,
          unidade_medida: (p.produtos as any).unidade_medida,
          unidade_compra: (p.produtos as any).unidade_compra || (p.produtos as any).unidade_medida,
          fator_conversao: (p.produtos as any).fator_conversao || 1,
          estoque_atual: (p.produtos as any).estoque_atual,
          preco_compra: p.preco_compra || 0
        }));

      setOutrosProdutos(outros);
    } catch (error) {
      console.error('Erro ao buscar outros produtos:', error);
    }
  };

  const handleItemChange = (index: number, field: string, value: number) => {
    setItens(prev => {
      const updated = [...prev];
      const item = updated[index];
      
      if (field === 'quantidade') {
        // Update quantity and recalculate stock quantity
        updated[index] = {
          ...item,
          quantidade: value,
          quantidade_estoque: value * item.fator_conversao,
          preco_total: value * item.preco_unitario
        };
      } else if (field === 'preco_unitario') {
        updated[index] = {
          ...item,
          preco_unitario: value,
          preco_total: value * item.quantidade
        };
      }
      
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const addProduto = () => {
    if (!selectedProduto) return;
    
    const produto = outrosProdutos.find(p => p.id === selectedProduto);
    if (!produto) return;

    if (itens.some(item => item.produto_id === produto.id)) {
      toast.error('Produto já adicionado');
      return;
    }

    const unidadeCompra = produto.unidade_compra || produto.unidade_medida;
    const fatorConversao = produto.fator_conversao || 1;

    setItens(prev => [...prev, {
      produto_id: produto.id,
      nome: produto.nome,
      unidade_compra: unidadeCompra,
      unidade_estoque: produto.unidade_medida,
      fator_conversao: fatorConversao,
      quantidade: 1,
      quantidade_estoque: fatorConversao,
      preco_unitario: produto.preco_compra,
      preco_total: produto.preco_compra
    }]);
    setSelectedProduto('');
  };

  const calcularTotal = () => {
    const subtotal = itens.reduce((sum, item) => sum + item.preco_total, 0);
    return subtotal + formData.valor_frete - formData.desconto;
  };

  const handleSubmit = async (status: 'rascunho' | 'pendente') => {
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    if (itens.some(item => item.quantidade <= 0)) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    setLoading(true);
    try {
      const valorTotal = calcularTotal();
      const dataVencimento = addDays(new Date(), formData.prazo_pagamento_dias);

      // Create order
      const { data: ordem, error: ordemError } = await supabase
        .from('ordens_compra')
        .insert({
          integrado_id: integradoId,
          parceiro_id: fornecedor.parceiro_id,
          data_prevista_entrega: formData.data_prevista_entrega,
          status,
          forma_pagamento: formData.forma_pagamento,
          prazo_pagamento_dias: formData.prazo_pagamento_dias,
          data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
          valor_total: valorTotal,
          tipo_frete: formData.tipo_frete,
          valor_frete: formData.valor_frete,
          desconto: formData.desconto,
          observacoes: formData.observacoes,
          criado_por: integradoId
        })
        .select()
        .single();

      if (ordemError) throw ordemError;

      // Create order items with conversion data
      const { error: itensError } = await supabase
        .from('ordens_compra_itens')
        .insert(itens.map(item => ({
          ordem_compra_id: ordem.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          unidade_medida: item.unidade_compra, // Use purchase unit
          unidade_compra: item.unidade_compra,
          fator_conversao: item.fator_conversao,
          preco_unitario: item.preco_unitario,
          preco_total: item.preco_total
        })));

      if (itensError) throw itensError;

      toast.success(status === 'rascunho' 
        ? 'Rascunho salvo com sucesso!' 
        : 'Ordem de compra criada com sucesso!'
      );
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar ordem:', error);
      toast.error('Erro ao criar ordem de compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nova Ordem de Compra
          </DialogTitle>
          <DialogDescription>
            Fornecedor: {fornecedor.razao_social_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Data Prev. Entrega</Label>
              <Input
                type="date"
                value={formData.data_prevista_entrega}
                onChange={(e) => setFormData(prev => ({ ...prev, data_prevista_entrega: e.target.value }))}
              />
            </div>
            <div>
              <Label>Forma Pagamento</Label>
              <Select 
                value={formData.forma_pagamento}
                onValueChange={(value) => setFormData(prev => ({ ...prev, forma_pagamento: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo Pagamento (dias)</Label>
              <Input
                type="number"
                value={formData.prazo_pagamento_dias}
                onChange={(e) => setFormData(prev => ({ ...prev, prazo_pagamento_dias: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Freight and Delivery */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Tipo de Frete</Label>
              <Select 
                value={formData.tipo_frete}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_frete: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cif">CIF (Frete Incluso)</SelectItem>
                  <SelectItem value="fob">FOB (Frete por Conta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_frete}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_frete: parseFloat(e.target.value) || 0 }))}
                disabled={formData.tipo_frete === 'cif'}
                placeholder={formData.tipo_frete === 'cif' ? 'Incluso' : '0.00'}
              />
            </div>
          </div>

          {/* Add more products */}
          {outrosProdutos.length > 0 && (
            <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label>
                  {fornecedor.produtos.length === 0 
                    ? 'Adicionar Produtos' 
                    : 'Adicionar Outros Produtos do Fornecedor'}
                </Label>
                <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {outrosProdutos
                      .filter(p => !itens.some(i => i.produto_id === p.id))
                      .map((produto) => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.nome} - R$ {produto.preco_compra.toFixed(2)}/{produto.unidade_compra}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addProduto} disabled={!selectedProduto}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          )}

          {/* Empty state for manual mode */}
          {fornecedor.produtos.length === 0 && itens.length === 0 && outrosProdutos.length === 0 && (
            <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
              Este fornecedor não possui produtos cadastrados. 
              Vincule produtos ao fornecedor em Cadastros → Produtos.
            </div>
          )}

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-40">Unidade</TableHead>
                  <TableHead className="w-36">Preço Unit. (R$)</TableHead>
                  <TableHead className="w-36 text-right">Total (R$)</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item, index) => (
                  <TableRow key={item.produto_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {item.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(index, 'quantidade', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-medium">{item.unidade_compra}</span>
                        {item.fator_conversao > 1 && (
                          <>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {item.quantidade_estoque.toFixed(0)} {item.unidade_estoque}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.preco_unitario}
                        onChange={(e) => handleItemChange(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {item.preco_total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>R$ {itens.reduce((sum, item) => sum + item.preco_total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete:</span>
                <span>R$ {formData.valor_frete.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto:</span>
                <Input
                  type="number"
                  step="0.01"
                  className="w-24 h-7 text-right"
                  value={formData.desconto}
                  onChange={(e) => setFormData(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total:</span>
                <span className="text-primary">R$ {calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais para a ordem de compra..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleSubmit('rascunho')} 
              disabled={loading || itens.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button 
              onClick={() => handleSubmit('pendente')} 
              disabled={loading || itens.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Criar OC Pendente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
