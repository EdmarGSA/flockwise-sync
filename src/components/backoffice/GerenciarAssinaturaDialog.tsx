import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface Props {
  integradoId: string;
  nomeGranja: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

interface PlanoOpt { id: string; codigo: string; nome: string }
interface AddonOpt { id: string; codigo: string; nome: string; preco_brl: number }
interface AddonAtivo { addon_id: string; ativo: boolean }

export default function GerenciarAssinaturaDialog({
  integradoId,
  nomeGranja,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planos, setPlanos] = useState<PlanoOpt[]>([]);
  const [addons, setAddons] = useState<AddonOpt[]>([]);
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);
  const [planoId, setPlanoId] = useState<string>("");
  const [status, setStatus] = useState<string>("trial");
  const [galpoesContratados, setGalpoesContratados] = useState<number>(0);
  const [venceEm, setVenceEm] = useState<string>("");
  const [addonsAtivos, setAddonsAtivos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [planosRes, addonsRes, assinRes] = await Promise.all([
        supabase.from("planos").select("id, codigo, nome").eq("ativo", true).order("ordem"),
        supabase
          .from("planos_addons")
          .select("id, codigo, nome, preco_brl")
          .eq("ativo", true)
          .order("ordem"),
        supabase
          .from("assinaturas")
          .select("id, plano_id, status, galpoes_contratados, vence_em")
          .eq("integrado_id", integradoId)
          .maybeSingle(),
      ]);
      setPlanos((planosRes.data as PlanoOpt[]) ?? []);
      setAddons((addonsRes.data as AddonOpt[]) ?? []);

      if (assinRes.data) {
        setAssinaturaId(assinRes.data.id);
        setPlanoId(assinRes.data.plano_id);
        setStatus(assinRes.data.status);
        setGalpoesContratados(assinRes.data.galpoes_contratados ?? 0);
        setVenceEm(
          assinRes.data.vence_em
            ? new Date(assinRes.data.vence_em).toISOString().slice(0, 10)
            : "",
        );
        const { data: aa } = await supabase
          .from("assinaturas_addons")
          .select("addon_id, ativo")
          .eq("assinatura_id", assinRes.data.id);
        const map: Record<string, boolean> = {};
        for (const r of (aa as AddonAtivo[]) ?? []) {
          map[r.addon_id] = r.ativo;
        }
        setAddonsAtivos(map);
      } else {
        setAssinaturaId(null);
        setPlanoId(planosRes.data?.[0]?.id ?? "");
        setStatus("trial");
        setGalpoesContratados(0);
        setVenceEm("");
        setAddonsAtivos({});
      }
      setLoading(false);
    })();
  }, [open, integradoId]);

  const toggleAddon = (id: string, v: boolean) => {
    setAddonsAtivos((m) => ({ ...m, [id]: v }));
  };

  const salvar = async () => {
    if (!planoId) {
      toast.error("Selecione um plano");
      return;
    }
    setSaving(true);
    try {
      let aid = assinaturaId;
      const payload = {
        plano_id: planoId,
        status: status as any,
        galpoes_contratados: galpoesContratados,
        vence_em: venceEm ? new Date(venceEm).toISOString() : null,
      };

      if (aid) {
        const { error } = await supabase.from("assinaturas").update(payload).eq("id", aid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("assinaturas")
          .insert({ ...payload, integrado_id: integradoId })
          .select("id")
          .single();
        if (error) throw error;
        aid = data.id;
      }

      // Upsert addons (insert or update each)
      for (const addon of addons) {
        const ativo = !!addonsAtivos[addon.id];
        const { data: existing } = await supabase
          .from("assinaturas_addons")
          .select("id")
          .eq("assinatura_id", aid!)
          .eq("addon_id", addon.id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("assinaturas_addons")
            .update({ ativo })
            .eq("id", existing.id);
        } else if (ativo) {
          await supabase
            .from("assinaturas_addons")
            .insert({ assinatura_id: aid!, addon_id: addon.id, ativo: true, quantidade: 1 });
        }
      }

      toast.success("Assinatura atualizada");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assinatura — {nomeGranja}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={planoId} onValueChange={setPlanoId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Galpões contratados</Label>
                <Input
                  type="number"
                  min={0}
                  value={galpoesContratados}
                  onChange={(e) => setGalpoesContratados(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vence em</Label>
                <Input type="date" value={venceEm} onChange={(e) => setVenceEm(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block">Add-ons</Label>
              <div className="space-y-2">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div>
                      <div className="text-sm font-medium">{a.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.preco_brl.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    </div>
                    <Switch
                      checked={!!addonsAtivos[a.id]}
                      onCheckedChange={(v) => toggleAddon(a.id, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
