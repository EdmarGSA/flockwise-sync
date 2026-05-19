import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useConfigZonas } from '@/hooks/useConfigZonas';

export function ZonasMetricasCard() {
  const { configOrg, loading, saving, salvar } = useConfigZonas();
  const [dias, setDias] = useState<number | null>(null);
  const [minutos, setMinutos] = useState<number | null>(null);
  const [percentis, setPercentis] = useState<boolean | null>(null);

  const dValue = dias ?? configOrg.diasFimPinteiro;
  const mValue = minutos ?? configOrg.minMinutosSustentado;
  const pValue = percentis ?? configOrg.usarPercentisAutomacao;

  const onSave = async () => {
    if (dValue < 1 || dValue > 60) {
      toast.error('Dias de pinteiro deve ficar entre 1 e 60.');
      return;
    }
    if (mValue < 5 || mValue > 60) {
      toast.error('Minutos sustentados deve ficar entre 5 e 60.');
      return;
    }
    try {
      await salvar({
        diasFimPinteiro: dValue,
        minMinutosSustentado: mValue,
        usarPercentisAutomacao: pValue,
      });
      setDias(null); setMinutos(null); setPercentis(null);
      toast.success('Configuração de zonas salva.');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? e));
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" /> Zonas e métricas robustas
        </CardTitle>
        <CardDescription>
          Reduz distorções da média quando aves estão no pinteiro e ignora picos curtos
          (porta aberta, descarga de ração) na hora de calcular mín/máx do dia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 space-y-2">
          <Label className="text-sm">Dias de pinteiro (padrão da organização)</Label>
          <Input
            type="number" min={1} max={60} step={1}
            value={dValue}
            onChange={(e) => setDias(Number(e.target.value || 0))}
            className="max-w-[160px]"
          />
          <p className="text-xs text-muted-foreground">
            Nos primeiros {dValue} dias, só sensores marcados como “pinteiro” ou “geral” entram na média.
            Cada lote pode sobrescrever esse valor.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">Minutos para mín/máx sustentado</Label>
            <span className="text-sm font-mono">{mValue} min</span>
          </div>
          <Slider
            min={5} max={60} step={1}
            value={[mValue]}
            onValueChange={(v) => setMinutos(v[0])}
          />
          <p className="text-xs text-muted-foreground">
            Picos mais curtos que isso aparecem só como tooltip “picos do dia”, mas não
            puxam o mín/máx oficial nem disparam alerta.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm flex items-center gap-2">
                Usar percentis e filtros na automação
                <Badge variant="outline" className="text-[10px]">Beta</Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Quando ligado, o cérebro climático e os automatismos passam a usar P5/P95,
                peso por sensor e filtro IQR. Recomendado validar 1 ciclo de visualização antes.
              </p>
            </div>
            <Switch
              checked={pValue}
              onCheckedChange={(v) => setPercentis(v)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
