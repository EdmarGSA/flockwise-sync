import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  FlaskConical, 
  Edit2, 
  Copy, 
  Star, 
  StarOff,
  ArrowLeft,
  DollarSign,
  Loader2,
  Eye,
  ToggleLeft,
  ToggleRight,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

interface NutricoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: any;
  integradoId: string;
  gruposProduto: any[];
  produtos: any[];
}

interface Nutricao {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  padrao: boolean;
  created_at: string;
}

interface ItemNutricao {
  id?: string;
  insumo_id: string;
  insumo_nome: string;
  quantidade: number;
  unidade_medida: string;
  grupo_nome?: string;
  custo_unitario: number;
}

interface NutricaoCusto {
  id: string;
  nome: string;
  custoKg: number;
  totalQtd: number;
  totalCusto: number;
  ativo: boolean;
  padrao: boolean;
}

const NutricoesDialog = ({ 
  open, 
  onOpenChange, 
  produto, 
  integradoId, 
  gruposProduto, 
  produtos 
}: NutricoesDialogProps) => {
  // State for list of nutritions
  const [nutricoes, setNutricoes] = useState<Nutricao[]>([]);
  const [loadingNutricoes, setLoadingNutricoes] = useState(false);
  
  // State for editing a single nutrition
  const [editingNutricao, setEditingNutricao] = useState<Nutricao | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [nutricaoNome, setNutricaoNome] = useState("");
  const [nutricaoDescricao, setNutricaoDescricao] = useState("");
  
  // State for nutrition items
  const [itens, setItens] = useState<ItemNutricao[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  
  // State for add item form
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [selectedInsumo, setSelectedInsumo] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("");
  
  const [saving, setSaving] = useState(false);
  
  // State for cost comparison
  const [nutricoesCusto, setNutricoesCusto] = useState<NutricaoCusto[]>([]);
  const [loadingCustos, setLoadingCustos] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("nutricoes");

  const produtosFiltrados = selectedGrupo 
    ? produtos.filter(p => p.grupo_produto_id === selectedGrupo && p.id !== produto?.id)
    : produtos.filter(p => p.id !== produto?.id);

  useEffect(() => {
    if (open && produto?.id) {
      fetchNutricoes();
      fetchNutricoesCusto();
      // Reset editing state
      setEditingNutricao(null);
      setIsCreating(false);
      setActiveTab("nutricoes");
    }
  }, [open, produto?.id]);

  const fetchNutricoes = async () => {
    setLoadingNutricoes(true);
    try {
      const { data, error } = await supabase
        .from('nutricoes')
        .select('*')
        .eq('produto_id', produto.id)
        .eq('integrado_id', integradoId)
        .order('padrao', { ascending: false })
        .order('nome');

      if (error) throw error;
      setNutricoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar nutrições:', error);
      toast({ title: "Erro ao carregar nutrições", variant: "destructive" });
    } finally {
      setLoadingNutricoes(false);
    }
  };

  const fetchNutricoesCusto = async () => {
    setLoadingCustos(true);
    try {
      // First get all nutritions for this product
      const { data: nutricaoData, error: nutricaoError } = await supabase
        .from('nutricoes')
        .select('id, nome, ativo, padrao')
        .eq('produto_id', produto.id)
        .eq('integrado_id', integradoId);

      if (nutricaoError) throw nutricaoError;

      // Get all items for each nutrition with their costs
      const custoPromises = (nutricaoData || []).map(async (nutricao) => {
        const { data: itensData, error: itensError } = await supabase
          .from('nutricao_itens')
          .select('quantidade, insumo:produtos!nutricao_itens_insumo_id_fkey(custo_unitario)')
          .eq('nutricao_id', nutricao.id);

        if (itensError) throw itensError;

        let totalQtd = 0;
        let totalCusto = 0;

        (itensData || []).forEach((item: any) => {
          const qtd = Number(item.quantidade) || 0;
          const custoUnit = Number(item.insumo?.custo_unitario) || 0;
          totalQtd += qtd;
          totalCusto += qtd * custoUnit;
        });

        const custoKg = totalQtd > 0 ? totalCusto / totalQtd : 0;

        return {
          id: nutricao.id,
          nome: nutricao.nome,
          custoKg,
          totalQtd,
          totalCusto,
          ativo: nutricao.ativo,
          padrao: nutricao.padrao,
        } as NutricaoCusto;
      });

      const custosResult = await Promise.all(custoPromises);
      // Sort by cost/kg for better visualization
      custosResult.sort((a, b) => a.custoKg - b.custoKg);
      setNutricoesCusto(custosResult);
    } catch (error) {
      console.error('Erro ao calcular custos:', error);
    } finally {
      setLoadingCustos(false);
    }
  };

  const fetchNutricaoItens = async (nutricaoId: string) => {
    setLoadingItens(true);
    try {
      const { data, error } = await supabase
        .from('nutricao_itens')
        .select('*, insumo:produtos!nutricao_itens_insumo_id_fkey(id, nome, unidade_medida, grupo_produto_id, custo_unitario)')
        .eq('nutricao_id', nutricaoId);

      if (error) throw error;

      const mappedItens = (data || []).map((item: any) => ({
        id: item.id,
        insumo_id: item.insumo_id,
        insumo_nome: item.insumo?.nome || 'Produto não encontrado',
        quantidade: Number(item.quantidade),
        unidade_medida: item.unidade_medida,
        grupo_nome: gruposProduto.find(g => g.id === item.insumo?.grupo_produto_id)?.nome,
        custo_unitario: Number(item.insumo?.custo_unitario || 0),
      }));
      setItens(mappedItens);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      toast({ title: "Erro ao carregar itens", variant: "destructive" });
    } finally {
      setLoadingItens(false);
    }
  };

  const handleCreateNutricao = () => {
    setIsCreating(true);
    setEditingNutricao(null);
    setNutricaoNome("");
    setNutricaoDescricao("");
    setItens([]);
  };

  const handleEditNutricao = async (nutricao: Nutricao) => {
    setEditingNutricao(nutricao);
    setIsCreating(false);
    setNutricaoNome(nutricao.nome);
    setNutricaoDescricao(nutricao.descricao || "");
    await fetchNutricaoItens(nutricao.id);
  };

  const handleCopyNutricao = async (nutricao: Nutricao) => {
    setIsCreating(true);
    setEditingNutricao(null);
    setNutricaoNome(`${nutricao.nome} (cópia)`);
    setNutricaoDescricao(nutricao.descricao || "");
    await fetchNutricaoItens(nutricao.id);
    // Remove IDs from items so they're created as new
    setItens(prev => prev.map(item => ({ ...item, id: undefined })));
  };

  const handleSetPadrao = async (nutricao: Nutricao) => {
    try {
      // First, unset all others as padrao
      await supabase
        .from('nutricoes')
        .update({ padrao: false })
        .eq('produto_id', produto.id)
        .eq('integrado_id', integradoId);

      // Then set this one as padrao
      await supabase
        .from('nutricoes')
        .update({ padrao: true })
        .eq('id', nutricao.id);

      toast({ title: `${nutricao.nome} definida como padrão` });
      fetchNutricoes();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      toast({ title: "Erro ao definir padrão", variant: "destructive" });
    }
  };

  const handleToggleAtivo = async (nutricao: Nutricao) => {
    try {
      await supabase
        .from('nutricoes')
        .update({ ativo: !nutricao.ativo })
        .eq('id', nutricao.id);

      toast({ title: nutricao.ativo ? "Nutrição desativada" : "Nutrição ativada" });
      fetchNutricoes();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    }
  };

  const handleAddItem = () => {
    if (!selectedInsumo || !quantidade) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const insumo = produtos.find(p => p.id === selectedInsumo);
    if (!insumo) return;

    const novoItem: ItemNutricao = {
      insumo_id: selectedInsumo,
      insumo_nome: insumo.nome,
      quantidade: Number(quantidade),
      unidade_medida: insumo.unidade_medida || 'KG',
      grupo_nome: gruposProduto.find(g => g.id === insumo.grupo_produto_id)?.nome,
      custo_unitario: Number(insumo.custo_unitario || 0),
    };

    setItens([...itens, novoItem]);
    setSelectedInsumo("");
    setQuantidade("");
  };

  const handleRemoveItem = (index: number) => {
    const newItens = [...itens];
    newItens.splice(index, 1);
    setItens(newItens);
  };

  const handleSaveNutricao = async () => {
    if (!nutricaoNome.trim()) {
      toast({ title: "Informe o nome da nutrição", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let nutricaoId: string;

      if (editingNutricao) {
        // Update existing
        await supabase
          .from('nutricoes')
          .update({ 
            nome: nutricaoNome.trim(), 
            descricao: nutricaoDescricao.trim() || null 
          })
          .eq('id', editingNutricao.id);

        nutricaoId = editingNutricao.id;

        // Delete existing items
        await supabase
          .from('nutricao_itens')
          .delete()
          .eq('nutricao_id', nutricaoId);
      } else {
        // Create new nutrition
        // Check if this should be the default (first nutrition)
        const isPadrao = nutricoes.length === 0;

        const { data: newNutricao, error: createError } = await supabase
          .from('nutricoes')
          .insert({
            produto_id: produto.id,
            nome: nutricaoNome.trim(),
            descricao: nutricaoDescricao.trim() || null,
            padrao: isPadrao,
            integrado_id: integradoId,
          })
          .select()
          .single();

        if (createError) throw createError;
        nutricaoId = newNutricao.id;
      }

      // Insert items
      if (itens.length > 0) {
        const inserts = itens.map(item => ({
          nutricao_id: nutricaoId,
          insumo_id: item.insumo_id,
          quantidade: item.quantidade,
          unidade_medida: item.unidade_medida,
          integrado_id: integradoId,
        }));

        const { error: itemsError } = await supabase
          .from('nutricao_itens')
          .insert(inserts);

        if (itemsError) throw itemsError;
      }

      toast({ title: editingNutricao ? "Nutrição atualizada!" : "Nutrição criada!" });
      setEditingNutricao(null);
      setIsCreating(false);
      fetchNutricoes();
    } catch (error) {
      console.error('Erro ao salvar nutrição:', error);
      toast({ title: "Erro ao salvar nutrição", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setEditingNutricao(null);
    setIsCreating(false);
    setItens([]);
  };

  const totalQuantidade = itens.reduce((acc, item) => acc + item.quantidade, 0);
  const totalCusto = itens.reduce((acc, item) => acc + (item.quantidade * item.custo_unitario), 0);
  const custoPorKg = totalQuantidade > 0 ? totalCusto / totalQuantidade : 0;

  const calcularCustoNutricao = (nutricaoId: string) => {
    // This would need to be fetched, but for now we'll show a placeholder
    return null;
  };

  const isEditing = editingNutricao !== null || isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                {isCreating ? "Nova Nutrição" : `Editar: ${editingNutricao?.nome}`}
              </>
            ) : (
              <>Nutrições - {produto?.nome}</>
            )}
          </DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          // Tabs for Nutritions and Cost Comparison
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nutricoes" className="gap-2">
                <FlaskConical className="w-4 h-4" /> Nutrições
              </TabsTrigger>
              <TabsTrigger value="comparativo" className="gap-2" disabled={nutricoes.length < 2}>
                <BarChart3 className="w-4 h-4" /> Comparativo de Custo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nutricoes" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Gerencie diferentes formulações nutricionais para este produto
                </p>
                <Button onClick={handleCreateNutricao} className="gap-2">
                  <Plus className="w-4 h-4" /> Nova Nutrição
                </Button>
              </div>

            {loadingNutricoes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : nutricoes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma nutrição cadastrada para este produto
                  </p>
                  <Button onClick={handleCreateNutricao} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Criar Primeira Nutrição
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {nutricoes.map(nutricao => (
                  <Card 
                    key={nutricao.id} 
                    className={`${!nutricao.ativo ? 'opacity-50' : ''} ${nutricao.padrao ? 'border-primary' : ''}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {nutricao.padrao && (
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{nutricao.nome}</span>
                              {!nutricao.ativo && (
                                <Badge variant="secondary">Inativa</Badge>
                              )}
                              {nutricao.padrao && (
                                <Badge variant="default" className="bg-amber-500">Padrão</Badge>
                              )}
                            </div>
                            {nutricao.descricao && (
                              <p className="text-sm text-muted-foreground">{nutricao.descricao}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!nutricao.padrao && nutricao.ativo && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleSetPadrao(nutricao)}
                              title="Definir como padrão"
                            >
                              <StarOff className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleCopyNutricao(nutricao)}
                            title="Copiar nutrição"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditNutricao(nutricao)}
                            title="Editar nutrição"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleAtivo(nutricao)}
                            title={nutricao.ativo ? "Desativar" : "Ativar"}
                          >
                            {nutricao.ativo ? (
                              <ToggleRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </TabsContent>

            <TabsContent value="comparativo" className="space-y-4 mt-4">
              {loadingCustos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : nutricoesCusto.length < 2 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Cadastre pelo menos 2 nutrições para comparar custos
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <DollarSign className="w-5 h-5" />
                        Comparativo de Custo por Kg
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={nutricoesCusto.filter(n => n.ativo)}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                              className="text-xs"
                            />
                            <YAxis 
                              type="category" 
                              dataKey="nome" 
                              width={120}
                              className="text-xs"
                            />
                            <Tooltip 
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Custo/Kg']}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))' 
                              }}
                            />
                            <Bar dataKey="custoKg" radius={[0, 4, 4, 0]}>
                              {nutricoesCusto.filter(n => n.ativo).map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.padrao ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                                />
                              ))}
                              <LabelList 
                                dataKey="custoKg" 
                                position="right" 
                                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                                className="fill-foreground text-xs"
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cost Comparison Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detalhamento por Nutrição</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nutrição</TableHead>
                            <TableHead className="text-right">Total Ingredientes</TableHead>
                            <TableHead className="text-right">Custo Total</TableHead>
                            <TableHead className="text-right">Custo/Kg</TableHead>
                            <TableHead className="text-right">Diferença</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nutricoesCusto.filter(n => n.ativo).map((nutricao, index) => {
                            const menorCusto = Math.min(...nutricoesCusto.filter(n => n.ativo).map(n => n.custoKg));
                            const diferenca = nutricao.custoKg - menorCusto;
                            const diferencaPercent = menorCusto > 0 ? (diferenca / menorCusto) * 100 : 0;
                            
                            return (
                              <TableRow key={nutricao.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {nutricao.padrao && (
                                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    )}
                                    <span className="font-medium">{nutricao.nome}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {nutricao.totalQtd.toFixed(3)} KG
                                </TableCell>
                                <TableCell className="text-right">
                                  R$ {nutricao.totalCusto.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  R$ {nutricao.custoKg.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {index === 0 ? (
                                    <Badge variant="default" className="bg-green-500">Menor Custo</Badge>
                                  ) : (
                                    <span className="text-destructive">
                                      +R$ {diferenca.toFixed(2)} ({diferencaPercent.toFixed(1)}%)
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Edit/Create Nutrition Form
          <div className="space-y-6">
            {/* Nutrition Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nutricaoNome">Nome da Nutrição *</Label>
                <Input
                  id="nutricaoNome"
                  value={nutricaoNome}
                  onChange={(e) => setNutricaoNome(e.target.value)}
                  placeholder="Ex: Agroceres, DSM, Padrão..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nutricaoDescricao">Descrição</Label>
                <Input
                  id="nutricaoDescricao"
                  value={nutricaoDescricao}
                  onChange={(e) => setNutricaoDescricao(e.target.value)}
                  placeholder="Descrição opcional..."
                />
              </div>
            </div>

            {/* Cost Summary */}
            {itens.length > 0 && (
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="py-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Ingredientes</p>
                      <p className="text-lg font-bold">{totalQuantidade.toFixed(3)} KG</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3" /> Custo Total
                      </p>
                      <p className="text-lg font-bold text-green-500">
                        R$ {totalCusto.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Custo/kg</p>
                      <p className="text-lg font-bold text-amber-500">
                        R$ {custoPorKg.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Item Form */}
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <h4 className="font-medium">Adicionar Insumo</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Filtrar por Grupo</Label>
                  <Select value={selectedGrupo || "all"} onValueChange={(val) => setSelectedGrupo(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os grupos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {gruposProduto.map(grupo => (
                        <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Insumo *</Label>
                  <Select value={selectedInsumo || "__none__"} onValueChange={(val) => setSelectedInsumo(val === "__none__" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione um insumo</SelectItem>
                      {produtosFiltrados.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade *</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    placeholder="0.000"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddItem} className="gap-2">
                    <Plus className="w-4 h-4" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Items Table */}
            {loadingItens ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : itens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="secondary">{item.grupo_nome || '-'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.insumo_nome}</TableCell>
                      <TableCell className="text-right">{item.quantidade.toFixed(3)}</TableCell>
                      <TableCell>{item.unidade_medida}</TableCell>
                      <TableCell className="text-right">
                        R$ {item.custo_unitario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(item.quantidade * item.custo_unitario).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{totalQuantidade.toFixed(3)}</TableCell>
                    <TableCell>KG</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-primary">
                      R$ {totalCusto.toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum insumo adicionado à nutrição
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleBack}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNutricao} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingNutricao ? "Salvar Alterações" : "Criar Nutrição"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NutricoesDialog;
