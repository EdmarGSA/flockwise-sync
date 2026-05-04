import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClimaNucleo } from "@/hooks/useClimaNucleo";
import { Cloud, Droplets, Wind, Sun, AlertTriangle, ThermometerSun, RefreshCw, Sunrise, Sunset, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  nucleoId: string;
  nucleoNome?: string;
}

const severidadeColor: Record<string, string> = {
  critico: "destructive",
  alto: "destructive",
  atencao: "default",
  medio: "default",
  baixo: "secondary",
};

export function ClimaNucleoCard({ nucleoId, nucleoNome }: Props) {
  const { observacao, forecast, alertas, solar, loading, refetch } = useClimaNucleo(nucleoId);
  const [atualizando, setAtualizando] = useState(false);

  const reconhecer = async (id: string) => {
    const { error } = await supabase
      .from("alertas_climaticos")
      .update({ reconhecido_em: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Erro ao reconhecer alerta");
    else toast.success("Alerta reconhecido");
  };

  const atualizarClima = async () => {
    setAtualizando(true);
    try {
      const { error } = await supabase.functions.invoke("weather-sync", { body: { nucleo_id: nucleoId } });
      if (error) throw error;
      await refetch();
      toast.success("Clima atualizado");
    } catch (e: any) {
      toast.error("Falha ao atualizar clima", { description: e?.message });
    } finally {
      setAtualizando(false);
    }
  };

  const formatHora = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--";

  const RefreshButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={atualizarClima}
      disabled={atualizando || !nucleoId}
      title="Atualizar clima e dados solares"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${atualizando ? "animate-spin" : ""}`} />
    </Button>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Clima {nucleoNome || ""}</span>
            {RefreshButton}
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Carregando...</p></CardContent>
      </Card>
    );
  }

  if (!observacao) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Clima {nucleoNome || ""}</span>
            {RefreshButton}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem dados climáticos. Verifique se o núcleo possui GPS e está ativo para meteorologia, ou clique em atualizar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const proxMax = forecast.slice(0, 12).reduce((a, f) => Math.max(a, Number(f.temp_c) || -99), -99);
  const proxMin = forecast.slice(0, 12).reduce((a, f) => Math.min(a, Number(f.temp_c) || 99), 99);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Cloud className="h-4 w-4" /> Clima {nucleoNome || ""}</span>
          <span className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {observacao.atualizado_em ? new Date(observacao.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
            {RefreshButton}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <ThermometerSun className="h-4 w-4 mx-auto text-orange-500" />
            <p className="text-xl font-bold">{Number(observacao.temp_c).toFixed(0)}°</p>
            <p className="text-[10px] text-muted-foreground">Temp</p>
          </div>
          <div>
            <Droplets className="h-4 w-4 mx-auto text-blue-500" />
            <p className="text-xl font-bold">{Number(observacao.ur_pct).toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">UR</p>
          </div>
          <div>
            <Wind className="h-4 w-4 mx-auto text-cyan-500" />
            <p className="text-xl font-bold">{Number(observacao.vento_kmh).toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">km/h</p>
          </div>
          <div>
            <Sun className="h-4 w-4 mx-auto text-yellow-500" />
            <p className="text-xl font-bold">{observacao.uv_index ?? "-"}</p>
            <p className="text-[10px] text-muted-foreground">UV</p>
          </div>
        </div>

        {solar && (
          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
            <div className="flex items-center gap-1.5">
              <Sunrise className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Nascer:</span>
              <span className="font-medium text-foreground">{formatHora(solar.nascer_sol)}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Sunset className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-muted-foreground">Pôr:</span>
              <span className="font-medium text-foreground">{formatHora(solar.por_sol)}</span>
            </div>
          </div>
        )}

        {forecast.length > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Próximas 12h: <span className="font-medium text-foreground">{proxMin.toFixed(0)}° → {proxMax.toFixed(0)}°</span>
          </div>
        )}

        {alertas.length > 0 && (
          <div className="border-t pt-2 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-500" /> Alertas ativos ({alertas.length})
            </p>
            {alertas.slice(0, 3).map((a) => (
              <div key={a.id} className="text-xs bg-muted/50 rounded p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.titulo}</span>
                  <Badge variant={severidadeColor[a.severidade] as any || "secondary"} className="text-[10px] h-5">
                    {a.severidade}
                  </Badge>
                </div>
                {a.mensagem && <p className="text-muted-foreground">{a.mensagem}</p>}
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => reconhecer(a.id)}>
                    Reconhecer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
