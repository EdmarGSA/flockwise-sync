import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Activity, CheckCircle2, XCircle, AlertTriangle, Send, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";

interface GalpaoLinha {
  id: string;
  nome: string;
  automacao_brain: "off" | "shadow" | "auto";
}
interface ComandoRow {
  id: string;
  galpao_id: string;
  funcao: string;
  status: string;
  origem: string;
  created_at: string;
  estado_desejado: any;
  erro: string | null;
}

const STATUS_COLOR: Record<string, "secondary" | "destructive" | "outline" | "default"> = {
  confirmado: "secondary", enviado: "secondary", aprovado: "default",
  sugerido: "outline", ignorado: "outline", falhou: "destructive", bloqueado: "destructive",
};

export default function BrainAutomacao() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [galpoes, setGalpoes] = useState<GalpaoLinha[]>([]);
  const [comandos, setComandos] = useState<ComandoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const carregar = async () => {
    if (!integradoId) return;
    setLoading(true);
    const { data: gs } = await supabase
      .from("galpoes")
      .select("id, nome, automacao_brain, nucleo:nucleos!inner(integrado_id)")
      .eq("ativo", true)
      .eq("nucleo.integrado_id", integradoId);
    setGalpoes((gs ?? []).map((g: any) => ({
      id: g.id, nome: g.nome, automacao_brain: g.automacao_brain ?? "shadow",
    })));

    const desde = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: cmds } = await supabase
      .from("comando_brain")
      .select("id, galpao_id, funcao, status, origem, created_at, estado_desejado, erro")
      .eq("integrado_id", integradoId)
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(200);
    setComandos((cmds ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [integradoId]);

  const panico = async () => {
    setActing(true);
    const { error } = await supabase
      .from("galpoes")
      .update({ automacao_brain: "off" })
      .in("id", galpoes.map((g) => g.id));
    if (!error) {
      await supabase
        .from("comando_brain")
        .update({ status: "ignorado", erro: "Pânico global acionado" })
        .eq("integrado_id", integradoId)
        .in("status", ["sugerido", "aprovado"]);
    }
    setActing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pânico acionado — todos os galpões em OFF e comandos pendentes ignorados");
    carregar();
  };

  const mudarTodos = async (modo: "shadow" | "auto") => {
    setActing(true);
    const { error } = await supabase
      .from("galpoes")
      .update({ automacao_brain: modo })
      .in("id", galpoes.map((g) => g.id));
    setActing(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Todos os galpões agora em modo ${modo.toUpperCase()}`);
    carregar();
  };

  const rodarDispatcher = async () => {
    setActing(true);
    const { error } = await supabase.functions.invoke("brain-dispatcher", { body: {} });
    setActing(false);
    if (error) toast.error(error.message); else toast.success("Dispatcher executado");
    carregar();
  };

  const aprovarComando = async (id: string) => {
    const { error } = await supabase
      .from("comando_brain")
      .update({ status: "aprovado" })
      .eq("id", id)
      .eq("status", "sugerido");
    if (error) { toast.error(error.message); return; }
    toast.success("Comando aprovado — será executado no próximo dispatcher");
    // Roda dispatcher imediatamente para não esperar 15s
    supabase.functions.invoke("brain-dispatcher", { body: {} }).catch(() => undefined);
    carregar();
  };

  const recusarComando = async (id: string) => {
    const { error } = await supabase
      .from("comando_brain")
      .update({ status: "ignorado", erro: "Recusado manualmente" })
      .eq("id", id)
      .eq("status", "sugerido");
    if (error) { toast.error(error.message); return; }
    toast.success("Comando recusado");
    carregar();
  };

  const mudarModoGalpao = async (galpaoId: string, modo: "off" | "shadow" | "auto") => {
    const { error } = await supabase
      .from("galpoes")
      .update({ automacao_brain: modo })
      .eq("id", galpaoId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Galpão atualizado para ${modo.toUpperCase()}`);
    carregar();
  };

  // KPIs últimas 7 dias
  const total = comandos.length;
  const confirmados = comandos.filter((c) => c.status === "confirmado" || c.status === "enviado").length;
  const aprovados = comandos.filter((c) => ["aprovado", "enviado", "confirmado"].includes(c.status)).length;
  const ignorados = comandos.filter((c) => c.status === "ignorado").length;
  const falhas = comandos.filter((c) => c.status === "falhou").length;
  const pendentes = comandos.filter((c) => c.status === "sugerido").length;

  const decididos = aprovados + ignorados;
  const aprovacaoPct = decididos > 0 ? Math.round((aprovados / decididos) * 100) : 0;
  const sucessoPct = aprovados > 0 ? Math.round((confirmados / aprovados) * 100) : 0;

  const galpaoNome = (id: string) => galpoes.find((g) => g.id === id)?.nome ?? id.slice(0, 8);
  const modoBadge = (m: string) =>
    m === "auto" ? <Badge>AUTO</Badge>
      : m === "shadow" ? <Badge variant="secondary">SOMBRA</Badge>
      : <Badge variant="outline">OFF</Badge>;

  const algumAuto = galpoes.some((g) => g.automacao_brain === "auto");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-primary" /> Automação Brain
              </h1>
              <p className="text-sm text-muted-foreground">
                Controle global do cérebro climático: modos, pânico e confiança
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={rodarDispatcher} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Rodar dispatcher
            </Button>
            <Button variant="outline" onClick={() => mudarTodos("shadow")} disabled={acting}>
              Todos em Sombra
            </Button>
            <Button variant="outline" onClick={() => mudarTodos("auto")} disabled={acting}>
              Todos em Auto
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={acting}>
                  <ShieldAlert className="h-4 w-4 mr-2" /> Pânico global
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Acionar pânico global?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isto coloca <strong>todos os galpões em OFF</strong> e marca todos os comandos pendentes
                    (sugeridos/aprovados) como ignorados. Use apenas em emergências.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={panico}>Sim, parar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {algumAuto && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Modo automático ativo</AlertTitle>
            <AlertDescription>
              {galpoes.filter((g) => g.automacao_brain === "auto").length} galpão(ões) executam comandos do Brain sem aprovação humana.
            </AlertDescription>
          </Alert>
        )}

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Confiança (7d)</CardDescription>
              <CardTitle className="text-3xl">{aprovacaoPct}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {aprovados} aprovados de {decididos} decididos
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sucesso de execução</CardDescription>
              <CardTitle className="text-3xl">{sucessoPct}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {confirmados} confirmados de {aprovados} executados
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendentes</CardDescription>
              <CardTitle className="text-3xl">{pendentes}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Aguardando aprovação humana
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Falhas (7d)</CardDescription>
              <CardTitle className="text-3xl text-destructive">{falhas}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              de {total} comandos totais
            </CardContent>
          </Card>
        </div>

        {/* Estado dos galpões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Modo por galpão
            </CardTitle>
            <CardDescription>Altere no Climate Brain individualmente</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20" />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {galpoes.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/30 text-sm">
                    <span className="truncate flex-1">{g.nome}</span>
                    <Select value={g.automacao_brain} onValueChange={(v: any) => mudarModoGalpao(g.id, v)}>
                      <SelectTrigger className="h-7 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">OFF</SelectItem>
                        <SelectItem value="shadow">SOMBRA</SelectItem>
                        <SelectItem value="auto">AUTO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico recente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comandos recentes (7d)</CardTitle>
            <CardDescription>Últimos 30 mais novos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <Skeleton className="h-40" />
            ) : comandos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum comando emitido pelo Brain ainda.</p>
            ) : (
              comandos.slice(0, 30).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/40 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {c.status === "confirmado" ? <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      : c.status === "falhou" ? <XCircle className="h-3 w-3 text-destructive shrink-0" />
                      : <Activity className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <span className="font-medium truncate">{galpaoNome(c.galpao_id)}</span>
                    <Badge variant="outline" className="text-[10px]">{c.funcao}</Badge>
                    <span className="text-muted-foreground truncate">
                      → {c.estado_desejado?.acao ?? JSON.stringify(c.estado_desejado)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.erro && <span className="text-destructive truncate max-w-[200px]">{c.erro}</span>}
                    <Badge variant={STATUS_COLOR[c.status] ?? "outline"} className="text-[10px]">
                      {c.status}
                    </Badge>
                    {c.status === "sugerido" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={() => aprovarComando(c.id)} title="Aprovar">
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => recusarComando(c.id)} title="Recusar">
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <span className="text-muted-foreground tabular-nums">
                      {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
