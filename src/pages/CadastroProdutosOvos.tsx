import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Egg, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ProdutoOvo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo_ovo: string;
  classificacao_peso: string;
  unidade_venda: string;
  fator_conversao: number;
  preco_venda: number;
  margem_minima: number;
  estoque_minimo: number;
  ativo: boolean;
}

const TIPOS_OVO = [
  { value: 'branco', label: 'Branco' },
  { value: 'castanho', label: 'Castanho' },
  { value: 'vermelho', label: 'Vermelho' },
  { value: 'caipira', label: 'Caipira' },
];

const CLASSIFICACOES_PESO = [
  { value: 'medio', label: 'Médio (38-47g)' },
  { value: 'grande', label: 'Grande (48-57g)' },
  { value: 'extra', label: 'Extra (58-67g)' },
  { value: 'jumbo', label: 'Jumbo (68g+)' },
];

const UNIDADES_VENDA = [
  { value: 'UN', label: 'Unidade', fator: 1 },
  { value: 'DZ', label: 'Dúzia (12un)', fator: 12 },
  { value: 'CX_15', label: 'Caixa 15un', fator: 15 },
  { value: 'CX_30', label: 'Caixa 30un', fator: 30 },
  { value: 'BDJ_30', label: 'Bandeja 30un', fator: 30 },
  { value: 'BDJ_60', label: 'Bandeja 60un', fator: 60 },
  { value: 'BDJ_180', label: 'Bandeja 180un', fator: 180 },
  { value: 'BDJ_360', label: 'Bandeja 360un', fator: 360 },
];

export default function CadastroProdutosOvos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<ProdutoOvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoOvo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    tipo_ovo: '',
    classificacao_peso: '',
    unidade_venda: 'DZ',
    fator_conversao: 12,
    preco_venda: 0,
    margem_minima: 10,
    estoque_minimo: 0,
  });

  useEffect(() => {
    if (user) fetchProdutos();
  }, [user]);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos_ovos')
        .select('*')
        .eq('integrado_id', user?.id)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar produtos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnidadeChange = (value: string) => {
    const unidade = UNIDADES_VENDA.find(u => u.value === value);
    setFormData(prev => ({
      ...prev,
      unidade_venda: value,
      fator_conversao: unidade?.fator || 1,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingProduto) {
        const { error } = await supabase
          .from('produtos_ovos')
          .update({
            codigo: formData.codigo,
            nome: formData.nome,
            descricao: formData.descricao || null,
            tipo_ovo: formData.tipo_ovo as any,
            classificacao_peso: formData.classificacao_peso as any,
            unidade_venda: formData.unidade_venda as any,
            fator_conversao: formData.fator_conversao,
            preco_venda: formData.preco_venda,
            margem_minima: formData.margem_minima,
            estoque_minimo: formData.estoque_minimo,
          })
          .eq('id', editingProduto.id);

        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('produtos_ovos')
          .insert([{
            integrado_id: user.id,
            codigo: formData.codigo,
            nome: formData.nome,
            descricao: formData.descricao || null,
            tipo_ovo: formData.tipo_ovo as any,
            classificacao_peso: formData.classificacao_peso as any,
            unidade_venda: formData.unidade_venda as any,
            fator_conversao: formData.fator_conversao,
            preco_venda: formData.preco_venda,
            margem_minima: formData.margem_minima,
            estoque_minimo: formData.estoque_minimo,
          }]);

        if (error) throw error;
        toast.success('Produto cadastrado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchProdutos();
    } catch (error: any) {
      toast.error('Erro ao salvar produto: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      tipo_ovo: '',
      classificacao_peso: '',
      unidade_venda: 'DZ',
      fator_conversao: 12,
      preco_venda: 0,
      margem_minima: 10,
      estoque_minimo: 0,
    });
    setEditingProduto(null);
  };

  const handleEdit = (produto: ProdutoOvo) => {
    setEditingProduto(produto);
    setFormData({
      codigo: produto.codigo,
      nome: produto.nome,
      descricao: produto.descricao || '',
      tipo_ovo: produto.tipo_ovo,
      classificacao_peso: produto.classificacao_peso,
      unidade_venda: produto.unidade_venda,
      fator_conversao: produto.fator_conversao,
      preco_venda: produto.preco_venda,
      margem_minima: produto.margem_minima,
      estoque_minimo: produto.estoque_minimo,
    });
    setDialogOpen(true);
  };

  const getTipoLabel = (tipo: string) => TIPOS_OVO.find(t => t.value === tipo)?.label || tipo;
  const getClassificacaoLabel = (c: string) => CLASSIFICACOES_PESO.find(cp => cp.value === c)?.label || c;
  const getUnidadeLabel = (u: string) => UNIDADES_VENDA.find(un => un.value === u)?.label || u;

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Egg className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Produtos de Ovos</h1>
              <p className="text-sm text-muted-foreground">Catálogo comercial de ovos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-28">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Catálogo de Produtos</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduto ? 'Editar Produto' : 'Novo Produto de Ovos'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Código *</Label>
                      <Input
                        value={formData.codigo}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                        placeholder="OVO-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ovos Caipira Grande DZ"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Ovo *</Label>
                      <Select value={formData.tipo_ovo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_ovo: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_OVO.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Classificação de Peso *</Label>
                      <Select value={formData.classificacao_peso} onValueChange={(v) => setFormData(prev => ({ ...prev, classificacao_peso: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a classificação" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICACOES_PESO.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unidade de Venda *</Label>
                      <Select value={formData.unidade_venda} onValueChange={handleUnidadeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES_VENDA.map(u => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fator de Conversão</Label>
                      <Input
                        type="number"
                        value={formData.fator_conversao}
                        onChange={(e) => setFormData(prev => ({ ...prev, fator_conversao: parseInt(e.target.value) || 1 }))}
                        min={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        1 {formData.unidade_venda} = {formData.fator_conversao} unidade(s)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Preço de Venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.preco_venda}
                        onChange={(e) => setFormData(prev => ({ ...prev, preco_venda: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Margem Mínima (%)</Label>
                      <Input
                        type="number"
                        value={formData.margem_minima}
                        onChange={(e) => setFormData(prev => ({ ...prev, margem_minima: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Mínimo</Label>
                      <Input
                        type="number"
                        value={formData.estoque_minimo}
                        onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground">Em {formData.unidade_venda}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição opcional"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingProduto ? 'Salvar' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredProdutos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell className="font-mono text-sm">{produto.codigo}</TableCell>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTipoLabel(produto.tipo_ovo)}</Badge>
                        </TableCell>
                        <TableCell>{getClassificacaoLabel(produto.classificacao_peso)}</TableCell>
                        <TableCell>
                          {getUnidadeLabel(produto.unidade_venda)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({produto.fator_conversao} un)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {produto.preco_venda.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(produto)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
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
    </div>
  );
}
