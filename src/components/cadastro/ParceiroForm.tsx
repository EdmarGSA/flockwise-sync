import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, Loader2, Building2, User, Tractor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formSchema = z.object({
  tipo_cadastro: z.enum(['cliente', 'fornecedor', 'ambos']),
  tipo_pessoa: z.enum(['pf', 'pj', 'produtor_rural']),
  cpf_cnpj: z.string().min(11, "CPF/CNPJ inválido"),
  razao_social_nome: z.string().min(2, "Nome é obrigatório"),
  nome_fantasia: z.string().optional(),
  rg: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  inscricao_produtor: z.string().optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  codigo_ibge: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ParceiroFormProps {
  integradoId: string;
  initialData?: Partial<FormValues>;
  onSuccess: () => void;
  onCancel: () => void;
}

const ParceiroForm = ({ integradoId, initialData, onSuccess, onCancel }: ParceiroFormProps) => {
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_cadastro: 'cliente',
      tipo_pessoa: 'pj',
      cpf_cnpj: '',
      razao_social_nome: '',
      nome_fantasia: '',
      rg: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      inscricao_produtor: '',
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
      codigo_ibge: '',
      observacoes: '',
      ...initialData,
    },
  });

  const tipoPessoa = form.watch('tipo_pessoa');

  const formatCpfCnpj = (value: string, tipo: string) => {
    const numbers = value.replace(/\D/g, '');
    if (tipo === 'pf') {
      return numbers.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCep = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Zod schemas for external API response validation
  const viacepSchema = z.object({
    logradouro: z.string().max(255).optional().nullable(),
    bairro: z.string().max(100).optional().nullable(),
    localidade: z.string().max(100).optional().nullable(),
    uf: z.string().max(2).optional().nullable(),
    ibge: z.string().max(7).optional().nullable(),
    erro: z.boolean().optional()
  });

  const brasilApiSchema = z.object({
    razao_social: z.string().max(255).optional().nullable(),
    nome_fantasia: z.string().max(255).optional().nullable(),
    email: z.string().max(255).optional().nullable(),
    ddd_telefone_1: z.string().max(20).optional().nullable(),
    cep: z.string().max(10).optional().nullable(),
    logradouro: z.string().max(255).optional().nullable(),
    numero: z.string().max(20).optional().nullable(),
    complemento: z.string().max(100).optional().nullable(),
    bairro: z.string().max(100).optional().nullable(),
    municipio: z.string().max(100).optional().nullable(),
    uf: z.string().max(2).optional().nullable(),
    codigo_municipio_ibge: z.union([z.string(), z.number()]).optional().nullable()
  });

  const searchCep = async () => {
    const cep = form.getValues('cep')?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }

    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const rawData = await response.json();

      // Validate response structure
      const result = viacepSchema.safeParse(rawData);
      if (!result.success) {
        console.error('CEP validation error:', result.error);
        toast.error("Resposta inválida da API de CEP");
        return;
      }

      const data = result.data;
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      form.setValue('logradouro', data.logradouro || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.localidade || '');
      form.setValue('estado', data.uf || '');
      form.setValue('codigo_ibge', data.ibge || '');
      toast.success("Endereço encontrado!");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setSearchingCep(false);
    }
  };

  const searchCnpj = async () => {
    const cnpj = form.getValues('cpf_cnpj')?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }

    setSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        toast.error("CNPJ não encontrado");
        return;
      }

      const rawData = await response.json();

      // Validate response structure
      const result = brasilApiSchema.safeParse(rawData);
      if (!result.success) {
        console.error('CNPJ validation error:', result.error);
        toast.error("Resposta inválida da API de CNPJ");
        return;
      }

      const data = result.data;

      form.setValue('razao_social_nome', data.razao_social || '');
      form.setValue('nome_fantasia', data.nome_fantasia || '');
      form.setValue('telefone', data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : '');
      form.setValue('email', data.email?.toLowerCase() || '');
      form.setValue('cep', data.cep?.replace(/\D/g, '') || '');
      form.setValue('logradouro', data.logradouro || '');
      form.setValue('numero', data.numero || '');
      form.setValue('complemento', data.complemento || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.municipio || '');
      form.setValue('estado', data.uf || '');
      form.setValue('codigo_ibge', data.codigo_municipio_ibge?.toString() || '');

      toast.success("Dados do CNPJ encontrados!");
    } catch (error) {
      toast.error("Erro ao buscar CNPJ");
    } finally {
      setSearchingCnpj(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('parceiros')
        .insert({
          integrado_id: integradoId,
          tipo_cadastro: values.tipo_cadastro,
          tipo_pessoa: values.tipo_pessoa,
          cpf_cnpj: values.cpf_cnpj.replace(/\D/g, ''),
          razao_social_nome: values.razao_social_nome,
          nome_fantasia: values.nome_fantasia || null,
          rg: values.rg || null,
          inscricao_estadual: values.inscricao_estadual || null,
          inscricao_municipal: values.inscricao_municipal || null,
          inscricao_produtor: values.inscricao_produtor || null,
          telefone: values.telefone || null,
          celular: values.celular || null,
          email: values.email || null,
          cep: values.cep?.replace(/\D/g, '') || null,
          logradouro: values.logradouro || null,
          numero: values.numero || null,
          complemento: values.complemento || null,
          bairro: values.bairro || null,
          cidade: values.cidade || null,
          estado: values.estado || null,
          codigo_ibge: values.codigo_ibge || null,
          observacoes: values.observacoes || null,
        });

      if (error) throw error;

      toast.success("Parceiro cadastrado com sucesso!");
      onSuccess();
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        toast.error("CPF/CNPJ já cadastrado");
      } else {
        toast.error("Erro ao cadastrar parceiro: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de Cadastro */}
        <FormField
          control={form.control}
          name="tipo_cadastro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cadastro</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cliente" id="cliente" />
                    <Label htmlFor="cliente">Cliente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fornecedor" id="fornecedor" />
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ambos" id="ambos" />
                    <Label htmlFor="ambos">Ambos</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de Pessoa */}
        <FormField
          control={form.control}
          name="tipo_pessoa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Pessoa</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pf" id="pf" />
                    <Label htmlFor="pf" className="flex items-center gap-1">
                      <User className="h-4 w-4" /> Pessoa Física
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pj" id="pj" />
                    <Label htmlFor="pj" className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" /> Pessoa Jurídica
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="produtor_rural" id="produtor_rural" />
                    <Label htmlFor="produtor_rural" className="flex items-center gap-1">
                      <Tractor className="h-4 w-4" /> Produtor Rural
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dados de Identificação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cpf_cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tipoPessoa === 'pf' ? 'CPF' : 'CNPJ'}</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={tipoPessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                      onChange={(e) => field.onChange(formatCpfCnpj(e.target.value, tipoPessoa))}
                      maxLength={tipoPessoa === 'pf' ? 14 : 18}
                    />
                  </FormControl>
                  {(tipoPessoa === 'pj' || tipoPessoa === 'produtor_rural') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={searchCnpj}
                      disabled={searchingCnpj}
                    >
                      {searchingCnpj ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {tipoPessoa === 'pf' && (
            <FormField
              control={form.control}
              name="rg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RG</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="RG" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Nome / Razão Social */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="razao_social_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tipoPessoa === 'pf' ? 'Nome Completo' : 'Razão Social'}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={tipoPessoa === 'pf' ? 'Nome completo' : 'Razão social'} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {tipoPessoa !== 'pf' && (
            <FormField
              control={form.control}
              name="nome_fantasia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome fantasia" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Inscrições */}
        {tipoPessoa !== 'pf' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="inscricao_estadual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inscrição Estadual</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Inscrição estadual" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inscricao_municipal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inscrição Municipal</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Inscrição municipal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tipoPessoa === 'produtor_rural' && (
              <FormField
                control={form.control}
                name="inscricao_produtor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição de Produtor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Inscrição de produtor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Contato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="(00) 0000-0000"
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    maxLength={15}
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
                    placeholder="(00) 00000-0000"
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    maxLength={15}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="email@exemplo.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Endereço */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Endereço</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="cep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00000-000"
                        onChange={(e) => field.onChange(formatCep(e.target.value))}
                        maxLength={9}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={searchCep}
                      disabled={searchingCep}
                    >
                      {searchingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logradouro"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Logradouro</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Rua, Avenida, etc." />
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
                    <Input {...field} placeholder="Nº" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="complemento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Apto, Sala, etc." />
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
                    <Input {...field} placeholder="Bairro" />
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
                    <Input {...field} placeholder="Cidade" />
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
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="UF" maxLength={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Observações adicionais..." rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cadastrar
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ParceiroForm;
