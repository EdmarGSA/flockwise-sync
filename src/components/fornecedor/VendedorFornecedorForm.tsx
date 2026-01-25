import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const vendedorSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  regiao: z.string().optional(),
  codigo_vendedor: z.string().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
});

type VendedorFormData = z.infer<typeof vendedorSchema>;

interface VendedorFornecedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedor?: any;
  fornecedorGlobalId: string;
  onSuccess: () => void;
}

export function VendedorFornecedorForm({
  open,
  onOpenChange,
  vendedor,
  fornecedorGlobalId,
  onSuccess,
}: VendedorFornecedorFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!vendedor;

  const form = useForm<VendedorFormData>({
    resolver: zodResolver(vendedorSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      regiao: '',
      codigo_vendedor: '',
      ativo: true,
      observacoes: '',
    },
  });

  useEffect(() => {
    if (vendedor) {
      form.reset({
        nome: vendedor.nome || '',
        email: vendedor.email || '',
        telefone: vendedor.telefone || '',
        regiao: vendedor.regiao || '',
        codigo_vendedor: vendedor.codigo_vendedor || '',
        ativo: vendedor.ativo ?? true,
        observacoes: vendedor.observacoes || '',
      });
    } else {
      form.reset({
        nome: '',
        email: '',
        telefone: '',
        regiao: '',
        codigo_vendedor: '',
        ativo: true,
        observacoes: '',
      });
    }
  }, [vendedor, form, open]);

  const onSubmit = async (data: VendedorFormData) => {
    setLoading(true);
    try {
      const payload = {
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        regiao: data.regiao || null,
        codigo_vendedor: data.codigo_vendedor || null,
        observacoes: data.observacoes || null,
        ativo: data.ativo,
        fornecedor_global_id: fornecedorGlobalId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('vendedores_fornecedor')
          .update(payload)
          .eq('id', vendedor.id);
        if (error) throw error;
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('vendedores_fornecedor')
          .insert([payload]);
        if (error) throw error;
        toast.success('Vendedor cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar vendedor:', error);
      toast.error(error.message || 'Erro ao salvar vendedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo_vendedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Interno</FormLabel>
                    <FormControl>
                      <Input placeholder="VND001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="regiao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Região</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Norte, Sul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o vendedor..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Vendedor Ativo</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
