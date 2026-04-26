import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  ExternalLink,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useCanManageMapbox } from '@/hooks/useCanManageMapbox';

function maskToken(token: string) {
  if (!token) return '';
  if (token.length <= 14) return token;
  return `${token.slice(0, 8)}••••••••${token.slice(-6)}`;
}

export default function ConfiguracaoMapbox() {
  const navigate = useNavigate();
  const { config, loading, refetch, integradoId } = useMapboxToken();
  const { canManage, loading: loadingPerm } = useCanManageMapbox();

  const [token, setToken] = useState('');
  const [defaultLat, setDefaultLat] = useState('');
  const [defaultLng, setDefaultLng] = useState('');
  const [defaultZoom, setDefaultZoom] = useState('12');
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setToken(config.public_token || '');
      setDefaultLat(config.default_lat?.toString() || '');
      setDefaultLng(config.default_lng?.toString() || '');
      setDefaultZoom(config.default_zoom?.toString() || '12');
      setTestResult(null);
    }
  }, [config]);

  // Buscar nome do usuário que atualizou por último
  useEffect(() => {
    const uid = config?.updated_by || config?.created_by;
    if (!uid) {
      setAuthorName(null);
      return;
    }
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => setAuthorName(data?.full_name || null));
  }, [config?.updated_by, config?.created_by]);

  const handleSave = async () => {
    if (!integradoId) return;
    if (!canManage) {
      toast.error('Apenas administradores podem alterar o token desta organização.');
      return;
    }
    if (!token.startsWith('pk.')) {
      toast.error('O token público do Mapbox deve começar com "pk."');
      return;
    }
    setSaving(true);
    const payload = {
      integrado_id: integradoId,
      public_token: token.trim(),
      default_lat: defaultLat ? parseFloat(defaultLat) : null,
      default_lng: defaultLng ? parseFloat(defaultLng) : null,
      default_zoom: defaultZoom ? parseInt(defaultZoom) : 12,
    };

    const { error } = await supabase
      .from('mapbox_config')
      .upsert(payload, { onConflict: 'integrado_id' });

    if (error) {
      toast.error('Erro ao salvar token: ' + error.message);
    } else {
      toast.success('Token Mapbox salvo com sucesso!');
      refetch();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!config?.id) return;
    if (!canManage) {
      toast.error('Apenas administradores podem remover o token.');
      return;
    }
    if (!confirm('Remover o token Mapbox? O mapa ficará indisponível para toda a organização.'))
      return;
    const { error } = await supabase.from('mapbox_config').delete().eq('id', config.id);
    if (error) toast.error('Erro ao remover: ' + error.message);
    else {
      toast.success('Token removido');
      setToken('');
      setTestResult(null);
      refetch();
    }
  };

  const handleTest = async () => {
    if (!token || !token.startsWith('pk.')) {
      toast.error('Informe um token válido (começa com "pk.")');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(
          token.trim(),
        )}`,
      );
      if (r.status === 200) {
        setTestResult('ok');
        toast.success('Token válido! Mapbox respondeu OK.');
      } else if (r.status === 401) {
        setTestResult('fail');
        toast.error('Token inválido ou sem permissão (401)');
      } else {
        setTestResult('fail');
        toast.error(`Mapbox retornou status ${r.status}`);
      }
    } catch (e: any) {
      setTestResult('fail');
      toast.error('Falha ao testar: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    toast.success('Token copiado');
  };

  const readOnly = !canManage;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/configuracoes')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Mapeamento (Mapbox)
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Token público da sua organização para o mapa interativo
              </p>
            </div>
          </div>
        </div>

        {!loadingPerm && readOnly && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              Você está visualizando em <strong>modo leitura</strong>. Apenas
              administradores ou o dono da organização podem alterar o token Mapbox.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-6">
          <AlertDescription className="text-sm">
            Para usar o mapeamento GPS do campo, você precisa de um{' '}
            <strong>token público gratuito</strong> do Mapbox.
            <br />
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Obter token gratuito (até 50 mil carregamentos/mês){' '}
              <ExternalLink className="h-3 w-3" />
            </a>
            <br />
            <span className="text-muted-foreground text-xs mt-1 block">
              O token deve começar com{' '}
              <code className="px-1 bg-muted rounded">pk.</code> — ele é público
              e seguro de salvar no app. Cada organização tem seu próprio token
              isolado.
            </span>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Token Público Mapbox</CardTitle>
                <CardDescription>
                  {config
                    ? 'Token configurado para sua organização'
                    : 'Nenhum token configurado ainda'}
                </CardDescription>
              </div>
              {config && testResult && (
                <Badge
                  variant={testResult === 'ok' ? 'default' : 'destructive'}
                  className="gap-1"
                >
                  {testResult === 'ok' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Válido
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" /> Inválido
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token (pk.xxxx...)</Label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  type={showToken || !token ? 'text' : 'password'}
                  placeholder="pk.eyJ1Ijoi..."
                  value={
                    showToken || !token
                      ? token
                      : maskToken(token)
                  }
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTestResult(null);
                  }}
                  disabled={loading || readOnly}
                  className="font-mono text-xs"
                  // Quando mascarado, edição direta confunde — exigimos clicar no olho
                  readOnly={!showToken && !!token && !readOnly ? false : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken((v) => !v)}
                  disabled={!token}
                  title={showToken ? 'Ocultar' : 'Mostrar'}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!token}
                  title="Copiar"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {token && !readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={testing}
                  className="gap-2 mt-1"
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {testing ? 'Testando...' : 'Testar token contra Mapbox'}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude inicial (opcional)</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="-25.4284"
                  value={defaultLat}
                  onChange={(e) => setDefaultLat(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude inicial (opcional)</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="-49.2733"
                  value={defaultLng}
                  onChange={(e) => setDefaultLng(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zoom">Zoom inicial</Label>
                <Input
                  id="zoom"
                  type="number"
                  min="1"
                  max="22"
                  value={defaultZoom}
                  onChange={(e) => setDefaultZoom(e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Define onde o mapa abre por padrão. Se não preencher, será
              centralizado no Brasil.
            </p>

            {config && (authorName || config.updated_at) && (
              <div className="pt-4 border-t text-xs text-muted-foreground space-y-0.5">
                <p>
                  Última atualização:{' '}
                  <strong>
                    {new Date(config.updated_at).toLocaleString('pt-BR')}
                  </strong>
                  {authorName && <> — por {authorName}</>}
                </p>
                {config.created_at !== config.updated_at && (
                  <p>
                    Criado em:{' '}
                    {new Date(config.created_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !token || readOnly}
                className="gap-2 flex-1"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Token'}
              </Button>
              {config && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={readOnly}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
