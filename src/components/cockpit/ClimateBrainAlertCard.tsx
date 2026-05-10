import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props { integradoId: string }

interface DivergenteRow {
  galpao_id: string;
  offset_temp_aprendido_c: number;
  galpao_nome?: string;
}

const ClimateBrainAlertCard = ({ integradoId }: Props) => {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState<DivergenteRow[]>([]);

  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      const { data: gs } = await supabase
        .from("galpoes")
        .select("id, nome, nucleo:nucleos!inner(integrado_id)")
        .eq("ativo", true)
        .eq("nucleo.integrado_id", integradoId);
      const ids = (gs ?? []).map((g: any) => g.id);
      if (!ids.length) return;
      const mapNome = new Map((gs ?? []).map((g: any) => [g.id, g.nome]));
      const { data: aps } = await supabase
        .from("aprendizado_galpao")
        .select("galpao_id, offset_temp_aprendido_c")
        .in("galpao_id", ids);
      const divs = (aps ?? [])
        .filter((a: any) => Math.abs(Number(a.offset_temp_aprendido_c ?? 0)) >= 1.5)
        .map((a: any) => ({
          galpao_id: a.galpao_id,
          offset_temp_aprendido_c: Number(a.offset_temp_aprendido_c),
          galpao_nome: mapNome.get(a.galpao_id) as string,
        }));
      setLinhas(divs);
    })();
  }, [integradoId]);

  if (linhas.length === 0) return null;

  return (
    <Card className="border-amber-500/60 bg-amber-500/5">
      <CardContent className="p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="p-2 rounded-md bg-amber-500/15">
            <Brain className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="font-semibold text-sm">
              {linhas.length} {linhas.length === 1 ? "galpão com" : "galpões com"} perfil térmico divergente
            </div>
            <div className="text-xs text-muted-foreground">
              Climate Brain aprendeu offsets ≥ 1,5°C — vale revisar isolamento, posicionamento e curva.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {linhas.slice(0, 4).map((l) => (
            <Badge key={l.galpao_id} variant="outline" className="border-amber-500/60">
              {l.galpao_nome ?? "Galpão"} · {l.offset_temp_aprendido_c > 0 ? "+" : ""}
              {l.offset_temp_aprendido_c.toFixed(1)}°C
            </Badge>
          ))}
          {linhas.length > 4 && (
            <Badge variant="outline">+{linhas.length - 4}</Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate("/climate-brain")}>
            Abrir Brain <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClimateBrainAlertCard;
