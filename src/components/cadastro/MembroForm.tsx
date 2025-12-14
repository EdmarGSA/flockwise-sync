import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  full_name: z.string().min(1, "Nome é obrigatório"),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().default("integrado"),
  roles: z.array(z.string()).default([]),
});

interface MembroFormProps {
  onSuccess: () => void;
}

const rolesOptions = [
  { value: "admin", label: "Administrador" },
  { value: "integrado", label: "Integrado" },
  { value: "veterinario", label: "Veterinário" },
  { value: "tecnico", label: "Técnico" },
  { value: "comprador", label: "Comprador" },
  { value: "conferente", label: "Conferente" },
];

const MembroForm = ({ onSuccess }: MembroFormProps) => {
  const [loading, setLoading] = useState(false);

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
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: values.full_name,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar usuário");
        setLoading(false);
        return;
      }

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          company_name: values.company_name || null,
          phone: values.phone || null,
          role: values.role,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Assign roles
      if (values.roles.length > 0) {
        const roleInserts = values.roles.map((role) => ({
          user_id: authData.user!.id,
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

  const selectedRoles = form.watch("roles");

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
                  <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                </FormControl>
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
