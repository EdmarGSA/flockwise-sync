import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIntegradoId } from "@/hooks/useIntegradoId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, ShieldAlert, Wifi } from "lucide-react";

const CameraNovoDvr = () => {
  const navigate = useNavigate();
  const integradoId = useIntegradoId();

  const [form, setForm] = useState({
    nome: "",
    host: "",
    porta_https: 443,
    porta_rtsp: 554,
    usuario: "",
    senha: "",
    num_canais: 16,
  });
  const [testando, setTestando] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const handleTestar = async () => {
    setTestando(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("intelbras-bridge/test-connection", {
      body: {
        host: form.host,
        porta_https: form.porta_https,
        usuario: form.usuario,
        senha: form.senha,
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
    if (!form.nome || !form.host || !form.usuario || !form.senha) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!integradoId) {
      toast.error("Organização não identificada");
      return;
    }
    setSalvando(true);
    try {
      const { data: encData, error: encErr } = await supabase.functions.invoke(
        "intelbras-bridge/encrypt-password",
        { body: { senha: form.senha } },
      );
      if (encErr || !encData?.encrypted) {
        throw new Error(encErr?.message || "Falha ao cifrar senha");
      }

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
      navigate("/cameras");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

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
              Novo DVR Intelbras
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastre um novo gravador para captura de snapshots dos galpões
            </p>
          </div>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Pré-requisitos</AlertTitle>
          <AlertDescription className="text-xs space-y-1 mt-2">
            <div>1. Configure DDNS Intelbras (ex: <code>xxxx.ddns-intelbras.com.br</code>)</div>
            <div>2. Libere a porta HTTPS (443) no roteador apontando para o DVR</div>
            <div>3. Crie um usuário <strong>read-only</strong> exclusivo no DVR</div>
            <div>4. Habilite acesso CGI/HTTP no DVR (padrão linha MHDX)</div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Dados de conexão</CardTitle>
            <CardDescription>Preencha os campos e teste antes de salvar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => navigate("/cameras")} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestar}
              disabled={testando || !form.host || !form.usuario || !form.senha}
              className="w-full sm:w-auto"
            >
              {testando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              Testar conexão
            </Button>
            <Button onClick={handleSalvar} disabled={salvando} className="w-full sm:w-auto">
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar DVR
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CameraNovoDvr;
