import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, Camera, ChevronDown, Loader2, ShieldAlert, Wifi } from "lucide-react";
import { validateDvrHost } from "@/lib/utils/validateHost";
import { validateProtocoloPorta } from "@/lib/utils/validateProtocoloPorta";

type Protocolo = "http" | "https";

const CameraEditarDvr = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({
    nome: "",
    host: "",
    protocolo: "https" as Protocolo,
    porta_https: 443,
    porta_http: 80,
    porta_rtsp: 554,
    usuario: "",
    senha: "",
    num_canais: 16,
  });
  const [hostError, setHostError] = useState<string | null>(null);
  const [portaError, setPortaError] = useState<string | null>(null);
  const [trocarSenha, setTrocarSenha] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [portaAutoAjuste, setPortaAutoAjuste] = useState<{
    protocoloAnterior: Protocolo;
    portaAnterior: number;
    protocoloNovo: Protocolo;
    portaNova: number;
  } | null>(null);

  const portaAtiva = form.protocolo === "http" ? form.porta_http : form.porta_https;

  const validarHost = (host: string) => {
    if (!host) {
      setHostError(null);
      return true;
    }
    const v = validateDvrHost(host);
    if (v.ok) {
      setHostError(null);
      return true;
    }
    setHostError(v.motivo ?? "Host inválido");
    return false;
  };

  const validarProtocoloPorta = (
    protocolo: Protocolo = form.protocolo,
    porta_http: number = form.porta_http,
    porta_https: number = form.porta_https,
  ) => {
    const v = validateProtocoloPorta({ protocolo, porta_http, porta_https });
    setPortaError(v.ok ? null : v.motivo ?? "Porta incompatível com o protocolo");
    return v.ok;
  };

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("cameras_dvr" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("DVR não encontrado");
        navigate("/cameras");
        return;
      }
      const d = data as any;
      setForm({
        nome: d.nome ?? "",
        host: d.host ?? "",
        protocolo: (d.protocolo ?? "https") as Protocolo,
        porta_https: d.porta_https ?? 443,
        porta_http: d.porta_http ?? 80,
        porta_rtsp: d.porta_rtsp ?? 554,
        usuario: d.usuario ?? "",
        senha: "",
        num_canais: d.num_canais ?? 16,
      });
      setCarregando(false);
    })();
  }, [id, navigate]);

  const handleTestar = async () => {
    setTestResult(null);
    if (!validarHost(form.host)) {
      toast.error("Corrija o host antes de testar");
      return;
    }
    if (!validarProtocoloPorta()) {
      toast.error("Porta incompatível com o protocolo selecionado");
      return;
    }
    setTestando(true);
    const { data, error } = await supabase.functions.invoke("intelbras-bridge/test-connection", {
      body: {
        host: form.host.trim(),
        protocolo: form.protocolo,
        porta_https: form.porta_https,
        porta_http: form.porta_http,
        usuario: form.usuario,
        ...(trocarSenha && form.senha ? { senha: form.senha } : { dvr_id: id }),
      },
    });
    setTestando(false);
    if (error) {
      setTestResult({ ok: false, mensagem: error.message });
      return;
    }
    setTestResult({
      ok: !!data?.ok,
      mensagem: data?.ok ? data?.mensagem : (data?.error || "Falha na conexão"),
    });
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.host || !form.usuario) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!validarHost(form.host)) {
      toast.error("Host inválido — veja a mensagem abaixo do campo");
      return;
    }
    if (!validarProtocoloPorta()) {
      toast.error("Porta incompatível com o protocolo selecionado");
      return;
    }
    if (trocarSenha && !form.senha) {
      toast.error("Informe a nova senha ou desmarque a opção");
      return;
    }
    setSalvando(true);
    try {
      const update: Record<string, any> = {
        nome: form.nome,
        host: form.host.trim(),
        protocolo: form.protocolo,
        porta_https: form.porta_https,
        porta_http: form.porta_http,
        porta_rtsp: form.porta_rtsp,
        usuario: form.usuario,
        num_canais: form.num_canais,
      };

      if (trocarSenha && form.senha) {
        const { data: encData, error: encErr } = await supabase.functions.invoke(
          "intelbras-bridge/encrypt-password",
          { body: { senha: form.senha } },
        );
        if (encErr || !encData?.encrypted) {
          throw new Error(encErr?.message || "Falha ao cifrar senha");
        }
        update.senha_encrypted = encData.encrypted;
      }

      const { error } = await supabase
        .from("cameras_dvr" as any)
        .update(update)
        .eq("id", id);
      if (error) throw error;
      toast.success("DVR atualizado!");
      navigate("/cameras");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cameras")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Camera className="h-7 w-7 text-primary" />
              Editar DVR
            </h1>
            <p className="text-sm text-muted-foreground">
              Atualize host, portas, credenciais e teste a conexão
            </p>
          </div>
        </div>

        <Collapsible open={ajudaAberta} onOpenChange={setAjudaAberta}>
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>Como configurar meu DVR</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${ajudaAberta ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </AlertTitle>
            <CollapsibleContent>
              <AlertDescription className="text-xs space-y-3 mt-2">
                <div>
                  <strong>1. Habilite o DDNS Intelbras no DVR</strong>
                  <div className="text-muted-foreground">
                    Menu → Rede → DDNS → marque "Habilitar", escolha "Intelbras DDNS" e
                    defina um nome de domínio único (ex: <code>granjamarcia</code>). O status
                    deve mudar de "IP Desatualizado" para "Conectado". O host final fica{" "}
                    <code>granjamarcia.ddns-intelbras.com.br</code>.
                  </div>
                </div>
                <div>
                  <strong>2. Redirecione a porta no roteador da granja</strong>
                  <div className="text-muted-foreground">
                    No roteador, faça port forwarding da porta externa <code>80</code> (HTTP)
                    ou <code>443</code> (HTTPS) para o IP local do DVR (ex:{" "}
                    <code>192.168.1.105</code>). Se possível, prefira HTTP/80 para evitar
                    problemas com o certificado auto-assinado do DVR.
                  </div>
                </div>
                <div>
                  <strong>3. Use o DDNS aqui no formulário</strong>
                  <div className="text-muted-foreground">
                    No campo "Host" abaixo, informe o domínio DDNS — <em>nunca</em> o IP
                    da rede local (192.168.x.x), porque a nuvem não enxerga sua LAN.
                  </div>
                </div>
                <div>
                  <strong>4. Crie um usuário read-only no DVR</strong>
                  <div className="text-muted-foreground">
                    Recomendado por segurança, para esta integração não precisar do usuário admin.
                  </div>
                </div>
              </AlertDescription>
            </CollapsibleContent>
          </Alert>
        </Collapsible>

        <Card>
          <CardHeader>
            <CardTitle>Dados de conexão</CardTitle>
            <CardDescription>Altere os campos necessários e teste antes de salvar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Host (DDNS ou IP público) *</Label>
              <Input
                value={form.host}
                onChange={(e) => {
                  setForm({ ...form, host: e.target.value });
                  validarHost(e.target.value);
                }}
                onBlur={(e) => validarHost(e.target.value)}
                aria-invalid={!!hostError}
                className={hostError ? "border-destructive" : ""}
              />
              {hostError && (
                <p className="text-xs text-destructive mt-1">{hostError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Protocolo</Label>
                <Select
                  value={form.protocolo}
                  onValueChange={(v) => {
                    const protocolo = v as Protocolo;
                    const next = {
                      ...form,
                      protocolo,
                      porta_http: protocolo === "http" ? 80 : form.porta_http,
                      porta_https: protocolo === "https" ? 443 : form.porta_https,
                    };
                    setForm(next);
                    validarProtocoloPorta(protocolo, next.porta_http, next.porta_https);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="https">HTTPS (porta 443)</SelectItem>
                    <SelectItem value="http">HTTP (porta 80) — recomendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.protocolo === "http" ? "Porta HTTP" : "Porta HTTPS"}</Label>
                <Input
                  type="number"
                  value={form.protocolo === "http" ? form.porta_http : form.porta_https}
                  onChange={(e) => {
                    const valor = +e.target.value;
                    const next = {
                      ...form,
                      ...(form.protocolo === "http"
                        ? { porta_http: valor }
                        : { porta_https: valor }),
                    };
                    setForm(next);
                    validarProtocoloPorta(next.protocolo, next.porta_http, next.porta_https);
                  }}
                  aria-invalid={!!portaError}
                  className={portaError ? "border-destructive" : ""}
                />
              </div>
            </div>
            {portaError && (
              <p className="text-xs text-destructive -mt-2">{portaError}</p>
            )}

            <div>
              <Label>Porta RTSP</Label>
              <Input
                type="number"
                value={form.porta_rtsp}
                onChange={(e) => setForm({ ...form, porta_rtsp: +e.target.value })}
              />
            </div>

            <div>
              <Label>Usuário *</Label>
              <Input
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={trocarSenha}
                  onChange={(e) => {
                    setTrocarSenha(e.target.checked);
                    if (!e.target.checked) setForm({ ...form, senha: "" });
                  }}
                />
                Alterar senha
              </label>
              {trocarSenha ? (
                <div>
                  <Label>Nova senha *</Label>
                  <Input
                    type="password"
                    placeholder="Digite a nova senha"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  A senha atual será mantida. Marque a opção acima para definir uma nova.
                </p>
              )}
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
                <AlertDescription className="text-sm space-y-2">
                  <div>{testResult.mensagem}</div>
                  {!testResult.ok && (
                    <div className="text-xs opacity-80 space-y-1 mt-2">
                      <div className="font-semibold">Possíveis causas:</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Host informado é IP privado da LAN (use DDNS)</li>
                        <li>DDNS do DVR não está habilitado / está "IP Desatualizado"</li>
                        <li>Porta {portaAtiva} não está redirecionada no roteador</li>
                        <li>Firewall/operadora bloqueia a porta {portaAtiva}</li>
                        <li>Usando HTTPS com certificado auto-assinado — tente HTTP na porta 80</li>
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => navigate("/cameras")} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestar}
              disabled={testando || !form.host || !form.usuario || (trocarSenha && !form.senha) || !!hostError || !!portaError}
              className="w-full sm:w-auto"
            >
              {testando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              Testar conexão
            </Button>
            <Button onClick={handleSalvar} disabled={salvando || !!hostError || !!portaError} className="w-full sm:w-auto">
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CameraEditarDvr;
