import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Percent, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MortalidadeMediaDialog from "@/components/cadastro/MortalidadeMediaDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MortalidadeMediaData {
  id: string;
  linhagem: string;
  sexo: string;
  mortalidade_7_dias: number;
  mortalidade_14_dias: number;
  mortalidade_21_dias: number;
  mortalidade_28_dias: number;
  mortalidade_35_dias: number;
  mortalidade_42_dias: number;
  mortalidade_acima_42_dias: number;
}

const linhagemLabels: Record<string, string> = {
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
  hubbard: 'Hubbard',
};

const sexoLabels: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  misto: 'Misto',
};

const CadastroMortalidadeMedia = () => {
  const { user, loading } = useAuth();
  const { integradoId } = useIntegradoId();
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);
  const [tabelas, setTabelas] = useState<MortalidadeMediaData[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<MortalidadeMediaData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (integradoId) {
      loadData();
    }
  }, [integradoId]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('mortalidade_media')
        .select('*')
        .eq('integrado_id', integradoId)
        .order('linhagem', { ascending: true })
        .order('sexo', { ascending: true });

      if (error) throw error;

      setTabelas(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar tabelas de mortalidade');
    } finally {
      setLoadingData(false);
    }
  };

  const handleEdit = (item: MortalidadeMediaData) => {
    setEditData(item);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditData(null);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('mortalidade_media')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;

      toast.success('Tabela excluída com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir tabela');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  if (loading || loadingData) {
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
              <Percent className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mortalidade Média</h1>
              <p className="text-muted-foreground">Configure os percentuais de referência por linhagem e sexo</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tabelas de Mortalidade</CardTitle>
              <CardDescription>
                Gerencie os percentuais de mortalidade esperada para cada combinação de linhagem e sexo
              </CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tabela
            </Button>
          </CardHeader>
          <CardContent>
            {tabelas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Percent className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma tabela de mortalidade cadastrada</p>
                <p className="text-sm mt-1">Clique em "Nova Tabela" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linhagem</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead className="text-center">7d</TableHead>
                      <TableHead className="text-center">14d</TableHead>
                      <TableHead className="text-center">21d</TableHead>
                      <TableHead className="text-center">28d</TableHead>
                      <TableHead className="text-center">35d</TableHead>
                      <TableHead className="text-center">42d</TableHead>
                      <TableHead className="text-center">42+d</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabelas.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {linhagemLabels[item.linhagem] || item.linhagem}
                        </TableCell>
                        <TableCell>
                          {sexoLabels[item.sexo] || item.sexo}
                        </TableCell>
                        <TableCell className="text-center">{item.mortalidade_7_dias}%</TableCell>
                        <TableCell className="text-center">{item.mortalidade_14_dias}%</TableCell>
                        <TableCell className="text-center">{item.mortalidade_21_dias}%</TableCell>
                        <TableCell className="text-center">{item.mortalidade_28_dias}%</TableCell>
                        <TableCell className="text-center">{item.mortalidade_35_dias}%</TableCell>
                        <TableCell className="text-center">{item.mortalidade_42_dias}%</TableCell>
                        <TableCell className="text-center">{item.mortalidade_acima_42_dias}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de criação/edição */}
        <MortalidadeMediaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          integradoId={integradoId!}
          onSuccess={loadData}
          editData={editData}
        />

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir tabela de mortalidade?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A tabela será permanentemente removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default CadastroMortalidadeMedia;
