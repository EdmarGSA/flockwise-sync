import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const formSchema = z.object({
  tipo_pessoa: z.enum(['fisica', 'juridica']),
  cpf_cnpj: z.string().min(11, 'CPF/CNPJ obrigatório'),
  razao_social_nome: z.string().min(2, 'Nome/Razão Social obrigatório'),
  nome_fantasia: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  limite_credito: z.number().min(0).default(0),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export interface ClienteFornecedor {
  id: string;
  fornecedor_global_id: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  razao_social_nome: string;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  codigo_ibge: string | null;
  limite_credito: number;
  saldo_credito: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ClienteFornecedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: ClienteFornecedor | null;
  fornecedorGlobalId: string;
  onSuccess: () => void;
}

export function ClienteFornecedorForm({
  open,
  onOpenChange,
  cliente,
  fornecedorGlobalId,
  onSuccess,
}: ClienteFornecedorFormProps) {
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const isEditing = !!cliente;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_pessoa: 'juridica',
      cpf_cnpj: '',
      razao_social_nome: '',
      nome_fantasia: '',
      inscricao_estadual: '',
      telefone: '',
      celular: '',
      email: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      limite_credito: 0,
      observacoes: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (cliente) {
      form.reset({
        tipo_pessoa: cliente.tipo_pessoa as 'fisica' | 'juridica',
        cpf_cnpj: cliente.cpf_cnpj || '',
        razao_social_nome: cliente.razao_social_nome || '',
        nome_fantasia: cliente.nome_fantasia || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        telefone: cliente.telefone || '',
        celular: cliente.celular || '',
        email: cliente.email || '',
        cep: cliente.cep || '',
        logradouro: cliente.logradouro || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        limite_credito: cliente.limite_credito || 0,
        observacoes: cliente.observacoes || '',
        ativo: cliente.ativo,
      });
    } else {
      form.reset({
        tipo_pessoa: 'juridica',
        cpf_cnpj: '',
        razao_social_nome: '',
        nome_fantasia: '',
        inscricao_estadual: '',
        telefone: '',
        celular: '',
        email: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        limite_credito: 0,
        observacoes: '',
        ativo: true,
      });
    }
  }, [cliente, open, form]);

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2');
  };

  const searchCep = async () => {
    const cep = form.getValues('cep')?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return;
    }

    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      form.setValue('logradouro', data.logradouro || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.localidade || '');
      form.setValue('estado', data.uf || '');
      toast.success('Endereço encontrado!');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setSearchingCep(false);
    }
  };

  const searchCnpj = async () => {
    const cnpj = form.getValues('cpf_cnpj')?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    setSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await response.json();

      if (data.message) {
        toast.error('CNPJ não encontrado');
        return;
      }

      form.setValue('razao_social_nome', data.razao_social || '');
      form.setValue('nome_fantasia', data.nome_fantasia || '');
      form.setValue('telefone', data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : '');
      form.setValue('email', data.email || '');
      form.setValue('cep', data.cep ? formatCep(data.cep) : '');
      form.setValue('logradouro', data.logradouro || '');
      form.setValue('numero', data.numero || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.municipio || '');
      form.setValue('estado', data.uf || '');
      toast.success('Dados do CNPJ carregados!');
    } catch {
      toast.error('Erro ao buscar CNPJ');
    } finally {
      setSearchingCnpj(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        fornecedor_global_id: fornecedorGlobalId,
        tipo_pessoa: data.tipo_pessoa,
        cpf_cnpj: data.cpf_cnpj.replace(/\D/g, ''),
        razao_social_nome: data.razao_social_nome,
        nome_fantasia: data.nome_fantasia || null,
        inscricao_estadual: data.inscricao_estadual || null,
        telefone: data.telefone || null,
        celular: data.celular || null,
        email: data.email || null,
        cep: data.cep?.replace(/\D/g, '') || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        limite_credito: data.limite_credito || 0,
        observacoes: data.observacoes || null,
        ativo: data.ativo,
      };

      if (isEditing && cliente) {
        const { error } = await supabase
          .from('clientes_fornecedor')
          .update(payload)
          .eq('id', cliente.id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('clientes_fornecedor')
          .insert(payload);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe um cliente com este CPF/CNPJ');
            return;
          }
          throw error;
        }
        toast.success('Cliente cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo Pessoa */}
            <FormField
              control={form.control}
              name="tipo_pessoa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Pessoa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CPF/CNPJ */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="cpf_cnpj"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {form.watch('tipo_pessoa') === 'fisica' ? 'CPF' : 'CNPJ'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(formatCpfCnpj(e.target.value))}
                        maxLength={18}
                        placeholder={form.watch('tipo_pessoa') === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('tipo_pessoa') === 'juridica' && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8"
                  onClick={searchCnpj}
                  disabled={searchingCnpj}
                >
                  {searchingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {/* Nome/Razão Social */}
            <FormField
              control={form.control}
              name="razao_social_nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('tipo_pessoa') === 'fisica' ? 'Nome Completo' : 'Razão Social'}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nome Fantasia */}
            {form.watch('tipo_pessoa') === 'juridica' && (
              <FormField
                control={form.control}
                name="nome_fantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Inscrição Estadual */}
            {form.watch('tipo_pessoa') === 'juridica' && (
              <FormField
                control={form.control}
                name="inscricao_estadual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Contatos */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        maxLength={15}
                        placeholder="(00) 0000-0000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="celular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        maxLength={15}
                        placeholder="(00) 00000-0000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@exemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Endereço */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem className="w-36">
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(formatCep(e.target.value))}
                        maxLength={9}
                        placeholder="00000-000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-8"
                onClick={searchCep}
                disabled={searchingCep}
              >
                {searchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="logradouro"
                render={({ field }) => (
                  <FormItem className="col-span-3">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UF_OPTIONS.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Limite de Crédito */}
            <FormField
              control={form.control}
              name="limite_credito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de Crédito (R$)</FormLabel>
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

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Observações gerais sobre o cliente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Cliente Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Clientes inativos não aparecem nas listagens
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
