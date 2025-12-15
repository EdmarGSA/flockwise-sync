import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Bird, Egg, Tractor, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ProdutoAnimalForm from '@/components/cadastro/ProdutoAnimalForm';

interface ProdutoAnimal {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  unidade_venda: string;
  preco_venda_base: number;
  peso_medio_referencia: number | null;
  ncm: string | null;
  ativo: boolean;
  grupo_animal: { id: string; nome: string } | null;
}

export default function CadastroProdutosAnimais() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [produtos, setProdutos] = useState<ProdutoAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchProdutos();
    }
  }, [user]);

  const fetchProdutos = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos_animais')
        .select(`
          id,
          sku,
          nome,
          descricao,
          unidade_venda,
          preco_venda_base,
          peso_medio_referencia,
          ncm,
          ativo,
          grupo_animal:grupos_animal(id, nome)
        `)
        .eq('integrado_id', user.id)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Error fetching produtos animais:', error);
      toast.error('Erro ao carregar produtos animais');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (produto: ProdutoAnimal) => {
    try {
      const { error } = await supabase
        .from('produtos_animais')
        .update({ ativo: !produto.ativo })
        .eq('id', produto.id);

      if (error) throw error;
      
      setProdutos(prev => prev.map(p => 
        p.id === produto.id ? { ...p, ativo: !p.ativo } : p
      ));
      toast.success(produto.ativo ? 'Produto desativado' : 'Produto ativado');
    } catch (error) {
      console.error('Error toggling ativo:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const getGrupoIcon = (grupoNome: string | undefined) => {
    if (!grupoNome) return <Bird className="w-4 h-4" />;
    const nome = grupoNome.toLowerCase();
    if (nome.includes('postura') || nome.includes('ovo')) return <Egg className="w-4 h-4" />;
    if (nome.includes('suíno') || nome.includes('bovino')) return <Tractor className="w-4 h-4" />;
    return <Bird className="w-4 h-4" />;
  };

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.grupo_animal?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
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

      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Bird className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Produtos Animais</h1>
              <p className="text-sm text-muted-foreground">Aves vivas, ovos, suínos e outros</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cadastro de Produtos Animais</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, SKU ou grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando produtos animais...
              </div>
            ) : filteredProdutos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bird className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto animal cadastrado</p>
                <p className="text-sm mt-2">Clique em "Novo Produto" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Grupo Animal</TableHead>
                      <TableHead>Un. Venda</TableHead>
                      <TableHead className="text-right">Preço Base</TableHead>
                      <TableHead className="text-right">Peso Médio Ref.</TableHead>
                      <TableHead className="text-center">Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map(produto => (
                      <TableRow key={produto.id}>
                        <TableCell className="font-mono text-sm">{produto.sku}</TableCell>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell>
                          {produto.grupo_animal ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              {getGrupoIcon(produto.grupo_animal.nome)}
                              {produto.grupo_animal.nome}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{produto.unidade_venda}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {produto.preco_venda_base.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {produto.peso_medio_referencia 
                            ? `${produto.peso_medio_referencia.toFixed(3)} kg`
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={produto.ativo}
                            onCheckedChange={() => handleToggleAtivo(produto)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Produto Animal</DialogTitle>
          </DialogHeader>
          <ProdutoAnimalForm
            integradoId={user.id}
            onSuccess={() => {
              setShowDialog(false);
              fetchProdutos();
            }}
            onCancel={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
