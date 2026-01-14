import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Users, Shield, Plus, Pencil, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MembroForm from "@/components/cadastro/MembroForm";
import MembroEditDialog from "@/components/cadastro/MembroEditDialog";

const CadastroMembros = () => {
  const { user, loading } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMembro, setSelectedMembro] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchMembers();
    }
  }, [user]);

  const fetchMembers = async () => {
    setLoadingData(true);
    
    // Buscar o integrado_id do usuário atual
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('integrado_id')
      .eq('id', user?.id)
      .single();

    const myIntegradoId = myProfile?.integrado_id || user?.id;
    
    // Buscar apenas membros da mesma organização
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('integrado_id', myIntegradoId)
      .order('created_at', { ascending: false });
    
    // Buscar roles dos membros da organização
    const userIds = profiles?.map(p => p.id) || [];
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .in('user_id', userIds);

    if (profiles) {
      const membersWithRoles = profiles.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
      }));
      setMembers(membersWithRoles);
    }
    
    setLoadingData(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'veterinario': return 'default';
      case 'tecnico': return 'secondary';
      case 'comprador': return 'default';
      case 'conferente': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'integrado': return 'Integrado';
      case 'veterinario': return 'Veterinário';
      case 'tecnico': return 'Técnico';
      case 'comprador': return 'Comprador';
      case 'conferente': return 'Conferente';
      default: return role;
    }
  };

  const handleAddSuccess = () => {
    setDialogOpen(false);
    fetchMembers();
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedMembro(null);
    fetchMembers();
  };

  const handleEditClick = (membro: any) => {
    setSelectedMembro(membro);
    setEditDialogOpen(true);
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

  // Block demo users from accessing member management
  if (isDemo) {
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
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cadastro de Membros</h1>
                <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Acesso Restrito no Demo</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  O gerenciamento de membros não está disponível no modo demonstração 
                  por questões de segurança e privacidade.
                </p>
                <Button onClick={() => navigate('/auth')} className="gap-2">
                  Criar Conta para Acessar
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cadastro de Membros</h1>
                <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
              </div>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Membro</DialogTitle>
              </DialogHeader>
              <MembroForm onSuccess={handleAddSuccess} />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Usuários do Sistema ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum membro cadastrado</p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Membro
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Papéis</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name || '-'}</TableCell>
                      <TableCell>{member.company_name || '-'}</TableCell>
                      <TableCell>{member.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {member.roles.length > 0 ? (
                            member.roles.map((role: string) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                {getRoleLabel(role)}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Sem papel</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditClick(member)}
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

        <MembroEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          membro={selectedMembro}
          onSuccess={handleEditSuccess}
        />
      </main>
    </div>
  );
};

export default CadastroMembros;
