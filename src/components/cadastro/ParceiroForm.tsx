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
import { Search, Loader2, Building2, User, Tractor, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface SupplierCredentials {
  email: string;
  password: string;
}

const ParceiroForm = ({ integradoId, initialData, onSuccess, onCancel }: ParceiroFormProps) => {
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [checkingGlobalSupplier, setCheckingGlobalSupplier] = useState(false);
  const [existingGlobalSupplier, setExistingGlobalSupplier] = useState<{ id: string; razao_social_nome: string } | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [newCredentials, setNewCredentials] = useState<SupplierCredentials | null>(null);

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
  const tipoCadastro = form.watch('tipo_cadastro');

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

  // Check if supplier already exists globally when searching CNPJ
  const checkGlobalSupplier = async (cnpj: string) => {
    if (tipoCadastro !== 'fornecedor' && tipoCadastro !== 'ambos') return;

    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setCheckingGlobalSupplier(true);
    try {
      const { data, error } = await supabase
        .from('fornecedores_globais')
        .select('id, razao_social_nome, nome_fantasia, email, telefone')
        .eq('cpf_cnpj', cleanCnpj)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingGlobalSupplier({ id: data.id, razao_social_nome: data.razao_social_nome });
        // Auto-fill form with global supplier data
        form.setValue('razao_social_nome', data.razao_social_nome);
        if (data.nome_fantasia) form.setValue('nome_fantasia', data.nome_fantasia);
        if (data.email) form.setValue('email', data.email);
        if (data.telefone) form.setValue('telefone', data.telefone);
        toast.info("Fornecedor já cadastrado no sistema - será vinculado à sua organização");
      } else {
        setExistingGlobalSupplier(null);
      }
    } catch (error) {
      console.error('Error checking global supplier:', error);
    } finally {
      setCheckingGlobalSupplier(false);
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
      // First check if supplier exists globally
      await checkGlobalSupplier(cnpj);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        toast.error("CNPJ não encontrado");
        return;
      }

      const rawData = await response.json();

      const result = brasilApiSchema.safeParse(rawData);
      if (!result.success) {
        console.error('CNPJ validation error:', result.error);
        toast.error("Resposta inválida da API de CNPJ");
        return;
      }

      const data = result.data;

      // Only fill if not already filled by global supplier
      if (!existingGlobalSupplier) {
        form.setValue('razao_social_nome', data.razao_social || '');
        form.setValue('nome_fantasia', data.nome_fantasia || '');
        form.setValue('email', data.email?.toLowerCase() || '');
      }
      
      form.setValue('telefone', data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : '');
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const isSupplier = values.tipo_cadastro === 'fornecedor' || values.tipo_cadastro === 'ambos';
      let fornecedorGlobalId: string | null = null;

      // If supplier, handle global supplier logic
      if (isSupplier) {
        if (existingGlobalSupplier) {
          // Use existing global supplier
          fornecedorGlobalId = existingGlobalSupplier.id;
        } else {
          // Create new global supplier via edge function
          if (!values.email) {
            toast.error("Email é obrigatório para cadastrar fornecedor");
            setLoading(false);
            return;
          }

          const { data: fnData, error: fnError } = await supabase.functions.invoke('create-supplier-user', {
            body: {
              cpf_cnpj: values.cpf_cnpj,
              razao_social_nome: values.razao_social_nome,
              nome_fantasia: values.nome_fantasia,
              email: values.email,
              telefone: values.telefone,
            },
          });

          if (fnError) {
            console.error('Edge function error:', fnError);
            throw new Error(fnError.message || 'Erro ao criar fornecedor');
          }

          if (!fnData.success) {
            throw new Error(fnData.message || 'Erro ao criar fornecedor');
          }

          fornecedorGlobalId = fnData.fornecedor_global_id;

          // If new user was created, show credentials
          if (fnData.is_new_user && fnData.credentials) {
            setNewCredentials(fnData.credentials);
            setCredentialsDialog(true);
          }
        }
      }

      // Create local partner record
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
          fornecedor_global_id: fornecedorGlobalId,
        });

      if (error) throw error;

      if (!credentialsDialog) {
        toast.success("Parceiro cadastrado com sucesso!");
        onSuccess();
      }
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        toast.error("CPF/CNPJ já cadastrado nesta organização");
      } else {
        toast.error("Erro ao cadastrar parceiro: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsDialogClose = () => {
    setCredentialsDialog(false);
    setNewCredentials(null);
    toast.success("Parceiro cadastrado com sucesso!");
    onSuccess();
  };

  return (
    <>
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      setExistingGlobalSupplier(null);
                    }}
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

          {/* Alert for supplier */}
          {(tipoCadastro === 'fornecedor' || tipoCadastro === 'ambos') && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cadastro de Fornecedor</AlertTitle>
              <AlertDescription>
                Ao cadastrar um fornecedor, um usuário será criado automaticamente para ele acessar o Portal do Fornecedor. 
                As credenciais serão exibidas após o cadastro.
              </AlertDescription>
            </Alert>
          )}

          {/* Existing global supplier notice */}
          {existingGlobalSupplier && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Fornecedor já existe no sistema</AlertTitle>
              <AlertDescription className="text-green-700">
                O fornecedor "{existingGlobalSupplier.razao_social_nome}" já está cadastrado globalmente.
                Ele será vinculado à sua organização sem criar um novo usuário.
              </AlertDescription>
            </Alert>
          )}

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
                        disabled={searchingCnpj || checkingGlobalSupplier}
                      >
                        {searchingCnpj || checkingGlobalSupplier ? (
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
                  <FormLabel>
                    Email 
                    {(tipoCadastro === 'fornecedor' || tipoCadastro === 'ambos') && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email" 
                      placeholder="email@exemplo.com"
                      required={tipoCadastro === 'fornecedor' || tipoCadastro === 'ambos'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Endereço */}
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

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Fornecedor Cadastrado com Sucesso
            </DialogTitle>
            <DialogDescription>
              Anote as credenciais de acesso do fornecedor ao Portal do Fornecedor.
              <strong className="block mt-2 text-destructive">
                A senha não poderá ser recuperada após fechar este diálogo!
              </strong>
            </DialogDescription>
          </DialogHeader>
          
          {newCredentials && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={newCredentials.email} readOnly className="bg-muted" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="flex items-center gap-2">
                  <Input value={newCredentials.password} readOnly className="bg-muted font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Compartilhe estas credenciais com o fornecedor de forma segura.
                  Ele poderá alterar a senha após o primeiro login.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleCredentialsDialogClose}>
              Entendi, Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ParceiroForm;