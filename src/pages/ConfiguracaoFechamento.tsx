import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConfigFechamento } from '@/hooks/useConfigFechamento';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Settings, Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ConfiguracaoFechamento = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { constanteAjusteCA, loading: configLoading, saveConfig } = useConfigFechamento();
  
  const [constante, setConstante] = useState<string>('3.8');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!configLoading) {
      setConstante(String(constanteAjusteCA));
    }
  }, [constanteAjusteCA, configLoading]);

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSave = async () => {
    const value = parseFloat(constante);
    if (isNaN(value) || value <= 0) {
      toast.error('Informe um valor válido maior que zero');
      return;
    }

    setSaving(true);
    const success = await saveConfig(value);
    setSaving(false);

    if (success) {
      toast.success('Configuração salva com sucesso');
    } else {
      toast.error('Erro ao salvar configuração');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Fechamento de Lote</h1>
              <p className="text-muted-foreground">Configurar constante de ajuste de conversão alimentar</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              A conversão alimentar corrigida é calculada pela fórmula: <strong>CAc = CA – (PM – PP) / K</strong>, 
              onde K é a constante de ajuste. O padrão é 3,8 (lotes mistos apresentam ~2,6 pontos de variação 
              na conversão para cada 100g de ganho de peso). Ajuste conforme os padrões da sua empresa.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Constante de Ajuste (K)
              </CardTitle>
              <CardDescription>
                Valor usado para calcular a conversão alimentar ajustada no fechamento do lote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="constante">Constante de Ajuste (K)</Label>
                <Input
                  id="constante"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={constante}
                  onChange={(e) => setConstante(e.target.value)}
                  placeholder="3.8"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Fórmula: CAc = CA – (Peso Médio Real – Peso Projetado) / {constante || '3.8'}
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exemplo de Cálculo</CardTitle>
              <CardDescription>Como a constante afeta o cálculo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Conversão Alimentar (CA):</p>
                  <p className="font-medium">1.680</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso Médio Real (PM):</p>
                  <p className="font-medium">2.810 kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso Projetado (PP):</p>
                  <p className="font-medium">2.949 kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Constante (K):</p>
                  <p className="font-medium">{constante || '3.8'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground">Cálculo:</p>
                <p className="font-mono text-xs">CAc = 1.680 – (2.810 – 2.949) / {constante || '3.8'}</p>
                <p className="font-mono text-xs">CAc = 1.680 – (-0.139) / {constante || '3.8'}</p>
                <p className="font-mono text-xs">CAc = 1.680 + {(0.139 / parseFloat(constante || '3.8')).toFixed(3)}</p>
                <p className="font-medium mt-2">
                  Conversão Ajustada: {(1.680 + 0.139 / parseFloat(constante || '3.8')).toFixed(3)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ConfiguracaoFechamento;
