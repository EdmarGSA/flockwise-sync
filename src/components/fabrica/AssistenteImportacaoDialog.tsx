import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Wand2, 
  Link2, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  SkipForward,
  Loader2,
  Info
} from 'lucide-react';
import { padronizarNome, validarNCM, formatarNCM, getDescricaoOrigem } from '@/lib/utils/padronizarNome';

export interface ItemNaoVinculado {
  codigo: string;        // cProd
  descricao: string;     // xProd
  quantidade: number;    // qCom
  valorUnitario: number; // vUnCom
  valorTotal: number;    // vProd
  unidade: string;       // uCom
  gtin: string;          // cEAN
  ncm: string;           // NCM
  cest: string;          // CEST
  origem: string;        // orig
}

interface ProdutoExistente {
  id: string;
  nome: string;
  sku: string;
  unidade_medida: string;
  codigo_barras_ean: string | null;
}

interface Categoria {
  id: string;
  nome: string;
}

interface GrupoProduto {
  id: string;
  nome: string;
}

export interface VinculoCriado {
  itemIndex: number;
  tipo: 'vinculado' | 'cadastrado' | 'pulado';
  produtoId?: string;
  produtoNome?: string;
}

interface AssistenteImportacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itensNaoVinculados: ItemNaoVinculado[];
  parceiroId: string;
  parceiroNome: string;
  integradoId: string;
  onComplete: (vinculos: VinculoCriado[]) => void;
}

export function AssistenteImportacaoDialog({
  open,
  onOpenChange,
  itensNaoVinculados,
  parceiroId,
  parceiroNome,
  integradoId,
  onComplete
}: AssistenteImportacaoDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Estados para vincular produto existente
  const [searchTerm, setSearchTerm] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<ProdutoExistente[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoExistente | null>(null);
  const [fatorConversaoVinculo, setFatorConversaoVinculo] = useState(1);
  
  // Estados para cadastrar novo produto
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [novoNCM, setNovoNCM] = useState('');
  const [novoGTIN, setNovoGTIN] = useState('');
  const [novaUnidadeEstoque, setNovaUnidadeEstoque] = useState('');
  const [novoFatorConversao, setNovoFatorConversao] = useState(1);
  const [novaCategoriaId, setNovaCategoriaId] = useState('');
  const [novoGrupoId, setNovoGrupoId] = useState('');
  const [novaOrigem, setNovaOrigem] = useState('0');
  const [novoCest, setNovoCest] = useState('');
  const [requerQuarentena, setRequerQuarentena] = useState(true);
  
  // Resultados processados
  const [vinculosCriados, setVinculosCriados] = useState<VinculoCriado[]>([]);
  
  // Alertas
  const [gtinDuplicado, setGtinDuplicado] = useState<ProdutoExistente | null>(null);
  const [ncmAlerta, setNcmAlerta] = useState<string | null>(null);
  
  const itemAtual = itensNaoVinculados[currentIndex];
  const totalItens = itensNaoVinculados.length;
  const itensProcessados = vinculosCriados.length;
  
  // Carregar categorias e grupos ao abrir
  useEffect(() => {
    if (open && integradoId) {
      fetchCategoriasGrupos();
    }
  }, [open, integradoId]);
  
  // Pré-preencher formulário quando mudar de item
  useEffect(() => {
    if (itemAtual) {
      const nomePadronizado = padronizarNome(itemAtual.descricao);
      setNovoNome(nomePadronizado);
      setNovoNCM(itemAtual.ncm || '');
      setNovoGTIN(itemAtual.gtin || '');
      setNovaUnidadeEstoque(itemAtual.unidade || 'UN');
      setNovoFatorConversao(1);
      setNovaOrigem(itemAtual.origem || '0');
      setNovoCest(itemAtual.cest || '');
      
      // Validar NCM
      const validacao = validarNCM(itemAtual.ncm);
      setNcmAlerta(validacao.mensagem || null);
      
      // Verificar GTIN duplicado
      if (itemAtual.gtin) {
        verificarGtinDuplicado(itemAtual.gtin);
      } else {
        setGtinDuplicado(null);
      }
      
      // Limpar seleções anteriores
      setSearchTerm('');
      setProdutosEncontrados([]);
      setProdutoSelecionado(null);
      setFatorConversaoVinculo(1);
    }
  }, [currentIndex, itemAtual]);
  
  const fetchCategoriasGrupos = async () => {
    const [catResult, grupoResult] = await Promise.all([
      supabase
        .from('categorias')
        .select('id, nome')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('grupos_produto')
        .select('id, nome')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome')
    ]);
    
    if (catResult.data) setCategorias(catResult.data);
    if (grupoResult.data) setGrupos(grupoResult.data);
  };
  
  const verificarGtinDuplicado = async (gtin: string) => {
    if (!gtin || gtin === 'SEM GTIN') {
      setGtinDuplicado(null);
      return;
    }
    
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, sku, unidade_medida, codigo_barras_ean')
      .eq('integrado_id', integradoId)
      .eq('codigo_barras_ean', gtin)
      .eq('ativo', true)
      .maybeSingle();
    
    setGtinDuplicado(data as ProdutoExistente | null);
  };
  
  const buscarProdutos = async (termo: string) => {
    if (!termo || termo.length < 2) {
      setProdutosEncontrados([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, sku, unidade_medida, codigo_barras_ean')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .or(`nome.ilike.%${termo}%,sku.ilike.%${termo}%`)
        .limit(10);
      
      setProdutosEncontrados(data || []);
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleVincularProduto = async () => {
    if (!produtoSelecionado || !itemAtual) return;
    
    setLoading(true);
    try {
      // Verificar se já existe vínculo
      const { data: existente } = await supabase
        .from('produto_fornecedor')
        .select('id')
        .eq('parceiro_id', parceiroId)
        .eq('produto_id', produtoSelecionado.id)
        .maybeSingle();
      
      if (existente) {
        // Atualizar vínculo existente
        await supabase
          .from('produto_fornecedor')
          .update({
            codigo_produto_fornecedor: itemAtual.codigo,
            descricao_produto_fornecedor: itemAtual.descricao,
            unidade_compra_fornecedor: itemAtual.unidade,
            fator_conversao_fornecedor: fatorConversaoVinculo,
            gtin_esperado: itemAtual.gtin || null,
            preco_compra: itemAtual.valorUnitario,
            ativo: true
          })
          .eq('id', existente.id);
      } else {
        // Criar novo vínculo
        await supabase
          .from('produto_fornecedor')
          .insert({
            integrado_id: integradoId,
            parceiro_id: parceiroId,
            produto_id: produtoSelecionado.id,
            codigo_produto_fornecedor: itemAtual.codigo,
            descricao_produto_fornecedor: itemAtual.descricao,
            unidade_compra_fornecedor: itemAtual.unidade,
            fator_conversao_fornecedor: fatorConversaoVinculo,
            gtin_esperado: itemAtual.gtin || null,
            preco_compra: itemAtual.valorUnitario,
            ativo: true
          });
      }
      
      // Registrar vínculo criado
      setVinculosCriados(prev => [...prev, {
        itemIndex: currentIndex,
        tipo: 'vinculado',
        produtoId: produtoSelecionado.id,
        produtoNome: produtoSelecionado.nome
      }]);
      
      toast.success(`Produto vinculado: ${produtoSelecionado.nome}`);
      avancarProximoItem();
      
    } catch (error) {
      console.error('Erro ao vincular produto:', error);
      toast.error('Erro ao vincular produto');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCadastrarNovo = async () => {
    if (!itemAtual) return;
    
    if (!novoNome.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    
    setLoading(true);
    try {
      // Gerar SKU automático
      const timestamp = Date.now().toString(36).toUpperCase();
      const sku = `IMP-${timestamp}`;
      
      // Criar produto
      const { data: novoProduto, error: prodError } = await supabase
        .from('produtos')
        .insert({
          integrado_id: integradoId,
          nome: novoNome.trim(),
          sku,
          ncm: novoNCM || null,
          codigo_barras_ean: novoGTIN || null,
          unidade_medida: novaUnidadeEstoque || 'UN',
          unidade_compra: itemAtual.unidade,
          fator_conversao: novoFatorConversao,
          custo_unitario: itemAtual.valorUnitario,
          origem_mercadoria: novaOrigem,
          cest: novoCest || null,
          categoria_id: novaCategoriaId || null,
          grupo_id: novoGrupoId || null,
          requer_quarentena: requerQuarentena,
          ativo: true
        })
        .select('id, nome')
        .single();
      
      if (prodError) throw prodError;
      
      // Criar vínculo com fornecedor automaticamente
      await supabase
        .from('produto_fornecedor')
        .insert({
          integrado_id: integradoId,
          parceiro_id: parceiroId,
          produto_id: novoProduto.id,
          codigo_produto_fornecedor: itemAtual.codigo,
          descricao_produto_fornecedor: itemAtual.descricao,
          unidade_compra_fornecedor: itemAtual.unidade,
          fator_conversao_fornecedor: novoFatorConversao,
          gtin_esperado: itemAtual.gtin || null,
          preco_compra: itemAtual.valorUnitario,
          ativo: true
        });
      
      // Registrar cadastro
      setVinculosCriados(prev => [...prev, {
        itemIndex: currentIndex,
        tipo: 'cadastrado',
        produtoId: novoProduto.id,
        produtoNome: novoProduto.nome
      }]);
      
      toast.success(`Produto cadastrado: ${novoProduto.nome}`);
      avancarProximoItem();
      
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      toast.error('Erro ao cadastrar produto');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePular = () => {
    setVinculosCriados(prev => [...prev, {
      itemIndex: currentIndex,
      tipo: 'pulado'
    }]);
    
    avancarProximoItem();
  };
  
  const avancarProximoItem = () => {
    if (currentIndex < totalItens - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Todos processados
      finalizarAssistente();
    }
  };
  
  const finalizarAssistente = () => {
    const pulados = vinculosCriados.filter(v => v.tipo === 'pulado').length;
    const vinculados = vinculosCriados.filter(v => v.tipo === 'vinculado').length;
    const cadastrados = vinculosCriados.filter(v => v.tipo === 'cadastrado').length;
    
    toast.success(
      `Importação concluída: ${vinculados} vinculados, ${cadastrados} cadastrados, ${pulados} pulados`
    );
    
    onComplete(vinculosCriados);
    onOpenChange(false);
  };
  
  const handleVincularGtinDuplicado = async () => {
    if (!gtinDuplicado) return;
    
    setProdutoSelecionado(gtinDuplicado);
    setGtinDuplicado(null);
  };
  
  if (!itemAtual) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Assistente de Importação - {itensProcessados + 1} de {totalItens}
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((itensProcessados + 1) / totalItens) * 100}%` }}
          />
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          {/* Card do item atual */}
          <Card className="mb-4 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Item do XML - Fornecedor: {parceiroNome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Código:</span>
                  <p className="font-mono font-medium">{itemAtual.codigo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NCM:</span>
                  <p className="font-mono font-medium">{formatarNCM(itemAtual.ncm) || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">GTIN:</span>
                  <p className="font-mono font-medium text-xs">{itemAtual.gtin || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Unidade:</span>
                  <p className="font-medium">{itemAtual.unidade}</p>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-muted-foreground text-sm">Descrição:</span>
                <p className="font-medium">{itemAtual.descricao}</p>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Qtd:</span>
                  <span className="ml-1 font-medium">{itemAtual.quantidade}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Unit.:</span>
                  <span className="ml-1 font-medium">
                    R$ {itemAtual.valorUnitario.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-1 font-medium">
                    R$ {itemAtual.valorTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Alertas */}
          {gtinDuplicado && (
            <Card className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Este código de barras já existe!
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Produto: <strong>{gtinDuplicado.nome}</strong> ({gtinDuplicado.sku})
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={handleVincularGtinDuplicado}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Vincular a este produto
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {ncmAlerta && (
            <Card className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                  <Info className="h-4 w-4" />
                  <span>{ncmAlerta}</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Tabs para opções */}
          <Tabs defaultValue="vincular" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vincular" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Vincular a Existente
              </TabsTrigger>
              <TabsTrigger value="cadastrar" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Cadastrar Novo
              </TabsTrigger>
            </TabsList>
            
            {/* Opção A: Vincular */}
            <TabsContent value="vincular" className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto por nome ou SKU..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      buscarProdutos(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                
                {searchLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {produtosEncontrados.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                    {produtosEncontrados.map(prod => (
                      <div 
                        key={prod.id}
                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${
                          produtoSelecionado?.id === prod.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setProdutoSelecionado(prod)}
                      >
                        <div>
                          <p className="font-medium">{prod.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {prod.sku} • {prod.unidade_medida}
                          </p>
                        </div>
                        {produtoSelecionado?.id === prod.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {produtoSelecionado && (
                  <Card className="border-primary/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="font-medium">
                          Selecionado: {produtoSelecionado.nome}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Unidade no XML</Label>
                          <p className="font-mono p-2 bg-muted rounded">
                            {itemAtual.unidade}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm">Unidade no Estoque</Label>
                          <p className="font-mono p-2 bg-muted rounded">
                            {produtoSelecionado.unidade_medida}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="fator">Fator de Conversão</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">1 {itemAtual.unidade} =</span>
                          <Input
                            id="fator"
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={fatorConversaoVinculo}
                            onChange={(e) => setFatorConversaoVinculo(parseFloat(e.target.value) || 1)}
                            className="w-24"
                          />
                          <span className="text-sm">{produtoSelecionado.unidade_medida}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recebendo {itemAtual.quantidade} {itemAtual.unidade} = {
                            (itemAtual.quantidade * fatorConversaoVinculo).toFixed(2)
                          } {produtoSelecionado.unidade_medida} no estoque
                        </p>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={handleVincularProduto}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4 mr-2" />
                        )}
                        Vincular Produto
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            {/* Opção B: Cadastrar Novo */}
            <TabsContent value="cadastrar" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto *</Label>
                  <Input
                    id="nome"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Nome padronizado"
                  />
                  <p className="text-xs text-muted-foreground">
                    Original: {itemAtual.descricao}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ncm">NCM</Label>
                  <Input
                    id="ncm"
                    value={novoNCM}
                    onChange={(e) => setNovoNCM(e.target.value)}
                    placeholder="0000.00.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gtin">GTIN/EAN</Label>
                  <Input
                    id="gtin"
                    value={novoGTIN}
                    onChange={(e) => setNovoGTIN(e.target.value)}
                    placeholder="Código de barras"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem da Mercadoria</Label>
                  <Select value={novaOrigem} onValueChange={setNovaOrigem}>
                    <SelectTrigger id="origem">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['0','1','2','3','4','5','6','7','8'].map(cod => (
                        <SelectItem key={cod} value={cod}>
                          {cod} - {getDescricaoOrigem(cod)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={novaCategoriaId} onValueChange={setNovaCategoriaId}>
                    <SelectTrigger id="categoria">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo de Produto</Label>
                  <Select value={novoGrupoId} onValueChange={setNovoGrupoId}>
                    <SelectTrigger id="grupo">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map(grp => (
                        <SelectItem key={grp.id} value={grp.id}>
                          {grp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unidadeEstoque">Unidade de Estoque</Label>
                  <Select value={novaUnidadeEstoque} onValueChange={setNovaUnidadeEstoque}>
                    <SelectTrigger id="unidadeEstoque">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN - Unidade</SelectItem>
                      <SelectItem value="KG">KG - Quilograma</SelectItem>
                      <SelectItem value="G">G - Grama</SelectItem>
                      <SelectItem value="L">L - Litro</SelectItem>
                      <SelectItem value="ML">ML - Mililitro</SelectItem>
                      <SelectItem value="CX">CX - Caixa</SelectItem>
                      <SelectItem value="SC">SC - Saco</SelectItem>
                      <SelectItem value="PC">PC - Peça</SelectItem>
                      <SelectItem value="TON">TON - Tonelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fatorNovo">Fator de Conversão</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">1 {itemAtual.unidade} =</span>
                    <Input
                      id="fatorNovo"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={novoFatorConversao}
                      onChange={(e) => setNovoFatorConversao(parseFloat(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-sm">{novaUnidadeEstoque}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="quarentena"
                  checked={requerQuarentena}
                  onChange={(e) => setRequerQuarentena(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="quarentena" className="text-sm cursor-pointer">
                  Requer quarentena no recebimento
                </Label>
              </div>
              
              {novoCest && (
                <div className="space-y-2">
                  <Label htmlFor="cest">CEST (Substituição Tributária)</Label>
                  <Input
                    id="cest"
                    value={novoCest}
                    onChange={(e) => setNovoCest(e.target.value)}
                    placeholder="00.000.00"
                  />
                </div>
              )}
              
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Preview da conversão:</p>
                <p className="text-muted-foreground">
                  Recebendo {itemAtual.quantidade} {itemAtual.unidade} = {
                    (itemAtual.quantidade * novoFatorConversao).toFixed(2)
                  } {novaUnidadeEstoque} no estoque
                </p>
                <p className="text-muted-foreground">
                  Custo: R$ {itemAtual.valorUnitario.toFixed(4)} / {itemAtual.unidade} → 
                  R$ {(itemAtual.valorUnitario / novoFatorConversao).toFixed(4)} / {novaUnidadeEstoque}
                </p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleCadastrarNovo}
                disabled={loading || !novoNome.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4 mr-2" />
                )}
                Cadastrar e Vincular
              </Button>
            </TabsContent>
          </Tabs>
        </ScrollArea>
        
        {/* Footer com navegação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {itensProcessados} / {totalItens} processados
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePular}
              disabled={loading}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Pular
            </Button>
            
            {itensProcessados >= totalItens - 1 && (
              <Button onClick={finalizarAssistente}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
