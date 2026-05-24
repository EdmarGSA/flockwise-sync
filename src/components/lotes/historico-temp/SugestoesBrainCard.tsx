import { useEffect, useState } from "react";
import { Check, X, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Sugestao {
  id: string;
  galpao_id: string;
  funcao: string;
  estado_desejado: any;
  origem: string;
  motivo: string | null;
  status: string;
  created_at: string;
}

export function SugestoesBrainCard({
  galpaoId,
  galpaoNome,
  modoAtual,
  onChange,
}: {
  galpaoId: string;
  galpaoNome: string;
  modoAtual: "off" | "shadow" | "auto";
  onChange: () => void;
}) {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comando_brain")
      .select("*")
      .eq("galpao_id", galpaoId)
      .order("created_at", { ascending: false })
      .limit(8);
    setSugestoes((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [galpaoId]);

  const mudarModo = async (novo: "off" | "shadow" | "auto") => {
    const { error } = await supabase
      .from("galpoes")
      .update({ automacao_brain: novo })
      .eq("id", galpaoId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Modo do galpão alterado para ${novo.toUpperCase()}`);
    onChange();
  };

  const aprovar = async (id: string) => {
    setActing(id);
    const { error } = await supabase
      .from("comando_brain")
      .update({ status: "aprovado", aprovado_em: new Date().toISOString() })
      .eq("id", id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Sugestão aprovada — dispatcher executará em até 15s");
    carregar();
  };

  const ignorar = async (id: string) => {
    setActing(id);
    const { error } = await supabase
      .from("comando_brain")
      .update({ status: "ignorado" })
      .eq("id", id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    carregar();
  };

  const executarAgora = async () => {
    setActing("dispatch");
    const { error } = await supabase.functions.invoke("brain-dispatcher", { body: {} });
    setActing(null);
    if (error) toast.error(error.message);
    else toast.success("Dispatcher executado");
    carregar();
  };

  const pendentes = sugestoes.filter((s) => s.status === "sugerido");
  const recentes = sugestoes.filter((s) => s.status !== "sugerido").slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span>Sugestões do Brain</span>
          <div className="flex items-center gap-2">
            <Select value={modoAtual} onValueChange={(v) => mudarModo(v as any)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="shadow">Sombra</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={executarAgora} disabled={acting === "dispatch"}>
              {acting === "dispatch" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        </CardTitle>
        <CardDescription className="text-xs">
          {modoAtual === "auto"
            ? "Brain atua sozinho neste galpão"
            : modoAtual === "shadow"
            ? "Brain só sugere — você aprova"
            : "Brain desligado"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando…</div>
        ) : pendentes.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhuma sugestão pendente.</div>
        ) : (
          pendentes.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/40 text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{s.funcao}</Badge>
                  <span className="font-mono">{s.estado_desejado?.acao ?? JSON.stringify(s.estado_desejado)}</span>
                </div>
                {s.motivo && <div className="text-muted-foreground truncate">{s.motivo}</div>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="default" className="h-7 px-2" onClick={() => aprovar(s.id)} disabled={acting === s.id}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => ignorar(s.id)} disabled={acting === s.id}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
        {recentes.length > 0 && (
          <div className="pt-2 border-t space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground">Recentes</div>
            {recentes.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">{s.funcao} → {s.estado_desejado?.acao}</span>
                <Badge variant={s.status === "confirmado" ? "secondary" : s.status === "falhou" ? "destructive" : "outline"} className="text-[10px]">
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
