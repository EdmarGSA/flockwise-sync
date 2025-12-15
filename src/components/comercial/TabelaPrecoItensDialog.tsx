import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Package, Bird } from 'lucide-react';
import { toast } from 'sonner';

interface TabelaPrecoItensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabela: any;
  integradoId: string;
}

interface ProdutoUnificado {
  id: string;
  tipo: 'produto' | 'produto_animal';
  nome: string;
  preco_venda: number;
  custo_medio: number | null;
  unidade: string;
}

export default function TabelaPrecoItensDialog({ open, onOpenChange, tabela, integradoId }: TabelaPrecoItensDialogProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [produtosUnificados, setProdutosUnificados] = useState<ProdutoUnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [novoItem, setNovoItem] = useState({
    selecionado_id: '',
    selecionado_tipo: '' as 'produto' | 'produto_animal' | '',
    preco_unitario: 0,
    desconto_maximo_percentual: 0
  });

  useEffect(() => {
    if (open) {
      fetchItens();
      fetchProdutosUnificados();
    }
  }, [open, tabela]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tabelas_preco_itens')
        .select(`
          *,
          produto:produtos(nome, preco_venda, custo_medio, unidade_medida),
          produto_animal:produtos_animais(nome, preco_venda_base, unidade_venda)
        `)
        .eq('tabela_preco_id', tabela.id)
        .order('created_at');

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Error fetching itens:', error);
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const fetchProdutosUnificados = async () => {
    // Buscar produtos com status_comercial = 'venda' ou 'ambos'
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome, preco_venda, custo_medio, unidade_medida')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .in('status_comercial', ['venda', 'ambos'])
      .order('nome');

    // Buscar produtos animais
    const { data: produtosAnimais } = await supabase
      .from('produtos_animais')
      .select('id, nome, preco_venda_base, unidade_venda')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .order('nome');

    const unificados: ProdutoUnificado[] = [
      ...(produtos || []).map(p => ({
        id: p.id,
        tipo: 'produto' as const,
        nome: p.nome,
        preco_venda: p.preco_venda || 0,
        custo_medio: p.custo_medio,
        unidade: p.unidade_medida || 'UN'
      })),
      ...(produtosAnimais || []).map(pa => ({
        id: pa.id,
        tipo: 'produto_animal' as const,
        nome: pa.nome,
        preco_venda: pa.preco_venda_base || 0,
        custo_medio: null,
        unidade: pa.unidade_venda || 'KG'
      }))
    ];

    setProdutosUnificados(unificados);
  };

  const handleAddItem = async () => {
    if (!novoItem.selecionado_id || !novoItem.selecionado_tipo || novoItem.preco_unitario <= 0) {
      toast.error('Selecione um produto e informe um preço válido');
      return;
    }

    // Check if already exists
    const jaExiste = itens.some(i => 
      (novoItem.selecionado_tipo === 'produto' && i.produto_id === novoItem.selecionado_id) ||
      (novoItem.selecionado_tipo === 'produto_animal' && i.produto_animal_id === novoItem.selecionado_id)
    );

    if (jaExiste) {
      toast.error('Produto já está na tabela');
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        tabela_preco_id: tabela.id,
        preco_unitario: novoItem.preco_unitario,
        desconto_maximo_percentual: novoItem.desconto_maximo_percentual
      };

      if (novoItem.selecionado_tipo === 'produto') {
        insertData.produto_id = novoItem.selecionado_id;
      } else {
        insertData.produto_animal_id = novoItem.selecionado_id;
      }

      const { error } = await supabase
        .from('tabelas_preco_itens')
        .insert(insertData);

      if (error) throw error;

      toast.success('Produto adicionado à tabela!');
      setNovoItem({ selecionado_id: '', selecionado_tipo: '', preco_unitario: 0, desconto_maximo_percentual: 0 });
      fetchItens();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (item: any, newPrice: number, newDesconto: number) => {
    try {
      const { error } = await supabase
        .from('tabelas_preco_itens')
        .update({
          preco_unitario: newPrice,
          desconto_maximo_percentual: newDesconto
        })
        .eq('id', item.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('tabelas_preco_itens')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Produto removido');
      fetchItens();
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Erro ao remover produto');
    }
  };

  // Filtrar produtos disponíveis (não já adicionados)
  const availableProducts = produtosUnificados.filter(p => {
    if (p.tipo === 'produto') {
      return !itens.some(i => i.produto_id === p.id);
    } else {
      return !itens.some(i => i.produto_animal_id === p.id);
    }
  });

  const produtosDisponiveis = availableProducts.filter(p => p.tipo === 'produto');
  const produtosAnimaisDisponiveis = availableProducts.filter(p => p.tipo === 'produto_animal');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preços da Tabela: {tabela.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Item */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2 md:col-span-2">
              <Label>Produto</Label>
              <Select
                value={novoItem.selecionado_id ? `${novoItem.selecionado_tipo}:${novoItem.selecionado_id}` : ''}
                onValueChange={(v) => {
                  const [tipo, id] = v.split(':') as ['produto' | 'produto_animal', string];
                  const item = produtosUnificados.find(p => p.id === id && p.tipo === tipo);
                  setNovoItem({
                    ...novoItem,
                    selecionado_id: id,
                    selecionado_tipo: tipo,
                    preco_unitario: item?.preco_venda || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtosDisponiveis.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Package className="w-3 h-3" /> Produtos
                      </div>
                      {produtosDisponiveis.map(p => (
                        <SelectItem key={`produto:${p.id}`} value={`produto:${p.id}`}>
                          {p.nome} ({p.unidade})
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {produtosAnimaisDisponiveis.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1 mt-2">
                        <Bird className="w-3 h-3" /> Produtos Animais
                      </div>
                      {produtosAnimaisDisponiveis.map(p => (
                        <SelectItem key={`produto_animal:${p.id}`} value={`produto_animal:${p.id}`}>
                          {p.nome} ({p.unidade})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preço Unit. (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={novoItem.preco_unitario}
                onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Desc. Máx. (%)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={novoItem.desconto_maximo_percentual}
                  onChange={(e) => setNovoItem({ ...novoItem, desconto_maximo_percentual: parseFloat(e.target.value) || 0 })}
                />
                <Button onClick={handleAddItem} disabled={saving}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto cadastrado nesta tabela
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Preço Unitário</TableHead>
                  <TableHead className="text-right">Desc. Máx.</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const isProduto = !!item.produto_id;
                  const nome = isProduto ? item.produto?.nome : item.produto_animal?.nome;
                  const unidade = isProduto ? item.produto?.unidade_medida : item.produto_animal?.unidade_venda;
                  const custoMedio = isProduto ? (item.produto?.custo_medio || 0) : null;
                  const margem = custoMedio && custoMedio > 0 
                    ? ((item.preco_unitario - custoMedio) / custoMedio * 100)
                    : null;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isProduto ? (
                            <Package className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Bird className="w-4 h-4 text-orange-500" />
                          )}
                          {nome}
                          <span className="text-xs text-muted-foreground">
                            ({unidade})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {custoMedio !== null ? `R$ ${custoMedio.toFixed(2)}` : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            setItens(itens.map(i => 
                              i.id === item.id ? { ...i, preco_unitario: newPrice } : i
                            ));
                          }}
                          onBlur={(e) => {
                            handleUpdateItem(item, parseFloat(e.target.value) || 0, item.desconto_maximo_percentual);
                          }}
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.desconto_maximo_percentual}
                          onChange={(e) => {
                            const newDesconto = parseFloat(e.target.value) || 0;
                            setItens(itens.map(i => 
                              i.id === item.id ? { ...i, desconto_maximo_percentual: newDesconto } : i
                            ));
                          }}
                          onBlur={(e) => {
                            handleUpdateItem(item, item.preco_unitario, parseFloat(e.target.value) || 0);
                          }}
                          className="w-20 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {margem !== null ? (
                          <span className={margem < tabela.margem_minima_percentual ? 'text-destructive' : 'text-green-600'}>
                            {margem.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
