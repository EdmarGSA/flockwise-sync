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
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface TaxaBancaria {
  id: string;
  conta_bancaria_id: string | null;
  nome: string;
  tipo: 'fixo' | 'percentual';
  valor: number;
  plano_conta_id: string | null;
  ativo: boolean;
}

interface ContaBancaria {
  id: string;
  banco_nome: string;
  agencia: string;
  conta: string;
}

interface PlanoContas {
  id: string;
  codigo: string;
  nome: string;
}

interface TaxasBancariasTabProps {
  userId: string;
}

const tipoOptions = [
  { value: 'fixo', label: 'Valor Fixo (R$)' },
  { value: 'percentual', label: 'Percentual (%)' },
];

const TaxasBancariasTab = ({ userId }: TaxasBancariasTabProps) => {
  const [taxas, setTaxas] = useState<TaxaBancaria[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<TaxaBancaria | null>(null);
  const [formData, setFormData] = useState<{
    conta_bancaria_id: string;
    nome: string;
    tipo: 'fixo' | 'percentual';
    valor: number;
    plano_conta_id: string;
  }>({
    conta_bancaria_id: '',
    nome: '',
    tipo: 'fixo',
    valor: 0,
    plano_conta_id: '',
  });

  const fetchData = async () => {
    try {
      const [taxasRes, contasRes, planoRes] = await Promise.all([
        supabase.from('taxas_bancarias').select('*').eq('integrado_id', userId).order('nome'),
        supabase.from('contas_bancarias').select('id, banco_nome, agencia, conta').eq('integrado_id', userId).eq('ativo', true),
        supabase.from('plano_contas').select('id, codigo, nome').eq('integrado_id', userId).eq('ativo', true).eq('tipo', 'despesa').order('codigo'),
      ]);
      
      if (taxasRes.error) throw taxasRes.error;
      if (contasRes.error) throw contasRes.error;
      if (planoRes.error) throw planoRes.error;
      
      setTaxas(taxasRes.data || []);
      setContas(contasRes.data || []);
      setPlanoContas(planoRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const resetForm = () => {
    setFormData({
      conta_bancaria_id: '',
      nome: '',
      tipo: 'fixo',
      valor: 0,
      plano_conta_id: '',
    });
    setEditingTaxa(null);
  };

  const handleOpenDialog = (taxa?: TaxaBancaria) => {
    if (taxa) {
      setEditingTaxa(taxa);
      setFormData({
        conta_bancaria_id: taxa.conta_bancaria_id || '',
        nome: taxa.nome,
        tipo: taxa.tipo,
        valor: taxa.valor,
        plano_conta_id: taxa.plano_conta_id || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTaxa) {
        const { error } = await supabase
          .from('taxas_bancarias')
          .update({
            conta_bancaria_id: formData.conta_bancaria_id || null,
            nome: formData.nome,
            tipo: formData.tipo,
            valor: formData.valor,
            plano_conta_id: formData.plano_conta_id || null,
          })
          .eq('id', editingTaxa.id);
        
        if (error) throw error;
        toast.success('Taxa atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('taxas_bancarias')
          .insert({
            integrado_id: userId,
            conta_bancaria_id: formData.conta_bancaria_id || null,
            nome: formData.nome,
            tipo: formData.tipo,
            valor: formData.valor,
            plano_conta_id: formData.plano_conta_id || null,
          });
        
        if (error) throw error;
        toast.success('Taxa cadastrada com sucesso');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar taxa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta taxa?')) return;
    
    try {
      const { error } = await supabase
        .from('taxas_bancarias')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Taxa excluída com sucesso');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir taxa');
    }
  };

  const getContaLabel = (contaId: string) => {
    const conta = contas.find(c => c.id === contaId);
    if (!conta) return 'Conta não encontrada';
    return `${conta.banco_nome} - ${conta.agencia}/${conta.conta}`;
  };

  const getPlanoLabel = (planoId: string) => {
    const plano = planoContas.find(p => p.id === planoId);
    return plano ? `${plano.codigo} - ${plano.nome}` : '-';
  };

  const formatValue = (taxa: TaxaBancaria) => {
    if (taxa.tipo === 'percentual') {
      return `${taxa.valor.toFixed(2)}%`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxa.valor);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Taxas Bancárias
          </CardTitle>
          <CardDescription>Parametrize tarifas e descontos para classificação automática</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Taxa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTaxa ? 'Editar Taxa' : 'Nova Taxa Bancária'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Taxa</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Tarifa de Boleto Registrado"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Cobrança</Label>
                  <Select value={formData.tipo} onValueChange={(v: 'fixo' | 'percentual') => setFormData({ ...formData, tipo: v })}>
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
                  <Label htmlFor="valor">
                    {formData.tipo === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'}
                  </Label>
                  <Input
                    id="valor"
                    type="number"
                    step={formData.tipo === 'percentual' ? '0.01' : '0.01'}
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta_bancaria">Conta Bancária (opcional)</Label>
                <Select value={formData.conta_bancaria_id || "all"} onValueChange={(v) => setFormData({ ...formData, conta_bancaria_id: v === "all" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {contas.map(conta => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.banco_nome} - {conta.agencia}/{conta.conta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plano_conta">Classificação Contábil (Plano de Contas)</Label>
                <Select value={formData.plano_conta_id || "none"} onValueChange={(v) => setFormData({ ...formData, plano_conta_id: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta contábil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem classificação</SelectItem>
                    {planoContas.map(plano => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.codigo} - {plano.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingTaxa ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {taxas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma taxa cadastrada. Cadastre taxas comuns como Tarifa de Boleto, Taxa TED, etc.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxas.map((taxa) => (
                <TableRow key={taxa.id}>
                  <TableCell className="font-medium">{taxa.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatValue(taxa)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {taxa.conta_bancaria_id ? getContaLabel(taxa.conta_bancaria_id) : 'Todas'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {taxa.plano_conta_id ? getPlanoLabel(taxa.plano_conta_id) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={taxa.ativo ? "default" : "secondary"}>
                      {taxa.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(taxa)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(taxa.id)}>
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

export default TaxasBancariasTab;
