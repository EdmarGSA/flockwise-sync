import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Building2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import OrganizacaoForm from "@/components/cadastro/OrganizacaoForm";

const CadastroOrganizacao = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [organizacoes, setOrganizacoes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchData = async () => {
    setLoadingData(true);
    const { data } = await supabase
      .from('organizacoes')
      .select('*')
      .eq('integrado_id', profile?.id);
    if (data) setOrganizacoes(data);
    setLoadingData(false);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingOrg(null);
    fetchData();
    toast({ title: "Organização salva com sucesso!" });
  };

  if (loading) {
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
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cadastro de Organização</h1>
              <p className="text-muted-foreground">Gerencie dados da empresa</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Organizações</CardTitle>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Nova Organização
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nova Organização</DialogTitle>
                </DialogHeader>
                <OrganizacaoForm integradoId={profile?.id} onSuccess={handleSuccess} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : organizacoes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma organização cadastrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizacoes.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.nome}</TableCell>
                      <TableCell>{org.cnpj || '-'}</TableCell>
                      <TableCell>{org.cidade ? `${org.cidade}/${org.estado}` : '-'}</TableCell>
                      <TableCell>{org.telefone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={org.ativo ? "default" : "secondary"}>
                          {org.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEditingOrg(org)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingOrg} onOpenChange={() => setEditingOrg(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Organização</DialogTitle>
            </DialogHeader>
            {editingOrg && (
              <OrganizacaoForm 
                integradoId={profile?.id} 
                organizacao={editingOrg}
                onSuccess={handleSuccess} 
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CadastroOrganizacao;
