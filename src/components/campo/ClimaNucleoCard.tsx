import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClimaNucleo } from "@/hooks/useClimaNucleo";
import { Cloud, Droplets, Wind, Sun, AlertTriangle, ThermometerSun, RefreshCw, Sunrise, Sunset } from "lucide-react";
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
  const { observacao, forecast, alertas, loading } = useClimaNucleo(nucleoId);

  const reconhecer = async (id: string) => {
    const { error } = await supabase
      .from("alertas_climaticos")
      .update({ reconhecido_em: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Erro ao reconhecer alerta");
    else toast.success("Alerta reconhecido");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Clima {nucleoNome || ""}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Carregando...</p></CardContent>
      </Card>
    );
  }

  if (!observacao) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Clima {nucleoNome || ""}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem dados climáticos. Verifique se o núcleo possui GPS e está ativo para meteorologia.
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
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><Cloud className="h-4 w-4" /> Clima {nucleoNome || ""}</span>
          <span className="text-xs text-muted-foreground">
            {observacao.atualizado_em ? new Date(observacao.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
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
