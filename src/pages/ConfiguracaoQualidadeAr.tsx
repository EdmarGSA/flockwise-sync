import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Wind, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";

interface Config {
  integrado_id: string;
  nh3_amarelo_ppm: number;
  nh3_vermelho_ppm: number;
  co2_amarelo_ppm: number;
  co2_vermelho_ppm: number;
  pressao_min_pa: number;
  pressao_max_pa: number;
  cooldown_minutos: number;
  ativo: boolean;
}

interface Alerta {
  id: string;
  tipo: string;
  valor_lido: number;
  limite_configurado: number;
  severidade: string;
  created_at: string;
  resolvido_em: string | null;
}

const defaultCfg = (id: string): Config => ({
  integrado_id: id,
  nh3_amarelo_ppm: 15,
  nh3_vermelho_ppm: 20,
  co2_amarelo_ppm: 2500,
  co2_vermelho_ppm: 3000,
  pressao_min_pa: 10,
  pressao_max_pa: 50,
  cooldown_minutos: 15,
  ativo: true,
});

export default function ConfiguracaoQualidadeAr() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      const { data } = await supabase
        .from("config_alertas_qualidade_ar")
        .select("*")
        .eq("integrado_id", integradoId)
        .maybeSingle();
      setCfg((data as Config) ?? defaultCfg(integradoId));

      const { data: a } = await supabase
        .from("alertas_qualidade_ar")
        .select("id, tipo, valor_lido, limite_configurado, severidade, created_at, resolvido_em")
        .eq("integrado_id", integradoId)
        .order("created_at", { ascending: false })
        .limit(20);
      setAlertas((a as Alerta[]) ?? []);
    })();
  }, [integradoId]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase.from("config_alertas_qualidade_ar").upsert(cfg);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  if (!cfg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/configuracoes")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Wind className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Qualidade do Ar e Pressão</h1>
            <p className="text-sm text-muted-foreground">
              Configure limites de NH₃, CO₂ e pressão estática para alertas automáticos
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Limites de Alerta</CardTitle>
            <CardDescription>Valores recomendados: NH₃ ≤ 20 ppm, CO₂ ≤ 3000 ppm</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>NH₃ Amarelo (ppm)</Label>
              <Input type="number" value={cfg.nh3_amarelo_ppm}
                onChange={(e) => setCfg({ ...cfg, nh3_amarelo_ppm: Number(e.target.value) })} />
            </div>
            <div>
              <Label>NH₃ Vermelho (ppm)</Label>
              <Input type="number" value={cfg.nh3_vermelho_ppm}
                onChange={(e) => setCfg({ ...cfg, nh3_vermelho_ppm: Number(e.target.value) })} />
            </div>
            <div>
              <Label>CO₂ Amarelo (ppm)</Label>
              <Input type="number" value={cfg.co2_amarelo_ppm}
                onChange={(e) => setCfg({ ...cfg, co2_amarelo_ppm: Number(e.target.value) })} />
            </div>
            <div>
              <Label>CO₂ Vermelho (ppm)</Label>
              <Input type="number" value={cfg.co2_vermelho_ppm}
                onChange={(e) => setCfg({ ...cfg, co2_vermelho_ppm: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Pressão Mín. (Pa)</Label>
              <Input type="number" value={cfg.pressao_min_pa}
                onChange={(e) => setCfg({ ...cfg, pressao_min_pa: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Pressão Máx. (Pa)</Label>
              <Input type="number" value={cfg.pressao_max_pa}
                onChange={(e) => setCfg({ ...cfg, pressao_max_pa: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Cooldown entre alertas (min)</Label>
              <Input type="number" value={cfg.cooldown_minutos}
                onChange={(e) => setCfg({ ...cfg, cooldown_minutos: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
              <Label>Sistema de alertas ativo</Label>
            </div>
            <div className="md:col-span-2">
              <Button onClick={save} disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Alertas Recentes
            </CardTitle>
            <CardDescription>Últimos 20 eventos de qualidade do ar</CardDescription>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum alerta registrado.
              </p>
            ) : (
              <div className="space-y-2">
                {alertas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${a.severidade === "critico" ? "text-destructive" : "text-yellow-500"}`} />
                      <div>
                        <p className="font-medium text-sm">{a.tipo.replace("_", " ").toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={a.severidade === "critico" ? "destructive" : "secondary"}>
                        {a.valor_lido.toFixed(1)} (limite {a.limite_configurado})
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
