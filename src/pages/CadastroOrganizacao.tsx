import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Building2, Pencil, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
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
    toast.success("Organização salva com sucesso!");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrg(null);
  };

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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

  // Show form in full page mode
  if (showForm || editingOrg) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {editingOrg ? "Editar Organização" : "Nova Organização"}
              </h1>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <OrganizacaoForm 
                integradoId={profile?.id} 
                organizacao={editingOrg}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
        {/* Header Responsivo */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-foreground">Organizações</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Gerencie dados da empresa</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Organização</span>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Organizações Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : organizacoes.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma organização cadastrada</p>
                <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar primeira organização
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                  {organizacoes.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => setEditingOrg(org)}
                      className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{org.nome}</h3>
                            <Badge variant={org.ativo ? "default" : "secondary"} className="shrink-0">
                              {org.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{formatCNPJ(org.cnpj)}</p>
                          {org.cidade && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {org.cidade}{org.estado ? `/${org.estado}` : ''}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
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
                          <TableCell>{formatCNPJ(org.cnpj)}</TableCell>
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
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CadastroOrganizacao;
