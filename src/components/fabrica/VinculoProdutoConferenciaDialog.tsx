import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Link2, Plus, Package, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ItemNfe {
  id: string;
  descricao_nfe: string;
  codigo_produto_nfe: string | null;
  ncm_nfe: string | null;
  gtin_nfe: string | null;
  cest_nfe: string | null;
  unidade_compra: string | null;
  preco_nfe: number;
  quantidade_nfe: number;
}

interface Produto {
  id: string;
  nome: string;
  sku: string | null;
  unidade_medida: string;
  ncm: string | null;
  codigo_barras_ean: string | null;
}

interface VinculoProdutoConferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemNfe | null;
  integradoId: string;
  parceiroId: string | null;
  recebimentoId: string;
  onVinculado: () => void;
}

export function VinculoProdutoConferenciaDialog({
  open,
  onOpenChange,
  item,
  integradoId,
  parceiroId,
  recebimentoId,
  onVinculado
}: VinculoProdutoConferenciaDialogProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'vincular' | 'cadastrar'>('vincular');
  const [saving, setSaving] = useState(false);
  
  // Vincular existente
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [fatorConversao, setFatorConversao] = useState(1);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  
  // Cadastrar novo
  const [novoNome, setNovoNome] = useState('');
  const [novoSku, setNovoSku] = useState('');
  const [novaUnidade, setNovaUnidade] = useState('KG');
  const [novoFatorConversao, setNovoFatorConversao] = useState(1);
  const [grupoId, setGrupoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && item) {
      setBusca('');
      setProdutoSelecionado(null);
      setFatorConversao(1);
      setNovoNome(item.descricao_nfe || '');
      setNovoSku('');
      setNovaUnidade(item.unidade_compra || 'KG');
      setNovoFatorConversao(1);
      setTab('vincular');
      fetchGruposCategorias();
    }
  }, [open, item]);

  // Search products when busca changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busca.length >= 2) {
        fetchProdutos();
      } else {
        setProdutos([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const fetchGruposCategorias = async () => {
    const [gruposRes, categoriasRes] = await Promise.all([
      supabase.from('grupos_produto').select('id, nome').eq('integrado_id', integradoId).eq('ativo', true),
      supabase.from('categorias').select('id, nome').eq('integrado_id', integradoId).eq('ativo', true)
    ]);
    if (gruposRes.data) setGrupos(gruposRes.data);
    if (categoriasRes.data) setCategorias(categoriasRes.data);
  };

  const fetchProdutos = async () => {
    setLoadingProdutos(true);
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, sku, unidade_medida, ncm, codigo_barras_ean')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .or(`nome.ilike.%${busca}%,sku.ilike.%${busca}%`)
      .limit(20);
    setProdutos(data || []);
    setLoadingProdutos(false);
  };

  const handleVincularExistente = async () => {
    if (!produtoSelecionado || !item) return;
    setSaving(true);

    try {
      // 1. Update recebimento_itens with produto_id
      const { error: updateError } = await supabase
        .from('recebimento_itens')
        .update({ produto_id: produtoSelecionado.id })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 2. Create De-Para link in produto_fornecedor (only if parceiroId exists)
      if (parceiroId) {
        const { error: deParaError } = await supabase
          .from('produto_fornecedor')
          .upsert({
            integrado_id: integradoId,
            produto_id: produtoSelecionado.id,
            parceiro_id: parceiroId,
            codigo_produto_fornecedor: item.codigo_produto_nfe,
            descricao_produto_fornecedor: item.descricao_nfe,
            unidade_compra_fornecedor: item.unidade_compra || 'UN',
            fator_conversao_fornecedor: fatorConversao,
            gtin_esperado: item.gtin_nfe,
            ativo: true
          }, {
            onConflict: 'produto_id,parceiro_id'
          });

        if (deParaError) {
          console.warn('Erro ao criar De-Para:', deParaError);
        }
      }

      toast.success('Produto vinculado com sucesso!');
      onVinculado();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao vincular produto: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCadastrarNovo = async () => {
    if (!novoNome || !item) return;
    setSaving(true);

    try {
      // 1. Create new product
      const { data: novoProduto, error: produtoError } = await supabase
        .from('produtos')
        .insert({
          integrado_id: integradoId,
          nome: novoNome,
          sku: novoSku || null,
          unidade_medida: novaUnidade,
          ncm: item.ncm_nfe,
          gtin: item.gtin_nfe,
          cest: item.cest_nfe,
          grupo_id: grupoId || null,
          categoria_id: categoriaId || null,
          preco_unitario: item.preco_nfe,
          ativo: true
        })
        .select('id')
        .single();

      if (produtoError) throw produtoError;

      // 2. Update recebimento_itens with produto_id
      const { error: updateError } = await supabase
        .from('recebimento_itens')
        .update({ produto_id: novoProduto.id })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 3. Create De-Para link (only if parceiroId exists)
      if (parceiroId) {
        const { error: deParaError } = await supabase
          .from('produto_fornecedor')
          .insert({
            integrado_id: integradoId,
            produto_id: novoProduto.id,
            parceiro_id: parceiroId,
            codigo_produto_fornecedor: item.codigo_produto_nfe,
            descricao_produto_fornecedor: item.descricao_nfe,
            unidade_compra_fornecedor: item.unidade_compra || 'UN',
            fator_conversao_fornecedor: novoFatorConversao,
            gtin_esperado: item.gtin_nfe,
            ativo: true
          });

        if (deParaError) {
          console.warn('Erro ao criar De-Para:', deParaError);
        }
      }

      toast.success('Produto cadastrado e vinculado com sucesso!');
      onVinculado();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao cadastrar produto: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Vincular Produto
          </DialogTitle>
        </DialogHeader>

        {/* Item info */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium">{item.descricao_nfe}</p>
          <div className="flex gap-4 mt-1 text-muted-foreground">
            <span>Cód: {item.codigo_produto_nfe || '-'}</span>
            <span>NCM: {item.ncm_nfe || '-'}</span>
            <span>GTIN: {item.gtin_nfe || '-'}</span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'vincular' | 'cadastrar')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vincular" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Vincular Existente
            </TabsTrigger>
            <TabsTrigger value="cadastrar" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Cadastrar Novo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vincular" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Products list */}
            <ScrollArea className="h-48 border rounded-lg">
              {loadingProdutos ? (
                <div className="p-4 text-center text-muted-foreground">Buscando...</div>
              ) : produtos.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {busca.length < 2 ? 'Digite para buscar' : 'Nenhum produto encontrado'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {produtos.map((produto) => (
                    <button
                      key={produto.id}
                      onClick={() => setProdutoSelecionado(produto)}
                      className={`w-full text-left p-2 rounded-md flex items-center justify-between hover:bg-accent transition-colors ${
                        produtoSelecionado?.id === produto.id ? 'bg-primary/10 border border-primary' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {produto.sku && `SKU: ${produto.sku} • `}
                          {produto.unidade_medida}
                        </p>
                      </div>
                      {produtoSelecionado?.id === produto.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Conversion factor */}
            {produtoSelecionado && (
              <div className="space-y-2">
                <Label>Fator de Conversão</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={fatorConversao}
                    onChange={(e) => setFatorConversao(parseFloat(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    1 {item.unidade_compra || 'UN'} = {fatorConversao} {produtoSelecionado.unidade_medida} (estoque)
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleVincularExistente}
              disabled={!produtoSelecionado || saving}
              className="w-full"
            >
              {saving ? 'Vinculando...' : 'Vincular Produto'}
            </Button>
          </TabsContent>

          <TabsContent value="cadastrar" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome do Produto *</Label>
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome do produto"
                />
              </div>

              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={novoSku}
                  onChange={(e) => setNovoSku(e.target.value)}
                  placeholder="Código interno"
                />
              </div>

              <div className="space-y-2">
                <Label>Unidade Estoque</Label>
                <Select value={novaUnidade} onValueChange={setNovaUnidade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="CX">CX</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Fator de Conversão</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={novoFatorConversao}
                    onChange={(e) => setNovoFatorConversao(parseFloat(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    1 {item.unidade_compra || 'UN'} = {novoFatorConversao} {novaUnidade} (estoque)
                  </span>
                </div>
              </div>
            </div>

            {/* XML data badges */}
            <div className="flex flex-wrap gap-2">
              {item.ncm_nfe && <Badge variant="outline">NCM: {item.ncm_nfe}</Badge>}
              {item.gtin_nfe && <Badge variant="outline">GTIN: {item.gtin_nfe}</Badge>}
              {item.cest_nfe && <Badge variant="outline">CEST: {item.cest_nfe}</Badge>}
            </div>

            <Button
              onClick={handleCadastrarNovo}
              disabled={!novoNome || saving}
              className="w-full"
            >
              {saving ? 'Cadastrando...' : 'Cadastrar e Vincular'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
