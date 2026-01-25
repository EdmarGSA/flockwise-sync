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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const galpaoSchema = z.object({
  nucleo_fornecedor_id: z.string().min(1, 'Núcleo é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  capacidade_aves: z.coerce.number().min(0, 'Capacidade deve ser positiva'),
  comprimento: z.coerce.number().min(0).optional().or(z.literal('')),
  largura: z.coerce.number().min(0).optional().or(z.literal('')),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
});

type GalpaoFormData = z.infer<typeof galpaoSchema>;

interface NucleoFornecedor {
  id: string;
  nome: string;
  cliente_fornecedor?: {
    razao_social_nome: string;
    nome_fantasia?: string;
  };
}

interface GalpaoFornecedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galpao?: any;
  fornecedorGlobalId: string;
  nucleos: NucleoFornecedor[];
  onSuccess: () => void;
}

export function GalpaoFornecedorForm({
  open,
  onOpenChange,
  galpao,
  fornecedorGlobalId,
  nucleos,
  onSuccess,
}: GalpaoFornecedorFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!galpao;

  const form = useForm<GalpaoFormData>({
    resolver: zodResolver(galpaoSchema),
    defaultValues: {
      nucleo_fornecedor_id: '',
      nome: '',
      capacidade_aves: 0,
      comprimento: '',
      largura: '',
      ativo: true,
      observacoes: '',
    },
  });

  useEffect(() => {
    if (galpao) {
      form.reset({
        nucleo_fornecedor_id: galpao.nucleo_fornecedor_id || '',
        nome: galpao.nome || '',
        capacidade_aves: galpao.capacidade_aves || 0,
        comprimento: galpao.comprimento || '',
        largura: galpao.largura || '',
        ativo: galpao.ativo ?? true,
        observacoes: galpao.observacoes || '',
      });
    } else {
      form.reset({
        nucleo_fornecedor_id: '',
        nome: '',
        capacidade_aves: 0,
        comprimento: '',
        largura: '',
        ativo: true,
        observacoes: '',
      });
    }
  }, [galpao, form, open]);

  const onSubmit = async (data: GalpaoFormData) => {
    setLoading(true);
    try {
      const payload = {
        nucleo_fornecedor_id: data.nucleo_fornecedor_id,
        nome: data.nome,
        capacidade_aves: data.capacidade_aves,
        comprimento: data.comprimento ? Number(data.comprimento) : null,
        largura: data.largura ? Number(data.largura) : null,
        ativo: data.ativo,
        observacoes: data.observacoes || null,
        fornecedor_global_id: fornecedorGlobalId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('galpoes_fornecedor')
          .update(payload)
          .eq('id', galpao.id);
        if (error) throw error;
        toast.success('Galpão atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('galpoes_fornecedor')
          .insert([payload]);
        if (error) throw error;
        toast.success('Galpão cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar galpão:', error);
      toast.error(error.message || 'Erro ao salvar galpão');
    } finally {
      setLoading(false);
    }
  };

  const calcularArea = () => {
    const comprimento = form.watch('comprimento');
    const largura = form.watch('largura');
    if (comprimento && largura) {
      return (Number(comprimento) * Number(largura)).toFixed(2);
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Galpão' : 'Novo Galpão'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nucleo_fornecedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Núcleo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o núcleo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {nucleos.map((nucleo) => (
                        <SelectItem key={nucleo.id} value={nucleo.id}>
                          {nucleo.nome} - {nucleo.cliente_fornecedor?.nome_fantasia || nucleo.cliente_fornecedor?.razao_social_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Número *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Galpão 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacidade_aves"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade (aves)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="comprimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprimento (m)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="largura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Largura (m)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Área (m²)</label>
                <div className="flex h-10 items-center rounded-md border bg-muted px-3">
                  {calcularArea() || '-'}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o galpão..." {...field} />
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
                  <FormLabel className="cursor-pointer">Galpão Ativo</FormLabel>
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
