import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Save, Loader2 } from 'lucide-react';
import Header from '@/components/Header';

interface MetasZootecnicas {
  id?: string;
  // Mortalidade
  mortalidade_7_dias_ok: number;
  mortalidade_7_dias_alerta: number;
  mortalidade_14_dias_ok: number;
  mortalidade_14_dias_alerta: number;
  mortalidade_21_dias_ok: number;
  mortalidade_21_dias_alerta: number;
  mortalidade_28_dias_ok: number;
  mortalidade_28_dias_alerta: number;
  mortalidade_35_dias_ok: number;
  mortalidade_35_dias_alerta: number;
  mortalidade_42_dias_ok: number;
  mortalidade_42_dias_alerta: number;
  // CA
  ca_7_dias_ok: number;
  ca_7_dias_alerta: number;
  ca_14_dias_ok: number;
  ca_14_dias_alerta: number;
  ca_21_dias_ok: number;
  ca_21_dias_alerta: number;
  ca_28_dias_ok: number;
  ca_28_dias_alerta: number;
  ca_35_dias_ok: number;
  ca_35_dias_alerta: number;
  ca_42_dias_ok: number;
  ca_42_dias_alerta: number;
  // Consumo
  consumo_7_dias_min: number;
  consumo_7_dias_max: number;
  consumo_14_dias_min: number;
  consumo_14_dias_max: number;
  consumo_21_dias_min: number;
  consumo_21_dias_max: number;
  consumo_28_dias_min: number;
  consumo_28_dias_max: number;
  consumo_35_dias_min: number;
  consumo_35_dias_max: number;
  consumo_42_dias_min: number;
  consumo_42_dias_max: number;
  // Medicamento
  carencia_medicamento_minimo: number;
}

const defaultMetas: MetasZootecnicas = {
  mortalidade_7_dias_ok: 0.5,
  mortalidade_7_dias_alerta: 1.0,
  mortalidade_14_dias_ok: 1.0,
  mortalidade_14_dias_alerta: 1.8,
  mortalidade_21_dias_ok: 1.5,
  mortalidade_21_dias_alerta: 2.5,
  mortalidade_28_dias_ok: 2.0,
  mortalidade_28_dias_alerta: 3.0,
  mortalidade_35_dias_ok: 2.5,
  mortalidade_35_dias_alerta: 3.5,
  mortalidade_42_dias_ok: 3.0,
  mortalidade_42_dias_alerta: 4.5,
  ca_7_dias_ok: 1.00,
  ca_7_dias_alerta: 1.20,
  ca_14_dias_ok: 1.20,
  ca_14_dias_alerta: 1.40,
  ca_21_dias_ok: 1.35,
  ca_21_dias_alerta: 1.55,
  ca_28_dias_ok: 1.50,
  ca_28_dias_alerta: 1.70,
  ca_35_dias_ok: 1.60,
  ca_35_dias_alerta: 1.80,
  ca_42_dias_ok: 1.70,
  ca_42_dias_alerta: 1.95,
  consumo_7_dias_min: 25,
  consumo_7_dias_max: 35,
  consumo_14_dias_min: 50,
  consumo_14_dias_max: 70,
  consumo_21_dias_min: 90,
  consumo_21_dias_max: 120,
  consumo_28_dias_min: 130,
  consumo_28_dias_max: 160,
  consumo_35_dias_min: 160,
  consumo_35_dias_max: 195,
  consumo_42_dias_min: 180,
  consumo_42_dias_max: 220,
  carencia_medicamento_minimo: 7,
};

const periodos = [7, 14, 21, 28, 35, 42];

export default function CadastroMetasZootecnicas() {
  const { user, loading: authLoading } = useAuth();
  const { integradoId, loading: integradoLoading } = useIntegradoId();
  const navigate = useNavigate();
  const [metas, setMetas] = useState<MetasZootecnicas>(defaultMetas);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (integradoId) {
      fetchMetas();
    }
  }, [integradoId]);

  const fetchMetas = async () => {
    if (!integradoId) return;
    
    try {
      const { data, error } = await supabase
        .from('metas_zootecnicas')
        .select('*')
        .eq('integrado_id', integradoId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching metas:', error);
      }

      if (data) {
        setMetas({
          id: data.id,
          mortalidade_7_dias_ok: Number(data.mortalidade_7_dias_ok),
          mortalidade_7_dias_alerta: Number(data.mortalidade_7_dias_alerta),
          mortalidade_14_dias_ok: Number(data.mortalidade_14_dias_ok),
          mortalidade_14_dias_alerta: Number(data.mortalidade_14_dias_alerta),
          mortalidade_21_dias_ok: Number(data.mortalidade_21_dias_ok),
          mortalidade_21_dias_alerta: Number(data.mortalidade_21_dias_alerta),
          mortalidade_28_dias_ok: Number(data.mortalidade_28_dias_ok),
          mortalidade_28_dias_alerta: Number(data.mortalidade_28_dias_alerta),
          mortalidade_35_dias_ok: Number(data.mortalidade_35_dias_ok),
          mortalidade_35_dias_alerta: Number(data.mortalidade_35_dias_alerta),
          mortalidade_42_dias_ok: Number(data.mortalidade_42_dias_ok),
          mortalidade_42_dias_alerta: Number(data.mortalidade_42_dias_alerta),
          ca_7_dias_ok: Number(data.ca_7_dias_ok),
          ca_7_dias_alerta: Number(data.ca_7_dias_alerta),
          ca_14_dias_ok: Number(data.ca_14_dias_ok),
          ca_14_dias_alerta: Number(data.ca_14_dias_alerta),
          ca_21_dias_ok: Number(data.ca_21_dias_ok),
          ca_21_dias_alerta: Number(data.ca_21_dias_alerta),
          ca_28_dias_ok: Number(data.ca_28_dias_ok),
          ca_28_dias_alerta: Number(data.ca_28_dias_alerta),
          ca_35_dias_ok: Number(data.ca_35_dias_ok),
          ca_35_dias_alerta: Number(data.ca_35_dias_alerta),
          ca_42_dias_ok: Number(data.ca_42_dias_ok),
          ca_42_dias_alerta: Number(data.ca_42_dias_alerta),
          consumo_7_dias_min: Number(data.consumo_7_dias_min),
          consumo_7_dias_max: Number(data.consumo_7_dias_max),
          consumo_14_dias_min: Number(data.consumo_14_dias_min),
          consumo_14_dias_max: Number(data.consumo_14_dias_max),
          consumo_21_dias_min: Number(data.consumo_21_dias_min),
          consumo_21_dias_max: Number(data.consumo_21_dias_max),
          consumo_28_dias_min: Number(data.consumo_28_dias_min),
          consumo_28_dias_max: Number(data.consumo_28_dias_max),
          consumo_35_dias_min: Number(data.consumo_35_dias_min),
          consumo_35_dias_max: Number(data.consumo_35_dias_max),
          consumo_42_dias_min: Number(data.consumo_42_dias_min),
          consumo_42_dias_max: Number(data.consumo_42_dias_max),
          carencia_medicamento_minimo: data.carencia_medicamento_minimo || 7,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!integradoId) return;
    
    setSaving(true);
    try {
      const payload = {
        integrado_id: integradoId,
        ...metas,
      };
      delete (payload as any).id;

      if (metas.id) {
        const { error } = await supabase
          .from('metas_zootecnicas')
          .update(payload)
          .eq('id', metas.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('metas_zootecnicas')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Metas salvas com sucesso!');
    } catch (error) {
      console.error('Error saving metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSaving(false);
    }
  };

  const updateMeta = (key: keyof MetasZootecnicas, value: number) => {
    setMetas(prev => ({ ...prev, [key]: value }));
  };

  if (authLoading || integradoLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground">Metas Zootécnicas</h1>
              <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">
                Configure limites de mortalidade, CA e consumo por período
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Mortalidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mortalidade (%)</CardTitle>
              <CardDescription>Percentual acumulado máximo por período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {periodos.map((periodo) => (
                  <div key={`mort-${periodo}`} className="space-y-2">
                    <Label className="text-sm font-medium">{periodo} dias</Label>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-chart-2">OK:</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={metas[`mortalidade_${periodo}_dias_ok` as keyof MetasZootecnicas]}
                          onChange={(e) => updateMeta(`mortalidade_${periodo}_dias_ok` as keyof MetasZootecnicas, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-chart-4">Alerta:</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={metas[`mortalidade_${periodo}_dias_alerta` as keyof MetasZootecnicas]}
                          onChange={(e) => updateMeta(`mortalidade_${periodo}_dias_alerta` as keyof MetasZootecnicas, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversão Alimentar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversão Alimentar</CardTitle>
              <CardDescription>Índice máximo de CA por período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {periodos.map((periodo) => (
                  <div key={`ca-${periodo}`} className="space-y-2">
                    <Label className="text-sm font-medium">{periodo} dias</Label>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-chart-2">OK:</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={metas[`ca_${periodo}_dias_ok` as keyof MetasZootecnicas]}
                          onChange={(e) => updateMeta(`ca_${periodo}_dias_ok` as keyof MetasZootecnicas, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-chart-4">Alerta:</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={metas[`ca_${periodo}_dias_alerta` as keyof MetasZootecnicas]}
                          onChange={(e) => updateMeta(`ca_${periodo}_dias_alerta` as keyof MetasZootecnicas, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consumo (g/ave/dia)</CardTitle>
              <CardDescription>Faixa esperada de consumo diário por período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {periodos.map((periodo) => (
                  <div key={`consumo-${periodo}`} className="space-y-2">
                    <Label className="text-sm font-medium">{periodo} dias</Label>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Mín:</span>
                        <Input
                          type="number"
                          step="1"
                          value={metas[`consumo_${periodo}_dias_min` as keyof MetasZootecnicas]}
                          onChange={(e) => updateMeta(`consumo_${periodo}_dias_min` as keyof MetasZootecnicas, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Máx:</span>
                        <Input
                          type="number"
                          step="1"
                          value={metas[`consumo_${periodo}_dias_max` as keyof MetasZootecnicas]}
                          onChange={(e) => updateMeta(`consumo_${periodo}_dias_max` as keyof MetasZootecnicas, parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medicamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medicamentos</CardTitle>
              <CardDescription>Período de carência antes do abate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label>Carência mínima (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={metas.carencia_medicamento_minimo}
                  onChange={(e) => updateMeta('carencia_medicamento_minimo', parseInt(e.target.value) || 7)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Configurações
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
