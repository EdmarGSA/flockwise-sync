import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Plus, RefreshCw, Loader2, Trash2,
  Wifi, WifiOff, AlertTriangle, ShieldAlert, Image as ImageIcon, Eye,
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
  const integradoId = useIntegradoId();

  const [dvrs, setDvrs] = useState<DvrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDvr, setSelectedDvr] = useState<DvrRow | null>(null);
  const [canais, setCanais] = useState<CanalRow[]>([]);
  const [snapshotUrls, setSnapshotUrls] = useState<Record<string, string>>({});
  const [capturingAll, setCapturingAll] = useState(false);
  const [capturing, setCapturing] = useState<Record<string, boolean>>({});

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", host: "", porta_https: 443, porta_rtsp: 554,
    usuario: "", senha: "", num_canais: 16,
  });
  const [testando, setTestando] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const loadDvrs = useCallback(async () => {
    if (!integradoId) return;
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
  }, [integradoId]);

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

    // Auto-cria canais ausentes (1..num_canais)
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

    // Carrega últimos snapshots
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

  const handleTestar = async () => {
    setTestando(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("intelbras-bridge/test-connection", {
      body: {
        host: form.host, porta_https: form.porta_https,
        usuario: form.usuario, senha: form.senha,
      },
    });
    setTestando(false);
    if (error) {
      setTestResult({ ok: false, mensagem: error.message });
      return;
    }
    setTestResult({
      ok: data?.ok,
      mensagem: data?.ok ? data?.mensagem : (data?.error || "Falha na conexão"),
    });
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.host || !form.usuario || !form.senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!integradoId) return;
    setSalvando(true);
    try {
      // Cifra a senha via edge function
      const { data: encData, error: encErr } = await supabase.functions.invoke(
        "intelbras-bridge/encrypt-password",
        { body: { senha: form.senha } },
      );
      if (encErr || !encData?.encrypted) throw new Error(encErr?.message || "Falha ao cifrar senha");

      const { error } = await supabase.from("cameras_dvr" as any).insert({
        integrado_id: integradoId,
        nome: form.nome,
        host: form.host,
        porta_https: form.porta_https,
        porta_rtsp: form.porta_rtsp,
        usuario: form.usuario,
        senha_encrypted: encData.encrypted,
        num_canais: form.num_canais,
        marca: "intelbras",
      });
      if (error) throw error;
      toast.success("DVR cadastrado!");
      setDialogOpen(false);
      setForm({ nome: "", host: "", porta_https: 443, porta_rtsp: 554, usuario: "", senha: "", num_canais: 16 });
      setTestResult(null);
      loadDvrs();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo DVR
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar DVR Intelbras</DialogTitle>
                <DialogDescription>
                  Informe o endereço DDNS, porta HTTPS e credenciais do DVR.
                </DialogDescription>
              </DialogHeader>

              <Alert className="mb-2">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Pré-requisitos</AlertTitle>
                <AlertDescription className="text-xs space-y-1 mt-2">
                  <div>1. Configure DDNS Intelbras (ex: <code>xxxx.ddns-intelbras.com.br</code>)</div>
                  <div>2. Libere a porta HTTPS (443) no roteador apontando para o DVR</div>
                  <div>3. Crie um usuário <strong>read-only</strong> exclusivo no DVR</div>
                  <div>4. Habilite acesso CGI/HTTP no DVR (padrão linha MHDX)</div>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Ex: DVR Granja Norte"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Host (DDNS ou IP público) *</Label>
                  <Input
                    placeholder="granja.ddns-intelbras.com.br"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Porta HTTPS</Label>
                    <Input
                      type="number"
                      value={form.porta_https}
                      onChange={(e) => setForm({ ...form, porta_https: +e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Porta RTSP</Label>
                    <Input
                      type="number"
                      value={form.porta_rtsp}
                      onChange={(e) => setForm({ ...form, porta_rtsp: +e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Usuário *</Label>
                  <Input
                    value={form.usuario}
                    onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Senha *</Label>
                  <Input
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número de canais</Label>
                  <Input
                    type="number"
                    min={1}
                    max={64}
                    value={form.num_canais}
                    onChange={(e) => setForm({ ...form, num_canais: +e.target.value })}
                  />
                </div>

                {testResult && (
                  <Alert variant={testResult.ok ? "default" : "destructive"}>
                    <AlertDescription className="text-sm">
                      {testResult.mensagem}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleTestar} disabled={testando || !form.host}>
                  {testando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                  Testar conexão
                </Button>
                <Button onClick={handleSalvar} disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeiro DVR
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dvrs.map((dvr) => (
              <Card key={dvr.id} className="cursor-pointer hover:shadow-md transition" onClick={() => openDvrDetail(dvr)}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{dvr.nome}</CardTitle>
                    {renderStatusBadge(dvr.status_conexao)}
                  </div>
                  <CardDescription className="text-xs truncate">
                    {dvr.host}:{dvr.porta_https}
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
                  <Button variant="link" size="sm" className="mt-2 px-0">
                    <Eye className="h-3 w-3 mr-1" /> Ver canais
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cameras;
