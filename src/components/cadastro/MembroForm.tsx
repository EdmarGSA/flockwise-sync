import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const translateAuthError = (message: string): string => {
  const errorMap: Record<string, string> = {
    "Password should contain at least one character of each": "A senha deve conter letras minúsculas, maiúsculas e números",
    "Password is known to be weak and easy to guess": "Esta senha é muito fraca e fácil de adivinhar",
    "already registered": "Este email já está cadastrado",
    "user already registered": "Usuário já cadastrado",
    "invalid email": "Email inválido",
    "password should be at least 6 characters": "Senha deve ter no mínimo 6 caracteres",
    "email rate limit exceeded": "Limite de tentativas excedido. Aguarde alguns minutos",
    "signup requires a valid password": "É necessário informar uma senha válida",
    "unable to validate email address": "Não foi possível validar o email",
    "email not confirmed": "Email não confirmado",
  };
  
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }
  return "Erro ao cadastrar. Tente novamente.";
};

// Password strength checker with requirements
const getPasswordStrength = (password: string): { 
  requirements: { met: boolean; text: string }[];
  allMet: boolean;
} => {
  const requirements = [
    { met: password.length >= 8, text: 'Mínimo 8 caracteres' },
    { met: /[a-z]/.test(password), text: 'Letra minúscula (a-z)' },
    { met: /[A-Z]/.test(password), text: 'Letra maiúscula (A-Z)' },
    { met: /[0-9]/.test(password), text: 'Número (0-9)' },
  ];
  
  return { requirements, allMet: requirements.every(r => r.met) };
};

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  full_name: z.string().min(1, "Nome é obrigatório"),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().default("integrado"),
  roles: z.array(z.string()).default([]),
  parceiro_id: z.string().optional(),
});

interface MembroFormProps {
  onSuccess: () => void;
}

interface Parceiro {
  id: string;
  razao_social_nome: string;
  cpf_cnpj: string | null;
}

const rolesOptions = [
  { value: "admin", label: "Administrador" },
  { value: "integrado", label: "Integrado" },
  { value: "veterinario", label: "Veterinário" },
  { value: "tecnico", label: "Técnico" },
  { value: "comprador", label: "Comprador" },
  { value: "conferente", label: "Conferente" },
  { value: "criador", label: "Criador" },
  { value: "fornecedor", label: "Fornecedor" },
];

const MembroForm = ({ onSuccess }: MembroFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminIntegradoId, setAdminIntegradoId] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loadingParceiros, setLoadingParceiros] = useState(false);
  
  const passwordStrength = getPasswordStrength(passwordValue);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      company_name: "",
      phone: "",
      role: "integrado",
      roles: ["integrado"],
      parceiro_id: "",
    },
  });

  // Buscar integrado_id do admin atual
  useEffect(() => {
    const fetchAdminIntegradoId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('integrado_id')
          .eq('id', user.id)
          .single();
        setAdminIntegradoId(profile?.integrado_id || user.id);
      }
    };
    fetchAdminIntegradoId();
  }, []);

  const selectedRoles = form.watch("roles");
  const roleIncludesFornecedor = selectedRoles.includes("fornecedor");

  // Buscar parceiros fornecedores quando role incluir fornecedor
  useEffect(() => {
    const fetchParceiros = async () => {
      if (!roleIncludesFornecedor || !adminIntegradoId) {
        setParceiros([]);
        return;
      }
      
      setLoadingParceiros(true);
      const { data, error } = await supabase
        .from('parceiros')
        .select('id, razao_social_nome, cpf_cnpj')
        .in('tipo_cadastro', ['fornecedor', 'ambos'])
        .eq('ativo', true)
        .eq('integrado_id', adminIntegradoId)
        .order('razao_social_nome');
      
      if (!error && data) {
        setParceiros(data);
      }
      setLoadingParceiros(false);
    };
    
    fetchParceiros();
  }, [roleIncludesFornecedor, adminIntegradoId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // Create user via Edge Function (does NOT change current session)
      // Passa o integrado_id do admin para vincular o novo membro à organização
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          integrado_id: adminIntegradoId,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error(translateAuthError(error.message || "Erro ao criar usuário"));
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      const newUserId = data?.user?.id;

      if (!newUserId) {
        toast.error("Erro ao criar usuário");
        setLoading(false);
        return;
      }

      // Update profile with additional data
      const profileUpdate: Record<string, any> = {
        full_name: values.full_name,
        company_name: values.company_name || null,
        phone: values.phone || null,
        role: values.role,
      };
      
      // Vincular parceiro se role for fornecedor
      if (values.roles.includes("fornecedor") && values.parceiro_id) {
        profileUpdate.parceiro_id = values.parceiro_id;
      }
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", newUserId);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Assign roles
      if (values.roles.length > 0) {
        const roleInserts = values.roles.map((role) => ({
          user_id: newUserId,
          role: role as "admin" | "integrado" | "veterinario" | "tecnico",
        }));

        const { error: rolesError } = await supabase
          .from("user_roles")
          .insert(roleInserts);

        if (rolesError) {
          console.error("Roles insert error:", rolesError);
        }
      }

      toast.success("Membro cadastrado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar membro");
    }

    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Mínimo 8 caracteres" 
                      className="pr-10"
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        setPasswordValue(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                {passwordValue && (
                  <div className="space-y-1.5 pt-1">
                    <ul className="text-xs space-y-0.5">
                      {passwordStrength.requirements.map((req, i) => (
                        <li key={i} className={`flex items-center gap-1 ${req.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                          <span>{req.met ? '✓' : '○'}</span>
                          <span>{req.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo *</FormLabel>
              <FormControl>
                <Input placeholder="Nome do membro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da empresa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
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

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função Principal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rolesOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roles"
          render={() => (
            <FormItem>
              <FormLabel>Papéis de Acesso</FormLabel>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                {rolesOptions.map((role) => (
                  <FormField
                    key={role.value}
                    control={form.control}
                    name="roles"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(role.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, role.value]);
                              } else {
                                field.onChange(
                                  field.value?.filter((v) => v !== role.value)
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal cursor-pointer">
                          {role.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {roleIncludesFornecedor && (
          <FormField
            control={form.control}
            name="parceiro_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vincular ao Parceiro (Fornecedor) *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingParceiros ? "Carregando..." : "Selecione o parceiro"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parceiros.length === 0 && !loadingParceiros && (
                      <SelectItem value="no-partner" disabled>
                        Nenhum fornecedor cadastrado
                      </SelectItem>
                    )}
                    {parceiros.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.razao_social_nome} {p.cpf_cnpj ? `- ${p.cpf_cnpj}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule este usuário a um parceiro cadastrado como fornecedor para que ele possa acessar o Portal do Fornecedor.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar Membro"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MembroForm;
