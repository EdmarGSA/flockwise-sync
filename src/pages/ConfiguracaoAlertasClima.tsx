import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Save, Thermometer, Wind, Droplets, CloudRain, Globe, MapPin } from "lucide-react";

const alertaSchema = z.object({
  temp_max_critico: z.number().min(-10, "Temp. máx. fora da faixa (-10 a 50°C)").max(50, "Temp. máx. fora da faixa (-10 a 50°C)").nullable(),
  temp_min_critico: z.number().min(-20, "Temp. mín. fora da faixa (-20 a 40°C)").max(40, "Temp. mín. fora da faixa (-20 a 40°C)").nullable(),
  ith_max_critico: z.number().min(50, "ITH deve estar entre 50 e 100").max(100, "ITH deve estar entre 50 e 100").nullable(),
  vento_max_kmh: z.number().min(10, "Vento entre 10 e 200 km/h").max(200, "Vento entre 10 e 200 km/h").nullable(),
  prob_chuva_min_pct: z.number().min(0, "Probabilidade entre 0 e 100%").max(100, "Probabilidade entre 0 e 100%").nullable(),
  habilitar_calor: z.boolean(),
  habilitar_frio: z.boolean(),
  habilitar_ith: z.boolean(),
  habilitar_vento: z.boolean(),
  habilitar_chuva: z.boolean(),
}).superRefine((d, ctx) => {
  if (d.habilitar_calor && d.temp_max_critico == null) {
    ctx.addIssue({ code: "custom", message: "Informe a temperatura máxima crítica" });
  }
  if (d.habilitar_frio && d.temp_min_critico == null) {
    ctx.addIssue({ code: "custom", message: "Informe a temperatura mínima crítica" });
  }
  if (d.habilitar_ith && d.ith_max_critico == null) {
    ctx.addIssue({ code: "custom", message: "Informe o ITH máximo" });
  }
  if (d.habilitar_vento && d.vento_max_kmh == null) {
    ctx.addIssue({ code: "custom", message: "Informe o vento máximo" });
  }
  if (d.habilitar_chuva && d.prob_chuva_min_pct == null) {
    ctx.addIssue({ code: "custom", message: "Informe a probabilidade mínima de chuva" });
  }
  if (d.temp_min_critico != null && d.temp_max_critico != null && d.temp_min_critico >= d.temp_max_critico) {
    ctx.addIssue({ code: "custom", message: "Temperatura mínima deve ser menor que a máxima" });
  }
  if (d.temp_max_critico != null && d.temp_min_critico != null && (d.temp_max_critico - d.temp_min_critico) < 3) {
    ctx.addIssue({ code: "custom", message: "Diferença entre temp. mín. e máx. deve ser de pelo menos 3°C" });
  }
});

interface AlertaConfig {
  id?: string;
  nucleo_id: string | null;
  temp_max_critico: number | null;
  temp_min_critico: number | null;
  ith_max_critico: number | null;
  vento_max_kmh: number | null;
  prob_chuva_min_pct: number | null;
  habilitar_calor: boolean;
  habilitar_frio: boolean;
  habilitar_ith: boolean;
  habilitar_vento: boolean;
  habilitar_chuva: boolean;
}

const DEFAULTS: AlertaConfig = {
  nucleo_id: null,
  temp_max_critico: 32,
  temp_min_critico: 12,
  ith_max_critico: 78,
  vento_max_kmh: 50,
  prob_chuva_min_pct: 70,
  habilitar_calor: true,
  habilitar_frio: true,
  habilitar_ith: true,
  habilitar_vento: true,
  habilitar_chuva: false,
};

const ConfiguracaoAlertasClima = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();

  const [nucleos, setNucleos] = useState<{ id: string; nome: string }[]>([]);
  const [configs, setConfigs] = useState<Record<string, AlertaConfig>>({}); // key = nucleo_id || "default"
  const [tab, setTab] = useState("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      setLoading(true);
      const [{ data: nucs }, { data: cfgs }] = await Promise.all([
        supabase.from("nucleos").select("id, nome").eq("integrado_id", integradoId).eq("ativo", true).order("nome"),
        supabase.from("nucleo_alertas_config").select("*").eq("integrado_id", integradoId),
      ]);
      setNucleos(nucs || []);
      const map: Record<string, AlertaConfig> = {};
      map["default"] = { ...DEFAULTS };
      (cfgs || []).forEach((c: any) => {
        const key = c.nucleo_id || "default";
        map[key] = {
          id: c.id, nucleo_id: c.nucleo_id,
          temp_max_critico: c.temp_max_critico, temp_min_critico: c.temp_min_critico,
          ith_max_critico: c.ith_max_critico, vento_max_kmh: c.vento_max_kmh,
          prob_chuva_min_pct: c.prob_chuva_min_pct,
          habilitar_calor: c.habilitar_calor, habilitar_frio: c.habilitar_frio,
          habilitar_ith: c.habilitar_ith, habilitar_vento: c.habilitar_vento,
          habilitar_chuva: c.habilitar_chuva,
        };
      });
      setConfigs(map);
      setLoading(false);
    })();
  }, [integradoId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!user) { navigate("/auth"); return null; }

  const getCfg = (key: string): AlertaConfig =>
    configs[key] || { ...DEFAULTS, nucleo_id: key === "default" ? null : key };

  const updateField = (key: string, patch: Partial<AlertaConfig>) => {
    setConfigs((prev) => ({ ...prev, [key]: { ...getCfg(key), ...patch } }));
  };

  const handleSave = async (key: string) => {
    if (!integradoId) return;
    const cfg = getCfg(key);
    const parsed = alertaSchema.safeParse({
      temp_max_critico: cfg.temp_max_critico,
      temp_min_critico: cfg.temp_min_critico,
      ith_max_critico: cfg.ith_max_critico,
      vento_max_kmh: cfg.vento_max_kmh,
      prob_chuva_min_pct: cfg.prob_chuva_min_pct,
      habilitar_calor: cfg.habilitar_calor,
      habilitar_frio: cfg.habilitar_frio,
      habilitar_ith: cfg.habilitar_ith,
      habilitar_vento: cfg.habilitar_vento,
      habilitar_chuva: cfg.habilitar_chuva,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Valores inválidos");
      return;
    }
    setSaving(true);
      nucleo_id: key === "default" ? null : key,
      temp_max_critico: cfg.temp_max_critico,
      temp_min_critico: cfg.temp_min_critico,
      ith_max_critico: cfg.ith_max_critico,
      vento_max_kmh: cfg.vento_max_kmh,
      prob_chuva_min_pct: cfg.prob_chuva_min_pct,
      habilitar_calor: cfg.habilitar_calor,
      habilitar_frio: cfg.habilitar_frio,
      habilitar_ith: cfg.habilitar_ith,
      habilitar_vento: cfg.habilitar_vento,
      habilitar_chuva: cfg.habilitar_chuva,
    };
    const { data, error } = await supabase
      .from("nucleo_alertas_config")
      .upsert(payload, { onConflict: "integrado_id,nucleo_id" })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    updateField(key, { id: data.id });
    toast.success("Limites salvos com sucesso");
  };

  const handleReset = async (key: string) => {
    if (key === "default") {
      setConfigs((p) => ({ ...p, default: { ...DEFAULTS } }));
      return;
    }
    if (!integradoId) return;
    const cfg = getCfg(key);
    if (cfg.id) {
      await supabase.from("nucleo_alertas_config").delete().eq("id", cfg.id);
    }
    setConfigs((p) => {
      const cp = { ...p };
      delete cp[key];
      return cp;
    });
    toast.success("Configuração removida — usará o padrão da organização");
  };

  const renderForm = (key: string) => {
    const cfg = getCfg(key);
    const isDefault = key === "default";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDefault ? <Globe className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            {isDefault ? "Limites padrão da organização" : nucleos.find((n) => n.id === key)?.nome}
          </CardTitle>
          <CardDescription>
            {isDefault
              ? "Aplicado a todos os núcleos sem configuração específica."
              : "Sobrescreve os limites padrão para este núcleo."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calor */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4 text-destructive" /> Onda de calor
              </Label>
              <Switch checked={cfg.habilitar_calor} onCheckedChange={(v) => updateField(key, { habilitar_calor: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Temp. máx. crítica (°C)</Label>
                <Input type="number" step="0.5" disabled={!cfg.habilitar_calor}
                  value={cfg.temp_max_critico ?? ""}
                  onChange={(e) => updateField(key, { temp_max_critico: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Gera alerta crítico quando a previsão atingir ou ultrapassar este valor nas próximas 24h.</p>
          </div>

          {/* Frio */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4 text-blue-500" /> Onda de frio
              </Label>
              <Switch checked={cfg.habilitar_frio} onCheckedChange={(v) => updateField(key, { habilitar_frio: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Temp. mín. crítica (°C)</Label>
                <Input type="number" step="0.5" disabled={!cfg.habilitar_frio}
                  value={cfg.temp_min_critico ?? ""}
                  onChange={(e) => updateField(key, { temp_min_critico: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
          </div>

          {/* ITH */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Droplets className="h-4 w-4 text-amber-500" /> ITH (estresse térmico)
              </Label>
              <Switch checked={cfg.habilitar_ith} onCheckedChange={(v) => updateField(key, { habilitar_ith: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">ITH máximo crítico</Label>
                <Input type="number" step="1" disabled={!cfg.habilitar_ith}
                  value={cfg.ith_max_critico ?? ""}
                  onChange={(e) => updateField(key, { ith_max_critico: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Referência: acima de 78 indica estresse moderado; acima de 82, severo.</p>
          </div>

          {/* Vento */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Wind className="h-4 w-4 text-cyan-600" /> Vento forte
              </Label>
              <Switch checked={cfg.habilitar_vento} onCheckedChange={(v) => updateField(key, { habilitar_vento: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vento máx. (km/h)</Label>
                <Input type="number" step="1" disabled={!cfg.habilitar_vento}
                  value={cfg.vento_max_kmh ?? ""}
                  onChange={(e) => updateField(key, { vento_max_kmh: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
          </div>

          {/* Chuva */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <CloudRain className="h-4 w-4 text-blue-600" /> Chuva intensa prevista
              </Label>
              <Switch checked={cfg.habilitar_chuva} onCheckedChange={(v) => updateField(key, { habilitar_chuva: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Probabilidade mín. (%)</Label>
                <Input type="number" step="5" disabled={!cfg.habilitar_chuva}
                  value={cfg.prob_chuva_min_pct ?? ""}
                  onChange={(e) => updateField(key, { prob_chuva_min_pct: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {!isDefault && cfg.id && (
              <Button variant="outline" onClick={() => handleReset(key)} disabled={saving}>
                Remover override
              </Button>
            )}
            <Button onClick={() => handleSave(key)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Alertas Climáticos</h1>
            <p className="text-sm text-muted-foreground">Defina limites de temperatura, ITH, vento e chuva por núcleo.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="default" className="gap-1"><Globe className="h-4 w-4" /> Padrão</TabsTrigger>
            {nucleos.map((n) => (
              <TabsTrigger key={n.id} value={n.id} className="gap-1">
                <MapPin className="h-3 w-3" /> {n.nome}
                {configs[n.id]?.id && <span className="ml-1 text-[10px] text-primary">●</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="default" className="mt-4">{renderForm("default")}</TabsContent>
          {nucleos.map((n) => (
            <TabsContent key={n.id} value={n.id} className="mt-4">{renderForm(n.id)}</TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default ConfiguracaoAlertasClima;
