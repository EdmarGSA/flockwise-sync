import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CadastroMembros = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMembers();
    }
  }, [user]);

  const fetchMembers = async () => {
    setLoadingData(true);
    
    // Get profiles with their roles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');
    
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*');

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
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'integrado': return 'Integrado';
      case 'veterinario': return 'Veterinário';
      case 'tecnico': return 'Técnico';
      default: return role;
    }
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
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cadastro de Membros</h1>
              <p className="text-muted-foreground">Visualize os usuários do sistema</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Usuários do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum membro encontrado</p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name || '-'}</TableCell>
                      <TableCell>{member.company_name || '-'}</TableCell>
                      <TableCell>{member.phone || '-'}</TableCell>
                      <TableCell>{member.role || '-'}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CadastroMembros;
