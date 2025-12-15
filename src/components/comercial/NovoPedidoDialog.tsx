import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle, History } from 'lucide-react';
import { toast } from 'sonner';

interface NovoPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
}

interface PedidoItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  unidade_medida: string;
  preco_tabela: number;
  preco_unitario: number;
  desconto_percentual: number;
  valor_total: number;
  margem_calculada: number;
  custo_medio: number;
}

type FormaPagamento = 'boleto' | 'pix' | 'transferencia' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'cheque';

export default function NovoPedidoDialog({ open, onOpenChange, integradoId, onSuccess }: NovoPedidoDialogProps) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [tabelasPreco, setTabelasPreco] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tabelaItens, setTabelaItens] = useState<any[]>([]);
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: '',
    tabela_preco_id: '',
    data_entrega_prevista: '',
    forma_pagamento: '' as FormaPagamento | '',
    prazo_pagamento_dias: 30,
    observacoes: '',
    desconto: 0,
    valor_frete: 0
  });

  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0
  });

  const [margemMinima, setMargemMinima] = useState(10);

  useEffect(() => {
    if (open) {
      fetchClientes();
      fetchTabelasPreco();
      fetchProdutos();
    }
  }, [open]);

  useEffect(() => {
    if (formData.tabela_preco_id) {
      fetchTabelaItens(formData.tabela_preco_id);
    }
  }, [formData.tabela_preco_id]);

  useEffect(() => {
    if (formData.cliente_id) {
      fetchHistoricoCliente(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('parceiros')
      .select('id, razao_social_nome, nome_fantasia')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .in('tipo_cadastro', ['cliente', 'ambos'])
      .order('razao_social_nome');
    setClientes(data || []);
  };

  const fetchTabelasPreco = async () => {
    const { data } = await supabase
      .from('tabelas_preco')
      .select('*')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .order('nome');
    setTabelasPreco(data || []);
    
    // Set default table
    const tabelaPadrao = data?.find(t => t.padrao);
    if (tabelaPadrao) {
      setFormData(prev => ({ ...prev, tabela_preco_id: tabelaPadrao.id }));
      setMargemMinima(tabelaPadrao.margem_minima_percentual || 10);
    }
  };

  const fetchTabelaItens = async (tabelaId: string) => {
    const { data } = await supabase
      .from('tabelas_preco_itens')
      .select('*, produto:produtos(nome, custo_medio, unidade_medida)')
      .eq('tabela_preco_id', tabelaId);
    setTabelaItens(data || []);

    // Update margem minima from selected table
    const tabela = tabelasPreco.find(t => t.id === tabelaId);
    if (tabela) {
      setMargemMinima(tabela.margem_minima_percentual || 10);
    }
  };

  const fetchProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, custo_medio, preco_venda, unidade_medida, estoque_atual')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .order('nome');
    setProdutos(data || []);
  };

  const fetchHistoricoCliente = async (clienteId: string) => {
    const { data } = await supabase
      .from('pedido_itens')
      .select(`
        *,
        pedido:pedidos!inner(cliente_id, data_emissao, status),
        produto:produtos(nome)
      `)
      .eq('pedido.cliente_id', clienteId)
      .eq('pedido.status', 'faturado')
      .order('created_at', { ascending: false })
      .limit(10);
    setHistoricoCliente(data || []);
  };

  const handleAddItem = () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0) {
      toast.error('Selecione um produto e quantidade válida');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    // Check if product already exists in items
    if (itens.some(i => i.produto_id === novoItem.produto_id)) {
      toast.error('Produto já adicionado ao pedido');
      return;
    }

    // Get price from table or use product's selling price
    const tabelaItem = tabelaItens.find(ti => ti.produto_id === novoItem.produto_id);
    const precoTabela = tabelaItem?.preco_unitario || produto.preco_venda || 0;
    const precoUnitario = novoItem.preco_unitario > 0 ? novoItem.preco_unitario : precoTabela;
    const custoMedio = produto.custo_medio || 0;
    const margem = custoMedio > 0 ? ((precoUnitario - custoMedio) / custoMedio) * 100 : 0;

    const newItem: PedidoItem = {
      produto_id: novoItem.produto_id,
      produto_nome: produto.nome,
      quantidade: novoItem.quantidade,
      unidade_medida: produto.unidade_medida,
      preco_tabela: precoTabela,
      preco_unitario: precoUnitario,
      desconto_percentual: 0,
      valor_total: precoUnitario * novoItem.quantidade,
      margem_calculada: margem,
      custo_medio: custoMedio
    };

    // Alert if margin is below minimum
    if (margem < margemMinima && custoMedio > 0) {
      toast.warning(`⚠️ Margem ${margem.toFixed(1)}% abaixo do mínimo (${margemMinima}%)`);
    }

    setItens([...itens, newItem]);
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0 });
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updatedItens = [...itens];
    const item = updatedItens[index];
    item.preco_unitario = newPrice;
    item.valor_total = newPrice * item.quantidade;
    item.margem_calculada = item.custo_medio > 0 
      ? ((newPrice - item.custo_medio) / item.custo_medio) * 100 
      : 0;

    // Alert if margin is below minimum
    if (item.margem_calculada < margemMinima && item.custo_medio > 0) {
      toast.warning(`⚠️ Margem ${item.margem_calculada.toFixed(1)}% abaixo do mínimo (${margemMinima}%)`);
    }

    setItens(updatedItens);
  };

  const calcularTotais = () => {
    const subtotal = itens.reduce((acc, item) => acc + item.valor_total, 0);
    const desconto = formData.desconto || 0;
    const frete = formData.valor_frete || 0;
    const total = subtotal - desconto + frete;
    return { subtotal, desconto, frete, total };
  };

  const handleSubmit = async (status: 'rascunho' | 'pendente_aprovacao') => {
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    setSaving(true);
    try {
      const totais = calcularTotais();

      // Create order
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([{
          integrado_id: integradoId,
          cliente_id: formData.cliente_id,
          tabela_preco_id: formData.tabela_preco_id || null,
          vendedor_id: integradoId,
          status,
          data_entrega_prevista: formData.data_entrega_prevista || null,
          forma_pagamento: (formData.forma_pagamento || null) as any,
          prazo_pagamento_dias: formData.prazo_pagamento_dias,
          valor_subtotal: totais.subtotal,
          desconto: totais.desconto,
          valor_frete: totais.frete,
          valor_total: totais.total,
          observacoes: formData.observacoes
        }])
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Create order items
      const pedidoItens = itens.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        unidade_medida: item.unidade_medida,
        preco_tabela: item.preco_tabela,
        preco_unitario: item.preco_unitario,
        desconto_percentual: item.desconto_percentual,
        valor_total: item.valor_total,
        margem_calculada: item.margem_calculada
      }));

      const { error: itensError } = await supabase
        .from('pedido_itens')
        .insert(pedidoItens);

      if (itensError) throw itensError;

      toast.success(`Pedido #${pedido.numero_pedido} criado com sucesso!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      tabela_preco_id: '',
      data_entrega_prevista: '',
      forma_pagamento: '',
      prazo_pagamento_dias: 30,
      observacoes: '',
      desconto: 0,
      valor_frete: 0
    });
    setItens([]);
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0 });
    setHistoricoCliente([]);
  };

  const totais = calcularTotais();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client and Table Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome_fantasia || cliente.razao_social_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tabela de Preços</Label>
              <Select
                value={formData.tabela_preco_id}
                onValueChange={(v) => setFormData({ ...formData, tabela_preco_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tabela" />
                </SelectTrigger>
                <SelectContent>
                  {tabelasPreco.map(tabela => (
                    <SelectItem key={tabela.id} value={tabela.id}>
                      {tabela.nome} {tabela.padrao && '(Padrão)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client History */}
          {historicoCliente.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Últimas compras deste cliente</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {historicoCliente.slice(0, 3).map((hist, idx) => (
                    <div key={idx}>
                      {hist.produto?.nome}: {hist.quantidade} {hist.unidade_medida} x R$ {hist.preco_unitario?.toFixed(2)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Item Section */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                  <Label>Produto</Label>
                  <Select
                    value={novoItem.produto_id}
                    onValueChange={(v) => {
                      const produto = produtos.find(p => p.id === v);
                      const tabelaItem = tabelaItens.find(ti => ti.produto_id === v);
                      const preco = tabelaItem?.preco_unitario || produto?.preco_venda || 0;
                      setNovoItem({ ...novoItem, produto_id: v, preco_unitario: preco });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map(produto => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.nome} (Est: {produto.estoque_atual} {produto.unidade_medida})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço Unit.</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={novoItem.preco_unitario}
                      onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })}
                    />
                    <Button onClick={handleAddItem}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {itens.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell className="text-right">
                          {item.quantidade} {item.unidade_medida}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) => handleUpdateItemPrice(index, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {item.valor_total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.margem_calculada < margemMinima ? 'destructive' : 'default'}>
                            {item.custo_medio > 0 ? (
                              <>
                                {item.margem_calculada.toFixed(1)}%
                                {item.margem_calculada < margemMinima && (
                                  <AlertTriangle className="w-3 h-3 ml-1" />
                                )}
                              </>
                            ) : '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Payment and Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v as FormaPagamento })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prazo (dias)</Label>
              <Input
                type="number"
                min="0"
                value={formData.prazo_pagamento_dias}
                onChange={(e) => setFormData({ ...formData, prazo_pagamento_dias: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.desconto}
                onChange={(e) => setFormData({ ...formData, desconto: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Frete (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.valor_frete}
                onChange={(e) => setFormData({ ...formData, valor_frete: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Entrega Prevista</Label>
              <Input
                type="date"
                value={formData.data_entrega_prevista}
                onChange={(e) => setFormData({ ...formData, data_entrega_prevista: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Totals */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-4 text-right">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">R$ {totais.subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desconto</p>
                  <p className="font-medium text-red-500">- R$ {totais.desconto.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Frete</p>
                  <p className="font-medium">+ R$ {totais.frete.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-primary">R$ {totais.total.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit('rascunho')}
            disabled={saving}
          >
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => handleSubmit('pendente_aprovacao')}
            disabled={saving}
          >
            Enviar para Aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
