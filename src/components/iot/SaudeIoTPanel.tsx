import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Activity,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dispositivo {
  id: string;
  nome: string;
  device_id_ewelink: string;
  driver?: string;
  ativo: boolean;
  ultimo_sync: string | null;
  galpao_id: string | null;
}

interface Leitura {
  dispositivo_id: string;
  temperatura_c: number | null;
  umidade_pct: number | null;
  online: boolean;
  lido_em: string;
}

interface ComandoLog {
  id: string;
  created_at: string;
  acao: string;
  resultado: string;
  temperatura_lida: number | null;
  tempo_resposta_ms: number | null;
  dispositivo_id: string | null;
}

interface Galpao {
  id: string;
  nome: string;
}

interface Props {
  integradoId: string | null;
  dispositivos: Dispositivo[];
  galpoes: Galpao[];
  /** Janela em minutos para considerar dispositivo "online". Default 15. */
  onlineWindowMinutes?: number;
}

export function SaudeIoTPanel({
  integradoId,
  dispositivos,
  galpoes,
  onlineWindowMinutes = 15,
}: Props) {
  const [leituras, setLeituras] = useState<Record<string, Leitura>>({});
  const [comandos, setComandos] = useState<ComandoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!integradoId || dispositivos.length === 0) {
      setLeituras({});
      setComandos([]);
      setLoading(false);
      return;
    }

    setRefreshing(true);
    const ids = dispositivos.map((d) => d.id);

    // Última leitura por dispositivo (uma query, depois pegamos a mais recente por device em memória)
    const { data: leituraData } = await supabase
      .from('leituras_sensores')
      .select('dispositivo_id, temperatura_c, umidade_pct, online, lido_em')
      .in('dispositivo_id', ids)
      .order('lido_em', { ascending: false })
      .limit(500);

    const map: Record<string, Leitura> = {};
    (leituraData || []).forEach((l) => {
      if (!map[l.dispositivo_id]) map[l.dispositivo_id] = l as Leitura;
    });
    setLeituras(map);

    // Últimos comandos da automação (15 mais recentes)
    const { data: cmdData } = await supabase
      .from('log_automacao_temperatura')
      .select('id, created_at, acao, resultado, temperatura_lida, tempo_resposta_ms, dispositivo_id')
      .order('created_at', { ascending: false })
      .limit(15);
    setComandos((cmdData || []) as ComandoLog[]);

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    // Realtime: atualiza ao chegar nova leitura ou novo comando
    if (!integradoId || dispositivos.length === 0) return;

    const channel = supabase
      .channel(`saude-iot-${integradoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leituras_sensores' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'log_automacao_temperatura' },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integradoId, dispositivos.map((d) => d.id).join(',')]);

  const isOnline = (devId: string): boolean => {
    const l = leituras[devId];
    if (!l) return false;
    if (l.online === false) return false;
    const ageMin = (Date.now() - new Date(l.lido_em).getTime()) / 60000;
    return ageMin <= onlineWindowMinutes;
  };

  const stats = useMemo(() => {
    const total = dispositivos.length;
    const onlineCount = dispositivos.filter((d) => isOnline(d.id)).length;
    const offlineCount = total - onlineCount;
    const semLeitura = dispositivos.filter((d) => !leituras[d.id]).length;
    return { total, onlineCount, offlineCount, semLeitura };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispositivos, leituras]);

  const galpaoName = (id: string | null) =>
    id ? galpoes.find((g) => g.id === id)?.nome ?? '—' : '—';

  const devNome = (devId: string | null) =>
    devId ? dispositivos.find((d) => d.id === devId)?.nome ?? 'Desconhecido' : 'Sistema';

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Carregando saúde dos dispositivos...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="h-3.5 w-3.5" /> Total
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary text-xs">
              <Wifi className="h-3.5 w-3.5" /> Online
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{stats.onlineCount}</p>
          </CardContent>
        </Card>
        <Card className={stats.offlineCount > 0 ? 'border-destructive/40' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${
                stats.offlineCount > 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {stats.offlineCount}
            </p>
          </CardContent>
        </Card>
        <Card className={stats.semLeitura > 0 ? 'border-amber-500/40' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" /> Sem leitura
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${
                stats.semLeitura > 0 ? 'text-amber-600' : 'text-foreground'
              }`}
            >
              {stats.semLeitura}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Tabela de status por dispositivo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status por dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dispositivos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum dispositivo cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Galpão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última leitura</TableHead>
                    <TableHead className="text-right">Temp.</TableHead>
                    <TableHead className="text-right">Umid.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispositivos.map((d) => {
                    const l = leituras[d.id];
                    const online = isOnline(d.id);
                    const isEsp32 = d.driver === 'esp32_http' || d.driver === 'esp32_mqtt';
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {online ? (
                              <Wifi className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <WifiOff className="h-3.5 w-3.5 text-destructive" />
                            )}
                            <span className="truncate max-w-[160px]">{d.nome}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {d.device_id_ewelink}
                          </p>
                        </TableCell>
                        <TableCell>
                          {isEsp32 ? (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                              <Cpu className="h-2.5 w-2.5" /> ESP32
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Wifi className="h-2.5 w-2.5" /> Sonoff
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {galpaoName(d.galpao_id)}
                        </TableCell>
                        <TableCell>
                          {online ? (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                              Offline
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(l.lido_em), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">sem dados</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {l?.temperatura_c != null ? (
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Thermometer className="h-3 w-3 text-muted-foreground" />
                              {l.temperatura_c}°C
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {l?.umidade_pct != null ? (
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Droplets className="h-3 w-3 text-muted-foreground" />
                              {l.umidade_pct}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico recente de comandos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Comandos recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comandos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum comando registrado.
            </p>
          ) : (
            <div className="space-y-2">
              {comandos.map((c) => {
                const ok = c.resultado === 'sucesso' || c.resultado === 'ok';
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 border rounded-md px-3 py-2 bg-muted/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {devNome(c.dispositivo_id)} ·{' '}
                          <span className="text-muted-foreground">{c.acao}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          {c.temperatura_lida != null && ` · ${c.temperatura_lida}°C`}
                          {c.tempo_resposta_ms != null && ` · ${c.tempo_resposta_ms}ms`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        ok
                          ? 'text-primary border-primary/30'
                          : 'text-destructive border-destructive/40'
                      }`}
                    >
                      {c.resultado}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
