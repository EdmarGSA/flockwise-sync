import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Package, History, Pencil, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProdutoForm from "@/components/cadastro/ProdutoForm";
import ProdutoEditForm from "@/components/cadastro/ProdutoEditForm";
import CategoriaForm from "@/components/cadastro/CategoriaForm";
import KardexView from "@/components/cadastro/KardexView";

const CadastroProdutos = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<any>(null);
  const [selectedProdutoKardex, setSelectedProdutoKardex] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchData = async () => {
    setLoadingData(true);
    
    const [produtosRes, categoriasRes] = await Promise.all([
      supabase.from('produtos').select('*, categorias(nome)').eq('integrado_id', profile?.id),
      supabase.from('categorias').select('*').eq('integrado_id', profile?.id)
    ]);

    if (produtosRes.data) setProdutos(produtosRes.data);
    if (categoriasRes.data) setCategorias(categoriasRes.data);
    
    setLoadingData(false);
  };

  const handleProdutoSuccess = () => {
    setShowProdutoForm(false);
    setEditingProduto(null);
    fetchData();
    toast({ title: "Produto salvo com sucesso!" });
  };

  const handleCategoriaSuccess = () => {
    setShowCategoriaForm(false);
    fetchData();
    toast({ title: "Categoria salva com sucesso!" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cadastro de Produtos</h1>
              <p className="text-muted-foreground">Gerencie produtos, categorias e movimentações</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="produtos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="produtos" className="gap-2">
              <Package className="w-4 h-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-2">
              <FolderTree className="w-4 h-4" /> Categorias
            </TabsTrigger>
            <TabsTrigger value="kardex" className="gap-2">
              <History className="w-4 h-4" /> Kardex
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtos</CardTitle>
                <Dialog open={showProdutoForm} onOpenChange={setShowProdutoForm}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Novo Produto</DialogTitle>
                    </DialogHeader>
                    <ProdutoForm 
                      integradoId={profile?.id} 
                      userId={user?.id}
                      categorias={categorias}
                      onSuccess={handleProdutoSuccess} 
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : produtos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Preço Venda</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtos.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell className="font-mono">{produto.sku}</TableCell>
                          <TableCell className="font-medium">{produto.nome}</TableCell>
                          <TableCell>{produto.categorias?.nome || '-'}</TableCell>
                          <TableCell>
                            <span className={Number(produto.estoque_atual) <= Number(produto.estoque_minimo) ? 'text-destructive font-bold' : ''}>
                              {produto.estoque_atual} {produto.unidade_medida}
                            </span>
                          </TableCell>
                          <TableCell>R$ {Number(produto.custo_unitario).toFixed(2)}</TableCell>
                          <TableCell>R$ {Number(produto.preco_venda).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={produto.ativo ? "default" : "secondary"}>
                              {produto.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setEditingProduto(produto)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedProdutoKardex(produto)}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorias">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Categorias</CardTitle>
                <Dialog open={showCategoriaForm} onOpenChange={setShowCategoriaForm}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Categoria</DialogTitle>
                    </DialogHeader>
                    <CategoriaForm integradoId={profile?.id} onSuccess={handleCategoriaSuccess} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : categorias.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorias.map((categoria) => (
                        <TableRow key={categoria.id}>
                          <TableCell className="font-medium">{categoria.nome}</TableCell>
                          <TableCell>{categoria.descricao || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={categoria.ativo ? "default" : "secondary"}>
                              {categoria.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kardex">
            <KardexView integradoId={profile?.id} produtos={produtos} />
          </TabsContent>
        </Tabs>

        {/* Edit Produto Dialog */}
        <Dialog open={!!editingProduto} onOpenChange={() => setEditingProduto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
            </DialogHeader>
            {editingProduto && (
              <ProdutoEditForm 
                produto={editingProduto}
                userId={user?.id}
                categorias={categorias}
                onSuccess={handleProdutoSuccess}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Kardex for specific product */}
        <Dialog open={!!selectedProdutoKardex} onOpenChange={() => setSelectedProdutoKardex(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kardex - {selectedProdutoKardex?.nome}</DialogTitle>
            </DialogHeader>
            {selectedProdutoKardex && (
              <KardexView 
                integradoId={profile?.id} 
                produtos={[selectedProdutoKardex]}
                produtoId={selectedProdutoKardex.id}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CadastroProdutos;
