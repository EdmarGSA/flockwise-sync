import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Target, TrendingUp, Egg, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MetasPosturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  linhagem: string;
  semanasVida: number;
  onSuccess?: () => void;
}

interface MetasPostura {
  id?: string;
  meta_pico_postura: number;
  semana_pico: number;
  meta_persistencia: number;
  meta_viabilidade: number;
  meta_ovos_incubaveis: number;
  meta_peso_ovo_g: number;
}

interface ProducaoHistorico {
  semana: number;
  percentual_postura: number;
  peso_medio_ovo_g: number | null;
}

interface ReferenciaPostura {
  semana: number;
  producao_percentual: number | null;
  peso_ovo_g: number | null;
}

export function MetasPosturaDialog({
  open,
  onOpenChange,
  loteId,
  integradoId,
  linhagem,
  semanasVida,
  onSuccess,
}: MetasPosturaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [metas, setMetas] = useState<MetasPostura>({
    meta_pico_postura: 95,
    semana_pico: 28,
    meta_persistencia: 0.5,
    meta_viabilidade: 95,
    meta_ovos_incubaveis: 85,
    meta_peso_ovo_g: 62,
  });
  const [historico, setHistorico] = useState<ProducaoHistorico[]>([]);
  const [referencia, setReferencia] = useState<ReferenciaPostura[]>([]);

  useEffect(() => {
    if (open) {
      fetchMetas();
      fetchHistorico();
      fetchReferencia();
    }
  }, [open, loteId, linhagem]);

  const fetchMetas = async () => {
    const { data, error } = await supabase
      .from('metas_postura')
      .select('*')
      .eq('lote_id', loteId)
      .maybeSingle();

    if (data) {
      setMetas({
        id: data.id,
        meta_pico_postura: data.meta_pico_postura || 95,
        semana_pico: data.semana_pico || 28,
        meta_persistencia: data.meta_persistencia || 0.5,
        meta_viabilidade: data.meta_viabilidade || 95,
        meta_ovos_incubaveis: data.meta_ovos_incubaveis || 85,
        meta_peso_ovo_g: data.meta_peso_ovo_g || 62,
      });
    }
  };

  const fetchHistorico = async () => {
    const { data } = await supabase
      .from('producao_ovos')
      .select('data_producao, percentual_postura, peso_medio_ovo_g')
      .eq('lote_id', loteId)
      .order('data_producao', { ascending: true });

    if (data) {
      // Group by week
      const weeklyData: Record<number, ProducaoHistorico> = {};
      data.forEach((item, index) => {
        const semana = Math.floor(index / 7) + 19; // Starting from week 19
        if (!weeklyData[semana]) {
          weeklyData[semana] = {
            semana,
            percentual_postura: 0,
            peso_medio_ovo_g: null,
          };
        }
        weeklyData[semana].percentual_postura += (item.percentual_postura || 0) / 7;
        if (item.peso_medio_ovo_g) {
          weeklyData[semana].peso_medio_ovo_g = item.peso_medio_ovo_g;
        }
      });
      setHistorico(Object.values(weeklyData));
    }
  };

  const fetchReferencia = async () => {
    const { data } = await supabase
      .from('desempenho_postura')
      .select('semana, producao_percentual, peso_ovo_g')
      .eq('linhagem', linhagem as any)
      .gte('semana', 19)
      .order('semana', { ascending: true });

    if (data) {
      setReferencia(data);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const insertData = {
        lote_id: loteId,
        integrado_id: integradoId,
        meta_pico_postura: metas.meta_pico_postura,
        semana_pico: metas.semana_pico,
        meta_persistencia: metas.meta_persistencia,
        meta_viabilidade: metas.meta_viabilidade,
        meta_ovos_incubaveis: metas.meta_ovos_incubaveis,
        meta_peso_ovo_g: metas.meta_peso_ovo_g,
      };

      const { error } = await supabase
        .from('metas_postura')
        .upsert(insertData, { onConflict: 'lote_id' });

      if (error) throw error;

      toast.success('Metas salvas com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setLoading(false);
    }
  };

  const handleUsarReferencia = async () => {
    // Find peak production from reference data
    const peakRef = referencia.reduce((max, curr) => 
      (curr.producao_percentual || 0) > (max.producao_percentual || 0) ? curr : max
    , referencia[0]);

    if (peakRef) {
      setMetas(prev => ({
        ...prev,
        meta_pico_postura: peakRef.producao_percentual || 95,
        semana_pico: peakRef.semana,
        meta_peso_ovo_g: referencia.find(r => r.semana === 50)?.peso_ovo_g || 64,
      }));
      toast.info('Valores de referência aplicados');
    }
  };

  // Chart data combining real and reference
  const chartData = referencia.map(ref => {
    const real = historico.find(h => h.semana === ref.semana);
    return {
      semana: ref.semana,
      referencia: ref.producao_percentual,
      real: real?.percentual_postura || null,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Metas de Postura - Semana {semanasVida}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="metas">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metas">Metas</TabsTrigger>
            <TabsTrigger value="curva">Curva de Produção</TabsTrigger>
          </TabsList>

          <TabsContent value="metas" className="space-y-6 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleUsarReferencia} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Usar Referência
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Produção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Meta Pico Postura (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metas.meta_pico_postura}
                      onChange={(e) => setMetas(prev => ({ ...prev, meta_pico_postura: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Semana do Pico</Label>
                    <Input
                      type="number"
                      value={metas.semana_pico}
                      onChange={(e) => setMetas(prev => ({ ...prev, semana_pico: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Persistência (% queda/semana)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metas.meta_persistencia}
                      onChange={(e) => setMetas(prev => ({ ...prev, meta_persistencia: parseFloat(e.target.value) }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Egg className="w-4 h-4 text-primary" />
                    Qualidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Meta Viabilidade (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metas.meta_viabilidade}
                      onChange={(e) => setMetas(prev => ({ ...prev, meta_viabilidade: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Meta Ovos Incubáveis (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metas.meta_ovos_incubaveis}
                      onChange={(e) => setMetas(prev => ({ ...prev, meta_ovos_incubaveis: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Meta Peso Ovo (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={metas.meta_peso_ovo_g}
                      onChange={(e) => setMetas(prev => ({ ...prev, meta_peso_ovo_g: parseFloat(e.target.value) }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Metas'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="curva" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Curva de Produção - Real vs Referência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="semana" 
                        className="text-xs"
                        label={{ value: 'Semana', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        className="text-xs"
                        domain={[0, 100]}
                        label={{ value: '% Postura', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                        }}
                      />
                      <Legend />
                      <ReferenceLine 
                        x={semanasVida} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="5 5" 
                        label={{ value: 'Atual', fill: 'hsl(var(--primary))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="referencia"
                        name="Referência"
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="real"
                        name="Real"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
