import { useState } from 'react';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, LayoutGrid, List, Eye, Share2, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProdutoCatalogoForm, ProdutoCatalogo } from './ProdutoCatalogoForm';
import { ProdutoCard } from './ProdutoCard';
import { supabase } from '@/integrations/supabase/client';

interface FornecedorCatalogoTabProps {
  produtos: ProdutoCatalogo[];
  fornecedorGlobalId: string;
  onRefresh: () => void;
}

type ViewMode = 'grid' | 'table' | 'vitrine';

export function FornecedorCatalogoTab({ 
  produtos, 
  fornecedorGlobalId, 
  onRefresh 
}: FornecedorCatalogoTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<ProdutoCatalogo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<ProdutoCatalogo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [linkCopied, setLinkCopied] = useState(false);

  const filteredProdutos = produtos.filter((p) => {
    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = showInactive ? true : p.ativo;
    const matchesStock = showLowStock ? p.estoque_proprio <= p.estoque_minimo : true;
    
    return matchesSearch && matchesStatus && matchesStock;
  });

  const handleEdit = (produto: ProdutoCatalogo) => {
    setSelectedProduto(produto);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedProduto(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!produtoToDelete) return;

    const { error } = await supabase
      .from('produtos_catalogo_fornecedor')
      .delete()
      .eq('id', produtoToDelete.id);

    if (error) {
      toast.error('Erro ao excluir produto');
    } else {
      toast.success('Produto excluído com sucesso');
      onRefresh();
    }
    
    setDeleteDialogOpen(false);
    setProdutoToDelete(null);
  };

  const confirmDelete = (produto: ProdutoCatalogo) => {
    setProdutoToDelete(produto);
    setDeleteDialogOpen(true);
  };

  const getStockBadge = (produto: ProdutoCatalogo) => {
    if (produto.estoque_proprio <= 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    }
    if (produto.estoque_proprio <= produto.estoque_minimo) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Baixo</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">OK</Badge>;
  };

  const produtosAtivos = produtos.filter(p => p.ativo).length;
  const produtosBaixoEstoque = produtos.filter(p => p.estoque_proprio <= p.estoque_minimo && p.ativo).length;
  const valorEstoque = produtos.reduce((sum, p) => sum + (p.estoque_proprio * (p.custo || p.preco_tabela)), 0);

  const vitrineUrl = `${window.location.origin}/vitrine/${fornecedorGlobalId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(vitrineUrl);
      setLinkCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`Confira nosso catálogo de produtos: ${vitrineUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Meu Catálogo de Produtos</CardTitle>
              <CardDescription>
                Produtos do seu portfólio (exclusivo para você)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium">Compartilhar Catálogo</h4>
                    <p className="text-sm text-muted-foreground">
                      Envie o link da sua vitrine para seus clientes
                    </p>
                    <div className="flex gap-2">
                      <Input 
                        value={vitrineUrl} 
                        readOnly 
                        className="text-xs"
                      />
                      <Button size="sm" onClick={handleCopyLink}>
                        {linkCopied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleShareWhatsApp}
                    >
                      Enviar via WhatsApp
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => window.open(vitrineUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar Vitrine
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros e Toggle de Visualização */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código, categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
              >
                <ToggleGroupItem value="grid" aria-label="Grid">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Tabela">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="vitrine" aria-label="Vitrine">
                  <Eye className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-inactive-products"
                  checked={showInactive}
                  onCheckedChange={(checked) => setShowInactive(!!checked)}
                />
                <label htmlFor="show-inactive-products" className="text-sm cursor-pointer">
                  Inativos
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-low-stock"
                  checked={showLowStock}
                  onCheckedChange={(checked) => setShowLowStock(!!checked)}
                />
                <label htmlFor="show-low-stock" className="text-sm cursor-pointer">
                  Estoque baixo
                </label>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total de Produtos</p>
              <p className="text-2xl font-bold">{produtos.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Ativos</p>
              <p className="text-2xl font-bold text-green-600">{produtosAtivos}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Estoque Baixo
              </p>
              <p className="text-2xl font-bold text-amber-600">{produtosBaixoEstoque}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor em Estoque</p>
              <p className="text-2xl font-bold">
                R$ {valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Lista de Produtos */}
          {filteredProdutos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {produtos.length === 0 
                ? 'Nenhum produto cadastrado ainda. Clique em "Novo Produto" para começar.'
                : 'Nenhum produto encontrado com os filtros aplicados.'}
            </div>
          ) : viewMode === 'grid' || viewMode === 'vitrine' ? (
            /* Grid View */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProdutos.map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  onEdit={() => handleEdit(produto)}
                  onDelete={() => confirmDelete(produto)}
                  showActions={viewMode === 'grid'}
                  showStock={viewMode === 'grid'}
                  showCost={viewMode === 'grid'}
                />
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Unidade</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map((produto) => (
                    <TableRow key={produto.id} className={!produto.ativo ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">
                        {produto.codigo_interno}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {produto.imagem_url ? (
                            <img 
                              src={produto.imagem_url} 
                              alt={produto.nome}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{produto.nome}</p>
                            {produto.marca && (
                              <p className="text-sm text-muted-foreground">{produto.marca}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {produto.categoria || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {produto.unidade_venda}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {produto.preco_tabela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{produto.estoque_proprio.toLocaleString('pt-BR')}</span>
                          {getStockBadge(produto)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {produto.ativo ? (
                          <Badge variant="default" className="gap-1">
                            <Package className="h-3 w-3" /> Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(produto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(produto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ProdutoCatalogoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        produto={selectedProduto}
        fornecedorGlobalId={fornecedorGlobalId}
        onSuccess={onRefresh}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{produtoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
