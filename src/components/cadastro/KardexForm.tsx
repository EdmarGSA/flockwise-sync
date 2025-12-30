import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package } from "lucide-react";

const formSchema = z.object({
  tipo_movimento: z.string().min(1, "Tipo é obrigatório"),
  usar_embalagem: z.boolean().default(false),
  quantidade_embalagens: z.coerce.number().optional(),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva"),
  custo_unitario: z.coerce.number().optional(),
  documento_ref: z.string().optional(),
  observacao: z.string().optional(),
});

interface KardexFormProps {
  integradoId: string;
  produtoId: string;
  produtos: any[];
  onSuccess: () => void;
}

const KardexForm = ({ integradoId, produtoId, produtos, onSuccess }: KardexFormProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const produto = produtos.find(p => p.id === produtoId);

  const fatorConversao = Number(produto?.fator_conversao) || 1;
  const unidadeCompra = produto?.unidade_compra || "UN";
  const unidadeEstoque = produto?.unidade_medida || "UN";
  const temConversao = fatorConversao > 1 || unidadeCompra !== unidadeEstoque;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_movimento: "",
      usar_embalagem: false,
      quantidade_embalagens: 1,
      quantidade: 0,
      custo_unitario: produto?.custo_unitario || 0,
    },
  });

  const usarEmbalagem = form.watch("usar_embalagem");
  const quantidadeEmbalagens = form.watch("quantidade_embalagens") || 0;
  const tipoMovimento = form.watch("tipo_movimento");

  // Calcula quantidade convertida quando usar embalagem
  useEffect(() => {
    if (usarEmbalagem && tipoMovimento !== 'ajuste') {
      const quantidadeConvertida = quantidadeEmbalagens * fatorConversao;
      form.setValue("quantidade", quantidadeConvertida);
    }
  }, [usarEmbalagem, quantidadeEmbalagens, fatorConversao, tipoMovimento]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    const saldoAnterior = Number(produto?.estoque_atual) || 0;
    let saldoAtual = saldoAnterior;
    const quantidadeFinal = values.quantidade;

    if (values.tipo_movimento === 'entrada') {
      saldoAtual = saldoAnterior + quantidadeFinal;
    } else if (values.tipo_movimento === 'saida') {
      saldoAtual = saldoAnterior - quantidadeFinal;
    } else if (values.tipo_movimento === 'ajuste') {
      saldoAtual = quantidadeFinal;
    }

    // Observação automática para movimentos com conversão
    let observacaoFinal = values.observacao || "";
    if (values.usar_embalagem && values.tipo_movimento !== 'ajuste') {
      const infoConversao = `[${values.quantidade_embalagens} ${unidadeCompra} x ${fatorConversao} = ${quantidadeFinal.toFixed(3)} ${unidadeEstoque}]`;
      observacaoFinal = observacaoFinal ? `${infoConversao} ${observacaoFinal}` : infoConversao;
    }

    // Insert kardex movement
    const { error: kardexError } = await supabase.from('kardex').insert({
      produto_id: produtoId,
      tipo_movimento: values.tipo_movimento,
      quantidade: quantidadeFinal,
      custo_unitario: values.custo_unitario || null,
      saldo_anterior: saldoAnterior,
      saldo_atual: saldoAtual,
      documento_ref: values.documento_ref || null,
      observacao: observacaoFinal || null,
      integrado_id: integradoId,
      criado_por: user?.id,
    });

    if (kardexError) {
      console.error(kardexError);
      setLoading(false);
      return;
    }

    // Update product stock and custo_medio for entrada movements
    const updateData: { estoque_atual: number; custo_medio?: number } = { 
      estoque_atual: saldoAtual 
    };
    
    // Calcular custo médio ponderado para entradas
    if (values.tipo_movimento === 'entrada' && values.custo_unitario && values.custo_unitario > 0) {
      const custoMedioAtual = produto?.custo_medio || 0;
      
      if (saldoAnterior > 0 && custoMedioAtual > 0) {
        // Custo médio ponderado: (estoque * custo_atual + entrada * custo_entrada) / (estoque + entrada)
        updateData.custo_medio = ((saldoAnterior * custoMedioAtual) + (quantidadeFinal * values.custo_unitario)) / saldoAtual;
      } else {
        // Primeira entrada ou custo anterior zerado
        updateData.custo_medio = values.custo_unitario;
      }
    }
    
    const { error: produtoError } = await supabase
      .from('produtos')
      .update(updateData)
      .eq('id', produtoId);

    setLoading(false);

    if (produtoError) {
      console.error(produtoError);
      return;
    }

    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 bg-muted rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">Produto: <strong>{produto?.nome}</strong></p>
          <p className="text-sm text-muted-foreground">Estoque Atual: <strong>{Number(produto?.estoque_atual).toFixed(3)} {unidadeEstoque}</strong></p>
          {temConversao && (
            <p className="text-sm text-muted-foreground mt-1">
              <Package className="inline h-3 w-3 mr-1" />
              Conversão: <strong>1 {unidadeCompra} = {fatorConversao} {unidadeEstoque}</strong>
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="tipo_movimento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Movimento *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste de Inventário</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggle para usar embalagem - só aparece para entrada/saída */}
        {temConversao && tipoMovimento && tipoMovimento !== 'ajuste' && (
          <FormField
            control={form.control}
            name="usar_embalagem"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="flex-1">
                  <FormLabel className="!mt-0 cursor-pointer">
                    Informar em embalagens ({unidadeCompra})
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    O sistema converterá automaticamente para {unidadeEstoque}
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* Quantidade de embalagens */}
        {usarEmbalagem && tipoMovimento !== 'ajuste' && (
          <FormField
            control={form.control}
            name="quantidade_embalagens"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade de Embalagens ({unidadeCompra}) *</FormLabel>
                <FormControl>
                  <Input type="number" step="1" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="quantidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {tipoMovimento === 'ajuste' ? 'Novo Saldo' : `Quantidade (${unidadeEstoque})`} *
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.001" 
                  {...field} 
                  disabled={usarEmbalagem && tipoMovimento !== 'ajuste'}
                  className={usarEmbalagem && tipoMovimento !== 'ajuste' ? "bg-muted" : ""}
                />
              </FormControl>
              {usarEmbalagem && tipoMovimento !== 'ajuste' && (
                <p className="text-xs text-muted-foreground">
                  Calculado: {quantidadeEmbalagens} {unidadeCompra} × {fatorConversao} = <strong>{field.value?.toFixed(3)} {unidadeEstoque}</strong>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="custo_unitario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custo Unitário (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.0001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documento_ref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Documento Referência</FormLabel>
              <FormControl>
                <Input placeholder="NF, Pedido, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações sobre a movimentação" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview do saldo */}
        {tipoMovimento && (
          <div className="p-3 bg-muted rounded-lg border">
            <p className="text-sm font-medium">Prévia do movimento:</p>
            <p className="text-sm text-muted-foreground">
              Saldo anterior: {Number(produto?.estoque_atual).toFixed(3)} {unidadeEstoque}
            </p>
            <p className="text-sm text-muted-foreground">
              {tipoMovimento === 'entrada' && `+ ${form.watch('quantidade')?.toFixed(3) || 0} ${unidadeEstoque}`}
              {tipoMovimento === 'saida' && `- ${form.watch('quantidade')?.toFixed(3) || 0} ${unidadeEstoque}`}
              {tipoMovimento === 'ajuste' && `Novo saldo: ${form.watch('quantidade')?.toFixed(3) || 0} ${unidadeEstoque}`}
            </p>
            {tipoMovimento !== 'ajuste' && (
              <p className="text-sm font-medium text-primary mt-1">
                Saldo final: {(
                  tipoMovimento === 'entrada' 
                    ? Number(produto?.estoque_atual || 0) + (form.watch('quantidade') || 0)
                    : Number(produto?.estoque_atual || 0) - (form.watch('quantidade') || 0)
                ).toFixed(3)} {unidadeEstoque}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Registrar Movimento"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default KardexForm;
