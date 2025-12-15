import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface TabelaPrecoItensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabela: any;
  integradoId: string;
}

export default function TabelaPrecoItensDialog({ open, onOpenChange, tabela, integradoId }: TabelaPrecoItensDialogProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    preco_unitario: 0,
    desconto_maximo_percentual: 0
  });

  useEffect(() => {
    if (open) {
      fetchItens();
      fetchProdutos();
    }
  }, [open, tabela]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tabelas_preco_itens')
        .select(`
          *,
          produto:produtos(nome, preco_venda, custo_medio, unidade_medida)
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

  const fetchProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco_venda, custo_medio, unidade_medida')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .order('nome');
    setProdutos(data || []);
  };

  const handleAddItem = async () => {
    if (!novoItem.produto_id || novoItem.preco_unitario <= 0) {
      toast.error('Selecione um produto e informe um preço válido');
      return;
    }

    // Check if product already exists
    if (itens.some(i => i.produto_id === novoItem.produto_id)) {
      toast.error('Produto já está na tabela');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tabelas_preco_itens')
        .insert({
          tabela_preco_id: tabela.id,
          produto_id: novoItem.produto_id,
          preco_unitario: novoItem.preco_unitario,
          desconto_maximo_percentual: novoItem.desconto_maximo_percentual
        });

      if (error) throw error;

      toast.success('Produto adicionado à tabela!');
      setNovoItem({ produto_id: '', preco_unitario: 0, desconto_maximo_percentual: 0 });
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

  const availableProducts = produtos.filter(
    p => !itens.some(i => i.produto_id === p.id)
  );

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
                value={novoItem.produto_id}
                onValueChange={(v) => {
                  const produto = produtos.find(p => p.id === v);
                  setNovoItem({
                    ...novoItem,
                    produto_id: v,
                    preco_unitario: produto?.preco_venda || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(produto => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
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
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-right">Preço Unitário</TableHead>
                  <TableHead className="text-right">Desc. Máx.</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const custoMedio = item.produto?.custo_medio || 0;
                  const margem = custoMedio > 0 
                    ? ((item.preco_unitario - custoMedio) / custoMedio * 100)
                    : 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.produto?.nome}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.produto?.unidade_medida})
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        R$ {custoMedio.toFixed(2)}
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
                        <span className={margem < tabela.margem_minima_percentual ? 'text-destructive' : 'text-green-600'}>
                          {margem.toFixed(1)}%
                        </span>
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
