import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, Wifi } from "lucide-react";

const CameraEditarDvr = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({
    nome: "",
    host: "",
    porta_https: 443,
    porta_rtsp: 554,
    usuario: "",
    senha: "",
    num_canais: 16,
  });
  const [trocarSenha, setTrocarSenha] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

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
        porta_https: d.porta_https ?? 443,
        porta_rtsp: d.porta_rtsp ?? 554,
        usuario: d.usuario ?? "",
        senha: "",
        num_canais: d.num_canais ?? 16,
      });
      setCarregando(false);
    })();
  }, [id, navigate]);

  const handleTestar = async () => {
    setTestando(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("intelbras-bridge/test-connection", {
      body: {
        host: form.host,
        porta_https: form.porta_https,
        usuario: form.usuario,
        // Se não trocou senha, manda dvr_id para a função usar a senha já cifrada
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
    if (trocarSenha && !form.senha) {
      toast.error("Informe a nova senha ou desmarque a opção");
      return;
    }
    setSalvando(true);
    try {
      const update: Record<string, any> = {
        nome: form.nome,
        host: form.host,
        porta_https: form.porta_https,
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
              disabled={testando || !form.host || !form.usuario || (trocarSenha && !form.senha)}
              className="w-full sm:w-auto"
            >
              {testando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              Testar conexão
            </Button>
            <Button onClick={handleSalvar} disabled={salvando} className="w-full sm:w-auto">
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
