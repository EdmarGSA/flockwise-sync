import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface PlanoContas {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: 'receita' | 'custo' | 'despesa' | 'investimento';
  conta_pai_id: string | null;
  nivel: number;
  natureza: 'devedora' | 'credora';
  ativo: boolean;
}

interface PlanoContasTabProps {
  userId: string;
}

const tipoOptions = [
  { value: 'receita', label: 'Receita', color: 'bg-green-500' },
  { value: 'custo', label: 'Custo', color: 'bg-orange-500' },
  { value: 'despesa', label: 'Despesa', color: 'bg-red-500' },
  { value: 'investimento', label: 'Investimento', color: 'bg-blue-500' },
];

const naturezaOptions = [
  { value: 'devedora', label: 'Devedora' },
  { value: 'credora', label: 'Credora' },
];

const PlanoContasTab = ({ userId }: PlanoContasTabProps) => {
  const [contas, setContas] = useState<PlanoContas[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<PlanoContas | null>(null);
  const [formData, setFormData] = useState<{
    codigo: string;
    nome: string;
    descricao: string;
    tipo: 'receita' | 'custo' | 'despesa' | 'investimento';
    conta_pai_id: string;
    natureza: 'devedora' | 'credora';
  }>({
    codigo: '',
    nome: '',
    descricao: '',
    tipo: 'despesa',
    conta_pai_id: '',
    natureza: 'devedora',
  });

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('integrado_id', userId)
        .order('codigo');
      
      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar plano de contas:', error);
      toast.error('Erro ao carregar plano de contas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, [userId]);

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      tipo: 'despesa',
      conta_pai_id: '',
      natureza: 'devedora',
    });
    setEditingConta(null);
  };

  const handleOpenDialog = (conta?: PlanoContas) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        codigo: conta.codigo,
        nome: conta.nome,
        descricao: conta.descricao || '',
        tipo: conta.tipo,
        conta_pai_id: conta.conta_pai_id || '',
        natureza: conta.natureza,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const calculateNivel = (contaPaiId: string | null): number => {
    if (!contaPaiId) return 1;
    const parent = contas.find(c => c.id === contaPaiId);
    return parent ? parent.nivel + 1 : 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nivel = calculateNivel(formData.conta_pai_id || null);
    
    try {
      if (editingConta) {
        const { error } = await supabase
          .from('plano_contas')
          .update({
            ...formData,
            conta_pai_id: formData.conta_pai_id || null,
            descricao: formData.descricao || null,
            nivel,
          })
          .eq('id', editingConta.id);
        
        if (error) throw error;
        toast.success('Conta atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('plano_contas')
          .insert({
            ...formData,
            integrado_id: userId,
            conta_pai_id: formData.conta_pai_id || null,
            descricao: formData.descricao || null,
            nivel,
          });
        
        if (error) throw error;
        toast.success('Conta cadastrada com sucesso');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchContas();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      if (error.code === '23505') {
        toast.error('Código já existe');
      } else {
        toast.error('Erro ao salvar conta');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const hasChildren = contas.some(c => c.conta_pai_id === id);
    if (hasChildren) {
      toast.error('Não é possível excluir conta com subcontas');
      return;
    }
    
    if (!confirm('Deseja realmente excluir esta conta?')) return;
    
    try {
      const { error } = await supabase
        .from('plano_contas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Conta excluída com sucesso');
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const getParentOptions = () => {
    return contas.filter(c => c.id !== editingConta?.id && c.nivel < 3);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plano de Contas (DRE)
          </CardTitle>
          <CardDescription>Estrutura hierárquica para classificação contábil</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta Contábil'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="1.1.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Custo de Ração"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v: 'receita' | 'custo' | 'despesa' | 'investimento') => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="natureza">Natureza</Label>
                  <Select value={formData.natureza} onValueChange={(v: 'devedora' | 'credora') => setFormData({ ...formData, natureza: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {naturezaOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta_pai">Conta Pai (opcional)</Label>
                <Select value={formData.conta_pai_id} onValueChange={(v) => setFormData({ ...formData, conta_pai_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta pai" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (Raiz)</SelectItem>
                    {getParentOptions().map(conta => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.codigo} - {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição da conta"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingConta ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {contas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma conta cadastrada. Comece criando as contas principais (Receitas, Custos, Despesas).
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>
                    <div className="flex items-center gap-1" style={{ paddingLeft: `${(conta.nivel - 1) * 20}px` }}>
                      {conta.nivel > 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      <span className="font-mono">{conta.codigo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{conta.nome}</TableCell>
                  <TableCell>
                    <Badge className={tipoOptions.find(t => t.value === conta.tipo)?.color}>
                      {tipoOptions.find(t => t.value === conta.tipo)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{conta.natureza === 'devedora' ? 'Devedora' : 'Credora'}</TableCell>
                  <TableCell>
                    <Badge variant={conta.ativo ? "default" : "secondary"}>
                      {conta.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(conta)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(conta.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
  );
};

export default PlanoContasTab;
