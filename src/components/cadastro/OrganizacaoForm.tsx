import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Search, Loader2 } from "lucide-react";

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// Schema for ViaCEP response validation
const viacepSchema = z.object({
  cep: z.string().max(10),
  logradouro: z.string().max(200).optional().default(""),
  complemento: z.string().max(100).optional().default(""),
  bairro: z.string().max(100).optional().default(""),
  localidade: z.string().max(100).optional().default(""),
  uf: z.string().max(2).optional().default(""),
  erro: z.boolean().optional(),
});

// Schema for BrasilAPI CNPJ response validation
const brasilApiSchema = z.object({
  razao_social: z.string().max(200).optional().default(""),
  nome_fantasia: z.string().max(200).nullable().optional(),
  cep: z.string().max(10).optional().default(""),
  logradouro: z.string().max(200).optional().default(""),
  numero: z.string().max(20).optional().default(""),
  complemento: z.string().max(100).nullable().optional(),
  bairro: z.string().max(100).optional().default(""),
  municipio: z.string().max(100).optional().default(""),
  uf: z.string().max(2).optional().default(""),
  ddd_telefone_1: z.string().max(20).nullable().optional(),
  email: z.string().max(100).nullable().optional(),
});

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  ativo: z.boolean().default(true),
});

interface OrganizacaoFormProps {
  integradoId: string;
  organizacao?: any;
  onSuccess: () => void;
  onCancel?: () => void;
}

const OrganizacaoForm = ({ integradoId, organizacao, onSuccess, onCancel }: OrganizacaoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const isEditing = !!organizacao;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: organizacao?.nome || "",
      cnpj: organizacao?.cnpj || "",
      inscricao_estadual: organizacao?.inscricao_estadual || "",
      telefone: organizacao?.telefone || "",
      email: organizacao?.email || "",
      endereco: organizacao?.endereco || "",
      cidade: organizacao?.cidade || "",
      estado: organizacao?.estado || "",
      cep: organizacao?.cep || "",
      ativo: organizacao?.ativo ?? true,
    },
  });

  // Format CNPJ
  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 14);
    return cleaned
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Format CEP
  const formatCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    return cleaned.replace(/^(\d{5})(\d)/, '$1-$2');
  };

  // Format phone
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cleaned
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  // Fetch CEP data
  const fetchCEP = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const rawData = await response.json();
      const result = viacepSchema.safeParse(rawData);
      
      if (!result.success || result.data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      const data = result.data;
      if (data.logradouro) {
        form.setValue('endereco', `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}`);
      }
      if (data.localidade) form.setValue('cidade', data.localidade);
      if (data.uf) form.setValue('estado', data.uf);
      
      toast.success("Endereço preenchido automaticamente");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  }, [form]);

  // Fetch CNPJ data
  const fetchCNPJ = useCallback(async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setLoadingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      
      if (!response.ok) {
        toast.error("CNPJ não encontrado");
        return;
      }
      
      const rawData = await response.json();
      const result = brasilApiSchema.safeParse(rawData);
      
      if (!result.success) {
        toast.error("Dados do CNPJ inválidos");
        return;
      }

      const data = result.data;
      const nome = data.nome_fantasia || data.razao_social || '';
      if (nome) form.setValue('nome', nome);
      
      if (data.cep) {
        form.setValue('cep', formatCEP(data.cep));
      }
      
      let endereco = data.logradouro || '';
      if (data.numero) endereco += `, ${data.numero}`;
      if (data.complemento) endereco += ` - ${data.complemento}`;
      if (data.bairro) endereco += `, ${data.bairro}`;
      if (endereco) form.setValue('endereco', endereco);
      
      if (data.municipio) form.setValue('cidade', data.municipio);
      if (data.uf) form.setValue('estado', data.uf);
      
      if (data.ddd_telefone_1) {
        form.setValue('telefone', formatPhone(data.ddd_telefone_1));
      }
      
      if (data.email) form.setValue('email', data.email.toLowerCase());
      
      toast.success("Dados da empresa preenchidos automaticamente");
    } catch (error) {
      toast.error("Erro ao buscar dados do CNPJ");
    } finally {
      setLoadingCnpj(false);
    }
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    if (isEditing) {
      const { error } = await supabase
        .from('organizacoes')
        .update(values)
        .eq('id', organizacao.id);

      if (error) {
        console.error(error);
        toast({ title: "Erro ao atualizar", variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from('organizacoes').insert({
        ...values,
        integrado_id: integradoId,
      } as any);

      if (error) {
        console.error(error);
        toast({ title: "Erro ao salvar", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* CNPJ with auto-fetch */}
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input 
                      placeholder="00.000.000/0000-00" 
                      {...field}
                      onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchCNPJ(field.value || '')}
                    disabled={loadingCnpj || (field.value?.replace(/\D/g, '').length !== 14)}
                    className="shrink-0"
                  >
                    {loadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nome */}
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da organização" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Row: IE + Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="inscricao_estadual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inscrição Estadual</FormLabel>
                  <FormControl>
                    <Input placeholder="Inscrição Estadual" {...field} />
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
                    <Input 
                      placeholder="(00) 00000-0000" 
                      {...field}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CEP with auto-fetch */}
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input 
                      placeholder="00000-000" 
                      {...field}
                      onChange={(e) => field.onChange(formatCEP(e.target.value))}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchCEP(field.value || '')}
                    disabled={loadingCep || (field.value?.replace(/\D/g, '').length !== 8)}
                    className="shrink-0"
                  >
                    {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Endereço */}
          <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input placeholder="Endereço completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Row: Cidade + Estado */}
          <div className="grid grid-cols-2 gap-4">
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
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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

          {/* Ativo switch */}
          <FormField
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 pt-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0 cursor-pointer">Organização ativa</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? "Atualizar" : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default OrganizacaoForm;
