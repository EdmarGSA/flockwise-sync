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
import { Plus, Pencil, Trash2, Target, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { centroCustosAgroTemplate } from "@/lib/templates/centroCustosAgro";

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: 'lote' | 'nucleo' | 'geral' | 'projeto';
  lote_id: string | null;
  nucleo_id: string | null;
  ativo: boolean;
}

interface Lote {
  id: string;
  galpao_id: string;
  nucleo_id: string;
  status: string;
  galpao?: { nome: string };
  nucleo?: { nome: string };
}

interface Nucleo {
  id: string;
  nome: string;
}

interface CentroCustosTabProps {
  userId: string;
}

const tipoOptions = [
  { value: 'geral', label: 'Geral' },
  { value: 'lote', label: 'Lote' },
  { value: 'nucleo', label: 'Núcleo' },
  { value: 'projeto', label: 'Projeto' },
];

const CentroCustosTab = ({ userId }: CentroCustosTabProps) => {
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroCusto | null>(null);
  const [formData, setFormData] = useState<{
    codigo: string;
    nome: string;
    descricao: string;
    tipo: 'lote' | 'nucleo' | 'geral' | 'projeto';
    lote_id: string;
    nucleo_id: string;
  }>({
    codigo: '',
    nome: '',
    descricao: '',
    tipo: 'geral',
    lote_id: '',
    nucleo_id: '',
  });

  const fetchData = async () => {
    try {
      const [centrosRes, lotesRes, nucleosRes] = await Promise.all([
        supabase.from('centro_custos').select('*').eq('integrado_id', userId).order('codigo'),
        supabase.from('lotes').select('*, galpao:galpoes(nome), nucleo:nucleos(nome)').eq('integrado_id', userId).in('status', ['previsao', 'alojado']),
        supabase.from('nucleos').select('id, nome').eq('integrado_id', userId).eq('ativo', true).order('nome'),
      ]);
      
      if (centrosRes.error) throw centrosRes.error;
      if (lotesRes.error) throw lotesRes.error;
      if (nucleosRes.error) throw nucleosRes.error;
      
      setCentros(centrosRes.data || []);
      setLotes(lotesRes.data || []);
      setNucleos(nucleosRes.data || []);
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
      codigo: '',
      nome: '',
      descricao: '',
      tipo: 'geral',
      lote_id: '',
      nucleo_id: '',
    });
    setEditingCentro(null);
  };

  const handleOpenDialog = (centro?: CentroCusto) => {
    if (centro) {
      setEditingCentro(centro);
      setFormData({
        codigo: centro.codigo,
        nome: centro.nome,
        descricao: centro.descricao || '',
        tipo: centro.tipo,
        lote_id: centro.lote_id || '',
        nucleo_id: centro.nucleo_id || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCentro) {
        const { error } = await supabase
          .from('centro_custos')
          .update({
            codigo: formData.codigo,
            nome: formData.nome,
            descricao: formData.descricao || null,
            tipo: formData.tipo,
            lote_id: formData.tipo === 'lote' ? formData.lote_id || null : null,
            nucleo_id: formData.tipo === 'nucleo' ? formData.nucleo_id || null : null,
          })
          .eq('id', editingCentro.id);
        
        if (error) throw error;
        toast.success('Centro de custo atualizado');
      } else {
        const { error } = await supabase
          .from('centro_custos')
          .insert({
            integrado_id: userId,
            codigo: formData.codigo,
            nome: formData.nome,
            descricao: formData.descricao || null,
            tipo: formData.tipo,
            lote_id: formData.tipo === 'lote' ? formData.lote_id || null : null,
            nucleo_id: formData.tipo === 'nucleo' ? formData.nucleo_id || null : null,
          });
        
        if (error) throw error;
        toast.success('Centro de custo cadastrado');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      if (error.code === '23505') {
        toast.error('Código já existe');
      } else {
        toast.error('Erro ao salvar');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este centro de custo?')) return;
    
    try {
      const { error } = await supabase
        .from('centro_custos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Centro de custo excluído');
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  };

  const getLoteLabel = (loteId: string) => {
    const lote = lotes.find(l => l.id === loteId);
    if (!lote) return 'Lote não encontrado';
    return `${lote.nucleo?.nome} - ${lote.galpao?.nome}`;
  };

  const getNucleoLabel = (nucleoId: string) => {
    const nucleo = nucleos.find(n => n.id === nucleoId);
    return nucleo?.nome || 'Núcleo não encontrado';
  };

  const carregarCentrosPadrao = async () => {
    if (centros.length > 0) {
      if (!confirm('Já existem centros de custos cadastrados. Deseja adicionar os centros padrão agropecuário? (Os centros existentes serão mantidos)')) {
        return;
      }
    }
    
    setLoadingTemplate(true);
    
    try {
      for (const template of centroCustosAgroTemplate) {
        // Verificar se já existe um centro com este código
        const jaExiste = centros.some(c => c.codigo === template.codigo);
        if (jaExiste) continue;
        
        const { error } = await supabase
          .from('centro_custos')
          .insert({
            integrado_id: userId,
            codigo: template.codigo,
            nome: template.nome,
            tipo: template.tipo,
            descricao: template.descricao || null,
          });
        
        if (error) {
          console.error('Erro ao inserir centro:', template.codigo, error);
          continue;
        }
      }
      
      toast.success('Centros de custos padrão carregados com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao carregar centros padrão:', error);
      toast.error('Erro ao carregar centros padrão');
    } finally {
      setLoadingTemplate(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Centro de Custos
          </CardTitle>
          <CardDescription>Vincule custos a lotes, núcleos ou projetos</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Centro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCentro ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="CC-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v: 'lote' | 'nucleo' | 'geral' | 'projeto') => setFormData({ ...formData, tipo: v, lote_id: '', nucleo_id: '' })}>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do centro de custo"
                  required
                />
              </div>
              {formData.tipo === 'lote' && (
                <div className="space-y-2">
                  <Label htmlFor="lote_id">Lote Vinculado</Label>
                  <Select value={formData.lote_id} onValueChange={(v) => setFormData({ ...formData, lote_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes.map(lote => (
                        <SelectItem key={lote.id} value={lote.id}>
                          {lote.nucleo?.nome} - {lote.galpao?.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.tipo === 'nucleo' && (
                <div className="space-y-2">
                  <Label htmlFor="nucleo_id">Núcleo Vinculado</Label>
                  <Select value={formData.nucleo_id} onValueChange={(v) => setFormData({ ...formData, nucleo_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o núcleo" />
                    </SelectTrigger>
                    <SelectContent>
                      {nucleos.map(nucleo => (
                        <SelectItem key={nucleo.id} value={nucleo.id}>
                          {nucleo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingCentro ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {centros.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">Nenhum centro de custo cadastrado.</p>
            <Button 
              onClick={carregarCentrosPadrao} 
              disabled={loadingTemplate}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {loadingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Carregar Centros de Custos Padrão
            </Button>
            <p className="text-xs text-muted-foreground">
              Inclui: Administração, Fábrica de Ração, Produção Própria, Integração e Logística
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centros.map((centro) => (
                <TableRow key={centro.id}>
                  <TableCell className="font-mono">{centro.codigo}</TableCell>
                  <TableCell className="font-medium">{centro.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoOptions.find(t => t.value === centro.tipo)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {centro.lote_id ? getLoteLabel(centro.lote_id) : 
                     centro.nucleo_id ? getNucleoLabel(centro.nucleo_id) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={centro.ativo ? "default" : "secondary"}>
                      {centro.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(centro)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(centro.id)}>
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

export default CentroCustosTab;
