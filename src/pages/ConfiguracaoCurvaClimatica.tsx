import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Thermometer, Droplets, Wind, Plus, Copy, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useAuth } from "@/hooks/useAuth";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";
import { getLinhagemLabel } from "@/lib/utils/labels";

interface CurvaRef {
  id: string;
  nome: string;
  linhagem: string;
  sexo: string;
  tipo_producao: string;
  publica: boolean;
  integrado_id: string | null;
  fonte: string | null;
}

interface Ponto {
  id?: string;
  curva_id?: string;
  dia_idade: number;
  temp_alvo_c: number;
  temp_min_alarme_c: number;
  temp_max_alarme_c: number;
  ur_min_pct: number | null;
  ur_max_pct: number | null;
  velocidade_ar_min_ms: number | null;
  velocidade_ar_max_ms: number | null;
  ith_alarme_amarelo: number | null;
  ith_alarme_vermelho: number | null;
}

const ConfiguracaoCurvaClimatica = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const integradoId = useIntegradoId();

  const [curvas, setCurvas] = useState<CurvaRef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => curvas.find((c) => c.id === selectedId) || null, [curvas, selectedId]);
  const isReadOnly = !!selected?.publica && selected?.integrado_id === null;

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("curva_climatica_referencia")
      .select("*")
      .or(`publica.eq.true,integrado_id.eq.${integradoId}`)
      .order("publica", { ascending: false })
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar curvas");
    } else {
      setCurvas(data as CurvaRef[]);
      if (!selectedId && data && data.length > 0) setSelectedId(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (integradoId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integradoId]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      const { data, error } = await supabase
        .from("curva_climatica_ponto")
        .select("*")
        .eq("curva_id", selectedId)
        .order("dia_idade");
      if (error) toast.error("Erro ao carregar pontos da curva");
      else setPontos((data as Ponto[]) || []);
    })();
  }, [selectedId]);

  const duplicarTemplate = async () => {
    if (!selected) return;
    const novo = {
      integrado_id: integradoId,
      nome: `${selected.nome} (cópia)`,
      linhagem: selected.linhagem,
      sexo: selected.sexo,
      tipo_producao: selected.tipo_producao,
      publica: false,
      fonte: `Cópia de ${selected.nome}`,
    };
    const { data, error } = await supabase
      .from("curva_climatica_referencia")
      .insert(novo)
      .select()
      .single();
    if (error || !data) {
      toast.error("Erro ao duplicar curva");
      return;
    }
    if (pontos.length > 0) {
      const copia = pontos.map(({ id, curva_id, ...rest }) => ({ ...rest, curva_id: data.id }));
      const { error: e2 } = await supabase.from("curva_climatica_ponto").insert(copia);
      if (e2) {
        toast.error("Curva criada, mas pontos não copiaram");
      }
    }
    toast.success("Curva duplicada");
    setSelectedId(data.id);
    carregar();
  };

  const removerCurva = async () => {
    if (!selected || isReadOnly) return;
    if (!confirm(`Excluir curva "${selected.nome}"?`)) return;
    const { error } = await supabase.from("curva_climatica_referencia").delete().eq("id", selected.id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Curva excluída");
      setSelectedId(null);
      carregar();
    }
  };

  const atualizarPonto = (idx: number, campo: keyof Ponto, valor: number) => {
    setPontos((prev) => prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)));
  };

  const salvarPontos = async () => {
    if (!selected || isReadOnly) return;
    setSaving(true);
    // upsert all
    const payload = pontos.map((p) => ({ ...p, curva_id: selected.id }));
    const { error } = await supabase
      .from("curva_climatica_ponto")
      .upsert(payload, { onConflict: "curva_id,dia_idade" });
    setSaving(false);
    if (error) toast.error(`Erro ao salvar: ${error.message}`);
    else toast.success("Curva salva");
  };

  if (authLoading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const chartData = pontos.map((p) => ({
    dia: p.dia_idade,
    alvo: Number(p.temp_alvo_c),
    min: Number(p.temp_min_alarme_c),
    max: Number(p.temp_max_alarme_c),
    ur_min: p.ur_min_pct,
    ur_max: p.ur_max_pct,
    vel_min: p.velocidade_ar_min_ms,
    vel_max: p.velocidade_ar_max_ms,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" /> Curva Climática por Linhagem
          </h1>
          <div />
        </div>

        <Alert>
          <AlertDescription>
            Curvas diárias de temperatura, umidade e velocidade de ar baseadas em padrões internacionais (Cobb, Ross,
            Hubbard, Lohmann, Hy-Line). Templates públicos não podem ser editados — duplique para personalizar.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-[320px_1fr] gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Curvas disponíveis</CardTitle>
              <CardDescription>{loading ? "Carregando..." : `${curvas.length} curva(s)`}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {curvas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{c.nome}</span>
                    {c.publica && (
                      <Badge variant="secondary" className="text-xs">
                        Template
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getLinhagemLabel(c.linhagem)} · {c.sexo} · {c.tipo_producao}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">{selected?.nome ?? "Selecione uma curva"}</CardTitle>
                  <CardDescription>
                    {isReadOnly
                      ? "Template público (somente leitura). Duplique para editar."
                      : `Editando curva da organização — ${pontos.length} ponto(s)`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selected && (
                    <Button size="sm" variant="outline" onClick={duplicarTemplate}>
                      <Copy className="h-4 w-4 mr-2" /> Duplicar
                    </Button>
                  )}
                  {selected && !isReadOnly && (
                    <>
                      <Button size="sm" variant="outline" onClick={removerCurva}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </Button>
                      <Button size="sm" onClick={salvarPontos} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selected && pontos.length > 0 ? (
                <Tabs defaultValue="grafico">
                  <TabsList>
                    <TabsTrigger value="grafico">
                      <Thermometer className="h-4 w-4 mr-2" /> Gráfico
                    </TabsTrigger>
                    <TabsTrigger value="tabela">Tabela diária</TabsTrigger>
                  </TabsList>

                  <TabsContent value="grafico" className="space-y-4">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="°C" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.5rem",
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="max" stroke="hsl(var(--destructive))" name="Máx alarme" dot={false} />
                          <Line type="monotone" dataKey="alvo" stroke="hsl(var(--primary))" name="Alvo" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="min" stroke="hsl(var(--accent))" name="Mín alarme" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="h-48">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Droplets className="h-3 w-3" /> Umidade alvo (%)
                        </p>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="dia" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                            <Line type="monotone" dataKey="ur_min" stroke="hsl(var(--accent))" name="UR mín" dot={false} />
                            <Line type="monotone" dataKey="ur_max" stroke="hsl(var(--primary))" name="UR máx" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-48">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Wind className="h-3 w-3" /> Velocidade de ar (m/s)
                        </p>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="dia" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                            <Line type="monotone" dataKey="vel_min" stroke="hsl(var(--accent))" name="Vel mín" dot={false} />
                            <Line type="monotone" dataKey="vel_max" stroke="hsl(var(--primary))" name="Vel máx" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tabela">
                    <div className="overflow-auto max-h-[60vh] border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Dia</th>
                            <th className="p-2 text-left">Alvo °C</th>
                            <th className="p-2 text-left">Mín °C</th>
                            <th className="p-2 text-left">Máx °C</th>
                            <th className="p-2 text-left">UR mín %</th>
                            <th className="p-2 text-left">UR máx %</th>
                            <th className="p-2 text-left">Vel mín m/s</th>
                            <th className="p-2 text-left">Vel máx m/s</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pontos.map((p, idx) => (
                            <tr key={p.dia_idade} className="border-t">
                              <td className="p-2 font-medium">{p.dia_idade}</td>
                              {(["temp_alvo_c", "temp_min_alarme_c", "temp_max_alarme_c", "ur_min_pct", "ur_max_pct", "velocidade_ar_min_ms", "velocidade_ar_max_ms"] as (keyof Ponto)[]).map((c) => (
                                <td key={c} className="p-1">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    disabled={isReadOnly}
                                    value={(p[c] as number) ?? ""}
                                    onChange={(e) => atualizarPonto(idx, c, parseFloat(e.target.value))}
                                    className="h-8 w-20"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione uma curva à esquerda para visualizar.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ConfiguracaoCurvaClimatica;
