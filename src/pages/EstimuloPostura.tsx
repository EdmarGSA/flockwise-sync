import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Zap, Save, PlayCircle, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { toast } from 'sonner';


const cfgSchema = z.object({
  idade_min_semanas: z.number().int('Use valor inteiro').min(10, 'Idade mínima >= 10 semanas').max(40, 'Idade mínima <= 40 semanas'),
  peso_min_kg: z.number().min(0.5, 'Peso mínimo >= 0,5 kg').max(5, 'Peso mínimo <= 5 kg'),
  horas_inicio: z.number().min(6, 'Horas início >= 6h').max(24, 'Horas início <= 24h'),
  horas_alvo: z.number().min(6, 'Horas alvo >= 6h').max(24, 'Horas alvo <= 24h'),
  ganho_semanal_min: z.number().int('Use minutos inteiros').min(5, 'Ganho semanal >= 5 min').max(120, 'Ganho semanal <= 120 min'),
  intensidade_pct: z.number().int().min(0, 'Intensidade entre 0 e 100').max(100, 'Intensidade entre 0 e 100'),
}).refine((d) => d.horas_inicio < d.horas_alvo, {
  message: 'Horas início deve ser menor que horas alvo', path: ['horas_inicio'],
}).refine((d) => (d.horas_alvo - d.horas_inicio) * 60 >= d.ganho_semanal_min, {
  message: 'Ganho semanal maior que diferença total', path: ['ganho_semanal_min'],
});

interface Cfg {
  idade_min_semanas: number;
  peso_min_kg: number;
  horas_inicio: number;
  horas_alvo: number;
  ganho_semanal_min: number;
  intensidade_pct: number;
  auto_aplicar: boolean;
  aplicado_em: string | null;
}

const DEFAULT: Cfg = {
  idade_min_semanas: 17, peso_min_kg: 1.45, horas_inicio: 9, horas_alvo: 16,
  ganho_semanal_min: 30, intensidade_pct: 60, auto_aplicar: false, aplicado_em: null,
};

interface LoteRow {
  id: string;
  data_alojamento: string | null;
  linhagem: string | null;
  status: string;
  galpao_nome?: string;
  peso_atual_kg?: number | null;
  idade_semanas?: number;
}

function simularCurva(cfg: Cfg) {
  const pts: { semana: number; horas: number }[] = [];
  let horas = cfg.horas_inicio;
  const ganho = cfg.ganho_semanal_min / 60;
  let semana = 0;
  pts.push({ semana, horas: Number(horas.toFixed(2)) });
  while (horas < cfg.horas_alvo && semana < 60) {
    semana += 1;
    horas = Math.min(cfg.horas_alvo, horas + ganho);
    pts.push({ semana, horas: Number(horas.toFixed(2)) });
  }
  // platô
  pts.push({ semana: semana + 4, horas: cfg.horas_alvo });
  return pts;
}

export default function EstimuloPostura() {
  const { integradoId } = useIntegradoId();
  const [lotes, setLotes] = useState<LoteRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [cfg, setCfg] = useState<Cfg>(DEFAULT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(false);

  // Carrega lotes postura
  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      setLoadingList(true);
      const { data: ls } = await supabase
        .from('lotes')
        .select('id, data_alojamento, linhagem, status, galpao_id, galpoes:galpao_id(nome, nucleos:nucleo_id(tipo_producao))')
        .eq('integrado_id', integradoId)
        .in('status', ['alojado', 'previsao']);
      const filtered = (ls ?? []).filter((l: any) => l?.galpoes?.nucleos?.tipo_producao === 'postura');
      const ids = filtered.map((l: any) => l.id);

      // pesagens (média últimos 14 dias) — em batch
      const pesoMap: Record<string, number> = {};
      if (ids.length) {
        const { data: pesagens } = await supabase
          .from('pesagens')
          .select('id, lote_id, data_pesagem, pesagem_itens(quantidade_aves, peso_bruto_g, peso_tara_g)')
          .in('lote_id', ids)
          .gte('data_pesagem', new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10));
        const acc: Record<string, { sum: number; n: number }> = {};
        (pesagens ?? []).forEach((p: any) => {
          (p.pesagem_itens ?? []).forEach((it: any) => {
            const q = Number(it.quantidade_aves) || 0;
            if (!q) return;
            const kg = (Number(it.peso_bruto_g) - Number(it.peso_tara_g)) / q;
            acc[p.lote_id] = acc[p.lote_id] || { sum: 0, n: 0 };
            acc[p.lote_id].sum += kg;
            acc[p.lote_id].n += 1;
          });
        });
        Object.keys(acc).forEach((k) => { pesoMap[k] = acc[k].sum / acc[k].n; });
      }

      const rows: LoteRow[] = filtered.map((l: any) => {
        const dias = l.data_alojamento ? Math.floor((Date.now() - new Date(l.data_alojamento).getTime()) / 86400000) + 1 : 0;
        return {
          id: l.id,
          data_alojamento: l.data_alojamento,
          linhagem: l.linhagem,
          status: l.status,
          galpao_nome: l.galpoes?.nome,
          peso_atual_kg: pesoMap[l.id] ?? null,
          idade_semanas: Math.floor(dias / 7),
        };
      });
      setLotes(rows);
      setLoadingList(false);
      if (!selectedLote && rows.length) setSelectedLote(rows[0].id);
    })();
  }, [integradoId]);

  // Carrega cfg do lote selecionado
  useEffect(() => {
    if (!selectedLote || !integradoId) return;
    (async () => {
      setLoadingCfg(true);
      const { data } = await supabase
        .from('config_estimulo_postura')
        .select('*')
        .eq('lote_id', selectedLote)
        .maybeSingle();
      if (data) setCfg({ ...DEFAULT, ...(data as any) });
      else setCfg(DEFAULT);
      setErrors({});
      setLoadingCfg(false);
    })();
  }, [selectedLote, integradoId]);

  const validar = (): boolean => {
    const r = cfgSchema.safeParse({
      idade_min_semanas: cfg.idade_min_semanas,
      peso_min_kg: cfg.peso_min_kg,
      horas_inicio: cfg.horas_inicio,
      horas_alvo: cfg.horas_alvo,
      ganho_semanal_min: cfg.ganho_semanal_min,
      intensidade_pct: cfg.intensidade_pct,
    });
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      toast.error(r.error.issues[0].message);
      return false;
    }
    setErrors({});
    return true;
  };

  const salvar = async (): Promise<boolean> => {
    if (!integradoId || !selectedLote) return false;
    if (!validar()) return false;
    setSaving(true);
    const payload = { ...cfg, lote_id: selectedLote, integrado_id: integradoId };
    const { error } = await supabase.from('config_estimulo_postura').upsert(payload, { onConflict: 'lote_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    toast.success('Configuração salva');
    return true;
  };

  const aplicar = async () => {
    if (!selectedLote) return;
    if (!validar()) return;
    setApplying(true);
    const ok = await salvar();
    if (!ok) { setApplying(false); return; }
    const { error } = await supabase.rpc('aplicar_estimulo_postura', { p_lote_id: selectedLote });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Estímulo aplicado e programa vinculado ao lote');
    setCfg((c) => ({ ...c, aplicado_em: new Date().toISOString() }));
  };

  const lote = useMemo(() => lotes.find((l) => l.id === selectedLote), [lotes, selectedLote]);
  const curva = useMemo(() => simularCurva(cfg), [cfg]);
  const elegivel = useMemo(() => {
    if (!lote) return null;
    const okIdade = (lote.idade_semanas ?? 0) >= cfg.idade_min_semanas;
    const okPeso = (lote.peso_atual_kg ?? 0) >= cfg.peso_min_kg;
    return { okIdade, okPeso, okTotal: okIdade && okPeso };
  }, [lote, cfg]);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 space-y-4 max-w-7xl">
        <header className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Estímulo de Postura</h1>
            <p className="text-sm text-muted-foreground">Configure parâmetros por lote, simule a curva e aplique o programa</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Lotes de Postura</CardTitle>
              <CardDescription>{lotes.length} lote(s) disponível(eis)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {loadingList ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : lotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum lote de postura ativo</p>
              ) : lotes.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLote(l.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${selectedLote === l.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{l.galpao_nome ?? 'Sem galpão'}</span>
                    <Badge variant="outline">{l.idade_semanas}sem</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {l.linhagem ?? '—'} · Peso médio: {l.peso_atual_kg ? `${l.peso_atual_kg.toFixed(2)} kg` : 'sem pesagem'}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Parâmetros do Estímulo
              </CardTitle>
              <CardDescription>
                {lote ? `Lote em ${lote.galpao_nome} · ${lote.idade_semanas} semanas` : 'Selecione um lote'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedLote ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Selecione um lote à esquerda</p>
              ) : loadingCfg ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Idade mínima (sem)</Label>
                      <Input type="number" min={10} max={40} value={cfg.idade_min_semanas}
                        onChange={(e) => setCfg({ ...cfg, idade_min_semanas: Number(e.target.value) })} />
                      {errors.idade_min_semanas && <p className="text-xs text-destructive mt-1">{errors.idade_min_semanas}</p>}
                    </div>
                    <div>
                      <Label>Peso mínimo (kg)</Label>
                      <Input type="number" step="0.01" min={0.5} max={5} value={cfg.peso_min_kg}
                        onChange={(e) => setCfg({ ...cfg, peso_min_kg: Number(e.target.value) })} />
                      {errors.peso_min_kg && <p className="text-xs text-destructive mt-1">{errors.peso_min_kg}</p>}
                    </div>
                    <div>
                      <Label>Intensidade (%)</Label>
                      <Input type="number" min={0} max={100} value={cfg.intensidade_pct}
                        onChange={(e) => setCfg({ ...cfg, intensidade_pct: Number(e.target.value) })} />
                      {errors.intensidade_pct && <p className="text-xs text-destructive mt-1">{errors.intensidade_pct}</p>}
                    </div>
                    <div>
                      <Label>Horas início</Label>
                      <Input type="number" step="0.5" min={6} max={24} value={cfg.horas_inicio}
                        onChange={(e) => setCfg({ ...cfg, horas_inicio: Number(e.target.value) })} />
                      {errors.horas_inicio && <p className="text-xs text-destructive mt-1">{errors.horas_inicio}</p>}
                    </div>
                    <div>
                      <Label>Horas alvo</Label>
                      <Input type="number" step="0.5" min={6} max={24} value={cfg.horas_alvo}
                        onChange={(e) => setCfg({ ...cfg, horas_alvo: Number(e.target.value) })} />
                      {errors.horas_alvo && <p className="text-xs text-destructive mt-1">{errors.horas_alvo}</p>}
                    </div>
                    <div>
                      <Label>Ganho semanal (min)</Label>
                      <Input type="number" min={5} max={120} value={cfg.ganho_semanal_min}
                        onChange={(e) => setCfg({ ...cfg, ganho_semanal_min: Number(e.target.value) })} />
                      {errors.ganho_semanal_min && <p className="text-xs text-destructive mt-1">{errors.ganho_semanal_min}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Aplicar automaticamente</Label>
                      <p className="text-xs text-muted-foreground">Quando atingir idade + peso mínimos (verificação diária)</p>
                    </div>
                    <Switch checked={cfg.auto_aplicar}
                      onCheckedChange={(v) => setCfg({ ...cfg, auto_aplicar: v })} />
                  </div>

                  {elegivel && lote && (
                    <div className="rounded-md border p-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Idade atual: <strong>{lote.idade_semanas} sem</strong></span>
                        <Badge variant={elegivel.okIdade ? 'default' : 'secondary'}>
                          {elegivel.okIdade ? 'OK' : `Faltam ${cfg.idade_min_semanas - (lote.idade_semanas ?? 0)} sem`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Peso médio: <strong>{lote.peso_atual_kg ? `${lote.peso_atual_kg.toFixed(2)} kg` : '—'}</strong></span>
                        <Badge variant={elegivel.okPeso ? 'default' : 'secondary'}>
                          {elegivel.okPeso ? 'OK' : 'Abaixo'}
                        </Badge>
                      </div>
                      {cfg.aplicado_em && (
                        <p className="text-xs text-muted-foreground pt-1">
                          Última aplicação: {new Date(cfg.aplicado_em).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-sm">Simulação da curva</h3>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {curva.length - 1} semanas até o platô
                      </span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={curva}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="semana" label={{ value: 'Semanas após início', position: 'insideBottom', offset: -5 }} />
                          <YAxis domain={[0, 24]} label={{ value: 'Horas de luz', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(v: any) => `${v} h`} />
                          <ReferenceLine y={cfg.horas_alvo} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="Alvo" />
                          <Line type="monotone" dataKey="horas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={salvar} disabled={saving || applying}>
                      {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      <Save className="w-4 h-4 mr-1" /> Salvar
                    </Button>
                    <Button onClick={aplicar} disabled={saving || applying}>
                      {applying && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      <Zap className="w-4 h-4 mr-1" /> Aplicar agora
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
