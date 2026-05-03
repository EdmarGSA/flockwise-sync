import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOverridesIluminacao } from '@/hooks/useOverridesIluminacao';
import { Lightbulb, Hand, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CanalLuz {
  id: string;
  canal_numero: number;
  nome: string;
  suporta_dimer: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dispositivoId: string;
  canalIdInicial?: string;
}

const DURACOES: { label: string; minutes: number | 'manha' | 'custom' }[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '2 horas', minutes: 120 },
  { label: '4 horas', minutes: 240 },
  { label: 'Até de manhã (06h)', minutes: 'manha' },
  { label: 'Personalizado', minutes: 'custom' },
];

function calcularAteQuando(opt: typeof DURACOES[number]['minutes'], customMin: number): Date {
  const d = new Date();
  if (opt === 'manha') {
    const t = new Date();
    t.setHours(6, 0, 0, 0);
    if (t.getTime() <= d.getTime()) t.setDate(t.getDate() + 1);
    return t;
  }
  if (opt === 'custom') return new Date(d.getTime() + customMin * 60_000);
  return new Date(d.getTime() + (opt as number) * 60_000);
}

export function OverridesIluminacaoDialog({ open, onOpenChange, dispositivoId, canalIdInicial }: Props) {
  const [canais, setCanais] = useState<CanalLuz[]>([]);
  const [canalId, setCanalId] = useState<string>('');
  const [estado, setEstado] = useState<'on' | 'off'>('on');
  const [intensidade, setIntensidade] = useState<number>(100);
  const [duracaoIdx, setDuracaoIdx] = useState<number>(1);
  const [customMin, setCustomMin] = useState<number>(60);
  const [motivo, setMotivo] = useState<string>('');

  const canalIds = useMemo(() => canais.map((c) => c.id), [canais]);
  const overrides = useOverridesIluminacao(canalIds);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('canais_dispositivo')
        .select('id, canal_numero, nome, suporta_dimer')
        .eq('dispositivo_id', dispositivoId)
        .eq('tipo_equipamento', 'iluminacao')
        .eq('ativo', true)
        .order('canal_numero');
      const list = (data ?? []) as CanalLuz[];
      setCanais(list);
      setCanalId(canalIdInicial && list.some((c) => c.id === canalIdInicial) ? canalIdInicial : list[0]?.id ?? '');
    })();
  }, [open, dispositivoId, canalIdInicial]);

  const canalSelecionado = canais.find((c) => c.id === canalId);
  const duracao = DURACOES[duracaoIdx];

  const handleAplicar = async () => {
    if (!canalId) return;
    const ate = calcularAteQuando(duracao.minutes, customMin);
    await overrides.create.mutateAsync({
      canal_id: canalId,
      estado_forcado: estado,
      intensidade_pct: estado === 'on' && canalSelecionado?.suporta_dimer ? intensidade : null,
      ate_quando: ate.toISOString(),
      motivo: motivo.trim() || null,
    });
    setMotivo('');
  };

  const canalNomeById = (id: string) => {
    const c = canais.find((x) => x.id === id);
    return c ? `CH${c.canal_numero} · ${c.nome}` : id.slice(0, 8);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Forçar Iluminação
          </DialogTitle>
          <DialogDescription>
            Sobrepõe o programa automático no canal escolhido até o horário definido.
          </DialogDescription>
        </DialogHeader>

        {canais.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Este dispositivo não possui canais de iluminação ativos.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={canalId} onValueChange={setCanalId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {canais.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      CH{c.canal_numero} · {c.nome}{c.suporta_dimer ? ' (dimmer)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as 'on' | 'off')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">Ligar</SelectItem>
                  <SelectItem value="off">Desligar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {estado === 'on' && canalSelecionado?.suporta_dimer && (
              <div className="space-y-2">
                <Label>Intensidade: {intensidade}%</Label>
                <Slider value={[intensidade]} min={1} max={100} step={1}
                  onValueChange={(v) => setIntensidade(v[0])} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={String(duracaoIdx)} onValueChange={(v) => setDuracaoIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURACOES.map((d, i) => (<SelectItem key={i} value={String(i)}>{d.label}</SelectItem>))}
                </SelectContent>
              </Select>
              {duracao.minutes === 'custom' && (
                <Input type="number" min={1} value={customMin}
                  onChange={(e) => setCustomMin(Number(e.target.value) || 1)}
                  placeholder="Minutos" />
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: manejo noturno" />
            </div>

            <Button onClick={handleAplicar} disabled={overrides.create.isPending || !canalId} className="w-full">
              {overrides.create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Hand className="w-4 h-4 mr-2" />}
              Aplicar override
            </Button>
          </div>
        )}

        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Overrides ativos</p>
          {overrides.isLoading ? (
            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : (overrides.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum override ativo.</p>
          ) : (
            <div className="space-y-2">
              {overrides.data!.map((o) => (
                <div key={o.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{canalNomeById(o.canal_id)}</p>
                    <p className="text-muted-foreground">
                      <Badge variant="outline" className="mr-1 text-[9px]">{o.estado_forcado}</Badge>
                      {o.intensidade_pct != null && `${o.intensidade_pct}% · `}
                      até {formatDistanceToNow(new Date(o.ate_quando), { addSuffix: true, locale: ptBR })}
                      {o.motivo && ` · ${o.motivo}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => overrides.remove.mutate(o.id)}
                    disabled={overrides.remove.isPending}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
