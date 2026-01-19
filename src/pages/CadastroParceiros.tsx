import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Users, Plus, Search, Pencil, Building2, User, Tractor, Link2, Key, Copy, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ParceiroForm from "@/components/cadastro/ParceiroForm";
import ParceiroEditDialog from "@/components/cadastro/ParceiroEditDialog";
import VincularProdutosDialog from "@/components/cadastro/VincularProdutosDialog";
import { TermoAceiteDialog } from "@/components/termos/TermoAceiteDialog";

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
  produtos_vinculados?: number;
  fornecedor_global_id?: string | null;
}

const CadastroParceiros = () => {
  const { user, loading } = useAuth();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const navigate = useNavigate();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null);
  const [vincularParceiro, setVincularParceiro] = useState<Parceiro | null>(null);

  // Generate access state
  const [generatingAccess, setGeneratingAccess] = useState<string | null>(null);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  // Termo de aceite state
  const [showTermoDialog, setShowTermoDialog] = useState(false);
  const [parceiroParaTermo, setParceiroParaTermo] = useState<Parceiro | null>(null);

  useEffect(() => {
    if (integradoId) {
      fetchParceiros();
    }
  }, [integradoId]);

  const fetchParceiros = async () => {
    try {
      // Fetch parceiros
      const { data: parceirosData, error: parceirosError } = await supabase
        .from('parceiros')
        .select('*')
        .eq('integrado_id', integradoId)
        .order('razao_social_nome');

      if (parceirosError) throw parceirosError;

      // Fetch product link counts for suppliers
      const { data: vinculosData, error: vinculosError } = await supabase
        .from('produto_fornecedor')
        .select('parceiro_id')
        .eq('integrado_id', integradoId);

      if (vinculosError) throw vinculosError;

      // Count products per supplier
      const countMap: Record<string, number> = {};
      (vinculosData || []).forEach((v: any) => {
        countMap[v.parceiro_id] = (countMap[v.parceiro_id] || 0) + 1;
      });

      // Merge counts into parceiros
      const parceirosComContagem = (parceirosData || []).map((p: any) => ({
        ...p,
        produtos_vinculados: countMap[p.id] || 0,
      }));

      setParceiros(parceirosComContagem as Parceiro[]);
    } catch (error: any) {
      toast.error("Erro ao carregar parceiros: " + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Inicia o fluxo de gerar acesso - primeiro mostra o termo
  const handleGenerateAccessClick = (parceiro: Parceiro) => {
    if (!parceiro.email) {
      toast.error('O fornecedor precisa ter um email cadastrado para gerar acesso');
      return;
    }
    // Mostrar termo de aceite antes de gerar acesso
    setParceiroParaTermo(parceiro);
    setShowTermoDialog(true);
  };

  // Executa a geração de acesso após aceite do termo
  const handleGenerateAccess = async (parceiro: Parceiro) => {
    setGeneratingAccess(parceiro.id);
    try {
      const cnpjLimpo = parceiro.cpf_cnpj.replace(/\D/g, '');

      // Call edge function to create/find global supplier and user
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-supplier-user', {
        body: {
          cpf_cnpj: cnpjLimpo,
          razao_social_nome: parceiro.razao_social_nome,
          nome_fantasia: parceiro.nome_fantasia || null,
          email: parceiro.email.toLowerCase(),
          telefone: parceiro.telefone?.replace(/\D/g, '') || null,
        },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error('Erro ao criar acesso do fornecedor');
      }

      if (!fnData?.success) {
        throw new Error(fnData?.message || 'Erro ao criar acesso do fornecedor');
      }

      const fornecedorGlobalId = fnData.fornecedor_global_id;

      // Update parceiro with fornecedor_global_id
      const { error: updateError } = await supabase
        .from('parceiros')
        .update({ fornecedor_global_id: fornecedorGlobalId })
        .eq('id', parceiro.id);

      if (updateError) throw updateError;

      // If new user was created, show credentials
      if (fnData.is_new_user && fnData.credentials) {
        setCredentials(fnData.credentials);
        setShowCredentialsDialog(true);
      } else {
        toast.success('Acesso do fornecedor já existia. Vínculo atualizado!');
      }

      // Refresh list
      fetchParceiros();
    } catch (error: any) {
      console.error('Erro ao gerar acesso:', error);
      toast.error(error.message || 'Erro ao gerar acesso do fornecedor');
    } finally {
      setGeneratingAccess(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (loading || loadingIntegrado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !integradoId) {
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

  const isFornecedor = (p: Parceiro) => p.tipo_cadastro === 'fornecedor' || p.tipo_cadastro === 'ambos';
  const needsAccess = (p: Parceiro) => isFornecedor(p) && !p.fornecedor_global_id;

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
                integradoId={integradoId}
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
                                <div className="flex items-center justify-end gap-1">
                                  {/* Generate Access Button - for suppliers without fornecedor_global_id */}
                                  {needsAccess(parceiro) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleGenerateAccessClick(parceiro)}
                                      disabled={generatingAccess === parceiro.id}
                                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950"
                                      title="Gerar Acesso ao Portal"
                                    >
                                      {generatingAccess === parceiro.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Key className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  {(parceiro.tipo_cadastro === 'fornecedor' || parceiro.tipo_cadastro === 'ambos') && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setVincularParceiro(parceiro)}
                                      className="relative"
                                      title="Vincular Produtos"
                                    >
                                      <Link2 className="h-4 w-4" />
                                      {parceiro.produtos_vinculados && parceiro.produtos_vinculados > 0 && (
                                        <Badge 
                                          variant="secondary" 
                                          className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                        >
                                          {parceiro.produtos_vinculados}
                                        </Badge>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingParceiro(parceiro)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
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
          integradoId={integradoId}
          onSuccess={() => {
            setEditingParceiro(null);
            fetchParceiros();
          }}
        />

        <VincularProdutosDialog
          open={!!vincularParceiro}
          onOpenChange={(open) => !open && setVincularParceiro(null)}
          parceiroId={vincularParceiro?.id || ""}
          parceiroNome={vincularParceiro?.razao_social_nome || ""}
          integradoId={integradoId}
          onSuccess={fetchParceiros}
        />

        {/* Credentials Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Key className="w-5 h-5" />
                Acesso do Fornecedor Criado
              </DialogTitle>
              <DialogDescription>
                Anote ou copie as credenciais abaixo para informar ao fornecedor. 
                A senha deverá ser alterada no primeiro acesso.
              </DialogDescription>
            </DialogHeader>

            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Acesso ao Portal criado com sucesso!
              </AlertDescription>
            </Alert>

            {credentials && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email de acesso</Label>
                  <div className="flex gap-2">
                    <Input value={credentials.email} readOnly className="bg-muted" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.email, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Senha provisória</Label>
                  <div className="flex gap-2">
                    <Input value={credentials.password} readOnly className="bg-muted font-mono" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.password, 'Senha')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => { setShowCredentialsDialog(false); setCredentials(null); }} className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" />
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Termo de Aceite para autorizar fornecedor */}
        <TermoAceiteDialog
          tipo="cliente_autorizacao"
          parceiroId={parceiroParaTermo?.id}
          parceiroNome={parceiroParaTermo?.nome_fantasia || parceiroParaTermo?.razao_social_nome}
          open={showTermoDialog}
          onAceite={() => {
            setShowTermoDialog(false);
            if (parceiroParaTermo) {
              handleGenerateAccess(parceiroParaTermo);
            }
            setParceiroParaTermo(null);
          }}
          onRecusar={() => {
            setShowTermoDialog(false);
            setParceiroParaTermo(null);
          }}
        />
      </main>
    </div>
  );
};

export default CadastroParceiros;
