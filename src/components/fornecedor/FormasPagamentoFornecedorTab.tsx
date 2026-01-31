import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Clock,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FormaPagamento {
  id: string;
  codigo: string;
  nome: string;
  codigo_erp: string | null;
  ativo: boolean;
}

interface PrazoPagamento {
  id: string;
  forma_pagamento_id: string;
  nome: string;
  dias_parcelas: number[];
  quantidade_parcelas: number;
  codigo_erp: string | null;
  padrao: boolean;
  ativo: boolean;
}

interface FormasPagamentoFornecedorTabProps {
  fornecedorGlobalId: string;
}

export const FormasPagamentoFornecedorTab = ({ fornecedorGlobalId }: FormasPagamentoFornecedorTabProps) => {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [prazos, setPrazos] = useState<PrazoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormaDialog, setShowFormaDialog] = useState(false);
  const [showPrazoDialog, setShowPrazoDialog] = useState(false);
  const [editingForma, setEditingForma] = useState<FormaPagamento | null>(null);
  const [editingPrazo, setEditingPrazo] = useState<PrazoPagamento | null>(null);
  const [selectedFormaId, setSelectedFormaId] = useState<string | null>(null);
  
  // Form states
  const [formaCodigo, setFormaCodigo] = useState('');
  const [formaNome, setFormaNome] = useState('');
  const [formaCodigoErp, setFormaCodigoErp] = useState('');
  
  const [prazoNome, setPrazoNome] = useState('');
  const [prazoDias, setPrazoDias] = useState('0');
  const [prazoCodigoErp, setPrazoCodigoErp] = useState('');
  const [prazoPadrao, setPrazoPadrao] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const [formasRes, prazosRes] = await Promise.all([
      supabase
        .from('formas_pagamento_fornecedor')
        .select('*')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .order('nome'),
      supabase
        .from('prazos_pagamento_fornecedor')
        .select('*')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .order('nome')
    ]);

    if (formasRes.data) setFormas(formasRes.data as FormaPagamento[]);
    if (prazosRes.data) setPrazos(prazosRes.data as PrazoPagamento[]);
    
    setLoading(false);
  };

  useEffect(() => {
    if (fornecedorGlobalId) {
      fetchData();
    }
  }, [fornecedorGlobalId]);

  const handleSaveForma = async () => {
    if (!formaCodigo.trim() || !formaNome.trim()) {
      toast.error('Preencha código e nome');
      return;
    }

    const data = {
      fornecedor_global_id: fornecedorGlobalId,
      codigo: formaCodigo.trim().toLowerCase(),
      nome: formaNome.trim(),
      codigo_erp: formaCodigoErp.trim() || null
    };

    let error;
    if (editingForma) {
      ({ error } = await supabase
        .from('formas_pagamento_fornecedor')
        .update(data)
        .eq('id', editingForma.id));
    } else {
      ({ error } = await supabase
        .from('formas_pagamento_fornecedor')
        .insert(data));
    }

    if (error) {
      toast.error('Erro ao salvar forma de pagamento');
      console.error(error);
    } else {
      toast.success(editingForma ? 'Forma atualizada!' : 'Forma criada!');
      setShowFormaDialog(false);
      resetFormaForm();
      fetchData();
    }
  };

  const handleSavePrazo = async () => {
    if (!selectedFormaId || !prazoNome.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const diasArray = prazoDias.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    if (diasArray.length === 0) diasArray.push(0);

    const data = {
      fornecedor_global_id: fornecedorGlobalId,
      forma_pagamento_id: selectedFormaId,
      nome: prazoNome.trim(),
      dias_parcelas: diasArray,
      quantidade_parcelas: diasArray.length,
      codigo_erp: prazoCodigoErp.trim() || null,
      padrao: prazoPadrao
    };

    let error;
    if (editingPrazo) {
      ({ error } = await supabase
        .from('prazos_pagamento_fornecedor')
        .update(data)
        .eq('id', editingPrazo.id));
    } else {
      ({ error } = await supabase
        .from('prazos_pagamento_fornecedor')
        .insert(data));
    }

    if (error) {
      toast.error('Erro ao salvar prazo');
      console.error(error);
    } else {
      toast.success(editingPrazo ? 'Prazo atualizado!' : 'Prazo criado!');
      setShowPrazoDialog(false);
      resetPrazoForm();
      fetchData();
    }
  };

  const handleToggleForma = async (id: string, ativo: boolean) => {
    await supabase
      .from('formas_pagamento_fornecedor')
      .update({ ativo })
      .eq('id', id);
    fetchData();
  };

  const handleTogglePrazo = async (id: string, ativo: boolean) => {
    await supabase
      .from('prazos_pagamento_fornecedor')
      .update({ ativo })
      .eq('id', id);
    fetchData();
  };

  const handleDeleteForma = async (id: string) => {
    const { error } = await supabase
      .from('formas_pagamento_fornecedor')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir. Verifique se há prazos vinculados.');
    } else {
      toast.success('Forma excluída');
      fetchData();
    }
  };

  const handleDeletePrazo = async (id: string) => {
    await supabase
      .from('prazos_pagamento_fornecedor')
      .delete()
      .eq('id', id);
    toast.success('Prazo excluído');
    fetchData();
  };

  const openEditForma = (forma: FormaPagamento) => {
    setEditingForma(forma);
    setFormaCodigo(forma.codigo);
    setFormaNome(forma.nome);
    setFormaCodigoErp(forma.codigo_erp || '');
    setShowFormaDialog(true);
  };

  const openEditPrazo = (prazo: PrazoPagamento) => {
    setEditingPrazo(prazo);
    setSelectedFormaId(prazo.forma_pagamento_id);
    setPrazoNome(prazo.nome);
    setPrazoDias(prazo.dias_parcelas.join(', '));
    setPrazoCodigoErp(prazo.codigo_erp || '');
    setPrazoPadrao(prazo.padrao);
    setShowPrazoDialog(true);
  };

  const resetFormaForm = () => {
    setEditingForma(null);
    setFormaCodigo('');
    setFormaNome('');
    setFormaCodigoErp('');
  };

  const resetPrazoForm = () => {
    setEditingPrazo(null);
    setSelectedFormaId(null);
    setPrazoNome('');
    setPrazoDias('0');
    setPrazoCodigoErp('');
    setPrazoPadrao(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Formas e Prazos de Pagamento</h2>
          <p className="text-muted-foreground">
            Configure as condições comerciais oferecidas aos seus clientes
          </p>
        </div>
      </div>

      {/* Formas de Pagamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Formas de Pagamento
            </CardTitle>
            <CardDescription>
              Métodos de pagamento aceitos (Boleto, PIX, Cartão, etc.)
            </CardDescription>
          </div>
          <Button onClick={() => { resetFormaForm(); setShowFormaDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Forma
          </Button>
        </CardHeader>
        <CardContent>
          {formas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma forma de pagamento cadastrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código ERP</TableHead>
                  <TableHead>Prazos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formas.map(forma => (
                  <TableRow key={forma.id}>
                    <TableCell className="font-mono">{forma.codigo}</TableCell>
                    <TableCell className="font-medium">{forma.nome}</TableCell>
                    <TableCell>
                      {forma.codigo_erp || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {prazos.filter(p => p.forma_pagamento_id === forma.id).length} prazos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={forma.ativo} 
                        onCheckedChange={(v) => handleToggleForma(forma.id, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditForma(forma)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteForma(forma.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Prazos de Pagamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Prazos de Pagamento
            </CardTitle>
            <CardDescription>
              Condições de parcelamento por forma de pagamento
            </CardDescription>
          </div>
          <Button 
            onClick={() => { resetPrazoForm(); setShowPrazoDialog(true); }}
            disabled={formas.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Prazo
          </Button>
        </CardHeader>
        <CardContent>
          {prazos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum prazo cadastrado.</p>
              {formas.length === 0 && (
                <p className="text-sm">Cadastre uma forma de pagamento primeiro.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Código ERP</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prazos.map(prazo => {
                  const forma = formas.find(f => f.id === prazo.forma_pagamento_id);
                  return (
                    <TableRow key={prazo.id}>
                      <TableCell>
                        <Badge variant="outline">{forma?.nome || '-'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{prazo.nome}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {prazo.dias_parcelas.join(' / ')}
                      </TableCell>
                      <TableCell>
                        {prazo.codigo_erp || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {prazo.padrao && <Badge>Padrão</Badge>}
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={prazo.ativo} 
                          onCheckedChange={(v) => handleTogglePrazo(prazo.id, v)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditPrazo(prazo)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePrazo(prazo.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Forma de Pagamento */}
      <Dialog open={showFormaDialog} onOpenChange={setShowFormaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingForma ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input 
                value={formaCodigo}
                onChange={(e) => setFormaCodigo(e.target.value)}
                placeholder="boleto, pix, cartao..."
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={formaNome}
                onChange={(e) => setFormaNome(e.target.value)}
                placeholder="Boleto Bancário"
              />
            </div>
            <div className="space-y-2">
              <Label>Código ERP (opcional)</Label>
              <Input 
                value={formaCodigoErp}
                onChange={(e) => setFormaCodigoErp(e.target.value)}
                placeholder="Código no seu sistema ERP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveForma}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Prazo de Pagamento */}
      <Dialog open={showPrazoDialog} onOpenChange={setShowPrazoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPrazo ? 'Editar Prazo' : 'Novo Prazo de Pagamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={selectedFormaId || ''} onValueChange={setSelectedFormaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {formas.filter(f => f.ativo).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Prazo</Label>
              <Input 
                value={prazoNome}
                onChange={(e) => setPrazoNome(e.target.value)}
                placeholder="À Vista, 7/14/21, 30 dias..."
              />
            </div>
            <div className="space-y-2">
              <Label>Dias das Parcelas</Label>
              <Input 
                value={prazoDias}
                onChange={(e) => setPrazoDias(e.target.value)}
                placeholder="0, 7, 14, 21"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgulas. Ex: 0 = à vista, 7, 14, 21 = parcelado
              </p>
            </div>
            <div className="space-y-2">
              <Label>Código ERP (opcional)</Label>
              <Input 
                value={prazoCodigoErp}
                onChange={(e) => setPrazoCodigoErp(e.target.value)}
                placeholder="Código no seu sistema ERP"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={prazoPadrao} onCheckedChange={setPrazoPadrao} />
              <Label>Prazo padrão para esta forma</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrazoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePrazo}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
