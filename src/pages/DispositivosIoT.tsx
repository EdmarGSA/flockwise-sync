import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Thermometer, Droplets, Wifi, WifiOff, RefreshCw, Plus, Trash2, Activity, Link, Unlink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dispositivo {
  id: string;
  integrado_id: string;
  galpao_id: string | null;
  device_id_ewelink: string;
  nome: string;
  tipo: string;
  marca: string;
  modelo: string;
  ativo: boolean;
  ultimo_sync: string | null;
}

interface Leitura {
  id: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  online: boolean;
  lido_em: string;
}

interface Galpao {
  id: string;
  nome: string;
  nucleo_id: string;
}

export default function DispositivosIoT() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [leituras, setLeituras] = useState<Record<string, Leitura>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ device_id_ewelink: '', nome: '', galpao_id: '' });
  const [ewelinkConnected, setEwelinkConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('ewelink_connected') === 'true') {
      toast.success('Conta eWeLink conectada com sucesso!');
      setEwelinkConnected(true);
      // Clean URL
      window.history.replaceState({}, '', '/configuracoes/dispositivos-iot');
    }
    if (searchParams.get('ewelink_error')) {
      toast.error('Erro ao conectar conta eWeLink. Tente novamente.');
      window.history.replaceState({}, '', '/configuracoes/dispositivos-iot');
    }
  }, [searchParams]);

  useEffect(() => {
    if (integradoId) {
      checkEwelinkConnection();
      fetchData();
    }
  }, [integradoId]);

  const checkEwelinkConnection = async () => {
    if (!integradoId) return;
    setCheckingConnection(true);
    const { data } = await supabase
      .from('ewelink_tokens')
      .select('id, at_expired_at, rt_expired_at')
      .eq('integrado_id', integradoId)
      .maybeSingle();

    if (data) {
      const rtExpiry = new Date(data.rt_expired_at);
      setEwelinkConnected(rtExpiry > new Date());
    } else {
      setEwelinkConnected(false);
    }
    setCheckingConnection(false);
  };

  const fetchData = async () => {
    if (!integradoId) return;
    setLoading(true);

    const [devRes, galpRes] = await Promise.all([
      supabase.from('dispositivos_iot').select('*').eq('integrado_id', integradoId).order('nome'),
      supabase.from('galpoes').select('id, nome, nucleo_id').eq('ativo', true),
    ]);

    if (devRes.data) setDispositivos(devRes.data as Dispositivo[]);
    if (galpRes.data) setGalpoes(galpRes.data);

    if (devRes.data && devRes.data.length > 0) {
      const leiturasMap: Record<string, Leitura> = {};
      for (const dev of devRes.data) {
        const { data: leitura } = await supabase
          .from('leituras_sensores')
          .select('*')
          .eq('dispositivo_id', dev.id)
          .order('lido_em', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (leitura) leiturasMap[dev.id] = leitura as Leitura;
      }
      setLeituras(leiturasMap);
    }

    setLoading(false);
  };

  const handleConnectEwelink = async () => {
    if (!integradoId) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const redirectUrl = `${supabaseUrl}/functions/v1/ewelink-oauth-callback`;
      const nonce = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
      const state = integradoId;

      const configRes = await fetch(`${supabaseUrl}/functions/v1/sync-sensors?action=config`);
      const configData = await configRes.json();
      const appId = configData?.appId;
      if (!appId) {
        toast.error('App ID eWeLink não configurado');
        return;
      }

      const oauthUrl = `https://c2ccdn.coolkit.cc/oauth/index.html?clientId=${appId}&redirectUrl=${encodeURIComponent(redirectUrl)}&grantType=authorization_code&state=${state}&nonce=${nonce}`;
      window.location.href = oauthUrl;
    } catch {
      toast.error('Erro ao iniciar conexão eWeLink');
    }
  };

  const handleDisconnectEwelink = async () => {
    if (!integradoId) return;
    const { error } = await supabase
      .from('ewelink_tokens')
      .delete()
      .eq('integrado_id', integradoId);
    if (error) {
      toast.error('Erro ao desconectar');
      return;
    }
    toast.success('Conta eWeLink desconectada');
    setEwelinkConnected(false);
  };

  const handleSync = async () => {
    if (!ewelinkConnected) {
      toast.error('Conecte sua conta eWeLink primeiro');
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sensors', {
        body: { action: 'sync', integrado_id: integradoId },
      });

      if (error) throw error;
      if (data?.error === 'NOT_CONNECTED' || data?.error === 'REAUTH_REQUIRED') {
        setEwelinkConnected(false);
        toast.error(data.message || 'Reconecte sua conta eWeLink');
        return;
      }
      toast.success(`Sync concluído: ${data?.leituras || 0} leituras`);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao sincronizar';
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddDevice = async () => {
    if (!integradoId || !newDevice.device_id_ewelink || !newDevice.nome) {
      toast.error('Preencha ID do dispositivo e nome');
      return;
    }

    const { error } = await supabase.from('dispositivos_iot').insert({
      integrado_id: integradoId,
      device_id_ewelink: newDevice.device_id_ewelink,
      nome: newDevice.nome,
      galpao_id: newDevice.galpao_id || null,
    });

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Dispositivo já cadastrado' : error.message);
      return;
    }

    toast.success('Dispositivo cadastrado');
    setAddDialogOpen(false);
    setNewDevice({ device_id_ewelink: '', nome: '', galpao_id: '' });
    fetchData();
  };

  const handleDeleteDevice = async (id: string) => {
    const { error } = await supabase.from('dispositivos_iot').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Dispositivo removido');
    fetchData();
  };

  const getTemperaturaColor = (temp: number | null) => {
    if (temp === null) return 'text-muted-foreground';
    if (temp < 20 || temp > 32) return 'text-destructive';
    if (temp < 22 || temp > 30) return 'text-accent';
    return 'text-primary';
  };

  const getUmidadeColor = (umid: number | null) => {
    if (umid === null) return 'text-muted-foreground';
    if (umid < 40 || umid > 80) return 'text-destructive';
    if (umid < 50 || umid > 70) return 'text-accent';
    return 'text-primary';
  };

  if (loading || loadingIntegrado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando dispositivos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Dispositivos IoT
              </h1>
              <p className="text-sm text-muted-foreground">Monitoramento de temperatura e umidade via Sonoff TH</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing || !ewelinkConnected}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Dispositivo Sonoff</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>ID do Dispositivo (eWeLink)</Label>
                    <Input
                      placeholder="Ex: 1000abcdef"
                      value={newDevice.device_id_ewelink}
                      onChange={(e) => setNewDevice({ ...newDevice, device_id_ewelink: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Encontre no app eWeLink → Dispositivo → Configurações → ID do dispositivo
                    </p>
                  </div>
                  <div>
                    <Label>Nome</Label>
                    <Input
                      placeholder="Ex: Sensor Galpão 1"
                      value={newDevice.nome}
                      onChange={(e) => setNewDevice({ ...newDevice, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Galpão (opcional)</Label>
                    <Select value={newDevice.galpao_id} onValueChange={(v) => setNewDevice({ ...newDevice, galpao_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o galpão" />
                      </SelectTrigger>
                      <SelectContent>
                        {galpoes.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleAddDevice}>
                    Cadastrar Dispositivo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* eWeLink Connection Card */}
        <Card className={ewelinkConnected ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {ewelinkConnected ? (
                <Link className="h-5 w-5 text-primary" />
              ) : (
                <Unlink className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {checkingConnection ? 'Verificando conexão...' : ewelinkConnected ? 'Conta eWeLink conectada' : 'Conta eWeLink não conectada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ewelinkConnected
                    ? 'Seus sensores serão sincronizados automaticamente'
                    : 'Conecte sua conta eWeLink para sincronizar sensores'}
                </p>
              </div>
            </div>
            {ewelinkConnected ? (
              <Button variant="outline" size="sm" onClick={handleDisconnectEwelink}>
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnectEwelink} disabled={checkingConnection}>
                <Link className="h-4 w-4 mr-2" />
                Conectar eWeLink
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Devices Grid */}
        {dispositivos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg text-foreground">Nenhum dispositivo cadastrado</h3>
              <p className="text-muted-foreground mt-1">
                Adicione seus sensores Sonoff TH para monitorar temperatura e umidade dos galpões.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dispositivos.map((dev) => {
              const leitura = leituras[dev.id];
              const galpao = galpoes.find((g) => g.id === dev.galpao_id);

              return (
                <Card key={dev.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {leitura?.online !== false ? (
                          <Wifi className="h-4 w-4 text-primary" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-destructive" />
                        )}
                        {dev.nome}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteDevice(dev.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="secondary" className="text-xs">{dev.marca} {dev.modelo}</Badge>
                      {galpao && <Badge variant="outline" className="text-xs">{galpao.nome}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {leitura ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Thermometer className={`h-5 w-5 ${getTemperaturaColor(leitura.temperatura_c)}`} />
                            <div>
                              <p className="text-xs text-muted-foreground">Temperatura</p>
                              <p className={`text-lg font-bold ${getTemperaturaColor(leitura.temperatura_c)}`}>
                                {leitura.temperatura_c !== null ? `${leitura.temperatura_c}°C` : '--'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Droplets className={`h-5 w-5 ${getUmidadeColor(leitura.umidade_pct)}`} />
                            <div>
                              <p className="text-xs text-muted-foreground">Umidade</p>
                              <p className={`text-lg font-bold ${getUmidadeColor(leitura.umidade_pct)}`}>
                                {leitura.umidade_pct !== null ? `${leitura.umidade_pct}%` : '--'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Última leitura: {formatDistanceToNow(new Date(leitura.lido_em), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Sem leituras. Clique em "Sincronizar".
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info card */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <h4 className="font-medium text-sm text-foreground mb-2">Como configurar</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Clique em "Conectar eWeLink" e autorize o acesso à sua conta</li>
              <li>Pareie seu Sonoff TH no app eWeLink normalmente</li>
              <li>Copie o ID do dispositivo (app eWeLink → Configurações do dispositivo)</li>
              <li>Clique em "Adicionar" e cole o ID</li>
              <li>Vincule a um galpão para monitoramento automático</li>
              <li>Clique em "Sincronizar" para buscar a primeira leitura</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
