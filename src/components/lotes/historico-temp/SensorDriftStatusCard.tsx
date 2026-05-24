import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface DriftRow {
  dispositivo_id: string;
  galpao_id: string | null;
  ultimo_check: string;
  amostras: number;
  delta_temp_c: number | null;
  delta_ur_pct: number | null;
  severidade: "ok" | "aviso" | "critico";
  motivo: string | null;
  excluido_agregacao: boolean;
  dispositivos_iot?: { nome: string; zona: string; galpao_id: string | null } | null;
  galpao_nome?: string;
}

interface Props {
  integradoId: string | null;
}

export function SensorDriftStatusCard({ integradoId }: Props) {
  const [rows, setRows] = useState<DriftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchRows = async () => {
    if (!integradoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sensor_drift_status")
      .select("dispositivo_id, galpao_id, ultimo_check, amostras, delta_temp_c, delta_ur_pct, severidade, motivo, excluido_agregacao, dispositivos_iot(nome, zona, galpao_id)")
      .eq("integrado_id", integradoId)
      .order("severidade", { ascending: false })
      .order("ultimo_check", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Erro ao carregar status de sensores", { description: error.message });
    } else {
      const rs = (data ?? []) as any[];
      const galpaoIds = Array.from(new Set(rs.map((r) => r.galpao_id).filter(Boolean)));
      let galpaoMap = new Map<string, string>();
      if (galpaoIds.length) {
        const { data: gs } = await supabase.from("galpoes").select("id, nome").in("id", galpaoIds);
        galpaoMap = new Map((gs ?? []).map((g: any) => [g.id, g.nome]));
      }
      setRows(rs.map((r) => ({ ...r, galpao_nome: galpaoMap.get(r.galpao_id) ?? "—" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, [integradoId]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("detect-sensor-drift", { body: {} });
      if (error) throw error;
      toast.success("Verificação executada");
      await fetchRows();
    } catch (e: any) {
      toast.error("Falha ao executar", { description: e?.message });
    } finally {
      setRunning(false);
    }
  };

  const criticos = rows.filter((r) => r.severidade === "critico");
  const avisos = rows.filter((r) => r.severidade === "aviso");
  const oks = rows.filter((r) => r.severidade === "ok");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Saúde dos sensores (drift)
            </CardTitle>
            <CardDescription>
              Compara cada sensor com a mediana dos pares no mesmo galpão. Sensores críticos são automaticamente
              excluídos da agregação do Climate Brain. Verificação a cada hora.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Verificar agora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="destructive">{criticos.length} crítico(s)</Badge>
          <Badge className="bg-amber-500 hover:bg-amber-500/90">{avisos.length} aviso(s)</Badge>
          <Badge variant="secondary">{oks.length} ok</Badge>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda sem avaliações. O detector roda automaticamente a cada hora — é preciso pelo menos 3 sensores ativos
            por galpão para a comparação.
          </p>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...criticos, ...avisos, ...oks].slice(0, 50).map((r) => (
              <div
                key={r.dispositivo_id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {r.severidade === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className={`h-4 w-4 ${r.severidade === "critico" ? "text-destructive" : "text-amber-500"}`} />
                    )}
                    <span className="font-medium truncate">{r.dispositivos_iot?.nome ?? r.dispositivo_id.slice(0, 8)}</span>
                    <Badge variant="outline" className="text-xs">{r.dispositivos_iot?.zona ?? "geral"}</Badge>
                    <span className="text-xs text-muted-foreground">· {r.galpao_nome}</span>
                  </div>
                  {r.motivo && (
                    <p className="text-xs text-muted-foreground mt-1 break-words">{r.motivo}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {r.amostras} buckets · último check {new Date(r.ultimo_check).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {r.delta_temp_c != null && (
                    <div className="text-xs">ΔT {r.delta_temp_c > 0 ? "+" : ""}{r.delta_temp_c.toFixed(2)}°C</div>
                  )}
                  {r.delta_ur_pct != null && (
                    <div className="text-xs text-muted-foreground">ΔUR {r.delta_ur_pct > 0 ? "+" : ""}{r.delta_ur_pct.toFixed(1)}%</div>
                  )}
                  {r.excluido_agregacao && (
                    <Badge variant="destructive" className="text-[10px] mt-1">Excluído</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
