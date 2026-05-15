import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Lightbulb, Sun, Moon, Loader2, Save, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CurvaFotoperiodoChart } from "@/components/iot/CurvaFotoperiodoChart";
import { OverridesAtivosLista } from "@/components/iot/OverridesAtivosLista";
import { TEMPLATES_PROGRAMAS } from "@/lib/templates/programasIluminacao";

interface Programa {
  id: string;
  nome: string;
  tipo_producao: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
}

interface Faixa {
  id?: string;
  programa_id?: string;
  dia_inicio: number;
  dia_fim: number;
  horas_luz: number;
  blocos: { acender: string; apagar: string; intensidade_pct?: number }[];
  ramp_up_min: number;
  ramp_down_min: number;
  intensidade_pct: number;
}

function calcHorasLuz(blocos: Faixa["blocos"]): number {
  const horas = blocos.reduce((acc, b) => {
    const [hA, mA] = b.acender.split(":").map(Number);
    const [hP, mP] = b.apagar.split(":").map(Number);
    let diff = (hP * 60 + mP) - (hA * 60 + mA);
    if (diff <= 0) diff += 1440;
    return acc + diff / 60;
  }, 0);
  return Math.round(horas * 10) / 10;
}

export default function ProgramasIluminacao() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [selecionado, setSelecionado] = useState<Programa | null>(null);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("frango_corte");
  const [novoTemplate, setNovoTemplate] = useState<string>("vazio");

  const fetchProgramas = async () => {
    if (!integradoId) return;
    setLoading(true);
    const { data } = await supabase
      .from("programa_iluminacao_lote")
      .select("*")
      .eq("integrado_id", integradoId)
      .order("is_default", { ascending: false })
      .order("nome");
    setProgramas((data || []) as Programa[]);
    if (data?.length && !selecionado) setSelecionado(data[0] as Programa);
    setLoading(false);
  };

  const fetchFaixas = async (programaId: string) => {
    const { data } = await supabase
      .from("programa_iluminacao_faixa")
      .select("*")
      .eq("programa_id", programaId)
      .order("dia_inicio");
    setFaixas((data || []) as unknown as Faixa[]);
    setDirty(new Set());
  };

  useEffect(() => { fetchProgramas(); /* eslint-disable-next-line */ }, [integradoId]);
  useEffect(() => { if (selecionado) fetchFaixas(selecionado.id); /* eslint-disable-next-line */ }, [selecionado?.id]);

  // Aviso ao fechar/recarregar
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const confirmarSair = (msg = "Há alterações não salvas. Sair mesmo assim?") => {
    if (dirty.size === 0) return true;
    return confirm(msg);
  };

  const editarFaixa = useCallback((id: string, patch: Partial<Faixa>) => {
    setFaixas((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const next = { ...f, ...patch };
      if (patch.blocos) next.horas_luz = calcHorasLuz(patch.blocos);
      return next;
    }));
    setDirty((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
  }, []);

  const salvarFaixa = async (faixa: Faixa) => {
    if (!faixa.id) return;
    setSavingIds((s) => new Set(s).add(faixa.id!));
    const { error } = await supabase
      .from("programa_iluminacao_faixa")
      .update({
        dia_inicio: faixa.dia_inicio,
        dia_fim: faixa.dia_fim,
        horas_luz: faixa.horas_luz,
        blocos: faixa.blocos,
        ramp_up_min: faixa.ramp_up_min,
        ramp_down_min: faixa.ramp_down_min,
        intensidade_pct: faixa.intensidade_pct,
      })
      .eq("id", faixa.id);
    setSavingIds((s) => { const n = new Set(s); n.delete(faixa.id!); return n; });
    if (error) { toast.error(`Falha ao salvar: ${error.message}`); return false; }
    setDirty((prev) => { const n = new Set(prev); n.delete(faixa.id!); return n; });
    return true;
  };

  const salvarTudo = async () => {
    const pendentes = faixas.filter((f) => f.id && dirty.has(f.id));
    if (pendentes.length === 0) { toast.info("Nada para salvar"); return; }
    let ok = 0;
    for (const f of pendentes) {
      const r = await salvarFaixa(f);
      if (r) ok++;
    }
    if (ok === pendentes.length) toast.success(`${ok} faixa(s) atualizada(s)`);
    else toast.warning(`${ok}/${pendentes.length} salvas — verifique erros`);
    if (selecionado) fetchFaixas(selecionado.id);
  };

  const criarPrograma = async () => {
    if (!integradoId || !novoNome.trim()) return;
    const template = TEMPLATES_PROGRAMAS.find((t) => t.id === novoTemplate);
    const tipoFinal = template?.tipo_producao ?? novoTipo;
    const { data, error } = await supabase.from("programa_iluminacao_lote").insert({
      integrado_id: integradoId,
      nome: novoNome.trim(),
      tipo_producao: tipoFinal,
      ativo: true,
      descricao: template?.descricao ?? null,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    if (template) {
      const faixasInsert = template.faixas.map((f) => ({ ...f, programa_id: data.id }));
      const { error: e2 } = await supabase.from("programa_iluminacao_faixa").insert(faixasInsert);
      if (e2) toast.error(`Programa criado, mas falhou ao inserir faixas: ${e2.message}`);
    }

    toast.success(template ? `Programa criado a partir do template ${template.label}` : "Programa criado");
    setNovoNome(""); setNovoTemplate("vazio"); setNovoOpen(false);
    await fetchProgramas();
    setSelecionado(data as Programa);
  };

  const adicionarFaixa = async () => {
    if (!selecionado) return;
    if (!confirmarSair("Adicionar nova faixa descartará alterações não salvas. Continuar?")) return;
    const ultima = faixas[faixas.length - 1];
    const inicio = ultima ? ultima.dia_fim + 1 : 1;
    const { error } = await supabase.from("programa_iluminacao_faixa").insert({
      programa_id: selecionado.id,
      dia_inicio: inicio, dia_fim: inicio + 6, horas_luz: 18,
      blocos: [{ acender: "05:00", apagar: "23:00", intensidade_pct: 80 }],
      ramp_up_min: 15, ramp_down_min: 15, intensidade_pct: 80,
    });
    if (error) { toast.error(error.message); return; }
    fetchFaixas(selecionado.id);
  };

  const removerFaixa = async (id: string) => {
    if (!confirm("Remover esta faixa?")) return;
    const { error } = await supabase.from("programa_iluminacao_faixa").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setDirty((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (selecionado) fetchFaixas(selecionado.id);
  };

  const removerPrograma = async () => {
    if (!selecionado || !confirm(`Remover programa "${selecionado.nome}"?`)) return;
    const { error } = await supabase.from("programa_iluminacao_lote").delete().eq("id", selecionado.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Programa removido");
    setSelecionado(null);
    fetchProgramas();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { if (confirmarSair()) navigate(-1); }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Lightbulb className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Programas de Iluminação</h1>
            <p className="text-sm text-muted-foreground">Defina o fotoperíodo por faixa de idade do lote</p>
          </div>
          {dirty.size > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 gap-1">
              <AlertCircle className="w-3 h-3" />
              {dirty.size} não salva{dirty.size > 1 ? "s" : ""}
            </Badge>
          )}
          <Button onClick={() => setNovoOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo programa</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : programas.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhum programa cadastrado. Clique em "Novo programa" para começar.
          </CardContent></Card>
        ) : (
          <Tabs
            value={selecionado?.id}
            onValueChange={(v) => {
              if (!confirmarSair("Trocar de programa descartará alterações não salvas. Continuar?")) return;
              setSelecionado(programas.find((p) => p.id === v) || null);
            }}
          >
            <TabsList className="flex flex-wrap h-auto">
              {programas.map((p) => (
                <TabsTrigger key={p.id} value={p.id} className="gap-2">
                  {p.nome}
                  {p.is_default && <Badge variant="outline" className="text-[10px]">padrão</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>

            {selecionado && (
              <TabsContent value={selecionado.id}>
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selecionado.nome}
                        <Badge variant="secondary">{selecionado.tipo_producao}</Badge>
                      </CardTitle>
                      <CardDescription>{selecionado.descricao || "Sem descrição"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={selecionado.is_default}
                          onCheckedChange={async (v) => {
                            const { error } = await supabase
                              .from("programa_iluminacao_lote")
                              .update({ is_default: v })
                              .eq("id", selecionado.id);
                            if (error) { toast.error(error.message); return; }
                            toast.success(v ? "Definido como padrão" : "Removido do padrão");
                            await fetchProgramas();
                          }}
                        />
                        <Label className="text-xs">Padrão p/ {selecionado.tipo_producao}</Label>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={salvarTudo}
                        disabled={dirty.size === 0 || savingIds.size > 0}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar tudo {dirty.size > 0 ? `(${dirty.size})` : ""}
                      </Button>
                      <Button variant="outline" size="sm" onClick={adicionarFaixa}>
                        <Plus className="w-4 h-4 mr-2" />Faixa
                      </Button>
                      {!selecionado.is_default && (
                        <Button variant="ghost" size="sm" onClick={removerPrograma}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Idade (dias)</TableHead>
                          <TableHead>Horas de luz</TableHead>
                          <TableHead><Sun className="w-3 h-3 inline" /> Acender</TableHead>
                          <TableHead><Moon className="w-3 h-3 inline" /> Apagar</TableHead>
                          <TableHead>Ramp ↑/↓ (min)</TableHead>
                          <TableHead>Intensidade %</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faixas.map((f) => {
                          const bloco = f.blocos?.[0] || { acender: "05:00", apagar: "23:00" };
                          const isDirty = f.id ? dirty.has(f.id) : false;
                          const isSaving = f.id ? savingIds.has(f.id) : false;
                          return (
                            <TableRow
                              key={f.id}
                              className={isDirty ? "bg-amber-50/40 dark:bg-amber-950/20 border-l-2 border-l-amber-400" : ""}
                            >
                              <TableCell className="flex gap-1 items-center">
                                <Input type="number" className="w-16 h-8" value={f.dia_inicio}
                                  onChange={(e) => editarFaixa(f.id!, { dia_inicio: Number(e.target.value) })} />
                                <span>–</span>
                                <Input type="number" className="w-16 h-8" value={f.dia_fim}
                                  onChange={(e) => editarFaixa(f.id!, { dia_fim: Number(e.target.value) })} />
                              </TableCell>
                              <TableCell><Badge variant="outline">{f.horas_luz}h</Badge></TableCell>
                              <TableCell>
                                <Input type="time" className="w-28 h-8" value={bloco.acender}
                                  onChange={(e) => editarFaixa(f.id!, { blocos: [{ ...bloco, acender: e.target.value }] })} />
                              </TableCell>
                              <TableCell>
                                <Input type="time" className="w-28 h-8" value={bloco.apagar}
                                  onChange={(e) => editarFaixa(f.id!, { blocos: [{ ...bloco, apagar: e.target.value }] })} />
                              </TableCell>
                              <TableCell className="flex gap-1">
                                <Input type="number" className="w-16 h-8" value={f.ramp_up_min}
                                  onChange={(e) => editarFaixa(f.id!, { ramp_up_min: Number(e.target.value) })} />
                                <Input type="number" className="w-16 h-8" value={f.ramp_down_min}
                                  onChange={(e) => editarFaixa(f.id!, { ramp_down_min: Number(e.target.value) })} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min={0} max={100} className="w-20 h-8" value={f.intensidade_pct}
                                  onChange={(e) => editarFaixa(f.id!, { intensidade_pct: Number(e.target.value) })} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant={isDirty ? "default" : "ghost"}
                                    size="sm"
                                    disabled={!isDirty || isSaving}
                                    onClick={async () => {
                                      const ok = await salvarFaixa(f);
                                      if (ok) toast.success("Faixa salva");
                                    }}
                                  >
                                    {isSaving
                                      ? <Loader2 className="w-4 h-4 animate-spin" />
                                      : <Save className="w-4 h-4" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => removerFaixa(f.id!)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {faixas.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        Sem faixas. Clique em "Faixa" para adicionar.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <CurvaFotoperiodoChart faixas={faixas as any} />

                <OverridesAtivosLista />

                <Card className="mt-4 bg-muted/30">
                  <CardHeader><CardTitle className="text-sm">Como aplicar</CardTitle></CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>1. Edite os campos da faixa e clique em <strong>Salvar</strong> (linha) ou <strong>Salvar tudo</strong> (topo). Linhas com alterações pendentes ficam destacadas em âmbar.</p>
                    <p>2. Cada lote pode ser vinculado a um programa em "Editar lote → Programa de iluminação".</p>
                    <p>3. Lotes sem vínculo usam o programa marcado como <strong>padrão</strong> para o tipo de produção.</p>
                    <p>4. Ramp-up/down simulam amanhecer/anoitecer suaves (apenas em canais com PWM via ESP32).</p>
                    <p>5. Sonoff on/off: ignora intensidade e ramp — liga/desliga conforme o bloco.</p>
                    <p>6. A automação roda a cada 1 minuto; mudanças refletem no campo no próximo ciclo após salvar.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}

        <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo programa de iluminação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Template (opcional)</Label>
                <Select value={novoTemplate} onValueChange={setNovoTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vazio">Em branco (sem faixas)</SelectItem>
                    {TEMPLATES_PROGRAMAS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {novoTemplate !== "vazio" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {TEMPLATES_PROGRAMAS.find((t) => t.id === novoTemplate)?.descricao}
                  </p>
                )}
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Cobb 500 verão" />
              </div>
              <div>
                <Label>Tipo de produção</Label>
                <Select
                  value={novoTemplate !== "vazio" ? (TEMPLATES_PROGRAMAS.find((t) => t.id === novoTemplate)?.tipo_producao ?? novoTipo) : novoTipo}
                  onValueChange={setNovoTipo}
                  disabled={novoTemplate !== "vazio"}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frango_corte">Frango de corte</SelectItem>
                    <SelectItem value="postura">Postura comercial</SelectItem>
                    <SelectItem value="matriz">Matriz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovoOpen(false)}>Cancelar</Button>
              <Button onClick={criarPrograma}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
