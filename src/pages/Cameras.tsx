import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Plus, RefreshCw, Loader2, Trash2, Pencil,
  Wifi, WifiOff, AlertTriangle, Image as ImageIcon, Eye, Search, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DvrRow {
  id: string;
  nome: string;
  host: string;
  porta_https: number;
  porta_rtsp: number;
  usuario: string;
  num_canais: number;
  ativo: boolean;
  status_conexao: "online" | "offline" | "erro" | "nao_testado";
  ultimo_sync: string | null;
  ultimo_erro: string | null;
}

interface CanalRow {
  id: string;
  dvr_id: string;
  canal_numero: number;
  nome: string;
  galpao_id: string | null;
  funcao: string;
  ativo: boolean;
  ultimo_snapshot_em: string | null;
}

const Cameras = () => {
  const navigate = useNavigate();
  const { integradoId, loading: loadingIntegradoId } = useIntegradoId();

  const [dvrs, setDvrs] = useState<DvrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDvr, setSelectedDvr] = useState<DvrRow | null>(null);
  const [canais, setCanais] = useState<CanalRow[]>([]);
  const [snapshotUrls, setSnapshotUrls] = useState<Record<string, string>>({});
  const [capturingAll, setCapturingAll] = useState(false);
  const [capturing, setCapturing] = useState<Record<string, boolean>>({});
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [ordenacao, setOrdenacao] = useState<string>(() => {
    if (typeof window === "undefined") return "recentes";
    return localStorage.getItem("cameras:ordenacao") || "recentes";
  });

  useEffect(() => {
    try {
      localStorage.setItem("cameras:ordenacao", ordenacao);
    } catch {
      // LocalStorage may be unavailable in restricted browser contexts.
    }
  }, [ordenacao]);

  const loadDvrs = useCallback(async () => {
    if (loadingIntegradoId) return;
    if (!integradoId) {
      setDvrs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("cameras_dvr" as any)
      .select("*")
      .eq("integrado_id", integradoId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar DVRs: " + error.message);
    } else {
      setDvrs((data || []) as any);
    }
    setLoading(false);
  }, [integradoId, loadingIntegradoId]);

  useEffect(() => { loadDvrs(); }, [loadDvrs]);

  const loadCanais = async (dvrId: string) => {
    const { data, error } = await supabase
      .from("cameras_canais" as any)
      .select("*")
      .eq("dvr_id", dvrId)
      .order("canal_numero", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar canais: " + error.message);
      return;
    }
    let lista = (data || []) as any as CanalRow[];

    const dvr = dvrs.find((d) => d.id === dvrId);
    if (dvr && lista.length < dvr.num_canais) {
      const existentes = new Set(lista.map((c) => c.canal_numero));
      const faltando = [];
      for (let i = 1; i <= dvr.num_canais; i++) {
        if (!existentes.has(i)) {
          faltando.push({
            dvr_id: dvrId,
            canal_numero: i,
            nome: `Canal ${i}`,
            funcao: "monitoramento",
            ativo: true,
            snapshot_intervalo_seg: 300,
          });
        }
      }
      if (faltando.length > 0) {
        const { data: novos } = await supabase
          .from("cameras_canais" as any)
          .insert(faltando)
          .select();
        lista = [...lista, ...(novos || []) as any].sort(
          (a, b) => a.canal_numero - b.canal_numero,
        );
      }
    }
    setCanais(lista);

    const { data: snaps } = await supabase
      .from("cameras_snapshots" as any)
      .select("canal_id, storage_path, capturado_em")
      .in("canal_id", lista.map((c) => c.id))
      .order("capturado_em", { ascending: false });

    const ultimoPorCanal: Record<string, string> = {};
    (snaps || []).forEach((s: any) => {
      if (!ultimoPorCanal[s.canal_id]) ultimoPorCanal[s.canal_id] = s.storage_path;
    });

    const urls: Record<string, string> = {};
    await Promise.all(
      Object.entries(ultimoPorCanal).map(async ([canalId, path]) => {
        const { data } = await supabase.storage
          .from("camera-snapshots")
          .createSignedUrl(path, 600);
        if (data?.signedUrl) urls[canalId] = data.signedUrl;
      }),
    );
    setSnapshotUrls(urls);
  };

  const openDvrDetail = (dvr: DvrRow) => {
    setSelectedDvr(dvr);
    loadCanais(dvr.id);
  };

  const handleDelete = async (dvr: DvrRow) => {
    if (!confirm(`Excluir DVR "${dvr.nome}" e todos os snapshots?`)) return;
    const { error } = await supabase.from("cameras_dvr" as any).delete().eq("id", dvr.id);
    if (error) toast.error(error.message);
    else {
      toast.success("DVR removido");
      setSelectedDvr(null);
      loadDvrs();
    }
  };

  const captureSnapshot = async (canalId: string) => {
    setCapturing((p) => ({ ...p, [canalId]: true }));
    const { data, error } = await supabase.functions.invoke("intelbras-bridge/snapshot", {
      body: { canal_id: canalId, tipo: "manual" },
    });
    setCapturing((p) => ({ ...p, [canalId]: false }));
    if (error) {
      toast.error("Falha: " + error.message);
      return;
    }
    if (data?.signed_url) {
      setSnapshotUrls((p) => ({ ...p, [canalId]: data.signed_url }));
      toast.success("Snapshot capturado");
    }
  };

  const captureAll = async () => {
    if (!selectedDvr) return;
    setCapturingAll(true);
    const { data, error } = await supabase.functions.invoke("intelbras-bridge/snapshot-all", {
      body: { dvr_id: selectedDvr.id },
    });
    setCapturingAll(false);
    if (error) {
      toast.error("Falha: " + error.message);
      return;
    }
    toast.success(`${data?.ok || 0} de ${data?.total || 0} canais capturados`);
    loadCanais(selectedDvr.id);
    loadDvrs();
  };

  const renderStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: any; icon: any }> = {
      online: { label: "Online", variant: "default", icon: Wifi },
      offline: { label: "Offline", variant: "secondary", icon: WifiOff },
      erro: { label: "Erro", variant: "destructive", icon: AlertTriangle },
      nao_testado: { label: "Não testado", variant: "outline", icon: Camera },
    };
    const cfg = map[status] || map.nao_testado;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Camera className="h-7 w-7 text-primary" />
                Câmeras
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie DVRs Intelbras e capture snapshots dos galpões
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/cameras/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo DVR
          </Button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedDvr ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDvr(null)} className="mb-2 -ml-2">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                  </Button>
                  <CardTitle className="flex items-center gap-2">
                    {selectedDvr.nome}
                    {renderStatusBadge(selectedDvr.status_conexao)}
                  </CardTitle>
                  <CardDescription>
                    {selectedDvr.host}:{selectedDvr.porta_https} • {selectedDvr.num_canais} canais
                    {selectedDvr.ultimo_sync && (
                      <> • Última sync {formatDistanceToNow(new Date(selectedDvr.ultimo_sync), { locale: ptBR, addSuffix: true })}</>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={captureAll} disabled={capturingAll}>
                    {capturingAll
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <RefreshCw className="h-4 w-4 mr-2" />}
                    Capturar todos
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigate(`/cameras/${selectedDvr.id}`)} title="Editar DVR">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedDvr)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {selectedDvr.ultimo_erro && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{selectedDvr.ultimo_erro}</AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {canais.map((c) => (
                  <Card key={c.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      {snapshotUrls[c.id] ? (
                        <img
                          src={snapshotUrls[c.id]}
                          alt={c.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-2 right-2 h-8 w-8"
                        onClick={() => captureSnapshot(c.id)}
                        disabled={capturing[c.id]}
                      >
                        {capturing[c.id]
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium truncate">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        Canal {c.canal_numero}
                        {c.ultimo_snapshot_em && (
                          <> • {formatDistanceToNow(new Date(c.ultimo_snapshot_em), { locale: ptBR, addSuffix: true })}</>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : dvrs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                Nenhum DVR cadastrado. Adicione um para começar.
              </p>
              <Button onClick={() => navigate("/cameras/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeiro DVR
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filtros */}
            <Card>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, host ou usuário..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="nao_testado">Não testado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Mais recentes</SelectItem>
                    <SelectItem value="nome_asc">Nome (A-Z)</SelectItem>
                    <SelectItem value="nome_desc">Nome (Z-A)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="host_asc">Host/IP (A-Z)</SelectItem>
                    <SelectItem value="host_desc">Host/IP (Z-A)</SelectItem>
                    <SelectItem value="usuario_asc">Usuário (A-Z)</SelectItem>
                    <SelectItem value="usuario_desc">Usuário (Z-A)</SelectItem>
                    <SelectItem value="sync_desc">Última sync (mais recente)</SelectItem>
                    <SelectItem value="sync_asc">Última sync (mais antiga)</SelectItem>
                  </SelectContent>
                </Select>
                {(filtroBusca || filtroStatus !== "todos" || ordenacao !== "recentes") && (
                  <Button
                    variant="ghost"
                    onClick={() => { setFiltroBusca(""); setFiltroStatus("todos"); setOrdenacao("recentes"); }}
                  >
                    <X className="h-4 w-4 mr-1" /> Limpar
                  </Button>
                )}
              </CardContent>
            </Card>

            {(() => {
              const termo = filtroBusca.trim().toLowerCase();
              const filtrados = dvrs.filter((d) => {
                const okStatus = filtroStatus === "todos" || d.status_conexao === filtroStatus;
                const okBusca = !termo
                  || d.nome.toLowerCase().includes(termo)
                  || d.host.toLowerCase().includes(termo)
                  || d.usuario.toLowerCase().includes(termo);
                return okStatus && okBusca;
              });

              const statusOrder: Record<string, number> = { online: 0, erro: 1, offline: 2, nao_testado: 3 };
              const ordenados = [...filtrados].sort((a, b) => {
                switch (ordenacao) {
                  case "nome_asc": return a.nome.localeCompare(b.nome, "pt-BR");
                  case "nome_desc": return b.nome.localeCompare(a.nome, "pt-BR");
                  case "status": {
                    const diff = (statusOrder[a.status_conexao] ?? 99) - (statusOrder[b.status_conexao] ?? 99);
                    return diff !== 0 ? diff : a.nome.localeCompare(b.nome, "pt-BR");
                  }
                  case "host_asc": return a.host.localeCompare(b.host, "pt-BR", { numeric: true, sensitivity: "base" });
                  case "host_desc": return b.host.localeCompare(a.host, "pt-BR", { numeric: true, sensitivity: "base" });
                  case "usuario_asc": return a.usuario.localeCompare(b.usuario, "pt-BR", { sensitivity: "base" });
                  case "usuario_desc": return b.usuario.localeCompare(a.usuario, "pt-BR", { sensitivity: "base" });
                  case "sync_desc": {
                    const ta = a.ultimo_sync ? new Date(a.ultimo_sync).getTime() : 0;
                    const tb = b.ultimo_sync ? new Date(b.ultimo_sync).getTime() : 0;
                    return tb - ta;
                  }
                  case "sync_asc": {
                    const ta = a.ultimo_sync ? new Date(a.ultimo_sync).getTime() : Infinity;
                    const tb = b.ultimo_sync ? new Date(b.ultimo_sync).getTime() : Infinity;
                    return ta - tb;
                  }
                  default: return 0;
                }
              });

              if (filtrados.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Nenhum DVR encontrado com os filtros aplicados.
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  <div className="text-xs text-muted-foreground">
                    {filtrados.length} de {dvrs.length} DVR{dvrs.length > 1 ? "s" : ""}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ordenados.map((dvr) => (
                      <Card key={dvr.id} className="hover:shadow-md transition">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base cursor-pointer" onClick={() => openDvrDetail(dvr)}>
                              {dvr.nome}
                            </CardTitle>
                            {renderStatusBadge(dvr.status_conexao)}
                          </div>
                          <CardDescription className="text-xs truncate">
                            {dvr.host}:{dvr.porta_https} • {dvr.usuario}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {dvr.num_canais} canais
                          </div>
                          {dvr.ultimo_sync && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Última sync {formatDistanceToNow(new Date(dvr.ultimo_sync), { locale: ptBR, addSuffix: true })}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3 gap-2">
                            <Button variant="link" size="sm" className="px-0" onClick={() => openDvrDetail(dvr)}>
                              <Eye className="h-3 w-3 mr-1" /> Ver canais
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/cameras/${dvr.id}`); }}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default Cameras;
