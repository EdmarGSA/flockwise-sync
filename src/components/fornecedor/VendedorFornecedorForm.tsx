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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';

const vendedorSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  regiao: z.string().optional(),
  codigo_vendedor: z.string().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional(),
  gerarAcesso: z.boolean().default(false),
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
  const [creatingUser, setCreatingUser] = useState(false);
  const isEditing = !!vendedor;
  const hasAccess = !!vendedor?.user_id;

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
      gerarAcesso: false,
    },
  });

  const gerarAcesso = form.watch('gerarAcesso');
  const emailValue = form.watch('email');

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
        gerarAcesso: false,
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
        gerarAcesso: false,
      });
    }
  }, [vendedor, form, open]);

  const createUserAccess = async (vendedorId: string, email: string, nome: string) => {
    setCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-salesperson-user', {
        body: {
          vendedor_fornecedor_id: vendedorId,
          email: email,
          nome: nome,
          fornecedor_global_id: fornecedorGlobalId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `Acesso criado! Email: ${email} | Senha: Vend123#`,
        { duration: 10000 }
      );
      return true;
    } catch (error: any) {
      console.error('Erro ao criar acesso:', error);
      toast.error(error.message || 'Erro ao criar acesso ao portal');
      return false;
    } finally {
      setCreatingUser(false);
    }
  };

  const onSubmit = async (data: VendedorFormData) => {
    // Validar email se gerar acesso estiver ativo
    if (data.gerarAcesso && !data.email) {
      form.setError('email', { message: 'Email é obrigatório para gerar acesso ao portal' });
      return;
    }

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

      let vendedorId = vendedor?.id;

      if (isEditing) {
        const { error } = await supabase
          .from('vendedores_fornecedor')
          .update(payload)
          .eq('id', vendedor.id);
        if (error) throw error;
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        const { data: insertData, error } = await supabase
          .from('vendedores_fornecedor')
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        vendedorId = insertData.id;
        toast.success('Vendedor cadastrado com sucesso!');
      }

      // Se gerar acesso estiver ativo, criar usuário
      if (data.gerarAcesso && vendedorId && data.email) {
        await createUserAccess(vendedorId, data.email, data.nome);
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
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Editar Vendedor' : 'Novo Vendedor'}
            {hasAccess && (
              <Badge variant="default" className="text-xs">
                <KeyRound className="h-3 w-3 mr-1" />
                Com Acesso
              </Badge>
            )}
          </DialogTitle>
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
                    <FormLabel>
                      E-mail {gerarAcesso && <span className="text-destructive">*</span>}
                    </FormLabel>
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

            {/* Switch para gerar acesso ao portal - apenas se não tem acesso ainda */}
            {!hasAccess && (
              <FormField
                control={form.control}
                name="gerarAcesso"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="cursor-pointer flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Gerar Acesso ao Portal
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Cria login com senha padrão Vend123#
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {hasAccess && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                <p className="text-sm text-primary flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Este vendedor já possui acesso ao portal
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || creatingUser}>
                {(loading || creatingUser) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {creatingUser ? 'Criando acesso...' : 'Salvando...'}
                  </>
                ) : (
                  isEditing ? 'Salvar' : 'Cadastrar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
