import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Shield, Timer, Thermometer } from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useAuth } from "@/hooks/useAuth";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";

interface Config {
  integrado_id: string;
  deadband_temp_c: number;
  tempo_min_on_aquecedor_seg: number;
  tempo_min_off_aquecedor_seg: number;
  tempo_min_on_ventilador_seg: number;
  tempo_min_off_ventilador_seg: number;
  tempo_min_on_nebulizador_seg: number;
  tempo_min_off_nebulizador_seg: number;
  ith_amarelo: number;
  ith_vermelho: number;
  modo_seguro_vent_min_pct: number;
  sensor_max_idade_min: number;
  protege_pintinho_ate_dias: number;
}

const DEFAULT: Omit<Config, "integrado_id"> = {
  deadband_temp_c: 0.5,
  tempo_min_on_aquecedor_seg: 60,
  tempo_min_off_aquecedor_seg: 300,
  tempo_min_on_ventilador_seg: 120,
  tempo_min_off_ventilador_seg: 60,
  tempo_min_on_nebulizador_seg: 180,
  tempo_min_off_nebulizador_seg: 120,
  ith_amarelo: 74,
  ith_vermelho: 78,
  modo_seguro_vent_min_pct: 30,
  sensor_max_idade_min: 15,
  protege_pintinho_ate_dias: 7,
};

const ConfiguracaoHistereseClima = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { integradoId } = useIntegradoId();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      const { data } = await supabase
        .from("config_histerese_organizacao")
        .select("*")
        .eq("integrado_id", integradoId)
        .maybeSingle();
      if (data) setCfg(data as Config);
      else setCfg({ integrado_id: integradoId, ...DEFAULT });
      setLoading(false);
    })();
  }, [integradoId]);

  const salvar = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase
      .from("config_histerese_organizacao")
      .upsert(cfg, { onConflict: "integrado_id" });
    setSaving(false);
    if (error) toast.error(`Erro: ${error.message}`);
    else toast.success("Configuração salva");
  };

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => (c ? { ...c, [k]: v } : c));

  if (authLoading || loading || !cfg) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const num = (k: keyof Config, label: string, suffix?: string, step = 1) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step={step}
          value={cfg[k] as number}
          onChange={(e) => set(k, Number(e.target.value) as Config[typeof k])}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Histerese e Segurança Climática
          </h1>
          <Button onClick={salvar} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            Esses parâmetros controlam o comportamento do motor de decisão climática (auto-temperatura). Histerese evita
            ciclagem de equipamentos; tempos mínimos protegem motores; ITH dispara protocolos de estresse calórico;
            modo seguro entra em ação se sensores falharem.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4" /> Histerese (deadband)
            </CardTitle>
            <CardDescription>
              Liga/desliga só quando temperatura ultrapassa o setpoint ± deadband. Recomendado 0.3 a 0.7°C.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">{num("deadband_temp_c", "Deadband", "°C", 0.1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4" /> Tempos mínimos on/off
            </CardTitle>
            <CardDescription>
              Anti-ciclagem. Aquecedores precisam de off longo (proteção do termostato); ventiladores, on longo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {num("tempo_min_on_aquecedor_seg", "Aquecedor on mín", "s")}
            {num("tempo_min_off_aquecedor_seg", "Aquecedor off mín", "s")}
            {num("tempo_min_on_ventilador_seg", "Ventilador on mín", "s")}
            {num("tempo_min_off_ventilador_seg", "Ventilador off mín", "s")}
            {num("tempo_min_on_nebulizador_seg", "Nebulizador on mín", "s")}
            {num("tempo_min_off_nebulizador_seg", "Nebulizador off mín", "s")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estresse calórico (ITH)</CardTitle>
            <CardDescription>
              Limites do Índice Temperatura/Umidade (NRC). Acima do vermelho, o sistema entra em emergência.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 max-w-md">
            {num("ith_amarelo", "ITH amarelo (atenção)", "", 0.1)}
            {num("ith_vermelho", "ITH vermelho (crítico)", "", 0.1)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modo seguro / Fail-safe</CardTitle>
            <CardDescription>
              Comportamento quando sensores falham ou ficam offline.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {num("sensor_max_idade_min", "Idade máx leitura sensor", "min")}
            {num("modo_seguro_vent_min_pct", "Ventilação mín modo seguro", "%")}
            {num("protege_pintinho_ate_dias", "Protege pintinho até", "dias")}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ConfiguracaoHistereseClima;
