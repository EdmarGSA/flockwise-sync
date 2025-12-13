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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Package, Star, Link2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}

interface ProdutoVinculado {
  id: string;
  produto_id: string;
  codigo_produto_fornecedor: string | null;
  preco_compra: number;
  prazo_entrega_dias: number;
  quantidade_minima: number;
  fornecedor_principal: boolean;
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

  useEffect(() => {
    if (open && parceiroId) {
      fetchData();
      setSelectedProducts(new Set());
      setFiltroGrupo("todos");
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
        .select('id, nome, sku, unidade_medida, grupo_produto_id')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) throw produtosError;
      setProdutos(produtosData || []);

      // Fetch linked products
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
          produtos:produto_id (id, nome, sku, unidade_medida, grupo_produto_id)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Vinculados - {parceiroNome}
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
              <h4 className="font-medium">Produtos Vinculados</h4>
              <Badge variant="secondary">{vinculados.length}</Badge>
            </div>
            
            {vinculados.length > 0 ? (
              <ScrollArea className="flex-1 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="text-right">Preço Compra</TableHead>
                      <TableHead className="text-center">Prazo</TableHead>
                      <TableHead className="text-center">Principal</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vinculados.map((vinculo) => (
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
                          <Badge variant="outline" className="text-xs">
                            {getGrupoNome(vinculo.produto?.grupo_produto_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(vinculo.preco_compra)}
                        </TableCell>
                        <TableCell className="text-center">
                          {vinculo.prazo_entrega_dias} dias
                        </TableCell>
                        <TableCell className="text-center">
                          {vinculo.fornecedor_principal && (
                            <Star className="h-4 w-4 text-amber-500 mx-auto fill-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(vinculo.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
