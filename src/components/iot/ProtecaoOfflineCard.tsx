import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Thermometer, Clock, Save, RotateCcw, ShieldCheck, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Modo = 'temperatura' | 'horario' | 'hibrido';
type Origem = 'curva' | 'manual';

interface TimerRow {
  id: string;
  dispositivo_id: string;
  canal_id: string | null;
  integrado_id: string;
  tipo_timer: string;
  hora_inicio: string;
  hora_fim: string;
  estado_desejado: string;
  idade_lote_dias: number | null;
  sincronizado: boolean;
  sincronizado_em: string | null;
  modo: Modo;
  temp_liga_c: number | null;
  temp_desliga_c: number | null;
  umidade_max_pct: number | null;
  janela_horaria_inicio: string | null;
  janela_horaria_fim: string | null;
  origem_setpoint: Origem;
  setpoint_editado_em: string | null;
  setpoint_editado_por: string | null;
}

interface Props {
  timer: TimerRow;
  deviceName: string;
  hasSensorLocal: boolean;
  onSaved?: () => void;
}

const tipoLabel = (tipo: string) =>
  tipo === 'aquecimento_noturno'
    ? '🔥 Aquecimento'
    : tipo === 'ventilacao_diurno'
    ? '💨 Ventilação'
    : '🔄 Ciclo';

const tipoFuncao = (tipo: string): 'aquecimento' | 'ventilacao' | 'outro' =>
  tipo.startsWith('aquecimento') ? 'aquecimento' : tipo.startsWith('ventilacao') ? 'ventilacao' : 'outro';

export function ProtecaoOfflineCard({ timer, deviceName, hasSensorLocal, onSaved }: Props) {
  const funcao = tipoFuncao(timer.tipo_timer);
  const [modo, setModo] = useState<Modo>(timer.modo || 'horario');
  const [tempLiga, setTempLiga] = useState<string>(timer.temp_liga_c?.toString() ?? '');
  const [tempDesliga, setTempDesliga] = useState<string>(timer.temp_desliga_c?.toString() ?? '');
  const [umidMax, setUmidMax] = useState<string>(timer.umidade_max_pct?.toString() ?? '');
  const [janInicio, setJanInicio] = useState<string>(timer.janela_horaria_inicio?.slice(0, 5) ?? '');
  const [janFim, setJanFim] = useState<string>(timer.janela_horaria_fim?.slice(0, 5) ?? '');
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setModo(timer.modo || 'horario');
    setTempLiga(timer.temp_liga_c?.toString() ?? '');
    setTempDesliga(timer.temp_desliga_c?.toString() ?? '');
    setUmidMax(timer.umidade_max_pct?.toString() ?? '');
    setJanInicio(timer.janela_horaria_inicio?.slice(0, 5) ?? '');
    setJanFim(timer.janela_horaria_fim?.slice(0, 5) ?? '');
  }, [timer.id, timer.modo, timer.temp_liga_c, timer.temp_desliga_c, timer.umidade_max_pct, timer.janela_horaria_inicio, timer.janela_horaria_fim]);

  const tempLigaNum = tempLiga !== '' ? Number(tempLiga) : null;
  const tempDesligaNum = tempDesliga !== '' ? Number(tempDesliga) : null;
  const histerese = tempLigaNum != null && tempDesligaNum != null ? Math.abs(tempLigaNum - tempDesligaNum) : null;

  // Validation
  const errors: string[] = [];
  const warnings: string[] = [];
  const needsTemp = modo === 'temperatura' || modo === 'hibrido';

  if (needsTemp) {
    if (tempLigaNum == null || tempDesligaNum == null) {
      errors.push('Informe temperatura para ligar e desligar');
    } else {
      if (funcao === 'ventilacao' && !(tempLigaNum > tempDesligaNum)) {
        errors.push('Para ventilação, "ligar" deve ser MAIOR que "desligar"');
      }
      if (funcao === 'aquecimento' && !(tempLigaNum < tempDesligaNum)) {
        errors.push('Para aquecimento, "ligar" deve ser MENOR que "desligar"');
      }
      if (histerese != null && histerese < 0.3) {
        warnings.push('Histerese muito baixa (< 0,3 °C) pode causar liga/desliga frequente');
      }
      if (funcao === 'aquecimento' && (timer.idade_lote_dias ?? 0) <= 7 && tempLigaNum < 28) {
        warnings.push('Pintinho ≤ 7 dias: aquecer abaixo de 28 °C pode comprometer o lote');
      }
    }
  }

  if (janInicio && !janFim) errors.push('Informe o fim da janela horária');
  if (!janInicio && janFim) errors.push('Informe o início da janela horária');

  const sensorAviso = !hasSensorLocal && needsTemp;

  const handleSave = async () => {
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const update = {
        modo,
        temp_liga_c: needsTemp ? tempLigaNum : null,
        temp_desliga_c: needsTemp ? tempDesligaNum : null,
        umidade_max_pct: umidMax !== '' ? Number(umidMax) : null,
        janela_horaria_inicio: janInicio || null,
        janela_horaria_fim: janFim || null,
        origem_setpoint: 'manual' as Origem,
        setpoint_editado_em: new Date().toISOString(),
        setpoint_editado_por: userData.user?.id ?? null,
        sincronizado: false,
      };
      const { error } = await supabase.from('timers_seguranca_iot').update(update).eq('id', timer.id);
      if (error) throw error;
      toast.success('Setpoint salvo. Sincronize para enviar ao dispositivo.');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreFromCurve = async () => {
    setRestoring(true);
    try {
      const { error } = await supabase
        .from('timers_seguranca_iot')
        .update({
          origem_setpoint: 'curva' as Origem,
          setpoint_editado_em: null,
          setpoint_editado_por: null,
          sincronizado: false,
          // limpa override manual; será recalculado no próximo resync
          modo: hasSensorLocal ? 'temperatura' : 'horario',
        })
        .eq('id', timer.id);
      if (error) throw error;
      toast.success('Restaurado. Clique em "Ressincronizar" no topo para recalcular.');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao restaurar');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Card className={timer.sincronizado ? 'border-primary/30' : 'border-destructive/30'}>
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {timer.sincronizado ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {deviceName} • <span className="font-normal">{tipoLabel(timer.tipo_timer)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Idade do lote: {timer.idade_lote_dias ?? '—'} dias •{' '}
                {timer.sincronizado ? (
                  <span className="text-primary">
                    ✓ sincronizado{' '}
                    {timer.sincronizado_em
                      ? formatDistanceToNow(new Date(timer.sincronizado_em), { addSuffix: true, locale: ptBR })
                      : ''}
                  </span>
                ) : (
                  <span className="text-destructive">⚠️ pendente de sincronização</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasSensorLocal ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Thermometer className="h-3 w-3" /> Sensor local OK
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> Sem sensor local
              </Badge>
            )}
            <Badge variant={timer.origem_setpoint === 'manual' ? 'default' : 'outline'} className="text-xs">
              {timer.origem_setpoint === 'manual' ? 'Setpoint manual' : 'Da curva'}
            </Badge>
          </div>
        </div>

        {/* Modo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Modo de proteção</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select value={modo} onValueChange={(v) => setModo(v as Modo)} disabled={!hasSensorLocal}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temperatura" disabled={!hasSensorLocal}>
                          🌡️ Temperatura (sensor local)
                        </SelectItem>
                        <SelectItem value="hibrido" disabled={!hasSensorLocal}>
                          🔀 Híbrido (temperatura + janela)
                        </SelectItem>
                        <SelectItem value="horario">🕒 Horário fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                {!hasSensorLocal && (
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Este dispositivo não tem sensor de temperatura local — apenas modo "Horário fixo" disponível.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Setpoints (mostra quando modo usa temperatura) */}
          {needsTemp && (
            <>
              <div>
                <Label className="text-xs">Liga quando temp. {funcao === 'aquecimento' ? '≤' : '≥'}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={tempLiga}
                    onChange={(e) => setTempLiga(e.target.value)}
                    placeholder="—"
                    className="h-9 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°C</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Desliga quando temp. {funcao === 'aquecimento' ? '≥' : '≤'}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={tempDesliga}
                    onChange={(e) => setTempDesliga(e.target.value)}
                    placeholder="—"
                    className="h-9 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°C</span>
                </div>
              </div>
            </>
          )}

          {/* Umidade — opcional */}
          {needsTemp && (
            <div>
              <Label className="text-xs">Umidade máxima (opcional)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  value={umidMax}
                  onChange={(e) => setUmidMax(e.target.value)}
                  placeholder="—"
                  className="h-9 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          )}

          {/* Janela horária */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> Janela horária {modo === 'horario' ? '(obrigatória)' : '(opcional)'}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="time"
                value={janInicio || (modo === 'horario' ? timer.hora_inicio?.slice(0, 5) : '')}
                onChange={(e) => setJanInicio(e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="time"
                value={janFim || (modo === 'horario' ? timer.hora_fim?.slice(0, 5) : '')}
                onChange={(e) => setJanFim(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Histerese info */}
          {needsTemp && histerese != null && (
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                Histerese: <span className="font-mono font-semibold">{histerese.toFixed(1)} °C</span>
              </p>
            </div>
          )}
        </div>

        {/* Errors / warnings */}
        {errors.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <ul className="space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <ul className="space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
        {sensorAviso && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Modo temperatura selecionado, mas este dispositivo não tem sensor local — proteção será apenas pelo fallback de horário.</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <p className="text-xs text-muted-foreground">
            Origem: <strong>{timer.origem_setpoint === 'manual' ? 'Manual' : 'Curva climática'}</strong>
            {timer.setpoint_editado_em && (
              <> • editado {formatDistanceToNow(new Date(timer.setpoint_editado_em), { addSuffix: true, locale: ptBR })}</>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreFromCurve}
              disabled={restoring || timer.origem_setpoint === 'curva'}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar da curva
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving || errors.length > 0}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Salvando…' : 'Salvar setpoint'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
