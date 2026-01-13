import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import SiloFormDialog from '@/components/cadastro/SiloFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Silo {
  id: string;
  nome: string;
  marca: string | null;
  diametro_m: number;
  numero_pernas: number;
  numero_aneis: number;
  capacidade_volume_m3: number;
  fator_tonelada_m3: number;
  capacidade_toneladas: number;
  ativo: boolean;
}

const CadastroSilos = () => {
  const { user, loading: authLoading } = useAuth();
  const { integradoId, loading: integradoLoading } = useIntegradoId();
  const navigate = useNavigate();
  
  const [silos, setSilos] = useState<Silo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSilo, setEditingSilo] = useState<Silo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siloToDelete, setSiloToDelete] = useState<Silo | null>(null);

  useEffect(() => {
    if (integradoId) {
      fetchSilos();
    }
  }, [integradoId]);

  const fetchSilos = async () => {
    if (!integradoId) return;
    
    try {
      const { data, error } = await supabase
        .from('silos')
        .select('*')
        .eq('integrado_id', integradoId)
        .order('nome');

      if (error) throw error;
      setSilos(data || []);
    } catch (error) {
      console.error('Erro ao buscar silos:', error);
      toast.error('Erro ao carregar silos');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (silo: Silo) => {
    setEditingSilo(silo);
    setFormDialogOpen(true);
  };

  const handleDelete = (silo: Silo) => {
    setSiloToDelete(silo);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!siloToDelete) return;

    try {
      // Verificar se o silo está vinculado a algum galpão
      const { data: galpoesVinculados, error: checkError } = await supabase
        .from('galpoes')
        .select('id, nome')
        .eq('silo_id', siloToDelete.id)
        .limit(1);

      if (checkError) throw checkError;

      if (galpoesVinculados && galpoesVinculados.length > 0) {
        toast.error('Este silo está vinculado a um ou mais galpões. Desvincule primeiro.');
        setDeleteDialogOpen(false);
        setSiloToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('silos')
        .delete()
        .eq('id', siloToDelete.id);

      if (error) throw error;

      toast.success('Tipo de silo excluído com sucesso');
      fetchSilos();
    } catch (error) {
      console.error('Erro ao excluir silo:', error);
      toast.error('Erro ao excluir silo');
    } finally {
      setDeleteDialogOpen(false);
      setSiloToDelete(null);
    }
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    setEditingSilo(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchSilos();
  };

  if (authLoading || integradoLoading) {
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
              <Warehouse className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tipos de Silos</h1>
              <p className="text-muted-foreground">Catálogo de especificações de silos</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Silos Cadastrados</CardTitle>
              <CardDescription>
                Cadastre os tipos de silos disponíveis. O vínculo com galpões é feito no cadastro de cada galpão.
              </CardDescription>
            </div>
            <Button onClick={() => setFormDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Tipo
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : silos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Warehouse className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum tipo de silo cadastrado</p>
                <p className="text-sm">Clique em "Novo Tipo" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-center">Diâmetro</TableHead>
                      <TableHead className="text-center">Anéis</TableHead>
                      <TableHead className="text-center">Volume (m³)</TableHead>
                      <TableHead className="text-center">Fator (t/m³)</TableHead>
                      <TableHead className="text-center">Capacidade (t)</TableHead>
                      <TableHead className="text-center">t/Anel</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {silos.map((silo) => {
                      const volumePorAnel = silo.capacidade_volume_m3 / silo.numero_aneis;
                      const toneladaPorAnel = volumePorAnel * silo.fator_tonelada_m3;
                      
                      return (
                        <TableRow key={silo.id}>
                          <TableCell className="font-medium">
                            {silo.nome}
                            {silo.marca && (
                              <span className="text-xs text-muted-foreground block">{silo.marca}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{silo.diametro_m.toFixed(2)} m</TableCell>
                          <TableCell className="text-center">{silo.numero_aneis}</TableCell>
                          <TableCell className="text-center">{silo.capacidade_volume_m3.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{silo.fator_tonelada_m3.toFixed(3)}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {silo.capacidade_toneladas.toFixed(2)} t
                          </TableCell>
                          <TableCell className="text-center">{toneladaPorAnel.toFixed(3)} t</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={silo.ativo ? 'default' : 'secondary'}>
                              {silo.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(silo)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(silo)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <SiloFormDialog
          open={formDialogOpen}
          onOpenChange={handleFormClose}
          silo={editingSilo}
          integradoId={integradoId || ''}
          onSuccess={handleFormSuccess}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o tipo de silo "{siloToDelete?.nome}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default CadastroSilos;
