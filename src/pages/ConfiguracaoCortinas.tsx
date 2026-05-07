import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Layers, Wind } from "lucide-react";
import { toast } from "sonner";

interface Galpao { id: string; nome: string; nucleo_id: string; }
interface Programa {
  id?: string;
  galpao_id: string;
  modo: string;
  posicao_min_pct: number;
  posicao_max_pct: number;
  velocidade_abertura_pct_min: number;
  velocidade_fechamento_pct_min: number;
  offset_estagio_min_pct: number;
  offset_estagio_transicao_pct: number;
  offset_estagio_tunel_pct: number;
  offset_estagio_heat_stress_pct: number;
  considerar_vento_externo: boolean;
  vento_externo_max_ms: number;
  ativo: boolean;
}

const defaultPrograma = (galpao_id: string): Programa => ({
  galpao_id,
  modo: "hibrido",
  posicao_min_pct: 0,
  posicao_max_pct: 100,
  velocidade_abertura_pct_min: 10,
  velocidade_fechamento_pct_min: 5,
  offset_estagio_min_pct: 10,
  offset_estagio_transicao_pct: 40,
  offset_estagio_tunel_pct: 100,
  offset_estagio_heat_stress_pct: 100,
  considerar_vento_externo: true,
  vento_externo_max_ms: 8,
  ativo: true,
});

export default function ConfiguracaoCortinas() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [selectedGalpao, setSelectedGalpao] = useState<string>("");
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [estado, setEstado] = useState<{ posicao_atual_pct: number | null; posicao_alvo_pct: number | null; ultimo_motivo: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      const { data } = await supabase
        .from("galpoes")
        .select("id, nome, nucleo_id, nucleos!inner(integrado_id)")
        .eq("nucleos.integrado_id", integradoId)
        .eq("ativo", true)
        .order("nome");
      setGalpoes((data ?? []) as any);
    })();
  }, [integradoId]);

  useEffect(() => {
    if (!selectedGalpao) { setPrograma(null); setEstado(null); return; }
    (async () => {
      const { data } = await supabase
        .from("programa_cortina_inteligente")
        .select("*")
        .eq("galpao_id", selectedGalpao)
        .maybeSingle();
      setPrograma(data ? (data as any) : defaultPrograma(selectedGalpao));

      const { data: est } = await supabase
        .from("cortina_estado_atual")
        .select("posicao_atual_pct, posicao_alvo_pct, ultimo_motivo")
        .eq("galpao_id", selectedGalpao)
        .maybeSingle();
      setEstado(est as any);
    })();
  }, [selectedGalpao]);

  const handleSave = async () => {
    if (!programa || !integradoId) return;
    setSaving(true);
    try {
      const payload = { ...programa, integrado_id: integradoId };
      const { error } = await supabase
        .from("programa_cortina_inteligente")
        .upsert(payload, { onConflict: "galpao_id" });
      if (error) throw error;
      toast.success("Programa de cortinas salvo");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof Programa>(k: K, v: Programa[K]) =>
    setPrograma((p) => (p ? { ...p, [k]: v } : p));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6" /> Cortinas Inteligentes
            </h1>
            <p className="text-muted-foreground text-sm">
              Posicionamento (%) automático por estágio de ventilação, idade e vento externo.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecione o galpão</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedGalpao} onValueChange={setSelectedGalpao}>
              <SelectTrigger><SelectValue placeholder="Escolha um galpão" /></SelectTrigger>
              <SelectContent>
                {galpoes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {programa && (
          <>
            {estado && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wind className="h-4 w-4" /> Estado atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 items-center">
                  <Badge variant="secondary">Posição: {estado.posicao_atual_pct ?? "—"}%</Badge>
                  <Badge variant="outline">Alvo: {estado.posicao_alvo_pct ?? "—"}%</Badge>
                  {estado.ultimo_motivo && (
                    <span className="text-xs text-muted-foreground">{estado.ultimo_motivo}</span>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Configuração geral</CardTitle>
                <CardDescription>Limites de posição, modo de controle e proteção contra vento.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Modo de controle</Label>
                  <Select value={programa.modo} onValueChange={(v) => update("modo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horario">Apenas horário</SelectItem>
                      <SelectItem value="temperatura">Apenas temperatura</SelectItem>
                      <SelectItem value="pressao_estatica">Pressão estática</SelectItem>
                      <SelectItem value="hibrido">Híbrido (recomendado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <Switch checked={programa.ativo} onCheckedChange={(v) => update("ativo", v)} />
                  <Label>Programa ativo</Label>
                </div>

                <div>
                  <Label>Posição mínima permitida: {programa.posicao_min_pct}%</Label>
                  <Slider value={[programa.posicao_min_pct]} min={0} max={100} step={5}
                    onValueChange={(v) => update("posicao_min_pct", v[0])} />
                </div>
                <div>
                  <Label>Posição máxima permitida: {programa.posicao_max_pct}%</Label>
                  <Slider value={[programa.posicao_max_pct]} min={0} max={100} step={5}
                    onValueChange={(v) => update("posicao_max_pct", v[0])} />
                </div>

                <div>
                  <Label>Velocidade de abertura (% por min)</Label>
                  <Input type="number" value={programa.velocidade_abertura_pct_min}
                    onChange={(e) => update("velocidade_abertura_pct_min", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Velocidade de fechamento (% por min)</Label>
                  <Input type="number" value={programa.velocidade_fechamento_pct_min}
                    onChange={(e) => update("velocidade_fechamento_pct_min", Number(e.target.value))} />
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={programa.considerar_vento_externo}
                    onCheckedChange={(v) => update("considerar_vento_externo", v)} />
                  <Label>Limitar abertura com vento forte</Label>
                </div>
                <div>
                  <Label>Vento externo máximo (m/s)</Label>
                  <Input type="number" step="0.5" value={programa.vento_externo_max_ms}
                    onChange={(e) => update("vento_externo_max_ms", Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Posição alvo por estágio de ventilação</CardTitle>
                <CardDescription>
                  Quanto a cortina deve abrir em cada estágio do programa de ventilação.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["offset_estagio_min_pct", "Mínima (CO₂/O₂)"],
                  ["offset_estagio_transicao_pct", "Transição"],
                  ["offset_estagio_tunel_pct", "Túnel"],
                  ["offset_estagio_heat_stress_pct", "Heat Stress (emergência)"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <Label>{label}: {(programa as any)[key]}%</Label>
                    <Slider value={[(programa as any)[key]]} min={0} max={100} step={5}
                      onValueChange={(v) => update(key as keyof Programa, v[0] as any)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar configuração"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
