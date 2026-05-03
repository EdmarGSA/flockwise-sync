import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Lightbulb, Wifi, WifiOff, Hand, Sun, Sunset, Sunrise, Loader2, Power,
  Trash2, SlidersHorizontal, Clock, LineChart, AlertTriangle,
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
