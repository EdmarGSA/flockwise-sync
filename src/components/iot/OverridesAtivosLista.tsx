import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hand, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OverrideRow {
  id: string;
  canal_id: string;
  estado_forcado: string;
  intensidade_pct: number | null;
  motivo: string | null;
  ate_quando: string;
  canal_nome?: string;
  dispositivo_nome?: string;
}

export function OverridesAtivosLista() {
  const { integradoId } = useIntegradoId();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OverrideRow[]>([]);

  const fetch = async () => {
    if (!integradoId) return;
    setLoading(true);
    const { data } = await supabase
      .from("override_iluminacao_canal")
      .select("*, canais_dispositivo!inner(nome, dispositivos_iot!inner(nome))")
      .eq("integrado_id", integradoId)
      .gt("ate_quando", new Date().toISOString())
      .order("ate_quando");
    setItems(
      ((data as any[]) || []).map((r) => ({
        ...r,
        canal_nome: r.canais_dispositivo?.nome,
        dispositivo_nome: r.canais_dispositivo?.dispositivos_iot?.nome,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [integradoId]);

  const encerrar = async (id: string) => {
    const { error } = await supabase.from("override_iluminacao_canal").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Override encerrado");
    fetch();
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Hand className="w-4 h-4 text-amber-600" />
          Overrides ativos
          {items.length > 0 && <Badge variant="outline">{items.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum override manual ativo no momento.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((o) => (
              <li key={o.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                <div className="flex-1">
                  <div className="font-medium">
                    {o.dispositivo_nome} · {o.canal_nome}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Forçado <strong>{o.estado_forcado}</strong>
                    {o.intensidade_pct != null && ` (${o.intensidade_pct}%)`} até{" "}
                    {format(new Date(o.ate_quando), "dd/MM HH:mm", { locale: ptBR })}
                    {o.motivo && ` — ${o.motivo}`}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => encerrar(o.id)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
