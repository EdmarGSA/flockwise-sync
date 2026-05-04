import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClimaNucleo } from "@/hooks/useClimaNucleo";
import { Cloud, Droplets, Wind, Sun, AlertTriangle, ThermometerSun, RefreshCw, Sunrise, Sunset, CheckCircle2, XCircle, Clock, CloudRain, CloudSnow, CloudFog, CloudLightning, CloudSun } from "lucide-react";

const condicaoWMO = (code?: number | null): { texto: string; Icon: any; cor: string } => {
  if (code == null) return { texto: "—", Icon: Cloud, cor: "text-muted-foreground" };
  if (code === 0) return { texto: "Céu limpo", Icon: Sun, cor: "text-yellow-500" };
  if (code <= 2) return { texto: "Parcialmente nublado", Icon: CloudSun, cor: "text-yellow-400" };
  if (code === 3) return { texto: "Nublado", Icon: Cloud, cor: "text-slate-400" };
  if (code >= 45 && code <= 48) return { texto: "Neblina", Icon: CloudFog, cor: "text-slate-400" };
  if (code >= 51 && code <= 57) return { texto: "Garoa", Icon: CloudRain, cor: "text-blue-400" };
  if (code >= 61 && code <= 67) return { texto: "Chuva", Icon: CloudRain, cor: "text-blue-500" };
  if (code >= 71 && code <= 77) return { texto: "Neve", Icon: CloudSnow, cor: "text-cyan-300" };
  if (code >= 80 && code <= 82) return { texto: "Pancadas de chuva", Icon: CloudRain, cor: "text-blue-600" };
  if (code >= 85 && code <= 86) return { texto: "Pancadas de neve", Icon: CloudSnow, cor: "text-cyan-300" };
  if (code >= 95) return { texto: "Tempestade", Icon: CloudLightning, cor: "text-purple-500" };
  return { texto: "—", Icon: Cloud, cor: "text-muted-foreground" };
};
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
  const { observacao, forecast, alertas, solar, ultimoSync, loading, refetch } = useClimaNucleo(nucleoId);
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

  const proxMax = forecast.slice(0, 12).reduce((a, f) => Math.max(a, Number(f.temperatura_c) || -99), -99);
  const proxMin = forecast.slice(0, 12).reduce((a, f) => Math.min(a, Number(f.temperatura_c) || 99), 99);
  const probChuvaMax = forecast.slice(0, 12).reduce((a, f) => Math.max(a, Number(f.prob_chuva_pct) || 0), 0);
  const cond = condicaoWMO(observacao.condicao_codigo);

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
        <div className="flex items-center gap-2 text-sm">
          <cond.Icon className={`h-5 w-5 ${cond.cor}`} />
          <span className="font-medium text-foreground">{cond.texto}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <ThermometerSun className="h-4 w-4 mx-auto text-orange-500" />
            <p className="text-xl font-bold">{observacao.temperatura_c != null ? `${Number(observacao.temperatura_c).toFixed(0)}°` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">Temp</p>
          </div>
          <div>
            <Droplets className="h-4 w-4 mx-auto text-blue-500" />
            <p className="text-xl font-bold">{observacao.umidade_pct != null ? `${Number(observacao.umidade_pct).toFixed(0)}%` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">UR</p>
          </div>
          <div>
            <Wind className="h-4 w-4 mx-auto text-cyan-500" />
            <p className="text-xl font-bold">{observacao.vento_kmh != null ? Number(observacao.vento_kmh).toFixed(0) : "—"}</p>
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
          <div className="text-xs text-muted-foreground border-t pt-2 flex items-center justify-between gap-2">
            <span>Próximas 12h: <span className="font-medium text-foreground">{proxMin.toFixed(0)}° → {proxMax.toFixed(0)}°</span></span>
            {probChuvaMax > 0 && (
              <span className="flex items-center gap-1 text-blue-500">
                <CloudRain className="h-3 w-3" /> {probChuvaMax}% chuva
              </span>
            )}
          </div>
        )}

        <div className="border-t pt-2 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5">
            {ultimoSync?.status === "sucesso" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : ultimoSync?.status === "erro" ? (
              <XCircle className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">Sync:</span>
            <span className={`font-medium ${ultimoSync?.status === "erro" ? "text-destructive" : "text-foreground"}`}>
              {ultimoSync
                ? `${new Date(ultimoSync.executado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${ultimoSync.trigger_tipo === "manual" ? " (manual)" : ""}`
                : "nunca executado"}
            </span>
          </span>
          {ultimoSync?.duracao_ms != null && (
            <span className="text-muted-foreground">{ultimoSync.duracao_ms} ms</span>
          )}
        </div>
        {ultimoSync?.status === "erro" && (
          <div className="-mt-1 space-y-1.5">
            {ultimoSync.mensagem && (
              <p className="text-[11px] text-destructive">{ultimoSync.mensagem}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] w-full"
              onClick={atualizarClima}
              disabled={atualizando}
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${atualizando ? "animate-spin" : ""}`} />
              Tentar novamente
            </Button>
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
