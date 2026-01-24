import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'SC', 'CX', 'PCT', 'FD', 'TON'];

const formSchema = z.object({
  codigo_interno: z.string().min(1, 'Código obrigatório'),
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  unidade_venda: z.string().min(1, 'Unidade obrigatória'),
  preco_tabela: z.number().min(0).default(0),
  custo: z.number().min(0).optional(),
  codigo_barras: z.string().optional(),
  ncm: z.string().optional(),
  estoque_proprio: z.number().min(0).default(0),
  estoque_minimo: z.number().min(0).default(0),
  ativo: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProdutoCatalogo {
  id: string;
  fornecedor_global_id: string;
  codigo_interno: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  marca: string | null;
  unidade_venda: string;
  preco_tabela: number;
  custo: number | null;
  codigo_barras: string | null;
  ncm: string | null;
  estoque_proprio: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ProdutoCatalogoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: ProdutoCatalogo | null;
  fornecedorGlobalId: string;
  onSuccess: () => void;
}

export function ProdutoCatalogoForm({
  open,
  onOpenChange,
  produto,
  fornecedorGlobalId,
  onSuccess,
}: ProdutoCatalogoFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!produto;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_interno: '',
      nome: '',
      descricao: '',
      categoria: '',
      marca: '',
      unidade_venda: 'UN',
      preco_tabela: 0,
      custo: 0,
      codigo_barras: '',
      ncm: '',
      estoque_proprio: 0,
      estoque_minimo: 0,
      ativo: true,
    },
  });

  useEffect(() => {
    if (produto) {
      form.reset({
        codigo_interno: produto.codigo_interno || '',
        nome: produto.nome || '',
        descricao: produto.descricao || '',
        categoria: produto.categoria || '',
        marca: produto.marca || '',
        unidade_venda: produto.unidade_venda || 'UN',
        preco_tabela: produto.preco_tabela || 0,
        custo: produto.custo || 0,
        codigo_barras: produto.codigo_barras || '',
        ncm: produto.ncm || '',
        estoque_proprio: produto.estoque_proprio || 0,
        estoque_minimo: produto.estoque_minimo || 0,
        ativo: produto.ativo,
      });
    } else {
      form.reset({
        codigo_interno: '',
        nome: '',
        descricao: '',
        categoria: '',
        marca: '',
        unidade_venda: 'UN',
        preco_tabela: 0,
        custo: 0,
        codigo_barras: '',
        ncm: '',
        estoque_proprio: 0,
        estoque_minimo: 0,
        ativo: true,
      });
    }
  }, [produto, open, form]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        fornecedor_global_id: fornecedorGlobalId,
        codigo_interno: data.codigo_interno,
        nome: data.nome,
        descricao: data.descricao || null,
        categoria: data.categoria || null,
        marca: data.marca || null,
        unidade_venda: data.unidade_venda,
        preco_tabela: data.preco_tabela || 0,
        custo: data.custo || null,
        codigo_barras: data.codigo_barras || null,
        ncm: data.ncm || null,
        estoque_proprio: data.estoque_proprio || 0,
        estoque_minimo: data.estoque_minimo || 0,
        ativo: data.ativo,
      };

      if (isEditing && produto) {
        const { error } = await supabase
          .from('produtos_catalogo_fornecedor')
          .update(payload)
          .eq('id', produto.id);

        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('produtos_catalogo_fornecedor')
          .insert(payload);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe um produto com este código');
            return;
          }
          throw error;
        }
        toast.success('Produto cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Código e Nome */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="codigo_interno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código (SKU)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: PROD001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Descrição detalhada do produto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria e Marca */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Ração, Insumo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Unidade e Preços */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unidade_venda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIDADES.map((un) => (
                          <SelectItem key={un} value={un}>{un}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preco_tabela"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="custo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="Opcional"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Códigos fiscais */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo_barras"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras (EAN)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ncm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NCM</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estoque */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estoque_proprio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Atual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estoque_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Produto Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Produtos inativos não aparecem no catálogo
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
