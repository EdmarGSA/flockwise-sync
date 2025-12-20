import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MembroModulosSection from "./MembroModulosSection";
import { useAuth } from "@/hooks/useAuth";
import type { NivelAcesso } from "@/hooks/useModuleAccess";

interface MembroEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membro: any;
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

const MembroEditDialog = ({ open, onOpenChange, membro, onSuccess }: MembroEditDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("integrado");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [moduloChanges, setModuloChanges] = useState<{ modulo_id: string; permitido: boolean; nivel_acesso: NivelAcesso }[]>([]);
  const [integradoId, setIntegradoId] = useState<string>("");

  useEffect(() => {
    if (membro) {
      setFullName(membro.full_name || "");
      setCompanyName(membro.company_name || "");
      setPhone(membro.phone || "");
      setRole(membro.role || "integrado");
      setSelectedRoles(membro.roles || []);
      setModuloChanges([]);
    }
  }, [membro]);

  useEffect(() => {
    const fetchIntegradoId = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("integrado_id")
        .eq("id", user.id)
        .single();
      if (data?.integrado_id) {
        setIntegradoId(data.integrado_id);
      }
    };
    fetchIntegradoId();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membro) return;

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          company_name: companyName || null,
          phone: phone || null,
          role: role,
        })
        .eq("id", membro.id);

      if (profileError) {
        toast.error("Erro ao atualizar perfil");
        setLoading(false);
        return;
      }

      // Update roles - delete existing and insert new
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", membro.id);

      if (deleteError) {
        console.error("Delete roles error:", deleteError);
      }

      if (selectedRoles.length > 0) {
        const roleInserts = selectedRoles.map((r) => ({
          user_id: membro.id,
          role: r as "admin" | "integrado" | "veterinario" | "tecnico" | "comprador" | "conferente",
        }));

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(roleInserts);

        if (insertError) {
          console.error("Insert roles error:", insertError);
        }
      }

      // Handle module permission changes
      if (moduloChanges.length > 0) {
        // Delete existing user_modulos for this user
        await supabase
          .from("user_modulos" as any)
          .delete()
          .eq("user_id", membro.id);

        // Insert new permissions
        const moduloInserts = moduloChanges.map((m) => ({
          user_id: membro.id,
          modulo_id: m.modulo_id,
          permitido: m.permitido,
          nivel_acesso: m.nivel_acesso,
          integrado_id: integradoId || membro.integrado_id,
        }));

        const { error: moduloError } = await supabase
          .from("user_modulos" as any)
          .insert(moduloInserts);

        if (moduloError) {
          console.error("Insert modulos error:", moduloError);
        }
      }

      toast.success("Membro atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar membro");
    }

    setLoading(false);
  };

  const handleRoleToggle = (roleValue: string) => {
    if (selectedRoles.includes(roleValue)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleValue));
    } else {
      setSelectedRoles([...selectedRoles, roleValue]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do membro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Empresa</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <Label>Função Principal</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {rolesOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Papéis de Acesso</Label>
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg mt-2">
              {rolesOptions.map((roleOpt) => (
                <div key={roleOpt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${roleOpt.value}`}
                    checked={selectedRoles.includes(roleOpt.value)}
                    onCheckedChange={() => handleRoleToggle(roleOpt.value)}
                  />
                  <label
                    htmlFor={`role-${roleOpt.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {roleOpt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label>Módulos Permitidos</Label>
            {membro && (
              <MembroModulosSection
                membroId={membro.id}
                membroRoles={selectedRoles}
                integradoId={integradoId || membro.integrado_id}
                onModulosChange={setModuloChanges}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MembroEditDialog;
