import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Sparkles, RefreshCw, Activity, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";

interface Aprendizado {
  galpao_id: string;
  offset_temp_aprendido_c: number;
  offset_ur_aprendido_pct: number;
  inercia_estimada_min: number;
  fator_isolamento: number;
  amostras_treinadas: number;
  ultimo_treino_em: string | null;
  narrativa_ia: string | null;
  metricas: any;
}
interface GalpaoRow {
  id: string;
  nome: string;
  aprendizado?: Aprendizado;
}

export default function ClimateBrain() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [galpoes, setGalpoes] = useState<GalpaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [running, setRunning] = useState(false);

  const carregar = async () => {
    if (!integradoId) return;
    setLoading(true);
    const { data: gs } = await supabase
      .from("galpoes")
      .select("id, nome, nucleo:nucleos!inner(integrado_id)")
      .eq("ativo", true)
      .eq("nucleo.integrado_id", integradoId);
    const ids = (gs ?? []).map((g: any) => g.id);
    const { data: aps } = await supabase
      .from("aprendizado_galpao")
      .select("*")
      .in("galpao_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const mapAp = new Map((aps ?? []).map((a: any) => [a.galpao_id, a]));
    setGalpoes((gs ?? []).map((g: any) => ({
      id: g.id, nome: g.nome, aprendizado: mapAp.get(g.id) as any,
    })));
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [integradoId]);

  const treinar = async () => {
    setTraining(true);
    const { error } = await supabase.functions.invoke("climate-learn", { body: {} });
    setTraining(false);
    if (error) { toast.error("Falha ao treinar: " + error.message); return; }
    toast.success("Treinamento concluído");
    carregar();
  };

  const rodarBrain = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("climate-brain", { body: {} });
    setRunning(false);
    if (error) { toast.error("Falha no brain: " + error.message); return; }
    toast.success("Brain executado");
  };

  const resetar = async (galpaoId: string) => {
    const { error } = await supabase
      .from("aprendizado_galpao")
      .update({ offset_temp_aprendido_c: 0, offset_ur_aprendido_pct: 0, narrativa_ia: null })
      .eq("galpao_id", galpaoId);
    if (error) { toast.error(error.message); return; }
    toast.success("Aprendizado resetado");
    carregar();
  };

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
                <Brain className="h-6 w-6 text-primary" /> Climate Brain
              </h1>
              <p className="text-sm text-muted-foreground">
                Cérebro climático integrado com aprendizado por galpão
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={rodarBrain} disabled={running}>
              <Activity className={`h-4 w-4 mr-2 ${running ? "animate-pulse" : ""}`} />
              Rodar agora
            </Button>
            <Button onClick={treinar} disabled={training}>
              <Sparkles className={`h-4 w-4 mr-2 ${training ? "animate-spin" : ""}`} />
              Treinar perfil
            </Button>
          </div>
        </div>

        <Alert>
          <Brain className="h-4 w-4" />
          <AlertTitle>Como funciona</AlertTitle>
          <AlertDescription>
            O Brain coordena ventilação, aquecimento, cortinas e nebulização a cada minuto. O Learn ajusta
            o perfil térmico de cada galpão a cada hora — offsets limitados a ±2°C por segurança.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {galpoes.map((g) => {
              const a = g.aprendizado;
              const offset = Number(a?.offset_temp_aprendido_c ?? 0);
              const treinado = !!a?.ultimo_treino_em;
              const divergente = Math.abs(offset) >= 1.5;
              return (
                <Card key={g.id} className={divergente ? "border-amber-500" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{g.nome}</span>
                      {treinado ? (
                        divergente ? <Badge variant="destructive">Perfil divergente</Badge>
                          : <Badge variant="secondary">Treinado</Badge>
                      ) : <Badge variant="outline">Sem treino</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {treinado
                        ? `Última atualização: ${new Date(a!.ultimo_treino_em!).toLocaleString("pt-BR")}`
                        : "Aguarda 48h+ de logs para começar"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-muted">
                        <div className="text-xs text-muted-foreground">Offset T</div>
                        <div className="text-lg font-bold">
                          {offset > 0 ? "+" : ""}{offset.toFixed(2)}°C
                        </div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="text-xs text-muted-foreground">Inércia</div>
                        <div className="text-lg font-bold">
                          {Number(a?.inercia_estimada_min ?? 30).toFixed(0)}min
                        </div>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <div className="text-xs text-muted-foreground">Isolamento</div>
                        <div className="text-lg font-bold">
                          {Number(a?.fator_isolamento ?? 1).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {a?.narrativa_ia && (
                      <Alert className="bg-primary/5 border-primary/30">
                        <Sparkles className="h-4 w-4" />
                        <AlertDescription className="text-sm">{a.narrativa_ia}</AlertDescription>
                      </Alert>
                    )}
                    {a?.metricas?.mae != null && (
                      <div className="text-xs text-muted-foreground">
                        MAE {Number(a.metricas.mae).toFixed(2)}°C ·
                        {" "}{a.amostras_treinadas} amostras ·
                        {" "}amplitude {Number(a.metricas.amplitude_diurna ?? 0).toFixed(1)}°C
                      </div>
                    )}
                    {treinado && (
                      <Button variant="ghost" size="sm" onClick={() => resetar(g.id)}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Resetar aprendizado
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {galpoes.length === 0 && (
              <Card><CardContent className="p-6 text-center text-muted-foreground">
                Nenhum galpão ativo encontrado.
              </CardContent></Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
