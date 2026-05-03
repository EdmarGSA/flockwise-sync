import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Lightbulb, Sun, Moon, Loader2 } from "lucide-react";
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

export default function ProgramasIluminacao() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [selecionado, setSelecionado] = useState<Programa | null>(null);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
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
  };

  useEffect(() => { fetchProgramas(); /* eslint-disable-next-line */ }, [integradoId]);
  useEffect(() => { if (selecionado) fetchFaixas(selecionado.id); }, [selecionado]);

  const criarPrograma = async () => {
    if (!integradoId || !novoNome.trim()) return;
    const { data, error } = await supabase.from("programa_iluminacao_lote").insert({
      integrado_id: integradoId, nome: novoNome.trim(), tipo_producao: novoTipo, ativo: true,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Programa criado");
    setNovoNome(""); setNovoOpen(false);
    await fetchProgramas();
    setSelecionado(data as Programa);
  };

  const adicionarFaixa = async () => {
    if (!selecionado) return;
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

  const atualizarFaixa = async (faixa: Faixa, campo: keyof Faixa, valor: any) => {
    const update: any = { [campo]: valor };
    // sincroniza horas_luz com blocos quando muda acender/apagar
    if (campo === "blocos") {
      const horas = (valor as Faixa["blocos"]).reduce((acc, b) => {
        const [hA, mA] = b.acender.split(":").map(Number);
        const [hP, mP] = b.apagar.split(":").map(Number);
        let diff = (hP * 60 + mP) - (hA * 60 + mA);
        if (diff <= 0) diff += 1440;
        return acc + diff / 60;
      }, 0);
      update.horas_luz = Math.round(horas * 10) / 10;
    }
    const { error } = await supabase.from("programa_iluminacao_faixa").update(update).eq("id", faixa.id!);
    if (error) { toast.error(error.message); return; }
    if (selecionado) fetchFaixas(selecionado.id);
  };

  const removerFaixa = async (id: string) => {
    await supabase.from("programa_iluminacao_faixa").delete().eq("id", id);
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <Lightbulb className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Programas de Iluminação</h1>
            <p className="text-sm text-muted-foreground">Defina o fotoperíodo por faixa de idade do lote</p>
          </div>
          <Button onClick={() => setNovoOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo programa</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : programas.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhum programa cadastrado. Clique em "Novo programa" para começar.
          </CardContent></Card>
        ) : (
          <Tabs value={selecionado?.id} onValueChange={(v) => setSelecionado(programas.find((p) => p.id === v) || null)}>
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
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faixas.map((f) => {
                          const bloco = f.blocos?.[0] || { acender: "05:00", apagar: "23:00" };
                          return (
                            <TableRow key={f.id}>
                              <TableCell className="flex gap-1 items-center">
                                <Input type="number" className="w-16 h-8" value={f.dia_inicio}
                                  onChange={(e) => atualizarFaixa(f, "dia_inicio", Number(e.target.value))} />
                                <span>–</span>
                                <Input type="number" className="w-16 h-8" value={f.dia_fim}
                                  onChange={(e) => atualizarFaixa(f, "dia_fim", Number(e.target.value))} />
                              </TableCell>
                              <TableCell><Badge variant="outline">{f.horas_luz}h</Badge></TableCell>
                              <TableCell>
                                <Input type="time" className="w-28 h-8" value={bloco.acender}
                                  onChange={(e) => atualizarFaixa(f, "blocos", [{ ...bloco, acender: e.target.value }])} />
                              </TableCell>
                              <TableCell>
                                <Input type="time" className="w-28 h-8" value={bloco.apagar}
                                  onChange={(e) => atualizarFaixa(f, "blocos", [{ ...bloco, apagar: e.target.value }])} />
                              </TableCell>
                              <TableCell className="flex gap-1">
                                <Input type="number" className="w-16 h-8" value={f.ramp_up_min}
                                  onChange={(e) => atualizarFaixa(f, "ramp_up_min", Number(e.target.value))} />
                                <Input type="number" className="w-16 h-8" value={f.ramp_down_min}
                                  onChange={(e) => atualizarFaixa(f, "ramp_down_min", Number(e.target.value))} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min={0} max={100} className="w-20 h-8" value={f.intensidade_pct}
                                  onChange={(e) => atualizarFaixa(f, "intensidade_pct", Number(e.target.value))} />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removerFaixa(f.id!)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
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
                    <p>1. Cada lote pode ser vinculado a um programa em "Editar lote → Programa de iluminação".</p>
                    <p>2. Lotes sem vínculo usam o programa marcado como <strong>padrão</strong> para o tipo de produção.</p>
                    <p>3. Ramp-up/down simulam amanhecer/anoitecer suaves (apenas em canais com PWM via ESP32).</p>
                    <p>4. Sonoff on/off: ignora intensidade e ramp — liga/desliga conforme o bloco.</p>
                    <p>5. A automação roda a cada 1 minuto; mudanças aqui refletem no campo no próximo ciclo.</p>
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
                <Label>Nome</Label>
                <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Cobb 500 verão" />
              </div>
              <div>
                <Label>Tipo de produção</Label>
                <Select value={novoTipo} onValueChange={setNovoTipo}>
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
