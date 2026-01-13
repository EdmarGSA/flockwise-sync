import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Egg, Plus, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface OvosVendaSectionProps {
  integradoId: string;
  margemMinima: number;
  onAddItem: (item: OvoVendaItem) => void;
}

export interface OvoVendaItem {
  produto_ovo_id: string;
  produto_nome: string;
  tipo_ovo: string;
  classificacao_peso: string;
  unidade_venda: string;
  fator_conversao: number;
  quantidade: number;
  quantidade_unidades: number;
  preco_unitario: number;
  valor_total: number;
  estoque_disponivel: number;
  custo_medio_unitario: number;
  margem_calculada: number;
}

interface ProdutoOvo {
  id: string;
  codigo: string;
  nome: string;
  tipo_ovo: string;
  classificacao_peso: string;
  unidade_venda: string;
  fator_conversao: number;
  preco_venda: number | null;
}

interface EstoqueAgrupado {
  tipo_ovo: string;
  classificacao_peso: string;
  quantidade_disponivel: number;
  custo_medio: number;
}

const TIPOS_OVO_LABELS: Record<string, string> = {
  branco: 'Branco',
  vermelho: 'Vermelho',
  caipira: 'Caipira',
  organico: 'Orgânico',
  codorna: 'Codorna',
};

const CLASSIFICACAO_LABELS: Record<string, string> = {
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
  extra: 'Extra',
  jumbo: 'Jumbo',
};

const UNIDADE_LABELS: Record<string, string> = {
  UN: 'Unidade',
  DZ: 'Dúzia',
  CX_30: 'Caixa 30',
  CX_360: 'Caixa 360',
};

export default function OvosVendaSection({ integradoId, margemMinima, onAddItem }: OvosVendaSectionProps) {
  const [produtosOvos, setProdutosOvos] = useState<ProdutoOvo[]>([]);
  const [estoqueAgrupado, setEstoqueAgrupado] = useState<EstoqueAgrupado[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [precoUnitario, setPrecoUnitario] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [integradoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch egg products
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos_ovos')
        .select('*')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) throw produtosError;
      setProdutosOvos(produtos || []);

      // Fetch and aggregate stock by type and classification
      const { data: estoque, error: estoqueError } = await supabase
        .from('estoque_ovos')
        .select('tipo_ovo, classificacao_peso, quantidade_atual, quantidade_reservada, custo_unitario')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .gt('quantidade_atual', 0);

      if (estoqueError) throw estoqueError;

      // Group stock by type and classification
      const agrupado: Record<string, EstoqueAgrupado> = {};
      (estoque || []).forEach(item => {
        const key = `${item.tipo_ovo}_${item.classificacao_peso}`;
        const disponivel = (item.quantidade_atual || 0) - (item.quantidade_reservada || 0);
        
        if (!agrupado[key]) {
          agrupado[key] = {
            tipo_ovo: item.tipo_ovo,
            classificacao_peso: item.classificacao_peso,
            quantidade_disponivel: 0,
            custo_medio: 0,
          };
        }
        
        // Accumulate available quantity
        agrupado[key].quantidade_disponivel += disponivel;
        
        // Calculate weighted average cost
        const totalAnterior = agrupado[key].custo_medio * (agrupado[key].quantidade_disponivel - disponivel);
        const totalNovo = (item.custo_unitario || 0) * disponivel;
        agrupado[key].custo_medio = agrupado[key].quantidade_disponivel > 0 
          ? (totalAnterior + totalNovo) / agrupado[key].quantidade_disponivel 
          : 0;
      });

      setEstoqueAgrupado(Object.values(agrupado));
    } catch (error) {
      console.error('Error fetching egg data:', error);
      toast.error('Erro ao carregar produtos de ovos');
    } finally {
      setLoading(false);
    }
  };

  const getEstoqueForProduto = (produto: ProdutoOvo): { disponivel: number; custoMedio: number } => {
    const estoque = estoqueAgrupado.find(
      e => e.tipo_ovo === produto.tipo_ovo && e.classificacao_peso === produto.classificacao_peso
    );
    return {
      disponivel: estoque?.quantidade_disponivel || 0,
      custoMedio: estoque?.custo_medio || 0,
    };
  };

  const handleProdutoChange = (produtoId: string) => {
    setSelectedProduto(produtoId);
    const produto = produtosOvos.find(p => p.id === produtoId);
    if (produto) {
      setPrecoUnitario(produto.preco_venda || 0);
    }
  };

  const handleAddOvo = () => {
    if (!selectedProduto) {
      toast.error('Selecione um produto de ovo');
      return;
    }

    if (quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    const produto = produtosOvos.find(p => p.id === selectedProduto);
    if (!produto) return;

    const { disponivel, custoMedio } = getEstoqueForProduto(produto);
    const quantidadeUnidades = quantidade * produto.fator_conversao;

    // Check stock availability
    if (quantidadeUnidades > disponivel) {
      toast.warning(`Estoque insuficiente! Disponível: ${disponivel} unidades (${(disponivel / produto.fator_conversao).toFixed(1)} ${produto.unidade_venda})`);
    }

    // Calculate margin
    const custoTotal = custoMedio * quantidadeUnidades;
    const valorTotal = precoUnitario * quantidade;
    const margem = custoTotal > 0 ? ((valorTotal - custoTotal) / custoTotal) * 100 : 0;

    if (margem < margemMinima && custoTotal > 0) {
      toast.warning(`⚠️ Margem ${margem.toFixed(1)}% abaixo do mínimo (${margemMinima}%)`);
    }

    const item: OvoVendaItem = {
      produto_ovo_id: produto.id,
      produto_nome: produto.nome,
      tipo_ovo: produto.tipo_ovo,
      classificacao_peso: produto.classificacao_peso,
      unidade_venda: produto.unidade_venda,
      fator_conversao: produto.fator_conversao,
      quantidade,
      quantidade_unidades: quantidadeUnidades,
      preco_unitario: precoUnitario,
      valor_total: valorTotal,
      estoque_disponivel: disponivel,
      custo_medio_unitario: custoMedio,
      margem_calculada: margem,
    };

    onAddItem(item);

    // Reset form
    setSelectedProduto('');
    setQuantidade(1);
    setPrecoUnitario(0);

    toast.success('Produto de ovo adicionado ao pedido');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4 text-center text-muted-foreground">
          Carregando produtos de ovos...
        </CardContent>
      </Card>
    );
  }

  if (produtosOvos.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="text-center space-y-2 py-4">
            <Egg className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto de ovo cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Cadastre produtos de ovos em Cadastros → Produtos Ovos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const produtoSelecionado = produtosOvos.find(p => p.id === selectedProduto);
  const estoqueInfo = produtoSelecionado ? getEstoqueForProduto(produtoSelecionado) : null;

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Egg className="w-5 h-5 text-amber-600" />
          <span className="font-medium">Venda de Ovos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 md:col-span-2">
            <Label>Produto de Ovo</Label>
            <Select value={selectedProduto} onValueChange={handleProdutoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {produtosOvos.map(produto => {
                  const { disponivel } = getEstoqueForProduto(produto);
                  const disponivelFormatado = (disponivel / produto.fator_conversao).toFixed(1);
                  
                  return (
                    <SelectItem key={produto.id} value={produto.id}>
                      <div className="flex items-center gap-2">
                        <span>{produto.nome}</span>
                        <Badge variant={disponivel > 0 ? 'secondary' : 'destructive'} className="text-xs">
                          {disponivelFormatado} {produto.unidade_venda}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade ({produtoSelecionado?.unidade_venda || 'UN'})</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantidade}
              onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label>Preço Unit. (R$)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={precoUnitario}
                onChange={(e) => setPrecoUnitario(parseFloat(e.target.value) || 0)}
              />
              <Button onClick={handleAddOvo} disabled={!selectedProduto}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stock info for selected product */}
        {produtoSelecionado && estoqueInfo && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{TIPOS_OVO_LABELS[produtoSelecionado.tipo_ovo] || produtoSelecionado.tipo_ovo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Classificação:</span>
                <p className="font-medium">{CLASSIFICACAO_LABELS[produtoSelecionado.classificacao_peso] || produtoSelecionado.classificacao_peso}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estoque Disponível:</span>
                <p className={`font-medium ${estoqueInfo.disponivel <= 0 ? 'text-destructive' : ''}`}>
                  {estoqueInfo.disponivel} unidades
                  {estoqueInfo.disponivel <= 0 && (
                    <AlertTriangle className="w-3 h-3 inline ml-1" />
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Médio/UN:</span>
                <p className="font-medium">
                  R$ {estoqueInfo.custoMedio.toFixed(4)}
                </p>
              </div>
            </div>

            {quantidade > 0 && precoUnitario > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Qtd em Unidades:</span>
                      <p className="font-medium">{(quantidade * produtoSelecionado.fator_conversao).toFixed(0)} UN</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Valor Total:</span>
                      <p className="font-medium text-primary">
                        R$ {(quantidade * precoUnitario).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {estoqueInfo.custoMedio > 0 && (
                    <div>
                      <span className="text-muted-foreground text-sm">Margem:</span>
                      {(() => {
                        const custoTotal = estoqueInfo.custoMedio * quantidade * produtoSelecionado.fator_conversao;
                        const valorTotal = precoUnitario * quantidade;
                        const margem = ((valorTotal - custoTotal) / custoTotal) * 100;
                        return (
                          <Badge variant={margem < margemMinima ? 'destructive' : 'default'}>
                            {margem.toFixed(1)}%
                            {margem < margemMinima && <AlertTriangle className="w-3 h-3 ml-1" />}
                          </Badge>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stock summary */}
        {estoqueAgrupado.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Package className="w-4 h-4" />
              <span>Resumo de Estoque Disponível</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {estoqueAgrupado
                .filter(e => e.quantidade_disponivel > 0)
                .map((e, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {TIPOS_OVO_LABELS[e.tipo_ovo] || e.tipo_ovo} {CLASSIFICACAO_LABELS[e.classificacao_peso] || e.classificacao_peso}: {e.quantidade_disponivel} UN
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
