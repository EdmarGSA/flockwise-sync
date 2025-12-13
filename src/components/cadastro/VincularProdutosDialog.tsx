import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package, Star } from "lucide-react";

const formSchema = z.object({
  produto_id: z.string().min(1, "Selecione um produto"),
  codigo_produto_fornecedor: z.string().optional(),
  preco_compra: z.coerce.number().min(0, "Preço inválido"),
  prazo_entrega_dias: z.coerce.number().int().min(0, "Prazo inválido"),
  quantidade_minima: z.coerce.number().min(0, "Quantidade inválida"),
  fornecedor_principal: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface Produto {
  id: string;
  nome: string;
  sku: string;
  unidade_medida: string;
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
  const [vinculados, setVinculados] = useState<ProdutoVinculado[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      produto_id: "",
      codigo_produto_fornecedor: "",
      preco_compra: 0,
      prazo_entrega_dias: 0,
      quantidade_minima: 0,
      fornecedor_principal: false,
    },
  });

  useEffect(() => {
    if (open && parceiroId) {
      fetchData();
    }
  }, [open, parceiroId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all products
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, sku, unidade_medida')
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
          produtos:produto_id (id, nome, sku, unidade_medida)
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

  const produtosDisponiveis = produtos.filter(
    (p) => !vinculados.some((v) => v.produto_id === p.id)
  );

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('produto_fornecedor').insert({
        integrado_id: integradoId,
        parceiro_id: parceiroId,
        produto_id: values.produto_id,
        codigo_produto_fornecedor: values.codigo_produto_fornecedor || null,
        preco_compra: values.preco_compra,
        prazo_entrega_dias: values.prazo_entrega_dias,
        quantidade_minima: values.quantidade_minima,
        fornecedor_principal: values.fornecedor_principal,
      });

      if (error) throw error;

      toast.success("Produto vinculado com sucesso!");
      form.reset();
      setShowAddForm(false);
      fetchData();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao vincular produto: " + error.message);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Vinculados - {parceiroNome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de produtos vinculados */}
          {vinculados.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Código Forn.</TableHead>
                    <TableHead className="text-right">Preço Compra</TableHead>
                    <TableHead className="text-center">Prazo (dias)</TableHead>
                    <TableHead className="text-center">Qtd. Mín.</TableHead>
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
                      <TableCell className="font-mono text-sm">
                        {vinculo.codigo_produto_fornecedor || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(vinculo.preco_compra)}
                      </TableCell>
                      <TableCell className="text-center">
                        {vinculo.prazo_entrega_dias}
                      </TableCell>
                      <TableCell className="text-center">
                        {vinculo.quantidade_minima} {vinculo.produto?.unidade_medida}
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              Nenhum produto vinculado a este fornecedor
            </div>
          )}

          {/* Formulário para adicionar */}
          {showAddForm ? (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium">Adicionar Produto</h4>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="produto_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produto *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {produtosDisponiveis.map((produto) => (
                                <SelectItem key={produto.id} value={produto.id}>
                                  {produto.nome} ({produto.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="codigo_produto_fornecedor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código no Fornecedor</FormLabel>
                          <FormControl>
                            <Input placeholder="Código do produto no fornecedor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="preco_compra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço de Compra (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="prazo_entrega_dias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo de Entrega (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantidade_minima"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade Mínima</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fornecedor_principal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Fornecedor Principal para este produto
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        form.reset();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Vincular Produto"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={produtosDisponiveis.length === 0}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          )}

          {produtosDisponiveis.length === 0 && !showAddForm && (
            <p className="text-sm text-muted-foreground text-center">
              Todos os produtos já estão vinculados a este fornecedor
            </p>
          )}

          {/* Resumo */}
          {vinculados.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{vinculados.length}</Badge>
              <span>produto(s) vinculado(s)</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VincularProdutosDialog;
