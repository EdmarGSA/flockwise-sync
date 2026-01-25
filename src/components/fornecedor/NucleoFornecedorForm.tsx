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

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const nucleoSchema = z.object({
  cliente_fornecedor_id: z.string().min(1, 'Cliente é obrigatório'),
  nome: z.string().min(2, 'Nome é obrigatório'),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  tipo_producao: z.enum(['corte', 'postura']).default('corte'),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
});

type NucleoFormData = z.infer<typeof nucleoSchema>;

interface ClienteFornecedor {
  id: string;
  razao_social_nome: string;
  nome_fantasia?: string;
}

interface NucleoFornecedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nucleo?: any;
  fornecedorGlobalId: string;
  clientes: ClienteFornecedor[];
  onSuccess: () => void;
}

export function NucleoFornecedorForm({
  open,
  onOpenChange,
  nucleo,
  fornecedorGlobalId,
  clientes,
  onSuccess,
}: NucleoFornecedorFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!nucleo;

  const form = useForm<NucleoFormData>({
    resolver: zodResolver(nucleoSchema),
    defaultValues: {
      cliente_fornecedor_id: '',
      nome: '',
      cidade: '',
      estado: '',
      cep: '',
      tipo_producao: 'corte',
      ativo: true,
      observacoes: '',
    },
  });

  useEffect(() => {
    if (nucleo) {
      form.reset({
        cliente_fornecedor_id: nucleo.cliente_fornecedor_id || '',
        nome: nucleo.nome || '',
        cidade: nucleo.cidade || '',
        estado: nucleo.estado || '',
        cep: nucleo.cep || '',
        tipo_producao: nucleo.tipo_producao || 'corte',
        ativo: nucleo.ativo ?? true,
        observacoes: nucleo.observacoes || '',
      });
    } else {
      form.reset({
        cliente_fornecedor_id: '',
        nome: '',
        cidade: '',
        estado: '',
        cep: '',
        tipo_producao: 'corte',
        ativo: true,
        observacoes: '',
      });
    }
  }, [nucleo, form, open]);

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        form.setValue('cidade', data.localidade);
        form.setValue('estado', data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const onSubmit = async (data: NucleoFormData) => {
    setLoading(true);
    try {
      const payload = {
        cliente_fornecedor_id: data.cliente_fornecedor_id,
        nome: data.nome,
        tipo_producao: data.tipo_producao,
        ativo: data.ativo,
        cidade: data.cidade || null,
        estado: data.estado || null,
        cep: data.cep || null,
        observacoes: data.observacoes || null,
        fornecedor_global_id: fornecedorGlobalId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('nucleos_fornecedor')
          .update(payload)
          .eq('id', nucleo.id);
        if (error) throw error;
        toast.success('Núcleo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('nucleos_fornecedor')
          .insert([payload]);
        if (error) throw error;
        toast.success('Núcleo cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar núcleo:', error);
      toast.error(error.message || 'Erro ao salvar núcleo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Núcleo' : 'Novo Núcleo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_fornecedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_fantasia || cliente.razao_social_nome}
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
                    <FormLabel>Nome do Núcleo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Granja Norte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_producao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Produção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corte">Corte</SelectItem>
                        <SelectItem value="postura">Postura</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        {...field}
                        onBlur={(e) => buscarCep(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Textarea placeholder="Observações sobre o núcleo..." {...field} />
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
                  <FormLabel className="cursor-pointer">Núcleo Ativo</FormLabel>
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
