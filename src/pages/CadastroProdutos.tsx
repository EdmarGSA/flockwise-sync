import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Package, History, Pencil, FolderTree, Layers, FlaskConical, RotateCcw, Truck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProdutoForm from "@/components/cadastro/ProdutoForm";
import ProdutoEditForm from "@/components/cadastro/ProdutoEditForm";
import CategoriaForm from "@/components/cadastro/CategoriaForm";
import GrupoProdutoForm from "@/components/cadastro/GrupoProdutoForm";
import NutricoesDialog from "@/components/cadastro/NutricoesDialog";
import KardexView from "@/components/cadastro/KardexView";
import FornecedoresVinculadosDialog from "@/components/cadastro/FornecedoresVinculadosDialog";

const CadastroProdutos = () => {
  const { user, loading } = useAuth();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [gruposProduto, setGruposProduto] = useState<any[]>([]);
  const [gruposAnimal, setGruposAnimal] = useState<any[]>([]);
  const [fasesAnimal, setFasesAnimal] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<any>(null);
  const [selectedProdutoKardex, setSelectedProdutoKardex] = useState<any>(null);
  const [formulacaoProduto, setFormulacaoProduto] = useState<any>(null);
  const [fornecedoresProduto, setFornecedoresProduto] = useState<any>(null);

  useEffect(() => {
    if (integradoId) {
      initializeDefaultGrupos();
    }
  }, [integradoId]);

  const initializeDefaultGrupos = async () => {
    // Initialize default product groups
    const { data: existingGrupos } = await supabase
      .from("grupos_produto")
      .select("id")
      .eq("integrado_id", integradoId)
      .limit(1);

    if (!existingGrupos || existingGrupos.length === 0) {
      const defaultGrupos = [
        { nome: "Ração", descricao: "Rações para animais", integrado_id: integradoId },
        { nome: "Suplemento", descricao: "Suplementos nutricionais", integrado_id: integradoId },
        { nome: "Cereais", descricao: "Grãos e cereais", integrado_id: integradoId },
        { nome: "Medicamento", descricao: "Medicamentos veterinários", integrado_id: integradoId },
        { nome: "Vacina", descricao: "Vacinas", integrado_id: integradoId },
      ];

      await supabase.from('grupos_produto').insert(defaultGrupos as any);
    }

    // Initialize default categories
    const { data: existingCategorias } = await supabase
      .from("categorias")
      .select("id")
      .eq("integrado_id", integradoId)
      .limit(1);

    if (!existingCategorias || existingCategorias.length === 0) {
      const defaultCategorias = [
        { nome: "Produção Própria", descricao: "Produtos de produção própria", tipo_origem: "producao_propria", integrado_id: integradoId },
        { nome: "Fabricação Própria", descricao: "Produtos fabricados internamente", tipo_origem: "fabricacao_propria", integrado_id: integradoId },
        { nome: "Terceiros", descricao: "Produtos adquiridos de terceiros", tipo_origem: "terceiros", integrado_id: integradoId },
      ];

      await supabase.from('categorias').insert(defaultCategorias as any);
    }

    fetchData();
  };

  const fetchData = async () => {
    setLoadingData(true);
    
    const [produtosRes, categoriasRes, gruposProdutoRes, gruposAnimalRes, fasesRes] = await Promise.all([
      supabase.from('produtos').select('*, categorias(nome, tipo_origem)').eq('integrado_id', integradoId),
      supabase.from('categorias').select('*').eq('integrado_id', integradoId),
      supabase.from('grupos_produto').select('*').eq('integrado_id', integradoId),
      supabase.from('grupos_animal').select('*').eq('integrado_id', integradoId),
      supabase.from('fases_animal').select('*').eq('integrado_id', integradoId),
    ]);

    if (produtosRes.data) setProdutos(produtosRes.data);
    if (categoriasRes.data) setCategorias(categoriasRes.data);
    if (gruposProdutoRes.data) setGruposProduto(gruposProdutoRes.data);
    if (gruposAnimalRes.data) setGruposAnimal(gruposAnimalRes.data);
    if (fasesRes.data) setFasesAnimal(fasesRes.data);
    
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

  const handleGrupoSuccess = () => {
    setShowGrupoForm(false);
    fetchData();
    toast({ title: "Grupo salvo com sucesso!" });
  };

  const handleResetDefaults = async () => {
    setLoadingData(true);

    // Delete existing categories for this user
    await supabase
      .from('categorias')
      .delete()
      .eq('integrado_id', integradoId);

    // Delete existing product groups for this user
    await supabase
      .from('grupos_produto')
      .delete()
      .eq('integrado_id', integradoId);

    // Recreate default categories
    const defaultCategorias = [
      { nome: "Produção Própria", descricao: "Produtos de produção própria", tipo_origem: "producao_propria", integrado_id: integradoId },
      { nome: "Fabricação Própria", descricao: "Produtos fabricados internamente", tipo_origem: "fabricacao_propria", integrado_id: integradoId },
      { nome: "Terceiros", descricao: "Produtos adquiridos de terceiros", tipo_origem: "terceiros", integrado_id: integradoId },
    ];

    await supabase.from('categorias').insert(defaultCategorias as any);

    // Recreate default product groups
    const defaultGrupos = [
      { nome: "Ração", descricao: "Rações para animais", integrado_id: integradoId },
      { nome: "Suplemento", descricao: "Suplementos nutricionais", integrado_id: integradoId },
      { nome: "Cereais", descricao: "Grãos e cereais", integrado_id: integradoId },
      { nome: "Medicamento", descricao: "Medicamentos veterinários", integrado_id: integradoId },
      { nome: "Vacina", descricao: "Vacinas", integrado_id: integradoId },
    ];

    await supabase.from('grupos_produto').insert(defaultGrupos as any);

    await fetchData();
    toast({ title: "Dados padrão recriados com sucesso!" });
  };

  const getTipoOrigemLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'producao_propria': 'Produção Própria',
      'fabricacao_propria': 'Fabricação Própria',
      'terceiros': 'Terceiros',
    };
    return labels[tipo] || tipo;
  };

  const getTipoOrigemBadgeVariant = (tipo: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'producao_propria': 'outline',
      'fabricacao_propria': 'default',
      'terceiros': 'secondary',
    };
    return variants[tipo] || 'outline';
  };

  if (loading || loadingIntegrado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !integradoId) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cadastro de Produtos</h1>
                <p className="text-muted-foreground">Gerencie produtos, categorias, grupos e movimentações</p>
              </div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Recriar Padrões
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Recriar dados padrão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá excluir todas as categorias e grupos de produtos existentes e recriá-los com os valores padrão:
                  <br /><br />
                  <strong>Categorias:</strong> Produção Própria, Fabricação Própria, Terceiros
                  <br />
                  <strong>Grupos:</strong> Ração, Suplemento, Cereais, Medicamento, Vacina
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDefaults}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Tabs defaultValue="produtos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="produtos" className="gap-2">
              <Package className="w-4 h-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="grupos" className="gap-2">
              <Layers className="w-4 h-4" /> Grupos
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
                      integradoId={integradoId} 
                      userId={user?.id}
                      categorias={categorias}
                      gruposProduto={gruposProduto}
                      gruposAnimal={gruposAnimal}
                      fasesAnimal={fasesAnimal}
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
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span>{produto.categorias?.nome || '-'}</span>
                              {produto.categorias?.tipo_origem && (
                                <Badge 
                                  variant={getTipoOrigemBadgeVariant(produto.categorias.tipo_origem)}
                                  className="w-fit text-xs"
                                >
                                  {getTipoOrigemLabel(produto.categorias.tipo_origem)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
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
                                title="Editar produto"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {produto.categorias?.tipo_origem === 'fabricacao_propria' && (
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => setFormulacaoProduto(produto)}
                                  title="Cadastrar Formulação / Bill of Materials"
                                  className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                                >
                                  <FlaskConical className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setFornecedoresProduto(produto)}
                                title="Ver Fornecedores"
                              >
                                <Truck className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedProdutoKardex(produto)}
                                title="Ver Kardex"
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

          <TabsContent value="grupos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Grupos de Produtos</CardTitle>
                <Dialog open={showGrupoForm} onOpenChange={setShowGrupoForm}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Novo Grupo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Grupo de Produto</DialogTitle>
                    </DialogHeader>
                    <GrupoProdutoForm integradoId={integradoId} onSuccess={handleGrupoSuccess} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : gruposProduto.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum grupo cadastrado</p>
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
                      {gruposProduto.map((grupo) => (
                        <TableRow key={grupo.id}>
                          <TableCell className="font-medium">{grupo.nome}</TableCell>
                          <TableCell>{grupo.descricao || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={grupo.ativo ? "default" : "secondary"}>
                              {grupo.ativo ? 'Ativo' : 'Inativo'}
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
                    <CategoriaForm integradoId={integradoId} onSuccess={handleCategoriaSuccess} />
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
                        <TableHead>Tipo de Origem</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorias.map((categoria) => (
                        <TableRow key={categoria.id}>
                          <TableCell className="font-medium">{categoria.nome}</TableCell>
                          <TableCell>{categoria.descricao || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTipoOrigemLabel(categoria.tipo_origem)}
                            </Badge>
                          </TableCell>
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
            <KardexView integradoId={integradoId} produtos={produtos} />
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
                gruposProduto={gruposProduto}
                gruposAnimal={gruposAnimal}
                fasesAnimal={fasesAnimal}
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
                integradoId={integradoId} 
                produtos={[selectedProdutoKardex]}
                produtoId={selectedProdutoKardex.id}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Nutrições Dialog */}
        <NutricoesDialog
          open={!!formulacaoProduto}
          onOpenChange={() => setFormulacaoProduto(null)}
          produto={formulacaoProduto}
          integradoId={integradoId}
          gruposProduto={gruposProduto}
          produtos={produtos}
        />

        {/* Fornecedores Vinculados Dialog */}
        <FornecedoresVinculadosDialog
          produto={fornecedoresProduto}
          open={!!fornecedoresProduto}
          onOpenChange={() => setFornecedoresProduto(null)}
        />
      </main>
    </div>
  );
};

export default CadastroProdutos;
