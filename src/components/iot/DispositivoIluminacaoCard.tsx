import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Lightbulb, Wifi, WifiOff, Hand, Sun, Sunset, Sunrise, Loader2, Power,
  Trash2, SlidersHorizontal, Clock, LineChart, AlertTriangle,
  History, RotateCcw, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useResumoIluminacaoGalpao, formatarProximoEvento } from '@/hooks/useResumoIluminacaoGalpao';
import { useOverridesIluminacao } from '@/hooks/useOverridesIluminacao';
import { OverridesIluminacaoDialog } from '@/components/iot/OverridesIluminacaoDialog';
import { CurvaFotoperiodoChart } from '@/components/iot/CurvaFotoperiodoChart';
import { useDeviceControl } from '@/hooks/useDeviceControl';

interface Dispositivo {
  id: string;
  integrado_id: string;
  galpao_id: string | null;
  device_id_ewelink: string;
  nome: string;
  driver?: string;
  automacao_ativa: boolean;
  funcao_automacao: string;
  ultimo_sync: string | null;
  ultima_inicializacao?: string | null;
  boot_count?: number | null;
  ultimo_boot_reason?: string | null;
}

interface Galpao { id: string; nome: string }

interface Props {
  dev: Dispositivo;
  galpao?: Galpao;
  integradoId: string | null;
  isOnline: boolean;
  currentSwitch: 'on' | 'off' | undefined;
  onManageCanais: () => void;
  onDelete: () => void;
}

export function DispositivoIluminacaoCard({
  dev, galpao, integradoId, isOnline, currentSwitch, onManageCanais, onDelete,
}: Props) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [curvaOpen, setCurvaOpen] = useState(false);
  const { data: resumo, isLoading } = useResumoIluminacaoGalpao(dev.galpao_id, integradoId);
  const { data: overrides } = useOverridesIluminacao();
  const { toggleDevice, isControlling } = useDeviceControl({ integradoId });

  // Override pode estar atrelado a canais do dispositivo — checagem leve por presença
  const overrideAtivo = (overrides ?? []).find((o) => o); // detalhamento mais fino fica no dialog

  const proxEvento = formatarProximoEvento(
    resumo?.estado?.proximo_evento_min,
    resumo?.estado?.proximo_evento_tipo,
  );

  const intensidade = resumo?.estado?.intensidade_pct ?? 0;
  const ligado = resumo?.estado?.estado === 'on';
  const emRampa = ligado && intensidade > 0 && intensidade < 100;

  const colorEstado = ligado
    ? (emRampa ? 'text-amber-500' : 'text-yellow-500')
    : 'text-muted-foreground';

  return (
    <Card className="relative border-yellow-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <Lightbulb className={`h-4 w-4 ${colorEstado}`} />
            {dev.nome}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title="Ver curva do programa"
              onClick={() => setCurvaOpen(true)}
              disabled={!resumo?.programaId}
            >
              <LineChart className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title="Gerenciar canais"
              onClick={onManageCanais}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1 text-yellow-600 border-yellow-500/40">
            <Lightbulb className="h-2.5 w-2.5" /> Iluminação
          </Badge>
          <Badge variant="secondary" className="text-xs">{dev.device_id_ewelink}</Badge>
          {galpao && <Badge variant="outline" className="text-xs">{galpao.nome}</Badge>}
          {dev.automacao_ativa && (
            <Badge
              variant="outline"
              className="text-xs text-primary border-primary/30 gap-0.5"
              title={resumo?.programaNome ? `Programa: ${resumo.programaNome}` : undefined}
            >
              <Sun className="h-2.5 w-2.5" /> Auto
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!dev.galpao_id ? (
          <div className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Vincule este dispositivo a um galpão para ativar o programa de luz.
          </div>
        ) : isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !resumo?.loteId ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhum lote alojado neste galpão. Sem programa de luz ativo.
          </p>
        ) : !resumo.programaId ? (
          <p className="text-xs text-amber-600 py-2">
            Lote sem programa de iluminação vinculado e nenhum padrão definido na organização.
          </p>
        ) : (
          <>
            {/* Programa + idade */}
            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="text-muted-foreground">Programa</p>
                <p className="font-medium text-foreground truncate" title={resumo.programaNome ?? ''}>
                  {resumo.programaNome}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({resumo.fonte === 'lote' ? 'do lote' : 'padrão da org'})
                  </span>
                </p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-muted-foreground">Idade</p>
                <p className="font-medium text-foreground">{resumo.idadeDias}d</p>
              </div>
            </div>

            {/* Faixa atual */}
            {resumo.faixa ? (
              <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/20 p-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Faixa</p>
                  <p className="text-sm font-semibold text-foreground">
                    {resumo.faixa.dia_inicio}–{resumo.faixa.dia_fim}d
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Horas luz</p>
                  <p className="text-sm font-semibold text-foreground">{resumo.faixa.horas_luz}h</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Intensidade</p>
                  <p className={`text-sm font-semibold ${colorEstado}`}>
                    {ligado ? `${intensidade}%` : 'Off'}
                    {emRampa && <span className="ml-1 text-[10px] text-amber-600">rampa</span>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600">
                Idade {resumo.idadeDias}d fora das faixas configuradas no programa.
              </p>
            )}

            {/* Próximo evento */}
            {proxEvento && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {resumo.estado?.proximo_evento_tipo === 'acender'
                  ? <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                  : <Sunset className="h-3.5 w-3.5 text-orange-500" />}
                <span>{proxEvento}</span>
              </div>
            )}

            {/* Override ativo */}
            {overrideAtivo && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 rounded px-2 py-1">
                <Hand className="h-3.5 w-3.5" />
                Há override manual ativo neste canal.
              </div>
            )}
          </>
        )}

        {/* Último comando */}
        {dev.ultimo_sync && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Última sinc: {formatDistanceToNow(new Date(dev.ultimo_sync), { addSuffix: true, locale: ptBR })}
          </p>
        )}

        {/* Recuperação após queda de energia/internet */}
        {dev.ultima_inicializacao && (Date.now() - new Date(dev.ultima_inicializacao).getTime()) < 6 * 3600_000 && (
          <div className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Recuperação após reinício {formatDistanceToNow(new Date(dev.ultima_inicializacao), { addSuffix: true, locale: ptBR })}
            {dev.ultimo_boot_reason && <span className="opacity-75">· {dev.ultimo_boot_reason}</span>}
            {typeof dev.boot_count === 'number' && dev.boot_count > 0 && (
              <span className="opacity-75">· total {dev.boot_count}</span>
            )}
          </div>
        )}

        {/* Linha do tempo de eventos */}
        <EventosTimeline
          dispositivoId={dev.id}
          bootCount={dev.boot_count ?? 0}
          ultimoBootReason={dev.ultimo_boot_reason ?? null}
        />


        {/* Switch manual + override */}
        {dev.driver !== 'esp32_http' && dev.driver !== 'esp32_mqtt' && currentSwitch !== undefined && (
          <div className="pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isControlling(dev.device_id_ewelink) ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Power className={`h-4 w-4 ${currentSwitch === 'on' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              )}
              <span className="text-sm font-medium text-foreground">
                {currentSwitch === 'on' ? 'Aceso' : 'Apagado'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                onClick={() => setOverrideOpen(true)}
              >
                <Hand className="h-3 w-3" /> Forçar
              </Button>
              <Switch
                checked={currentSwitch === 'on'}
                disabled={isControlling(dev.device_id_ewelink) || !isOnline}
                onCheckedChange={() => toggleDevice(dev.device_id_ewelink, currentSwitch)}
              />
            </div>
          </div>
        )}
      </CardContent>

      <OverridesIluminacaoDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        dispositivoId={dev.id}
      />

      <Dialog open={curvaOpen} onOpenChange={setCurvaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Curva de fotoperíodo · {resumo?.programaNome}</DialogTitle>
          </DialogHeader>
          {resumo?.programaId && curvaOpen && (
            <CurvaProgramaWrapper programaId={resumo.programaId} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CurvaProgramaWrapper({ programaId }: { programaId: string }) {
  const [faixas, setFaixas] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from('programa_iluminacao_faixa')
      .select('dia_inicio, dia_fim, horas_luz, blocos, intensidade_pct')
      .eq('programa_id', programaId)
      .order('dia_inicio')
      .then(({ data }) => setFaixas(data ?? []));
  }, [programaId]);
  return <CurvaFotoperiodoChart faixas={faixas as any} />;
}

interface EventoIoT {
  id: string;
  tipo: string;
  criado_em: string;
  detalhes: any;
}

function EventosTimeline({
  dispositivoId, bootCount, ultimoBootReason,
}: { dispositivoId: string; bootCount: number; ultimoBootReason: string | null }) {
  const [open, setOpen] = useState(false);
  const [eventos, setEventos] = useState<EventoIoT[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootSerie, setBootSerie] = useState<{ label: string; valor: number }[]>([]);
  const [janela, setJanela] = useState<'24h' | '7d'>('7d');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const sinceBoots = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    Promise.all([
      supabase
        .from('eventos_dispositivo_iot')
        .select('id, tipo, criado_em, detalhes')
        .eq('dispositivo_id', dispositivoId)
        .in('tipo', ['boot', 'reconciliacao', 'recuperacao_local', 'offline', 'online'])
        .order('criado_em', { ascending: false })
        .limit(10),
      supabase
        .from('eventos_dispositivo_iot')
        .select('criado_em')
        .eq('dispositivo_id', dispositivoId)
        .eq('tipo', 'boot')
        .gte('criado_em', sinceBoots),
    ]).then(([evRes, bootRes]) => {
      setEventos((evRes.data ?? []) as EventoIoT[]);
      setBootSerie(agruparBoots((bootRes.data ?? []).map((r: any) => r.criado_em), janela));
      setLoading(false);
    });
  }, [open, dispositivoId, janela]);

  const iconFor = (tipo: string) => {
    switch (tipo) {
      case 'boot': return <Zap className="h-3 w-3 text-amber-500" />;
      case 'reconciliacao': return <RotateCcw className="h-3 w-3 text-blue-500" />;
      case 'recuperacao_local': return <AlertTriangle className="h-3 w-3 text-amber-600" />;
      case 'offline': return <WifiOff className="h-3 w-3 text-destructive" />;
      case 'online': return <Wifi className="h-3 w-3 text-primary" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const labelFor = (tipo: string) => ({
    boot: 'Boot',
    reconciliacao: 'Reconciliação',
    recuperacao_local: 'Recuperação local',
    offline: 'Offline',
    online: 'Online',
  } as Record<string, string>)[tipo] ?? tipo;

  return (
    <div className="border-t pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition"
      >
        <span className="flex items-center gap-1.5">
          <History className="h-3 w-3" />
          Eventos
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {bootCount} boot{bootCount === 1 ? '' : 's'}
          </Badge>
          {ultimoBootReason && (
            <span className="opacity-70">· últ.: {ultimoBootReason}</span>
          )}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {/* Mini-chart de boots */}
          <div className="rounded-md border bg-muted/20 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Reinícios por {janela === '24h' ? 'hora (24h)' : 'dia (7d)'}
              </span>
              <div className="flex gap-0.5">
                {(['24h', '7d'] as const).map((j) => (
                  <button
                    key={j}
                    onClick={(e) => { e.stopPropagation(); setJanela(j); }}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      janela === j
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
            <BootsBarChart data={bootSerie} />
          </div>

          {loading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          ) : eventos.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-1">Nenhum evento registrado.</p>
          ) : (
            <ol className="relative border-l border-border/60 ml-1.5 space-y-1.5 pl-3">
              {eventos.map((e) => {
                const motivo =
                  e.detalhes?.boot_reason ??
                  e.detalhes?.motivo ??
                  e.detalhes?.reason ??
                  (e.tipo === 'reconciliacao' && e.detalhes?.estado
                    ? `estado=${e.detalhes.estado}`
                    : null);
                return (
                  <li key={e.id} className="text-[11px] leading-tight">
                    <span className="absolute -left-[5px] mt-0.5">{iconFor(e.tipo)}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{labelFor(e.tipo)}</span>
                      <span className="text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(e.criado_em), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    {motivo && (
                      <p className="text-muted-foreground truncate" title={String(motivo)}>{motivo}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function agruparBoots(timestamps: string[], janela: '24h' | '7d') {
  const agora = new Date();
  if (janela === '24h') {
    const buckets: { label: string; valor: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(agora.getTime() - i * 3600_000);
      const horaIni = new Date(d);
      horaIni.setMinutes(0, 0, 0);
      const horaFim = new Date(horaIni.getTime() + 3600_000);
      const valor = timestamps.filter((t) => {
        const ts = new Date(t).getTime();
        return ts >= horaIni.getTime() && ts < horaFim.getTime();
      }).length;
      buckets.push({ label: `${horaIni.getHours().toString().padStart(2, '0')}h`, valor });
    }
    return buckets;
  }
  const buckets: { label: string; valor: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(agora);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const fim = new Date(d.getTime() + 24 * 3600_000);
    const valor = timestamps.filter((t) => {
      const ts = new Date(t).getTime();
      return ts >= d.getTime() && ts < fim.getTime();
    }).length;
    buckets.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3),
      valor,
    });
  }
  return buckets;
}

function BootsBarChart({ data }: { data: { label: string; valor: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.valor));
  const total = data.reduce((s, d) => s + d.valor, 0);
  return (
    <div>
      <div className="flex items-end gap-0.5 h-10">
        {data.map((d, i) => {
          const altura = d.valor === 0 ? 2 : Math.max(3, (d.valor / max) * 100);
          return (
            <div
              key={i}
              className="flex-1 group relative flex items-end"
              title={`${d.label}: ${d.valor} reinício${d.valor === 1 ? '' : 's'}`}
            >
              <div
                className={`w-full rounded-sm transition-all ${
                  d.valor === 0 ? 'bg-muted' : 'bg-amber-500/70 hover:bg-amber-500'
                }`}
                style={{ height: `${altura}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span className="font-medium">Total: {total}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
