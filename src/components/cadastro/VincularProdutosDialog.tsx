import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Package, Star, Link2, Pencil, Save, X, ArrowRight, Check, AlertTriangle, Barcode } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrupoProduto {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  sku: string;
  unidade_medida: string;
  grupo_produto_id: string | null;
  codigo_barras_ean: string | null;
}

interface ProdutoVinculado {
  id: string;
  produto_id: string;
  codigo_produto_fornecedor: string | null;
  preco_compra: number;
  prazo_entrega_dias: number;
  quantidade_minima: number;
  fornecedor_principal: boolean;
  unidade_compra_fornecedor: string | null;
  fator_conversao_fornecedor: number | null;
  gtin_esperado: string | null;
  descricao_produto_fornecedor: string | null;
  produto: Produto;
}

interface VincularProdutosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parceiroId: string;
  parceiroNome: string;
  integradoId: string;
  onSuccess: () => void;
}

const VincularProdutosDialog = ({
  open,
  onOpenChange,
  parceiroId,
  parceiroNome,
  integradoId,
  onSuccess,
}: VincularProdutosDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);
  const [vinculados, setVinculados] = useState<ProdutoVinculado[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState<string>("todos");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    codigo_produto_fornecedor: '',
    descricao_produto_fornecedor: '',
    unidade_compra_fornecedor: '',
    fator_conversao_fornecedor: 1,
    gtin_esperado: '',
    preco_compra: 0,
    prazo_entrega_dias: 0,
  });

  useEffect(() => {
    if (open && parceiroId) {
      fetchData();
      setSelectedProducts(new Set());
      setFiltroGrupo("todos");
      setEditingId(null);
    }
  }, [open, parceiroId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch grupos de produto
      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos_produto')
        .select('id, nome')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (gruposError) throw gruposError;
      setGrupos(gruposData || []);

      // Fetch all products
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, sku, unidade_medida, grupo_produto_id, codigo_barras_ean')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) throw produtosError;
      setProdutos(produtosData || []);

      // Fetch linked products with new columns
      const { data: vinculadosData, error: vinculadosError } = await supabase
        .from('produto_fornecedor')
        .select(`
          id,
          produto_id,
          codigo_produto_fornecedor,
          preco_compra,
          prazo_entrega_dias,
          quantidade_minima,
          fornecedor_principal,
          unidade_compra_fornecedor,
          fator_conversao_fornecedor,
          gtin_esperado,
          descricao_produto_fornecedor,
          produtos:produto_id (id, nome, sku, unidade_medida, grupo_produto_id, codigo_barras_ean)
        `)
        .eq('parceiro_id', parceiroId)
        .eq('ativo', true);

      if (vinculadosError) throw vinculadosError;
      
      const formatted = (vinculadosData || []).map((v: any) => ({
        ...v,
        produto: v.produtos,
      }));
      setVinculados(formatted);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Produtos disponíveis = não vinculados + filtro de grupo
  const produtosDisponiveis = produtos.filter((p) => {
    const naoVinculado = !vinculados.some((v) => v.produto_id === p.id);
    const matchGrupo = filtroGrupo === "todos" || p.grupo_produto_id === filtroGrupo;
    return naoVinculado && matchGrupo;
  });

  const handleToggleProduct = (produtoId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(produtoId)) {
        newSet.delete(produtoId);
      } else {
        newSet.add(produtoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === produtosDisponiveis.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(produtosDisponiveis.map((p) => p.id)));
    }
  };

  const handleVincular = async () => {
    if (selectedProducts.size === 0) {
      toast.warning("Selecione pelo menos um produto");
      return;
    }

    setLoading(true);
    try {
      const inserts = Array.from(selectedProducts).map((produtoId) => ({
        integrado_id: integradoId,
        parceiro_id: parceiroId,
        produto_id: produtoId,
        preco_compra: 0,
        prazo_entrega_dias: 0,
        quantidade_minima: 0,
        fornecedor_principal: false,
        fator_conversao_fornecedor: 1,
      }));

      const { error } = await supabase.from('produto_fornecedor').insert(inserts);

      if (error) throw error;

      toast.success(`${selectedProducts.size} produto(s) vinculado(s) com sucesso!`);
      setSelectedProducts(new Set());
      fetchData();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao vincular produtos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (vinculoId: string) => {
    if (!confirm("Deseja remover este vínculo?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('produto_fornecedor')
        .delete()
        .eq('id', vinculoId);

      if (error) throw error;

      toast.success("Vínculo removido!");
      fetchData();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao remover vínculo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (vinculo: ProdutoVinculado) => {
    setEditingId(vinculo.id);
    setEditForm({
      codigo_produto_fornecedor: vinculo.codigo_produto_fornecedor || '',
      descricao_produto_fornecedor: vinculo.descricao_produto_fornecedor || '',
      unidade_compra_fornecedor: vinculo.unidade_compra_fornecedor || vinculo.produto?.unidade_medida || '',
      fator_conversao_fornecedor: vinculo.fator_conversao_fornecedor || 1,
      gtin_esperado: vinculo.gtin_esperado || vinculo.produto?.codigo_barras_ean || '',
      preco_compra: vinculo.preco_compra || 0,
      prazo_entrega_dias: vinculo.prazo_entrega_dias || 0,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('produto_fornecedor')
        .update({
          codigo_produto_fornecedor: editForm.codigo_produto_fornecedor || null,
          descricao_produto_fornecedor: editForm.descricao_produto_fornecedor || null,
          unidade_compra_fornecedor: editForm.unidade_compra_fornecedor || null,
          fator_conversao_fornecedor: editForm.fator_conversao_fornecedor || 1,
          gtin_esperado: editForm.gtin_esperado || null,
          preco_compra: editForm.preco_compra,
          prazo_entrega_dias: editForm.prazo_entrega_dias,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success("De-Para atualizado com sucesso!");
      setEditingId(null);
      fetchData();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getGrupoNome = (grupoId: string | null) => {
    if (!grupoId) return "-";
    const grupo = grupos.find((g) => g.id === grupoId);
    return grupo?.nome || "-";
  };

  const getDeParaStatus = (vinculo: ProdutoVinculado) => {
    const hasCodigoFornecedor = !!vinculo.codigo_produto_fornecedor;
    const hasGtin = !!vinculo.gtin_esperado;
    const hasFatorConversao = vinculo.fator_conversao_fornecedor && vinculo.fator_conversao_fornecedor > 1;
    
    if (hasCodigoFornecedor && hasGtin) return 'completo';
    if (hasCodigoFornecedor || hasGtin || hasFatorConversao) return 'parcial';
    return 'pendente';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            De-Para Produtos - {parceiroNome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Seção: Adicionar produtos */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h4 className="font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Vincular Novos Produtos
              </h4>
              <div className="flex items-center gap-3">
                <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os grupos</SelectItem>
                    {grupos.map((grupo) => (
                      <SelectItem key={grupo.id} value={grupo.id}>
                        {grupo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleVincular}
                  disabled={loading || selectedProducts.size === 0}
                  size="sm"
                >
                  Vincular ({selectedProducts.size})
                </Button>
              </div>
            </div>

            {produtosDisponiveis.length > 0 ? (
              <ScrollArea className="h-[200px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            produtosDisponiveis.length > 0 &&
                            selectedProducts.size === produtosDisponiveis.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Unidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosDisponiveis.map((produto) => (
                      <TableRow
                        key={produto.id}
                        className={selectedProducts.has(produto.id) ? "bg-muted/50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(produto.id)}
                            onCheckedChange={() => handleToggleProduct(produto.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {produto.sku}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getGrupoNome(produto.grupo_produto_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>{produto.unidade_medida}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border rounded-md">
                {filtroGrupo !== "todos"
                  ? "Nenhum produto disponível neste grupo"
                  : "Todos os produtos já estão vinculados"}
              </div>
            )}
          </div>

          {/* Seção: Produtos já vinculados */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">Produtos Vinculados (De-Para)</h4>
              <Badge variant="secondary">{vinculados.length}</Badge>
            </div>
            
            {vinculados.length > 0 ? (
              <ScrollArea className="flex-1 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto Interno</TableHead>
                      <TableHead>Código Fornecedor</TableHead>
                      <TableHead>Unid. Compra</TableHead>
                      <TableHead className="text-center">Conversão</TableHead>
                      <TableHead>GTIN</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vinculados.map((vinculo) => {
                      const isEditing = editingId === vinculo.id;
                      const status = getDeParaStatus(vinculo);
                      
                      if (isEditing) {
                        return (
                          <TableRow key={vinculo.id} className="bg-muted/30">
                            <TableCell colSpan={7}>
                              <Card className="border-primary/50">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Pencil className="w-4 h-4" />
                                    Editar De-Para: {vinculo.produto?.nome}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-xs">Código Produto Fornecedor (cProd NF-e)</Label>
                                      <Input
                                        value={editForm.codigo_produto_fornecedor}
                                        onChange={(e) => setEditForm({ ...editForm, codigo_produto_fornecedor: e.target.value })}
                                        placeholder="Ex: ABC123"
                                      />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                      <Label className="text-xs">Descrição Produto Fornecedor (xProd NF-e)</Label>
                                      <Input
                                        value={editForm.descricao_produto_fornecedor}
                                        onChange={(e) => setEditForm({ ...editForm, descricao_produto_fornecedor: e.target.value })}
                                        placeholder="Nome conforme NF-e do fornecedor"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-xs">Unidade Compra (uCom NF-e)</Label>
                                      <Input
                                        value={editForm.unidade_compra_fornecedor}
                                        onChange={(e) => setEditForm({ ...editForm, unidade_compra_fornecedor: e.target.value })}
                                        placeholder="CX, SC, UN..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Fator de Conversão</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={editForm.fator_conversao_fornecedor}
                                        onChange={(e) => setEditForm({ ...editForm, fator_conversao_fornecedor: parseFloat(e.target.value) || 1 })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">GTIN/EAN Esperado (cEAN NF-e)</Label>
                                      <Input
                                        value={editForm.gtin_esperado}
                                        onChange={(e) => setEditForm({ ...editForm, gtin_esperado: e.target.value })}
                                        placeholder="7891234567890"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Preço Compra</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.preco_compra}
                                        onChange={(e) => setEditForm({ ...editForm, preco_compra: parseFloat(e.target.value) || 0 })}
                                      />
                                    </div>
                                  </div>
                                  
                                  {editForm.fator_conversao_fornecedor > 1 && (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                                      <ArrowRight className="w-4 h-4" />
                                      <span>
                                        1 {editForm.unidade_compra_fornecedor || 'unidade'} do fornecedor = {editForm.fator_conversao_fornecedor} {vinculo.produto?.unidade_medida} no estoque
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                      <X className="w-4 h-4 mr-1" />
                                      Cancelar
                                    </Button>
                                    <Button size="sm" onClick={handleSaveEdit} disabled={loading}>
                                      <Save className="w-4 h-4 mr-1" />
                                      Salvar
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return (
                        <TableRow key={vinculo.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{vinculo.produto?.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {vinculo.produto?.sku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {vinculo.codigo_produto_fornecedor ? (
                              <div>
                                <span className="font-mono text-sm">{vinculo.codigo_produto_fornecedor}</span>
                                {vinculo.descricao_produto_fornecedor && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {vinculo.descricao_produto_fornecedor}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {vinculo.unidade_compra_fornecedor || vinculo.produto?.unidade_medida}
                          </TableCell>
                          <TableCell className="text-center">
                            {vinculo.fator_conversao_fornecedor && vinculo.fator_conversao_fornecedor > 1 ? (
                              <Badge variant="secondary" className="text-xs">
                                ×{vinculo.fator_conversao_fornecedor}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">1:1</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {vinculo.gtin_esperado ? (
                              <div className="flex items-center gap-1">
                                <Barcode className="w-3 h-3 text-muted-foreground" />
                                <span className="font-mono text-xs">{vinculo.gtin_esperado.substring(0, 8)}...</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {status === 'completo' && (
                              <Badge className="bg-green-600 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Completo
                              </Badge>
                            )}
                            {status === 'parcial' && (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Parcial
                              </Badge>
                            )}
                            {status === 'pendente' && (
                              <Badge variant="secondary" className="text-xs">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(vinculo)}
                                disabled={loading}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(vinculo.id)}
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                Nenhum produto vinculado a este fornecedor
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VincularProdutosDialog;
