import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  tipo_movimento: z.string().min(1, "Tipo é obrigatório"),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_movimento: "",
      quantidade: 0,
      custo_unitario: produto?.custo_unitario || 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    const saldoAnterior = Number(produto?.estoque_atual) || 0;
    let saldoAtual = saldoAnterior;

    if (values.tipo_movimento === 'entrada') {
      saldoAtual = saldoAnterior + values.quantidade;
    } else if (values.tipo_movimento === 'saida') {
      saldoAtual = saldoAnterior - values.quantidade;
    } else if (values.tipo_movimento === 'ajuste') {
      saldoAtual = values.quantidade; // Ajuste define o valor absoluto
    }

    // Insert kardex movement
    const { error: kardexError } = await supabase.from('kardex').insert({
      produto_id: produtoId,
      tipo_movimento: values.tipo_movimento,
      quantidade: values.quantidade,
      custo_unitario: values.custo_unitario || null,
      saldo_anterior: saldoAnterior,
      saldo_atual: saldoAtual,
      documento_ref: values.documento_ref || null,
      observacao: values.observacao || null,
      integrado_id: integradoId,
      criado_por: user?.id,
    });

    if (kardexError) {
      console.error(kardexError);
      setLoading(false);
      return;
    }

    // Update product stock
    const { error: produtoError } = await supabase
      .from('produtos')
      .update({ estoque_atual: saldoAtual })
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
          <p className="text-sm text-muted-foreground">Estoque Atual: <strong>{Number(produto?.estoque_atual).toFixed(3)} {produto?.unidade_medida}</strong></p>
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

        <FormField
          control={form.control}
          name="quantidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {form.watch('tipo_movimento') === 'ajuste' ? 'Novo Saldo' : 'Quantidade'} *
              </FormLabel>
              <FormControl>
                <Input type="number" step="0.001" {...field} />
              </FormControl>
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
