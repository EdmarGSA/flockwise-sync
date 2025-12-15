import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Tag, Star, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import TabelaPrecoItensDialog from './TabelaPrecoItensDialog';

interface TabelasPrecosTabProps {
  integradoId: string;
}

export default function TabelasPrecosTab({ integradoId }: TabelasPrecosTabProps) {
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTabela, setEditingTabela] = useState<any>(null);
  const [selectedTabela, setSelectedTabela] = useState<any>(null);
  const [showItensDialog, setShowItensDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    padrao: false,
    vigencia_inicio: '',
    vigencia_fim: '',
    margem_minima_percentual: 10,
    ativo: true
  });

  const fetchTabelas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tabelas_preco')
        .select('*')
        .eq('integrado_id', integradoId)
        .order('nome');

      if (error) throw error;
      setTabelas(data || []);
    } catch (error) {
      console.error('Error fetching tabelas:', error);
      toast.error('Erro ao carregar tabelas de preço');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabelas();
  }, [integradoId]);

  const handleOpenForm = (tabela?: any) => {
    if (tabela) {
      setEditingTabela(tabela);
      setFormData({
        nome: tabela.nome,
        descricao: tabela.descricao || '',
        padrao: tabela.padrao,
        vigencia_inicio: tabela.vigencia_inicio || '',
        vigencia_fim: tabela.vigencia_fim || '',
        margem_minima_percentual: tabela.margem_minima_percentual,
        ativo: tabela.ativo
      });
    } else {
      setEditingTabela(null);
      setFormData({
        nome: '',
        descricao: '',
        padrao: false,
        vigencia_inicio: '',
        vigencia_fim: '',
        margem_minima_percentual: 10,
        ativo: true
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // If setting as default, unset other defaults first
      if (formData.padrao) {
        await supabase
          .from('tabelas_preco')
          .update({ padrao: false })
          .eq('integrado_id', integradoId)
          .neq('id', editingTabela?.id || '');
      }

      const payload = {
        ...formData,
        integrado_id: integradoId,
        vigencia_inicio: formData.vigencia_inicio || null,
        vigencia_fim: formData.vigencia_fim || null
      };

      if (editingTabela) {
        const { error } = await supabase
          .from('tabelas_preco')
          .update(payload)
          .eq('id', editingTabela.id);
        if (error) throw error;
        toast.success('Tabela atualizada!');
      } else {
        const { error } = await supabase
          .from('tabelas_preco')
          .insert(payload);
        if (error) throw error;
        toast.success('Tabela criada!');
      }

      setShowForm(false);
      fetchTabelas();
    } catch (error) {
      console.error('Error saving tabela:', error);
      toast.error('Erro ao salvar tabela');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Tabelas de Preço
        </CardTitle>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tabela
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : tabelas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma tabela de preço cadastrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Margem Mín.</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabelas.map((tabela) => (
                <TableRow key={tabela.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {tabela.nome}
                      {tabela.padrao && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Padrão
                        </Badge>
                      )}
                    </div>
                    {tabela.descricao && (
                      <p className="text-xs text-muted-foreground">{tabela.descricao}</p>
                    )}
                  </TableCell>
                  <TableCell>{tabela.margem_minima_percentual}%</TableCell>
                  <TableCell>
                    {tabela.vigencia_inicio ? (
                      <span className="text-sm">
                        {format(new Date(tabela.vigencia_inicio), 'dd/MM/yy')}
                        {tabela.vigencia_fim && ` - ${format(new Date(tabela.vigencia_fim), 'dd/MM/yy')}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sem vigência</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tabela.ativo ? 'default' : 'secondary'}>
                      {tabela.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTabela(tabela);
                          setShowItensDialog(true);
                        }}
                        title="Gerenciar Preços"
                      >
                        <Package className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(tabela)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTabela ? 'Editar Tabela de Preço' : 'Nova Tabela de Preço'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Tabela Revenda"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>

            <div className="space-y-2">
              <Label>Margem Mínima (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.margem_minima_percentual}
                onChange={(e) => setFormData({ ...formData, margem_minima_percentual: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Alerta quando preço de venda ficar abaixo desta margem sobre o custo
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vigência Início</Label>
                <Input
                  type="date"
                  value={formData.vigencia_inicio}
                  onChange={(e) => setFormData({ ...formData, vigencia_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vigência Fim</Label>
                <Input
                  type="date"
                  value={formData.vigencia_fim}
                  onChange={(e) => setFormData({ ...formData, vigencia_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.padrao}
                  onCheckedChange={(checked) => setFormData({ ...formData, padrao: checked })}
                />
                <Label>Tabela Padrão</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label>Ativa</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Items Dialog */}
      {selectedTabela && (
        <TabelaPrecoItensDialog
          open={showItensDialog}
          onOpenChange={setShowItensDialog}
          tabela={selectedTabela}
          integradoId={integradoId}
        />
      )}
    </Card>
  );
}
