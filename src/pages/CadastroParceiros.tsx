import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Plus, Search, Pencil, Building2, User, Tractor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ParceiroForm from "@/components/cadastro/ParceiroForm";
import ParceiroEditDialog from "@/components/cadastro/ParceiroEditDialog";

interface Parceiro {
  id: string;
  tipo_cadastro: 'cliente' | 'fornecedor' | 'ambos';
  tipo_pessoa: 'pf' | 'pj' | 'produtor_rural';
  cpf_cnpj: string;
  razao_social_nome: string;
  nome_fantasia: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
}

const CadastroParceiros = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null);

  useEffect(() => {
    if (user) {
      fetchParceiros();
    }
  }, [user]);

  const fetchParceiros = async () => {
    try {
      const { data, error } = await supabase
        .from('parceiros')
        .select('*')
        .eq('integrado_id', user?.id)
        .order('razao_social_nome');

      if (error) throw error;
      setParceiros((data || []) as Parceiro[]);
    } catch (error: any) {
      toast.error("Erro ao carregar parceiros: " + error.message);
    } finally {
      setLoadingData(false);
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

  const filteredParceiros = parceiros.filter(p => {
    const matchesSearch = 
      p.razao_social_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cpf_cnpj.includes(searchTerm) ||
      (p.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === "todos") return matchesSearch;
    if (activeTab === "clientes") return matchesSearch && (p.tipo_cadastro === 'cliente' || p.tipo_cadastro === 'ambos');
    if (activeTab === "fornecedores") return matchesSearch && (p.tipo_cadastro === 'fornecedor' || p.tipo_cadastro === 'ambos');
    return matchesSearch;
  });

  const getTipoPessoaIcon = (tipo: string) => {
    switch (tipo) {
      case 'pf': return <User className="h-4 w-4" />;
      case 'pj': return <Building2 className="h-4 w-4" />;
      case 'produtor_rural': return <Tractor className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTipoPessoaLabel = (tipo: string) => {
    switch (tipo) {
      case 'pf': return 'Pessoa Física';
      case 'pj': return 'Pessoa Jurídica';
      case 'produtor_rural': return 'Produtor Rural';
      default: return tipo;
    }
  };

  const getTipoCadastroVariant = (tipo: string) => {
    switch (tipo) {
      case 'cliente': return 'default';
      case 'fornecedor': return 'secondary';
      case 'ambos': return 'outline';
      default: return 'default';
    }
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

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
              <h1 className="text-3xl font-bold text-foreground">Fornecedores e Clientes</h1>
              <p className="text-muted-foreground">Gerencie seus parceiros comerciais</p>
            </div>
          </div>
        </div>

        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo Parceiro</CardTitle>
            </CardHeader>
            <CardContent>
              <ParceiroForm
                integradoId={user.id}
                onSuccess={() => {
                  setShowForm(false);
                  fetchParceiros();
                }}
                onCancel={() => setShowForm(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CPF/CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Parceiro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="clientes">Clientes</TabsTrigger>
                  <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredParceiros.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum parceiro encontrado
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nome/Razão Social</TableHead>
                            <TableHead>CPF/CNPJ</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Cidade/UF</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParceiros.map((parceiro) => (
                            <TableRow key={parceiro.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTipoPessoaIcon(parceiro.tipo_pessoa)}
                                  <span className="text-xs text-muted-foreground">
                                    {getTipoPessoaLabel(parceiro.tipo_pessoa)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{parceiro.razao_social_nome}</div>
                                  {parceiro.nome_fantasia && (
                                    <div className="text-sm text-muted-foreground">{parceiro.nome_fantasia}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatCpfCnpj(parceiro.cpf_cnpj)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {parceiro.telefone || parceiro.celular || '-'}
                                </div>
                                {parceiro.email && (
                                  <div className="text-xs text-muted-foreground">{parceiro.email}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                {parceiro.cidade && parceiro.estado 
                                  ? `${parceiro.cidade}/${parceiro.estado}`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getTipoCadastroVariant(parceiro.tipo_cadastro) as any}>
                                  {parceiro.tipo_cadastro === 'ambos' ? 'Cliente/Fornecedor' : 
                                   parceiro.tipo_cadastro.charAt(0).toUpperCase() + parceiro.tipo_cadastro.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingParceiro(parceiro)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <ParceiroEditDialog
          open={!!editingParceiro}
          onOpenChange={(open) => !open && setEditingParceiro(null)}
          parceiro={editingParceiro}
          integradoId={user.id}
          onSuccess={() => {
            setEditingParceiro(null);
            fetchParceiros();
          }}
        />
      </main>
    </div>
  );
};

export default CadastroParceiros;
