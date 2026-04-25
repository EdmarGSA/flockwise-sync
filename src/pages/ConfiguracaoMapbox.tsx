import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, ExternalLink, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useMapboxToken } from '@/hooks/useMapboxToken';

export default function ConfiguracaoMapbox() {
  const navigate = useNavigate();
  const { config, loading, refetch, integradoId } = useMapboxToken();

  const [token, setToken] = useState('');
  const [defaultLat, setDefaultLat] = useState('');
  const [defaultLng, setDefaultLng] = useState('');
  const [defaultZoom, setDefaultZoom] = useState('12');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setToken(config.public_token || '');
      setDefaultLat(config.default_lat?.toString() || '');
      setDefaultLng(config.default_lng?.toString() || '');
      setDefaultZoom(config.default_zoom?.toString() || '12');
    }
  }, [config]);

  const handleSave = async () => {
    if (!integradoId) return;
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
    if (!confirm('Remover o token Mapbox? O mapa ficará indisponível.')) return;
    const { error } = await supabase.from('mapbox_config').delete().eq('id', config.id);
    if (error) toast.error('Erro ao remover: ' + error.message);
    else {
      toast.success('Token removido');
      setToken('');
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mapeamento (Mapbox)</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Token público para exibir o mapa interativo do campo
              </p>
            </div>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertDescription className="text-sm">
            Para usar o mapeamento GPS do campo, você precisa de um <strong>token público gratuito</strong> do Mapbox.
            <br />
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Obter token gratuito (até 50 mil carregamentos/mês) <ExternalLink className="h-3 w-3" />
            </a>
            <br />
            <span className="text-muted-foreground text-xs mt-1 block">
              O token deve começar com <code className="px-1 bg-muted rounded">pk.</code> — ele é público e seguro de
              salvar no app.
            </span>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Token Público Mapbox</CardTitle>
            <CardDescription>
              {config ? 'Token configurado para sua organização' : 'Nenhum token configurado ainda'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token (pk.xxxx...)</Label>
              <Input
                id="token"
                type="text"
                placeholder="pk.eyJ1Ijoi..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                className="font-mono text-xs"
              />
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
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Define onde o mapa abre por padrão. Se não preencher, será centralizado no Brasil.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving || !token} className="gap-2 flex-1">
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Token'}
              </Button>
              {config && (
                <Button variant="outline" onClick={handleDelete} className="gap-2 text-destructive">
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
