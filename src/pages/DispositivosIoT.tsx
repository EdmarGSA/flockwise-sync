import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useDeviceControl } from '@/hooks/useDeviceControl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Thermometer, Droplets, Wifi, WifiOff, RefreshCw, Plus, Trash2, Activity, Link, Unlink, Search, ExternalLink, Power, Loader2, Zap, History } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
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
  funcao_automacao: string;
  automacao_ativa: boolean;
  regra_grupo: string | null;
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

interface EwelinkApiDevice {
  deviceId: string;
  name: string;
  online: boolean;
  temperatura: number | null;
  umidade: number | null;
  switchState?: string | null;
}

interface RegraTemperatura {
  id: string;
  nome: string;
  dia_inicio: number;
  dia_fim: number;
  temp_min_c: number;
  temp_max_c: number;
  umidade_min_pct: number | null;
  umidade_max_pct: number | null;
  ativo: boolean;
}

interface LogAutomacao {
  id: string;
  created_at: string;
  temperatura_lida: number;
  temp_min_regra: number;
  temp_max_regra: number;
  acao: string;
  resultado: string;
  dispositivo_nome?: string;
  lote_id?: string;
}

export default function DispositivosIoT() {
  const navigate = useNavigate();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [leituras, setLeituras] = useState<Record<string, Leitura>>({});
  const [switchStates, setSwitchStates] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ device_id_ewelink: '', nome: '', galpao_id: '' });
  const [ewelinkConnected, setEwelinkConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [ewelinkDevices, setEwelinkDevices] = useState<EwelinkApiDevice[]>([]);
  const [loadingEwelinkDevices, setLoadingEwelinkDevices] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [autoControlDevices, setAutoControlDevices] = useState<Set<string>>(new Set());
  const [automacaoDialogOpen, setAutomacaoDialogOpen] = useState(false);
  const [selectedDeviceForAutomacao, setSelectedDeviceForAutomacao] = useState<Dispositivo | null>(null);
  const [selectedFuncao, setSelectedFuncao] = useState<string>('nenhuma');
  const [selectedRegraGrupo, setSelectedRegraGrupo] = useState<string>('');

  // Automation state
  const [regras, setRegras] = useState<RegraTemperatura[]>([]);
  const [logs, setLogs] = useState<LogAutomacao[]>([]);
  const [addRegraOpen, setAddRegraOpen] = useState(false);
  const [newRegra, setNewRegra] = useState({ dia_inicio: '', dia_fim: '', temp_min_c: '', temp_max_c: '' });

  const { toggleDevice, isControlling, fetchDeviceStatus } = useDeviceControl({
    integradoId,
    onSuccess: () => fetchDeviceStates(),
  });

  useEffect(() => {
    if (integradoId) {
      checkEwelinkConnection();
      fetchData();
    }
  }, [integradoId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ewelink_connected') === 'true') {
      toast.success('Conta eWeLink conectada com sucesso!');
      setEwelinkConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('ewelink_error')) {
      toast.error(`Erro ao conectar eWeLink: ${params.get('ewelink_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkEwelinkConnection = async () => {
    setCheckingConnection(true);
    try {
      const { data } = await supabase.functions.invoke('sync-sensors', {
        body: { action: 'check-connection', integrado_id: integradoId },
      });
      setEwelinkConnected(data?.connected === true);
    } catch {
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
      fetchDeviceStatesForDevices(devRes.data as Dispositivo[]);
    }

    // Fetch automation rules
    fetchRegras();
    fetchLogs();

    setLoading(false);
  };

  const fetchRegras = async () => {
    if (!integradoId) return;
    const { data } = await supabase
      .from('regras_temperatura_lote')
      .select('*')
      .eq('integrado_id', integradoId)
      .order('dia_inicio', { ascending: true });
    if (data) setRegras(data as RegraTemperatura[]);
  };

  const fetchLogs = async () => {
    if (!integradoId) return;
    const { data } = await supabase
      .from('log_automacao_temperatura')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      // Enrich with device names
      const enriched = data.map((log: any) => {
        const dev = dispositivos.find(d => d.id === log.dispositivo_id);
        return { ...log, dispositivo_nome: dev?.nome || 'Desconhecido' };
      });
      setLogs(enriched);
    }
  };

  const fetchDeviceStatesForDevices = async (devices: Dispositivo[]) => {
    const states: Record<string, string | null> = {};
    const autoCtrl = new Set<string>();
    await Promise.all(
      devices.map(async (dev) => {
        const params = await fetchDeviceStatus(dev.device_id_ewelink);
        states[dev.id] = params?.switch ?? null;
        if (params?.autoControlEnabled === 1) autoCtrl.add(dev.id);
      })
    );
    setSwitchStates(states);
    setAutoControlDevices(autoCtrl);
  };

  const fetchDeviceStates = async () => {
    if (dispositivos.length > 0) {
      await fetchDeviceStatesForDevices(dispositivos);
    }
  };

  const handleConnectEwelink = async () => {
    setConnecting(true);
    try {
      const returnUrl = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.functions.invoke('sync-sensors', {
        body: { action: 'oauth-url', integrado_id: integradoId, returnUrl },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) { window.location.href = data.url; } else { toast.error('URL de autorização não retornada'); }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar URL OAuth');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectEwelink = async () => {
    if (!integradoId) return;
    const { error } = await supabase.from('ewelink_tokens' as any).delete().eq('integrado_id', integradoId);
    if (error) { toast.error('Erro ao desconectar'); return; }
    toast.success('Conta eWeLink desconectada');
    setEwelinkConnected(false);
  };

  const handleSync = async () => {
    if (!ewelinkConnected) { toast.error('Conta eWeLink não conectada'); return; }
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
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchEwelinkDevices = async () => {
    setLoadingEwelinkDevices(true);
    setShowDevicePicker(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-sensors', {
        body: { action: 'list-devices', integrado_id: integradoId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.message || 'Erro ao buscar dispositivos'); setEwelinkDevices([]); return; }
      setEwelinkDevices(data?.devices || []);
      if (!data?.devices?.length) toast.info('Nenhum dispositivo encontrado na conta eWeLink');
    } catch {
      toast.error('Erro ao buscar dispositivos da conta eWeLink');
      setEwelinkDevices([]);
    } finally {
      setLoadingEwelinkDevices(false);
    }
  };

  const handleSelectEwelinkDevice = (dev: EwelinkApiDevice) => {
    setNewDevice({ device_id_ewelink: dev.deviceId, nome: dev.name, galpao_id: newDevice.galpao_id });
    setShowDevicePicker(false);
    toast.success(`Dispositivo "${dev.name}" selecionado`);
  };

  const handleAddDevice = async () => {
    if (!integradoId || !newDevice.device_id_ewelink || !newDevice.nome) {
      toast.error('Preencha ID do dispositivo e nome'); return;
    }
    const { error } = await supabase.from('dispositivos_iot').insert({
      integrado_id: integradoId,
      device_id_ewelink: newDevice.device_id_ewelink,
      nome: newDevice.nome,
      galpao_id: newDevice.galpao_id || null,
    });
    if (error) { toast.error(error.message.includes('duplicate') ? 'Dispositivo já cadastrado' : error.message); return; }
    toast.success('Dispositivo cadastrado');
    setAddDialogOpen(false);
    setNewDevice({ device_id_ewelink: '', nome: '', galpao_id: '' });
    fetchData();
  };

  const handleDeleteDevice = async (id: string) => {
    const { error } = await supabase.from('dispositivos_iot').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Dispositivo removido');
    fetchData();
  };

  const handleUpdateDeviceAutomation = async (devId: string, field: string, value: any) => {
    const { error } = await supabase
      .from('dispositivos_iot')
      .update({ [field]: value })
      .eq('id', devId);
    if (error) { toast.error(error.message); return; }
    setDispositivos(prev => prev.map(d => d.id === devId ? { ...d, [field]: value } : d));
    toast.success('Dispositivo atualizado');
  };

  const openAutomacaoDialog = (dev: Dispositivo) => {
    setSelectedDeviceForAutomacao(dev);
    setSelectedFuncao(dev.funcao_automacao || 'nenhuma');
    setSelectedRegraGrupo(dev.regra_grupo || '');
    setAutomacaoDialogOpen(true);
  };

  const handleSaveAutomacao = async () => {
    if (!selectedDeviceForAutomacao) return;
    const isActive = selectedFuncao !== 'nenhuma' && !!selectedRegraGrupo && !!selectedDeviceForAutomacao.galpao_id;
    const { error } = await supabase
      .from('dispositivos_iot')
      .update({
        funcao_automacao: selectedFuncao as any,
        regra_grupo: selectedRegraGrupo || null,
        automacao_ativa: isActive,
      })
      .eq('id', selectedDeviceForAutomacao.id);
    if (error) { toast.error(error.message); return; }
    setDispositivos(prev => prev.map(d =>
      d.id === selectedDeviceForAutomacao.id
        ? { ...d, funcao_automacao: selectedFuncao, regra_grupo: selectedRegraGrupo || null, automacao_ativa: isActive }
        : d
    ));
    toast.success(isActive ? 'Automação ativada e vinculada às regras' : 'Automação atualizada');
    setAutomacaoDialogOpen(false);
  };

  const handleDesativarAutomacao = async (devId: string) => {
    const { error } = await supabase
      .from('dispositivos_iot')
      .update({ automacao_ativa: false, funcao_automacao: 'nenhuma', regra_grupo: null })
      .eq('id', devId);
    if (error) { toast.error(error.message); return; }
    setDispositivos(prev => prev.map(d =>
      d.id === devId ? { ...d, automacao_ativa: false, funcao_automacao: 'nenhuma', regra_grupo: null } : d
    ));
    toast.success('Automação desativada');
  };

  const regraGrupos = [...new Set(regras.map(r => r.nome))].filter(Boolean);

  const handleAddRegra = async () => {
    if (!integradoId) return;
    const { dia_inicio, dia_fim, temp_min_c, temp_max_c } = newRegra;
    if (!dia_inicio || !dia_fim || !temp_min_c || !temp_max_c) {
      toast.error('Preencha todos os campos'); return;
    }
    const { error } = await supabase.from('regras_temperatura_lote').insert({
      integrado_id: integradoId,
      dia_inicio: Number(dia_inicio),
      dia_fim: Number(dia_fim),
      temp_min_c: Number(temp_min_c),
      temp_max_c: Number(temp_max_c),
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Regra adicionada');
    setNewRegra({ dia_inicio: '', dia_fim: '', temp_min_c: '', temp_max_c: '' });
    setAddRegraOpen(false);
    fetchRegras();
  };

  const handleDeleteRegra = async (id: string) => {
    const { error } = await supabase.from('regras_temperatura_lote').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Regra removida');
    fetchRegras();
  };

  const handleSeedDefaultRegras = async () => {
    if (!integradoId) return;
    const defaults = [
      { dia_inicio: 1, dia_fim: 7, temp_min_c: 32, temp_max_c: 34 },
      { dia_inicio: 8, dia_fim: 14, temp_min_c: 29, temp_max_c: 31 },
      { dia_inicio: 15, dia_fim: 21, temp_min_c: 26, temp_max_c: 28 },
      { dia_inicio: 22, dia_fim: 28, temp_min_c: 23, temp_max_c: 25 },
      { dia_inicio: 29, dia_fim: 56, temp_min_c: 20, temp_max_c: 23 },
    ];
    const { error } = await supabase.from('regras_temperatura_lote').insert(
      defaults.map(d => ({ ...d, integrado_id: integradoId, nome: 'Padrão Frango Corte' }))
    );
    if (error) { toast.error(error.message); return; }
    toast.success('Regras padrão criadas');
    fetchRegras();
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
              <p className="text-sm text-muted-foreground">Monitoramento, controle e automação de dispositivos Sonoff</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing || !ewelinkConnected}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Adicionar Dispositivo Sonoff</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  {ewelinkConnected && (
                    <Button type="button" variant="outline" className="w-full" onClick={handleFetchEwelinkDevices} disabled={loadingEwelinkDevices}>
                      <Search className="h-4 w-4 mr-2" />
                      {loadingEwelinkDevices ? 'Buscando...' : 'Buscar dispositivos da conta eWeLink'}
                    </Button>
                  )}
                  {showDevicePicker && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {loadingEwelinkDevices ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                      ) : ewelinkDevices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum dispositivo encontrado</p>
                      ) : (
                        ewelinkDevices.map((dev) => (
                          <button key={dev.deviceId} type="button" className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-b-0 flex items-center justify-between" onClick={() => handleSelectEwelinkDevice(dev)}>
                            <div>
                              <p className="text-sm font-medium text-foreground">{dev.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {dev.deviceId}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {dev.online ? <Badge variant="secondary" className="text-xs"><Wifi className="h-3 w-3 mr-1" />Online</Badge> : <Badge variant="outline" className="text-xs"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
                              {dev.temperatura !== null && <span className="text-muted-foreground">{dev.temperatura}°C</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <div>
                    <Label>ID do Dispositivo (eWeLink)</Label>
                    <Input placeholder="Ex: 1000abcdef" value={newDevice.device_id_ewelink} onChange={(e) => setNewDevice({ ...newDevice, device_id_ewelink: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nome</Label>
                    <Input placeholder="Ex: Sensor Galpão 1" value={newDevice.nome} onChange={(e) => setNewDevice({ ...newDevice, nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>Galpão (opcional)</Label>
                    <Select value={newDevice.galpao_id} onValueChange={(v) => setNewDevice({ ...newDevice, galpao_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o galpão" /></SelectTrigger>
                      <SelectContent>
                        {galpoes.map((g) => (<SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleAddDevice}>Cadastrar Dispositivo</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* eWeLink Connection Card */}
        <Card className={ewelinkConnected ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {ewelinkConnected ? <Link className="h-5 w-5 text-primary" /> : <Unlink className="h-5 w-5 text-destructive" />}
                <div>
                  <p className="font-medium text-foreground">
                    {checkingConnection ? 'Verificando conexão...' : ewelinkConnected ? 'Conta eWeLink conectada' : 'Conta eWeLink não conectada'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ewelinkConnected ? 'Seus dispositivos serão sincronizados e controlados através da sua conta eWeLink' : 'Conecte sua conta eWeLink para sincronizar e controlar seus dispositivos Sonoff'}
                  </p>
                </div>
              </div>
              {ewelinkConnected && (
                <Button variant="outline" size="sm" onClick={handleDisconnectEwelink}>
                  <Unlink className="h-4 w-4 mr-2" />Desconectar
                </Button>
              )}
            </div>
            {!ewelinkConnected && !checkingConnection && (
              <div className="mt-3 space-y-2">
                <Button className="w-full sm:w-auto" onClick={handleConnectEwelink} disabled={connecting}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {connecting ? 'Redirecionando...' : 'Conectar conta eWeLink'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Você será redirecionado para a página de login do eWeLink para autorizar o acesso aos seus dispositivos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="dispositivos">
          <TabsList>
            <TabsTrigger value="dispositivos" className="gap-1"><Activity className="h-4 w-4" />Dispositivos</TabsTrigger>
            <TabsTrigger value="automacao" className="gap-1"><Zap className="h-4 w-4" />Automação</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1"><History className="h-4 w-4" />Histórico</TabsTrigger>
          </TabsList>

          {/* Dispositivos Tab */}
          <TabsContent value="dispositivos">
            {dispositivos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg text-foreground">Nenhum dispositivo cadastrado</h3>
                  <p className="text-muted-foreground mt-1">Adicione seus dispositivos Sonoff para monitorar e controlar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dispositivos.map((dev) => {
                  const leitura = leituras[dev.id];
                  const galpao = galpoes.find((g) => g.id === dev.galpao_id);
                  const currentSwitch = switchStates[dev.id];
                  const isOnline = leitura?.online !== false;

                  return (
                    <Card key={dev.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {isOnline ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                            {dev.nome}
                          </CardTitle>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteDevice(dev.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{dev.device_id_ewelink}</Badge>
                          {galpao && <Badge variant="outline" className="text-xs">{galpao.nome}</Badge>}
                          {dev.automacao_ativa && dev.funcao_automacao !== 'nenhuma' && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30 gap-0.5">
                              <Zap className="h-2.5 w-2.5" />
                              {dev.funcao_automacao === 'aquecimento' ? 'Aquecimento' : 'Ventilação'}
                            </Badge>
                          )}
                          {dev.regra_grupo && (
                            <Badge variant="outline" className="text-xs gap-0.5">
                              <Link className="h-2.5 w-2.5" />
                              {dev.regra_grupo}
                            </Badge>
                          )}
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
                          <p className="text-sm text-muted-foreground py-4 text-center">Sem leituras. Clique em "Sincronizar".</p>
                        )}

                        {currentSwitch !== undefined && (
                          <div className="mt-3 pt-3 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isControlling(dev.device_id_ewelink) ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Power className={`h-4 w-4 ${currentSwitch === 'on' ? 'text-primary' : 'text-muted-foreground'}`} />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {currentSwitch === 'on' ? 'Ligado' : currentSwitch === 'off' ? 'Desligado' : 'Controle'}
                              </span>
                              {autoControlDevices.has(dev.id) && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Auto</Badge>
                              )}
                            </div>
                            <Switch
                              checked={currentSwitch === 'on'}
                              disabled={isControlling(dev.device_id_ewelink) || !isOnline}
                              onCheckedChange={() => toggleDevice(dev.device_id_ewelink, currentSwitch)}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Automação Tab */}
          <TabsContent value="automacao" className="space-y-6">
            {/* Temperature Rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-primary" />
                    Faixas de Temperatura por Idade
                  </CardTitle>
                  <div className="flex gap-2">
                    {regras.length === 0 && (
                      <Button variant="outline" size="sm" onClick={handleSeedDefaultRegras}>
                        Criar padrão
                      </Button>
                    )}
                    <Dialog open={addRegraOpen} onOpenChange={setAddRegraOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova regra</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Nova Regra de Temperatura</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Dia início</Label>
                              <Input type="number" value={newRegra.dia_inicio} onChange={(e) => setNewRegra({ ...newRegra, dia_inicio: e.target.value })} placeholder="1" />
                            </div>
                            <div>
                              <Label>Dia fim</Label>
                              <Input type="number" value={newRegra.dia_fim} onChange={(e) => setNewRegra({ ...newRegra, dia_fim: e.target.value })} placeholder="7" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Temp. mínima (°C)</Label>
                              <Input type="number" step="0.5" value={newRegra.temp_min_c} onChange={(e) => setNewRegra({ ...newRegra, temp_min_c: e.target.value })} placeholder="32" />
                            </div>
                            <div>
                              <Label>Temp. máxima (°C)</Label>
                              <Input type="number" step="0.5" value={newRegra.temp_max_c} onChange={(e) => setNewRegra({ ...newRegra, temp_max_c: e.target.value })} placeholder="34" />
                            </div>
                          </div>
                          <Button className="w-full" onClick={handleAddRegra}>Salvar regra</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {regras.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma regra configurada. Clique em "Criar padrão" para usar as faixas recomendadas para frango de corte.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Temp. Mín.</TableHead>
                        <TableHead>Temp. Máx.</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regras.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">Dia {r.dia_inicio} – {r.dia_fim}</TableCell>
                          <TableCell>{Number(r.temp_min_c)}°C</TableCell>
                          <TableCell>{Number(r.temp_max_c)}°C</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteRegra(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Device Automation Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Função dos Dispositivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dispositivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum dispositivo cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Galpão</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Regras Vinculadas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispositivos.map((dev) => {
                        const galpao = galpoes.find(g => g.id === dev.galpao_id);
                        const regrasFiltradas = dev.regra_grupo ? regras.filter(r => r.nome === dev.regra_grupo) : [];
                        return (
                          <TableRow key={dev.id}>
                            <TableCell className="font-medium">{dev.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{galpao?.nome || '—'}</TableCell>
                            <TableCell>
                              {dev.funcao_automacao !== 'nenhuma' ? (
                                <Badge variant="secondary" className="text-xs">
                                  {dev.funcao_automacao === 'aquecimento' ? 'Aquecimento' : 'Ventilação'}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {dev.regra_grupo ? (
                                <div>
                                  <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                                    <Link className="h-2.5 w-2.5" />
                                    {dev.regra_grupo}
                                  </Badge>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {regrasFiltradas.length} faixa{regrasFiltradas.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Não vinculado</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {dev.automacao_ativa ? (
                                <Badge className="text-xs bg-primary/10 text-primary border border-primary/30">Ativa</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Inativa</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAutomacaoDialog(dev)}>
                                  <Zap className="h-3 w-3 mr-1" />Configurar
                                </Button>
                                {dev.automacao_ativa && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDesativarAutomacao(dev.id)}>
                                    <Unlink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  Clique em "Configurar" para vincular o dispositivo a um grupo de regras de temperatura e definir a função (aquecimento/ventilação).
                </p>
              </CardContent>
            </Card>

            {/* Automação Dialog */}
            <Dialog open={automacaoDialogOpen} onOpenChange={setAutomacaoDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Configurar Automação — {selectedDeviceForAutomacao?.nome}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {!selectedDeviceForAutomacao?.galpao_id && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      Este dispositivo não está vinculado a um galpão. Vincule-o primeiro na aba Dispositivos.
                    </div>
                  )}

                  <div>
                    <Label>Função do dispositivo</Label>
                    <Select value={selectedFuncao} onValueChange={setSelectedFuncao}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma</SelectItem>
                        <SelectItem value="aquecimento">Aquecimento</SelectItem>
                        <SelectItem value="ventilacao">Ventilação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Grupo de regras de temperatura</Label>
                    {regraGrupos.length === 0 ? (
                      <div className="mt-2 p-3 rounded-md bg-muted text-sm text-muted-foreground text-center">
                        Nenhum grupo de regras cadastrado.
                        <Button variant="link" size="sm" className="ml-1 p-0 h-auto" onClick={() => { setAutomacaoDialogOpen(false); handleSeedDefaultRegras(); }}>
                          Criar regras padrão
                        </Button>
                      </div>
                    ) : (
                      <Select value={selectedRegraGrupo} onValueChange={setSelectedRegraGrupo}>
                        <SelectTrigger><SelectValue placeholder="Selecione o grupo de regras" /></SelectTrigger>
                        <SelectContent>
                          {regraGrupos.map(grupo => (
                            <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedRegraGrupo && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Faixas do grupo "{selectedRegraGrupo}"</Label>
                      <div className="mt-1 border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8 text-xs">Período</TableHead>
                              <TableHead className="h-8 text-xs">Mín.</TableHead>
                              <TableHead className="h-8 text-xs">Máx.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regras.filter(r => r.nome === selectedRegraGrupo).map(r => (
                              <TableRow key={r.id}>
                                <TableCell className="py-1.5 text-xs">Dia {r.dia_inicio}–{r.dia_fim}</TableCell>
                                <TableCell className="py-1.5 text-xs">{Number(r.temp_min_c)}°C</TableCell>
                                <TableCell className="py-1.5 text-xs">{Number(r.temp_max_c)}°C</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleSaveAutomacao}
                    disabled={!selectedDeviceForAutomacao?.galpao_id || (selectedFuncao !== 'nenhuma' && !selectedRegraGrupo)}
                  >
                    {selectedFuncao !== 'nenhuma' && selectedRegraGrupo ? 'Ativar Automação' : 'Salvar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Histórico de Automação
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchLogs}>
                    <RefreshCw className="h-4 w-4 mr-1" />Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ação automática registrada ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Temp. Lida</TableHead>
                        <TableHead>Faixa</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell className="text-sm font-medium">{log.dispositivo_nome}</TableCell>
                          <TableCell>{log.temperatura_lida != null ? `${Number(log.temperatura_lida).toFixed(1)}°C` : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{Number(log.temp_min_regra)}–{Number(log.temp_max_regra)}°C</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{log.acao}</TableCell>
                          <TableCell>
                            <Badge variant={log.resultado === 'sucesso' ? 'secondary' : 'destructive'} className="text-xs">
                              {log.resultado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info card */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <h4 className="font-medium text-sm text-foreground mb-2">Como configurar</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Pareie seus dispositivos Sonoff no app eWeLink (na sua conta pessoal)</li>
              <li>Clique em "Conectar conta eWeLink" e autorize o acesso na página do eWeLink</li>
              <li>Clique em "Adicionar" e use "Buscar dispositivos" para selecionar o sensor da lista</li>
              <li>Vincule a um galpão para monitoramento automático</li>
              <li>Na aba "Automação", configure as faixas de temperatura por idade e a função de cada dispositivo</li>
              <li>A automação verifica a cada 5 minutos e liga/desliga conforme a faixa ideal</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
