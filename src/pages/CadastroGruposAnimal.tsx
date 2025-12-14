import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Edit2, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RacaoDisponivel {
  id: string;
  nome: string;
  sku: string;
}

interface GrupoAnimal {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface FaseAnimal {
  id: string;
  grupo_id: string;
  nome: string;
  dia_inicio: number;
  dia_fim: number;
  descricao: string | null;
  ativo: boolean;
  produto_racao_id: string | null;
  produto_racao?: { id: string; nome: string; sku: string } | null;
}

const CadastroGruposAnimal = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<GrupoAnimal[]>([]);
  const [fases, setFases] = useState<FaseAnimal[]>([]);
  const [expandedGrupo, setExpandedGrupo] = useState<string | null>(null);
  const [isGrupoDialogOpen, setIsGrupoDialogOpen] = useState(false);
  const [isFaseDialogOpen, setIsFaseDialogOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<GrupoAnimal | null>(null);
  const [editingFase, setEditingFase] = useState<FaseAnimal | null>(null);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
  const [racoesDisponiveis, setRacoesDisponiveis] = useState<RacaoDisponivel[]>([]);
  const [loadingRacoes, setLoadingRacoes] = useState(false);
  
  const [grupoForm, setGrupoForm] = useState({ nome: "", descricao: "" });
  const [faseForm, setFaseForm] = useState({ nome: "", dia_inicio: 0, dia_fim: 7, descricao: "", produto_racao_id: "" });

  useEffect(() => {
    if (user) {
      initializeDefaultGroups();
    }
  }, [user]);

  const initializeDefaultGroups = async () => {
    const { data: existingGrupos, error } = await supabase
      .from("grupos_animal")
      .select("id")
      .eq("integrado_id", user?.id)
      .limit(1);

    if (error) {
      toast.error("Erro ao verificar grupos");
      return;
    }

    if (!existingGrupos || existingGrupos.length === 0) {
      const defaultGrupos = [
        { nome: "Aves Corte", descricao: "Frangos de corte para abate", integrado_id: user?.id },
        { nome: "Aves Postura", descricao: "Galinhas poedeiras para produção de ovos", integrado_id: user?.id },
        { nome: "Suínos", descricao: "Criação de suínos", integrado_id: user?.id },
        { nome: "Bovinos", descricao: "Criação de bovinos", integrado_id: user?.id },
      ];

      const { error: insertError } = await supabase
        .from("grupos_animal")
        .insert(defaultGrupos);

      if (insertError) {
        toast.error("Erro ao criar grupos padrão");
      } else {
        toast.success("Grupos padrão criados com sucesso!");
      }
    }

    fetchGrupos();
    fetchFases();
  };

  const fetchGrupos = async () => {
    const { data, error } = await supabase
      .from("grupos_animal")
      .select("*")
      .eq("integrado_id", user?.id)
      .order("nome");
    
    if (error) {
      toast.error("Erro ao carregar grupos");
      return;
    }
    setGrupos(data || []);
  };

  const fetchFases = async () => {
    const { data, error } = await supabase
      .from("fases_animal")
      .select("*, produto_racao:produtos!fases_animal_produto_racao_id_fkey(id, nome, sku)")
      .eq("integrado_id", user?.id)
      .order("dia_inicio");
    
    if (error) {
      toast.error("Erro ao carregar fases");
      return;
    }
    setFases(data || []);
  };

  const fetchRacoesDisponiveis = async (grupoAnimalId: string) => {
    setLoadingRacoes(true);
    try {
      // First get the grupo_produto "Ração"
      const { data: grupoProduto } = await supabase
        .from("grupos_produto")
        .select("id")
        .eq("nome", "Ração")
        .eq("integrado_id", user?.id)
        .single();

      if (!grupoProduto) {
        setRacoesDisponiveis([]);
        return;
      }

      // Then get products matching grupo_produto and grupo_animal
      const { data: produtos, error } = await supabase
        .from("produtos")
        .select("id, nome, sku")
        .eq("grupo_produto_id", grupoProduto.id)
        .eq("grupo_animal_id", grupoAnimalId)
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao buscar rações:", error);
        setRacoesDisponiveis([]);
        return;
      }

      setRacoesDisponiveis(produtos || []);
    } finally {
      setLoadingRacoes(false);
    }
  };

  const handleSaveGrupo = async () => {
    if (!grupoForm.nome.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    if (editingGrupo) {
      const { error } = await supabase
        .from("grupos_animal")
        .update({ nome: grupoForm.nome, descricao: grupoForm.descricao || null })
        .eq("id", editingGrupo.id);
      
      if (error) {
        toast.error("Erro ao atualizar grupo");
        return;
      }
      toast.success("Grupo atualizado com sucesso");
    } else {
      const { error } = await supabase
        .from("grupos_animal")
        .insert({ 
          nome: grupoForm.nome, 
          descricao: grupoForm.descricao || null,
          integrado_id: user?.id 
        });
      
      if (error) {
        toast.error("Erro ao criar grupo");
        return;
      }
      toast.success("Grupo criado com sucesso");
    }

    setIsGrupoDialogOpen(false);
    setEditingGrupo(null);
    setGrupoForm({ nome: "", descricao: "" });
    fetchGrupos();
  };

  const handleSaveFase = async () => {
    if (!faseForm.nome.trim() || !selectedGrupoId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (faseForm.dia_fim < faseForm.dia_inicio) {
      toast.error("Dia fim deve ser maior ou igual ao dia início");
      return;
    }

    const racaoId = faseForm.produto_racao_id || null;

    if (editingFase) {
      const { error } = await supabase
        .from("fases_animal")
        .update({ 
          nome: faseForm.nome, 
          dia_inicio: faseForm.dia_inicio,
          dia_fim: faseForm.dia_fim,
          descricao: faseForm.descricao || null,
          produto_racao_id: racaoId
        })
        .eq("id", editingFase.id);
      
      if (error) {
        toast.error("Erro ao atualizar fase");
        return;
      }
      toast.success("Fase atualizada com sucesso");
    } else {
      const { error } = await supabase
        .from("fases_animal")
        .insert({ 
          nome: faseForm.nome, 
          dia_inicio: faseForm.dia_inicio,
          dia_fim: faseForm.dia_fim,
          descricao: faseForm.descricao || null,
          produto_racao_id: racaoId,
          grupo_id: selectedGrupoId,
          integrado_id: user?.id 
        });
      
      if (error) {
        toast.error("Erro ao criar fase");
        return;
      }
      toast.success("Fase criada com sucesso");
    }

    setIsFaseDialogOpen(false);
    setEditingFase(null);
    setFaseForm({ nome: "", dia_inicio: 0, dia_fim: 7, descricao: "", produto_racao_id: "" });
    setRacoesDisponiveis([]);
    fetchFases();
  };

  const openEditGrupo = (grupo: GrupoAnimal) => {
    setEditingGrupo(grupo);
    setGrupoForm({ nome: grupo.nome, descricao: grupo.descricao || "" });
    setIsGrupoDialogOpen(true);
  };

  const openAddFase = (grupoId: string) => {
    setSelectedGrupoId(grupoId);
    setEditingFase(null);
    setFaseForm({ nome: "", dia_inicio: 0, dia_fim: 7, descricao: "", produto_racao_id: "" });
    fetchRacoesDisponiveis(grupoId);
    setIsFaseDialogOpen(true);
  };

  const openEditFase = (fase: FaseAnimal) => {
    setSelectedGrupoId(fase.grupo_id);
    setEditingFase(fase);
    setFaseForm({ 
      nome: fase.nome, 
      dia_inicio: fase.dia_inicio, 
      dia_fim: fase.dia_fim, 
      descricao: fase.descricao || "",
      produto_racao_id: fase.produto_racao_id || ""
    });
    fetchRacoesDisponiveis(fase.grupo_id);
    setIsFaseDialogOpen(true);
  };

  const toggleGrupoExpand = (grupoId: string) => {
    setExpandedGrupo(expandedGrupo === grupoId ? null : grupoId);
  };

  const getFasesByGrupo = (grupoId: string) => {
    return fases.filter(f => f.grupo_id === grupoId);
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
              <Layers className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Grupos de Animais</h1>
              <p className="text-muted-foreground">Gerencie grupos e fases de produção</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <Dialog open={isGrupoDialogOpen} onOpenChange={setIsGrupoDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingGrupo(null); setGrupoForm({ nome: "", descricao: "" }); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGrupo ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input 
                    id="nome" 
                    value={grupoForm.nome}
                    onChange={(e) => setGrupoForm({ ...grupoForm, nome: e.target.value })}
                    placeholder="Ex: Aves Corte"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea 
                    id="descricao" 
                    value={grupoForm.descricao}
                    onChange={(e) => setGrupoForm({ ...grupoForm, descricao: e.target.value })}
                    placeholder="Descrição do grupo"
                  />
                </div>
                <Button onClick={handleSaveGrupo} className="w-full">
                  {editingGrupo ? "Salvar Alterações" : "Criar Grupo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={isFaseDialogOpen} onOpenChange={setIsFaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFase ? "Editar Fase" : "Nova Fase"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fase_nome">Nome *</Label>
                <Input 
                  id="fase_nome" 
                  value={faseForm.nome}
                  onChange={(e) => setFaseForm({ ...faseForm, nome: e.target.value })}
                  placeholder="Ex: Pré-Inicial"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dia_inicio">Dia Início *</Label>
                  <Input 
                    id="dia_inicio" 
                    type="number"
                    min="0"
                    value={faseForm.dia_inicio}
                    onChange={(e) => setFaseForm({ ...faseForm, dia_inicio: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="dia_fim">Dia Fim *</Label>
                  <Input 
                    id="dia_fim" 
                    type="number"
                    min="0"
                    value={faseForm.dia_fim}
                    onChange={(e) => setFaseForm({ ...faseForm, dia_fim: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="fase_descricao">Descrição</Label>
                <Textarea 
                  id="fase_descricao" 
                  value={faseForm.descricao}
                  onChange={(e) => setFaseForm({ ...faseForm, descricao: e.target.value })}
                  placeholder="Descrição da fase"
                />
              </div>
              <div>
                <Label htmlFor="produto_racao">Ração Vinculada</Label>
                <Select 
                  value={faseForm.produto_racao_id} 
                  onValueChange={(value) => setFaseForm({ ...faseForm, produto_racao_id: value })}
                  disabled={loadingRacoes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRacoes ? "Carregando..." : "Selecione uma ração (opcional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma ração</SelectItem>
                    {racoesDisponiveis.map((racao) => (
                      <SelectItem key={racao.id} value={racao.id}>
                        {racao.nome} ({racao.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {racoesDisponiveis.length === 0 && !loadingRacoes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhuma ração disponível para este grupo de animal.
                  </p>
                )}
              </div>
              <Button onClick={handleSaveFase} className="w-full">
                {editingFase ? "Salvar Alterações" : "Criar Fase"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Grupos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {grupos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum grupo cadastrado. Clique em "Novo Grupo" para começar.
              </p>
            ) : (
              <div className="space-y-2">
                {grupos.map((grupo) => (
                  <div key={grupo.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGrupoExpand(grupo.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedGrupo === grupo.id ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <span className="font-medium">{grupo.nome}</span>
                          {grupo.descricao && (
                            <p className="text-sm text-muted-foreground">{grupo.descricao}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {getFasesByGrupo(grupo.id).length} fases
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openAddFase(grupo.id); }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Fase
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); openEditGrupo(grupo); }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {expandedGrupo === grupo.id && (
                      <div className="p-4 bg-background">
                        {getFasesByGrupo(grupo.id).length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">
                            Nenhuma fase cadastrada para este grupo.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Período (dias)</TableHead>
                                <TableHead>Ração Vinculada</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFasesByGrupo(grupo.id).map((fase) => (
                                <TableRow key={fase.id}>
                                  <TableCell className="font-medium">{fase.nome}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {fase.dia_inicio} - {fase.dia_fim}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {fase.produto_racao ? (
                                      <Badge variant="secondary">
                                        {fase.produto_racao.nome}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">Sem ração</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {fase.descricao || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => openEditFase(fase)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CadastroGruposAnimal;
