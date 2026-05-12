import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Wind,
  CloudFog,
  Blinds,
  Activity,
  RefreshCw,
  Target,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useIntegradoId } from "@/hooks/useIntegradoId";
import { supabase } from "@/integrations/supabase/client";

interface GalpaoBoard {
  galpao_id: string;
  galpao_nome: string;
  lote_id?: string | null;
  idade_dias?: number | null;
  // Brain
  modo?: string | null;
  temp_lida?: number | null;
  ur_lida?: number | null;
  setpoint_alvo?: number | null;
  ith?: number | null;
  ultimo_brain_em?: string | null;
  motivo?: string[] | null;
  // Atuadores
  ventilacao_estagio?: string | null;
  cortina_pct?: number | null;
  cortina_alvo_pct?: number | null;
  nebulizacao_estado?: string | null;
  nebulizacao_em?: string | null;
}

interface DecisaoLog {
  id: string;
  created_at: string;
  galpao_id: string;
  galpao_nome?: string;
  funcao_automacao: string;
  estado_decidido: string;
  modo_dominante?: string | null;
  temp_lida?: number | null;
  ur_lida?: number | null;
  setpoint_alvo?: number | null;
  reason_chain?: string[] | null;
}

const MODO_VARIANT: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  CONFORTO: { variant: "secondary", label: "Conforto" },
  AQUECIMENTO: { variant: "default", label: "Aquecimento" },
  ALERTA_CALOR: { variant: "destructive", label: "Alerta calor" },
  EMERGENCIA: { variant: "destructive", label: "Emergência" },
  skip: { variant: "outline", label: "Sem dados" },
  error: { variant: "destructive", label: "Erro" },
};

const FUNCAO_ICONE: Record<string, JSX.Element> = {
  climate_brain: <Activity className="h-3.5 w-3.5" />,
  ventilacao: <Wind className="h-3.5 w-3.5" />,
  cortina: <Blinds className="h-3.5 w-3.5" />,
  nebulizacao: <CloudFog className="h-3.5 w-3.5" />,
};

export default function AmbienciaDashboard() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [boards, setBoards] = useState<GalpaoBoard[]>([]);
  const [decisoes, setDecisoes] = useState<DecisaoLog[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    if (!integradoId) return;
    setLoading(true);

    // 1. Galpões da org
    const { data: gs } = await supabase
      .from("galpoes")
      .select("id, nome, nucleo:nucleos!inner(integrado_id)")
      .eq("ativo", true)
      .eq("nucleo.integrado_id", integradoId);
    const galpoes = (gs ?? []).map((g: any) => ({ id: g.id as string, nome: g.nome as string }));
    const galpaoIds = galpoes.map((g) => g.id);

    if (galpaoIds.length === 0) {
      setBoards([]);
      setDecisoes([]);
      setLoading(false);
      return;
    }

    // 2. Última decisão climate_brain por galpão (pega últimas 50, pega 1ª por galpão)
    const { data: brainLogs } = await supabase
      .from("log_decisao_clima")
      .select("galpao_id, lote_id, modo_dominante, estado_decidido, temp_lida, ur_lida, setpoint_alvo, ith_calc, reason_chain, created_at")
      .in("galpao_id", galpaoIds)
      .eq("funcao_automacao", "climate_brain")
      .order("created_at", { ascending: false })
      .limit(200);
    const ultimaBrain = new Map<string, any>();
    for (const r of brainLogs ?? []) {
      if (!ultimaBrain.has(r.galpao_id)) ultimaBrain.set(r.galpao_id, r);
    }

    // 3. Estado atuadores
    const [{ data: vents }, { data: cortinas }, { data: nebs }, { data: lotes }] = await Promise.all([
      supabase.from("estagio_ventilacao_estado").select("galpao_id, estagio_atual").in("galpao_id", galpaoIds),
      supabase.from("cortina_estado_atual").select("galpao_id, posicao_atual_pct, posicao_alvo_pct").in("galpao_id", galpaoIds),
      supabase.from("programa_nebulizacao_galpao").select("galpao_id, ultimo_estado, ultimo_acionamento_em").in("galpao_id", galpaoIds),
      supabase.from("lotes").select("id, galpao_id, data_alojamento").in("galpao_id", galpaoIds).eq("status", "alojado"),
    ]);

    const mapVent = new Map((vents ?? []).map((v: any) => [v.galpao_id, v]));
    const mapCort = new Map((cortinas ?? []).map((c: any) => [c.galpao_id, c]));
    const mapNeb = new Map((nebs ?? []).map((n: any) => [n.galpao_id, n]));
    const mapLote = new Map((lotes ?? []).map((l: any) => [l.galpao_id, l]));

    const boardsBuilt: GalpaoBoard[] = galpoes.map((g) => {
      const b = ultimaBrain.get(g.id);
      const v = mapVent.get(g.id) as any;
      const c = mapCort.get(g.id) as any;
      const n = mapNeb.get(g.id) as any;
      const lote = mapLote.get(g.id) as any;
      const idade = lote?.data_alojamento
        ? Math.floor((Date.now() - new Date(lote.data_alojamento).getTime()) / 86400000) + 1
        : null;
      return {
        galpao_id: g.id,
        galpao_nome: g.nome,
        lote_id: lote?.id ?? null,
        idade_dias: idade,
        modo: b?.modo_dominante ?? b?.estado_decidido ?? null,
        temp_lida: b?.temp_lida ?? null,
        ur_lida: b?.ur_lida ?? null,
        setpoint_alvo: b?.setpoint_alvo ?? null,
        ith: b?.ith_calc ?? null,
        ultimo_brain_em: b?.created_at ?? null,
        motivo: Array.isArray(b?.reason_chain) ? b.reason_chain : null,
        ventilacao_estagio: v?.estagio_atual ?? null,
        cortina_pct: c?.posicao_atual_pct ?? null,
        cortina_alvo_pct: c?.posicao_alvo_pct ?? null,
        nebulizacao_estado: n?.ultimo_estado ?? null,
        nebulizacao_em: n?.ultimo_acionamento_em ?? null,
      };
    });

    // 4. Histórico geral das últimas 30 decisões (todas as funções)
    const { data: historico } = await supabase
      .from("log_decisao_clima")
      .select("id, created_at, galpao_id, funcao_automacao, estado_decidido, modo_dominante, temp_lida, ur_lida, setpoint_alvo, reason_chain")
      .in("galpao_id", galpaoIds)
      .order("created_at", { ascending: false })
      .limit(30);

    const galpaoNomeMap = new Map(galpoes.map((g) => [g.id, g.nome]));
    const decisoesBuilt: DecisaoLog[] = (historico ?? []).map((d: any) => ({
      ...d,
      galpao_nome: galpaoNomeMap.get(d.galpao_id) ?? "—",
      reason_chain: Array.isArray(d.reason_chain) ? d.reason_chain : null,
    }));

    setBoards(boardsBuilt);
    setDecisoes(decisoesBuilt);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integradoId]);

  const ativos = useMemo(() => boards.filter((b) => b.lote_id), [boards]);
  const inativos = useMemo(() => boards.filter((b) => !b.lote_id), [boards]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/climate-brain")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Thermometer className="h-6 w-6 text-primary" /> Dashboard de Ambiência
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitoramento em tempo real das decisões climáticas — atualiza a cada 30s
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={carregar}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Galpões com lote ativo ({ativos.length})
              </h2>
              {ativos.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground">
                  Nenhum galpão com lote ativo no momento.
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ativos.map((b) => <BoardCard key={b.galpao_id} board={b} />)}
                </div>
              )}
            </section>

            {inativos.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Galpões sem lote ativo ({inativos.length})
                </h2>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {inativos.map((b) => (
                    <Card key={b.galpao_id} className="opacity-60">
                      <CardContent className="p-3 text-sm flex items-center justify-between">
                        <span>{b.galpao_nome}</span>
                        <Badge variant="outline">Sem lote</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Histórico de decisões (últimas 30)
                </CardTitle>
                <CardDescription>
                  Todas as ações de coordenação climática realizadas nos seus galpões
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {decisoes.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Nenhuma decisão registrada ainda.
                      </div>
                    ) : decisoes.map((d) => (
                      <div key={d.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                        <div className="mt-1 text-muted-foreground">
                          {FUNCAO_ICONE[d.funcao_automacao] ?? <Activity className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{d.galpao_nome}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {d.funcao_automacao.replace("_", " ")}
                            </Badge>
                            <span className="text-foreground">→ {d.estado_decidido}</span>
                            {d.modo_dominante && (
                              <Badge
                                variant={MODO_VARIANT[d.modo_dominante]?.variant ?? "secondary"}
                                className="text-[10px]"
                              >
                                {MODO_VARIANT[d.modo_dominante]?.label ?? d.modo_dominante}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                            {d.temp_lida != null && <span>T {Number(d.temp_lida).toFixed(1)}°C</span>}
                            {d.setpoint_alvo != null && <span>alvo {Number(d.setpoint_alvo).toFixed(1)}°C</span>}
                            {d.ur_lida != null && <span>UR {Number(d.ur_lida).toFixed(0)}%</span>}
                            <span>· {formatDistanceToNow(new Date(d.created_at), { locale: ptBR, addSuffix: true })}</span>
                          </div>
                          {d.reason_chain && d.reason_chain.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 italic truncate">
                              {d.reason_chain.join(" · ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function BoardCard({ board }: { board: GalpaoBoard }) {
  const modoCfg = board.modo ? MODO_VARIANT[board.modo] : null;
  const delta = board.temp_lida != null && board.setpoint_alvo != null
    ? Number(board.temp_lida) - Number(board.setpoint_alvo) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{board.galpao_nome}</span>
          {modoCfg ? (
            <Badge variant={modoCfg.variant}>{modoCfg.label}</Badge>
          ) : (
            <Badge variant="outline">Aguardando</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {board.idade_dias != null ? `Lote com ${board.idade_dias} dias · ` : ""}
          {board.ultimo_brain_em
            ? `atualizado ${formatDistanceToNow(new Date(board.ultimo_brain_em), { locale: ptBR, addSuffix: true })}`
            : "sem leituras do brain"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={<Thermometer className="h-3.5 w-3.5" />}
            label="Temp"
            value={board.temp_lida != null ? `${Number(board.temp_lida).toFixed(1)}°C` : "—"}
            hint={delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}°C` : undefined}
            hintClass={delta != null ? (Math.abs(delta) > 1.5 ? "text-destructive" : "text-muted-foreground") : ""}
          />
          <Metric
            icon={<Target className="h-3.5 w-3.5" />}
            label="Alvo"
            value={board.setpoint_alvo != null ? `${Number(board.setpoint_alvo).toFixed(1)}°C` : "—"}
          />
          <Metric
            icon={<Droplets className="h-3.5 w-3.5" />}
            label="UR"
            value={board.ur_lida != null ? `${Number(board.ur_lida).toFixed(0)}%` : "—"}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <Metric
            icon={<Wind className="h-3.5 w-3.5" />}
            label="Ventilação"
            value={board.ventilacao_estagio ?? "—"}
          />
          <Metric
            icon={<Blinds className="h-3.5 w-3.5" />}
            label="Cortina"
            value={board.cortina_pct != null ? `${board.cortina_pct}%` : "—"}
            hint={board.cortina_alvo_pct != null && board.cortina_alvo_pct !== board.cortina_pct
              ? `→ ${board.cortina_alvo_pct}%` : undefined}
          />
          <Metric
            icon={<CloudFog className="h-3.5 w-3.5" />}
            label="Nebulização"
            value={board.nebulizacao_estado === "on" ? "Ligada" : board.nebulizacao_estado === "off" ? "Desligada" : "—"}
          />
        </div>

        {board.motivo && board.motivo.length > 0 && (
          <div className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
            {board.motivo[0]}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon, label, value, hint, hintClass,
}: { icon: JSX.Element; label: string; value: string; hint?: string; hintClass?: string }) {
  return (
    <div className="text-center p-2 rounded bg-muted/50">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
        {icon}{label}
      </div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
      {hint && <div className={`text-[10px] ${hintClass ?? "text-muted-foreground"}`}>{hint}</div>}
    </div>
  );
}
