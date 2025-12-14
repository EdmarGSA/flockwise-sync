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
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
import { toast } from "sonner";

interface ContaBancaria {
  id: string;
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  digito: string | null;
  tipo: 'corrente' | 'poupanca' | 'investimento';
  saldo_inicial: number;
  saldo_atual: number;
  taxa_manutencao_mensal: number | null;
  descricao: string | null;
  ativo: boolean;
}

interface ContasBancariasTabProps {
  userId: string;
}

const tipoOptions = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
];

const ContasBancariasTab = ({ userId }: ContasBancariasTabProps) => {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [formData, setFormData] = useState<{
    banco_codigo: string;
    banco_nome: string;
    agencia: string;
    conta: string;
    digito: string;
    tipo: 'corrente' | 'poupanca' | 'investimento';
    saldo_inicial: number;
    taxa_manutencao_mensal: number;
    descricao: string;
  }>({
    banco_codigo: '',
    banco_nome: '',
    agencia: '',
    conta: '',
    digito: '',
    tipo: 'corrente',
    saldo_inicial: 0,
    taxa_manutencao_mensal: 0,
    descricao: '',
  });

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('integrado_id', userId)
        .order('banco_nome');
      
      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, [userId]);

  const resetForm = () => {
    setFormData({
      banco_codigo: '',
      banco_nome: '',
      agencia: '',
      conta: '',
      digito: '',
      tipo: 'corrente',
      saldo_inicial: 0,
      taxa_manutencao_mensal: 0,
      descricao: '',
    });
    setEditingConta(null);
  };

  const handleOpenDialog = (conta?: ContaBancaria) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        banco_codigo: conta.banco_codigo,
        banco_nome: conta.banco_nome,
        agencia: conta.agencia,
        conta: conta.conta,
        digito: conta.digito || '',
        tipo: conta.tipo,
        saldo_inicial: conta.saldo_inicial,
        taxa_manutencao_mensal: conta.taxa_manutencao_mensal || 0,
        descricao: conta.descricao || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingConta) {
        const { error } = await supabase
          .from('contas_bancarias')
          .update({
            ...formData,
            digito: formData.digito || null,
            descricao: formData.descricao || null,
            taxa_manutencao_mensal: formData.taxa_manutencao_mensal || null,
          })
          .eq('id', editingConta.id);
        
        if (error) throw error;
        toast.success('Conta atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('contas_bancarias')
          .insert({
            ...formData,
            integrado_id: userId,
            saldo_atual: formData.saldo_inicial,
            digito: formData.digito || null,
            descricao: formData.descricao || null,
            taxa_manutencao_mensal: formData.taxa_manutencao_mensal || null,
          });
        
        if (error) throw error;
        toast.success('Conta cadastrada com sucesso');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchContas();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast.error('Erro ao salvar conta bancária');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conta?')) return;
    
    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Conta excluída com sucesso');
      fetchContas();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta bancária');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Contas Bancárias
          </CardTitle>
          <CardDescription>Gerencie suas contas movimento</CardDescription>
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
              <DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta Bancária'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banco_codigo">Código do Banco</Label>
                  <Input
                    id="banco_codigo"
                    value={formData.banco_codigo}
                    onChange={(e) => setFormData({ ...formData, banco_codigo: e.target.value })}
                    placeholder="001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banco_nome">Nome do Banco</Label>
                  <Input
                    id="banco_nome"
                    value={formData.banco_nome}
                    onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                    placeholder="Banco do Brasil"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="0001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="12345"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digito">Dígito</Label>
                  <Input
                    id="digito"
                    value={formData.digito}
                    onChange={(e) => setFormData({ ...formData, digito: e.target.value })}
                    placeholder="6"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Conta</Label>
                  <Select value={formData.tipo} onValueChange={(v: 'corrente' | 'poupanca' | 'investimento') => setFormData({ ...formData, tipo: v })}>
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
                  <Label htmlFor="saldo_inicial">Saldo Inicial (R$)</Label>
                  <Input
                    id="saldo_inicial"
                    type="number"
                    step="0.01"
                    value={formData.saldo_inicial}
                    onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                    disabled={!!editingConta}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxa_manutencao">Taxa Manutenção Mensal (R$)</Label>
                  <Input
                    id="taxa_manutencao"
                    type="number"
                    step="0.01"
                    value={formData.taxa_manutencao_mensal}
                    onChange={(e) => setFormData({ ...formData, taxa_manutencao_mensal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Conta principal"
                  />
                </div>
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
            Nenhuma conta bancária cadastrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Agência/Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{conta.banco_nome}</div>
                      <div className="text-sm text-muted-foreground">{conta.banco_codigo}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {conta.agencia} / {conta.conta}{conta.digito ? `-${conta.digito}` : ''}
                  </TableCell>
                  <TableCell>
                    {tipoOptions.find(t => t.value === conta.tipo)?.label}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(conta.saldo_atual)}
                  </TableCell>
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

export default ContasBancariasTab;
