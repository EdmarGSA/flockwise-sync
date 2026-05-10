import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Wind, Plus, Trash2, Gauge } from "lucide-react";
import { toast } from "sonner";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";

type Modo = "positiva_simples" | "negativa_tunel" | "minima_apenas";

interface Estagio {
  estagio: "min" | "transicao" | "tunel" | "heat_stress";
  temp_min?: number;
  temp_max?: number;
  ventiladores_n: number;
  ciclo_on_s?: number;
  ciclo_off_s?: number;
  posicao_inlet_pct?: number;
  posicao_cortina_pct?: number;
}

interface Programa {
  id?: string;
  galpao_id: string;
  modo: Modo;
  estagios: Estagio[];
  pressao_estatica_alvo_pa: number | null;
  velocidade_alvo_ms_min: number | null;
  velocidade_alvo_ms_max: number | null;
  area_transversal_m2: number | null;
  troca_ar_brooding_ativa: boolean;
  troca_ar_brooding_max_pct: number;
  ativo: boolean;
}

interface Galpao {
  id: string;
  nome: string;
  largura: number | null;
  altura: number | null;
  comprimento: number | null;
  tipo_pressao: string | null;
  ventilador_quantidade: number | null;
}

const DEFAULT_ESTAGIOS_POSITIVA: Estagio[] = [
  { estagio: "min", temp_max: 24, ventiladores_n: 1, ciclo_on_s: 30, ciclo_off_s: 60, posicao_cortina_pct: 0 },
  { estagio: "transicao", temp_min: 24, temp_max: 28, ventiladores_n: 4, posicao_cortina_pct: 40 },
  { estagio: "tunel", temp_min: 28, ventiladores_n: 24, posicao_cortina_pct: 100 },
];

const DEFAULT_ESTAGIOS_NEGATIVA: Estagio[] = [
  { estagio: "min", temp_max: 24, ventiladores_n: 1, ciclo_on_s: 30, ciclo_off_s: 60, posicao_inlet_pct: 30 },
  { estagio: "transicao", temp_min: 24, temp_max: 28, ventiladores_n: 6, posicao_inlet_pct: 60 },
  { estagio: "tunel", temp_min: 28, ventiladores_n: 32, posicao_inlet_pct: 100 },
];

const ConfiguracaoVentilacao = () => {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [galpaoId, setGalpaoId] = useState<string>("");
  const [prog, setProg] = useState<Programa | null>(null);
  const [cfmCanais, setCfmCanais] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carrega galpões da org
  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      const { data: nucleos } = await supabase
        .from("nucleos")
        .select("id")
        .eq("integrado_id", integradoId);
      const nIds = (nucleos ?? []).map((n: any) => n.id);
      if (nIds.length === 0) {
        setGalpoes([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("galpoes")
        .select("id, nome, largura, altura, comprimento, tipo_pressao, ventilador_quantidade")
        .in("nucleo_id", nIds)
        .eq("ativo", true)
        .order("nome");
      setGalpoes(data ?? []);
      setLoading(false);
    })();
  }, [integradoId]);

  const galpaoSel = useMemo(
    () => galpoes.find((g) => g.id === galpaoId) ?? null,
    [galpoes, galpaoId],
  );

  // Carrega programa + cfm
  useEffect(() => {
    if (!galpaoId || !integradoId) return;
    (async () => {
      const { data } = await supabase
        .from("programa_ventilacao_galpao")
        .select("*")
        .eq("galpao_id", galpaoId)
        .maybeSingle();

      const g = galpoes.find((x) => x.id === galpaoId);
      const area =
        g?.largura && g?.altura ? Number(g.largura) * Number(g.altura) : null;

      if (data) {
        setProg({
          id: data.id,
          galpao_id: data.galpao_id,
          modo: data.modo as Modo,
          estagios: (data.estagios as unknown as Estagio[]) ?? [],
          pressao_estatica_alvo_pa: data.pressao_estatica_alvo_pa,
          velocidade_alvo_ms_min: data.velocidade_alvo_ms_min,
          velocidade_alvo_ms_max: data.velocidade_alvo_ms_max,
          area_transversal_m2: data.area_transversal_m2 ?? area,
          troca_ar_brooding_ativa: (data as any).troca_ar_brooding_ativa ?? true,
          troca_ar_brooding_max_pct: (data as any).troca_ar_brooding_max_pct ?? 25,
          ativo: data.ativo,
        });
      } else {
        const modo: Modo =
          g?.tipo_pressao === "negativa" ? "negativa_tunel" : "positiva_simples";
        setProg({
          galpao_id: galpaoId,
          modo,
          estagios: modo === "negativa_tunel" ? DEFAULT_ESTAGIOS_NEGATIVA : DEFAULT_ESTAGIOS_POSITIVA,
          pressao_estatica_alvo_pa: modo === "negativa_tunel" ? 25 : null,
          velocidade_alvo_ms_min: modo === "negativa_tunel" ? 2.0 : null,
          velocidade_alvo_ms_max: modo === "negativa_tunel" ? 3.0 : null,
          area_transversal_m2: area,
          troca_ar_brooding_ativa: true,
          troca_ar_brooding_max_pct: 25,
          ativo: true,
        });
      }

      // CFM dos canais ventilação ativos do galpão
      const { data: disps } = await supabase
        .from("dispositivos_iot")
        .select("id")
        .eq("integrado_id", integradoId)
        .eq("galpao_id", galpaoId);
      const dIds = (disps ?? []).map((d: any) => d.id);
      if (dIds.length) {
        const { data: cs } = await supabase
          .from("canais_dispositivo")
          .select("cfm_nominal")
          .in("dispositivo_id", dIds)
          .eq("funcao_automacao", "ventilacao")
          .eq("ativo", true);
        setCfmCanais(
          (cs ?? []).reduce((s: number, c: any) => s + (Number(c.cfm_nominal) || 0), 0),
        );
      } else setCfmCanais(0);
    })();
  }, [galpaoId, integradoId, galpoes]);

  const updateEstagio = (idx: number, patch: Partial<Estagio>) => {
    if (!prog) return;
    const next = [...prog.estagios];
    next[idx] = { ...next[idx], ...patch };
    setProg({ ...prog, estagios: next });
  };
  const addEstagio = () => {
    if (!prog) return;
    setProg({
      ...prog,
      estagios: [...prog.estagios, { estagio: "transicao", ventiladores_n: 1 }],
    });
  };
  const rmEstagio = (idx: number) => {
    if (!prog) return;
    setProg({ ...prog, estagios: prog.estagios.filter((_, i) => i !== idx) });
  };

  const velSimulada = useMemo(() => {
    if (!prog || prog.modo !== "negativa_tunel" || !prog.area_transversal_m2 || cfmCanais <= 0)
      return null;
    return (cfmCanais * 0.000472) / (prog.area_transversal_m2 * 0.85);
  }, [prog, cfmCanais]);

  const salvar = async () => {
    if (!prog || !integradoId) return;
    setSaving(true);
    const payload = {
      ...prog,
      integrado_id: integradoId,
      estagios: prog.estagios as unknown as any,
    };
    const { error } = await supabase
      .from("programa_ventilacao_galpao")
      .upsert(payload, { onConflict: "galpao_id" });
    setSaving(false);
    if (error) toast.error(`Erro: ${error.message}`);
    else toast.success("Programa de ventilação salvo");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/configuracoes")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wind className="h-8 w-8 text-primary" /> Programa de Ventilação por Galpão
          </h1>
          <p className="text-muted-foreground">
            Configure estágios (mínima → transição → túnel) para pressão positiva ou negativa,
            com simulador de velocidade de ar e meta de pressão estática.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Galpão</CardTitle>
            <CardDescription>Escolha o galpão para configurar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={galpaoId} onValueChange={setGalpaoId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um galpão" />
              </SelectTrigger>
              <SelectContent>
                {galpoes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}{" "}
                    {g.tipo_pressao && (
                      <Badge variant="outline" className="ml-2">
                        {g.tipo_pressao}
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {galpaoSel && (
              <div className="mt-3 text-sm text-muted-foreground">
                Dimensões: {galpaoSel.comprimento ?? "?"}m × {galpaoSel.largura ?? "?"}m ×{" "}
                {galpaoSel.altura ?? "?"}m · Ventiladores físicos:{" "}
                {galpaoSel.ventilador_quantidade ?? "?"} · CFM total cadastrado nos canais:{" "}
                <strong>{cfmCanais.toLocaleString("pt-BR")}</strong>
              </div>
            )}
          </CardContent>
        </Card>

        {prog && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Modo de Pressão</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={prog.modo}
                    onValueChange={(v) =>
                      setProg({
                        ...prog,
                        modo: v as Modo,
                        estagios:
                          v === "negativa_tunel"
                            ? DEFAULT_ESTAGIOS_NEGATIVA
                            : v === "positiva_simples"
                              ? DEFAULT_ESTAGIOS_POSITIVA
                              : prog.estagios,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positiva_simples">Positiva (simples)</SelectItem>
                      <SelectItem value="negativa_tunel">Negativa (túnel)</SelectItem>
                      <SelectItem value="minima_apenas">Apenas ventilação mínima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área transversal (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={prog.area_transversal_m2 ?? ""}
                    onChange={(e) =>
                      setProg({
                        ...prog,
                        area_transversal_m2: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                {prog.modo === "negativa_tunel" && (
                  <>
                    <div>
                      <Label>Pressão estática alvo (Pa)</Label>
                      <Input
                        type="number"
                        value={prog.pressao_estatica_alvo_pa ?? ""}
                        onChange={(e) =>
                          setProg({
                            ...prog,
                            pressao_estatica_alvo_pa: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Faixa típica 25–37 Pa (0.10–0.15 pol. H₂O).
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Vel. alvo mín (m/s)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={prog.velocidade_alvo_ms_min ?? ""}
                          onChange={(e) =>
                            setProg({
                              ...prog,
                              velocidade_alvo_ms_min: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Vel. alvo máx (m/s)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={prog.velocidade_alvo_ms_max ?? ""}
                          onChange={(e) =>
                            setProg({
                              ...prog,
                              velocidade_alvo_ms_max: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {prog.modo === "negativa_tunel" && (
              <Alert className="mb-6">
                <Gauge className="h-4 w-4" />
                <AlertDescription>
                  <strong>Simulador de velocidade de ar (túnel cheio):</strong>{" "}
                  {velSimulada != null
                    ? `${velSimulada.toFixed(2)} m/s`
                    : "informe área transversal e CFM dos canais"}
                  {velSimulada != null && prog.velocidade_alvo_ms_max && (
                    <>
                      {" "}
                      —{" "}
                      {velSimulada >= (prog.velocidade_alvo_ms_min ?? 0) &&
                      velSimulada <= prog.velocidade_alvo_ms_max
                        ? "✅ dentro da faixa alvo"
                        : "⚠️ fora da faixa alvo"}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estágios</CardTitle>
                  <CardDescription>
                    Cada estágio define faixa de temperatura, nº de ventiladores ativos e %
                    de inlet/cortina.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addEstagio}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {prog.estagios.map((e, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end border rounded-md p-3"
                  >
                    <div>
                      <Label className="text-xs">Estágio</Label>
                      <Select
                        value={e.estagio}
                        onValueChange={(v) =>
                          updateEstagio(i, { estagio: v as Estagio["estagio"] })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="min">Mínima</SelectItem>
                          <SelectItem value="transicao">Transição</SelectItem>
                          <SelectItem value="tunel">Túnel</SelectItem>
                          <SelectItem value="heat_stress">Heat stress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">T mín (°C)</Label>
                      <Input
                        type="number" step="0.1"
                        value={e.temp_min ?? ""}
                        onChange={(ev) =>
                          updateEstagio(i, { temp_min: ev.target.value ? Number(ev.target.value) : undefined })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">T máx (°C)</Label>
                      <Input
                        type="number" step="0.1"
                        value={e.temp_max ?? ""}
                        onChange={(ev) =>
                          updateEstagio(i, { temp_max: ev.target.value ? Number(ev.target.value) : undefined })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ventiladores</Label>
                      <Input
                        type="number"
                        value={e.ventiladores_n}
                        onChange={(ev) => updateEstagio(i, { ventiladores_n: Number(ev.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ciclo on/off (s)</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={e.ciclo_on_s ?? ""}
                          onChange={(ev) =>
                            updateEstagio(i, { ciclo_on_s: ev.target.value ? Number(ev.target.value) : undefined })
                          }
                        />
                        <Input
                          type="number"
                          value={e.ciclo_off_s ?? ""}
                          onChange={(ev) =>
                            updateEstagio(i, { ciclo_off_s: ev.target.value ? Number(ev.target.value) : undefined })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">
                        {prog.modo === "negativa_tunel" ? "Inlet %" : "Cortina %"}
                      </Label>
                      <Input
                        type="number" min={0} max={100}
                        value={
                          prog.modo === "negativa_tunel"
                            ? e.posicao_inlet_pct ?? ""
                            : e.posicao_cortina_pct ?? ""
                        }
                        onChange={(ev) =>
                          updateEstagio(
                            i,
                            prog.modo === "negativa_tunel"
                              ? { posicao_inlet_pct: ev.target.value ? Number(ev.target.value) : undefined }
                              : { posicao_cortina_pct: ev.target.value ? Number(ev.target.value) : undefined },
                          )
                        }
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => rmEstagio(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={salvar} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar programa"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ConfiguracaoVentilacao;
