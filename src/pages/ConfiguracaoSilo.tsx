import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConfigSilo } from '@/hooks/useConfigSilo';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Package, AlertTriangle, Clock, CheckCircle, Save } from 'lucide-react';

const ConfiguracaoSilo = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { config, loading, saveConfig } = useConfigSilo();
  
  const [diasCritico, setDiasCritico] = useState(2);
  const [diasAtencao, setDiasAtencao] = useState(4);
  const [diasOk, setDiasOk] = useState(5);
  const [diasEstoqueSugerido, setDiasEstoqueSugerido] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDiasCritico(config.diasCritico);
      setDiasAtencao(config.diasAtencao);
      setDiasOk(config.diasOk);
      setDiasEstoqueSugerido(config.diasEstoqueSugerido);
    }
  }, [config, loading]);

  if (authLoading || loading) {
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

  const validateConfig = () => {
    if (diasCritico >= diasAtencao) {
      toast.error('Dias Crítico deve ser menor que Dias Atenção');
      return false;
    }
    if (diasAtencao >= diasOk) {
      toast.error('Dias Atenção deve ser menor que Dias OK');
      return false;
    }
    if (diasEstoqueSugerido < diasOk) {
      toast.error('Dias de Estoque Sugerido deve ser maior ou igual a Dias OK');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateConfig()) return;

    setSaving(true);
    const success = await saveConfig({
      diasCritico,
      diasAtencao,
      diasOk,
      diasEstoqueSugerido,
    });

    if (success) {
      toast.success('Configurações salvas com sucesso!');
    } else {
      toast.error('Erro ao salvar configurações');
    }
    setSaving(false);
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
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nível de Silo</h1>
              <p className="text-muted-foreground">Configure thresholds de alerta e sugestão de estoque</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Thresholds de Alerta</CardTitle>
              <CardDescription>
                Configure os dias restantes de ração para cada nível de alerta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="diasCritico" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Dias Crítico
                </Label>
                <Input
                  id="diasCritico"
                  type="number"
                  min={1}
                  max={10}
                  value={diasCritico}
                  onChange={(e) => setDiasCritico(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta vermelho quando restar menos de {diasCritico} dias de ração
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diasAtencao" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Dias Atenção
                </Label>
                <Input
                  id="diasAtencao"
                  type="number"
                  min={1}
                  max={15}
                  value={diasAtencao}
                  onChange={(e) => setDiasAtencao(parseInt(e.target.value) || 2)}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta amarelo entre {diasCritico} e {diasAtencao} dias
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diasOk" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Dias OK
                </Label>
                <Input
                  id="diasOk"
                  type="number"
                  min={1}
                  max={20}
                  value={diasOk}
                  onChange={(e) => setDiasOk(parseInt(e.target.value) || 3)}
                />
                <p className="text-xs text-muted-foreground">
                  Status verde quando restar mais de {diasOk} dias de ração
                </p>
              </div>

              <div className="border-t pt-6 space-y-2">
                <Label htmlFor="diasEstoqueSugerido">Dias de Estoque Sugerido</Label>
                <Input
                  id="diasEstoqueSugerido"
                  type="number"
                  min={1}
                  max={30}
                  value={diasEstoqueSugerido}
                  onChange={(e) => setDiasEstoqueSugerido(parseInt(e.target.value) || 7)}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade sugerida será calculada para {diasEstoqueSugerido} dias de consumo
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>
                Veja como os alertas serão exibidos com as configurações atuais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <span className="font-medium">Crítico</span>
                  </div>
                  <Badge variant="destructive">&lt; {diasCritico} dias</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span className="font-medium">Atenção</span>
                  </div>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {diasCritico} - {diasAtencao} dias
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">OK</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
                    &gt; {diasOk} dias
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-2">Sugestão de Pedido:</p>
                <p className="text-sm">
                  Quando o nível ficar <span className="font-semibold text-destructive">crítico</span>, 
                  o sistema sugerirá quantidade suficiente para manter{' '}
                  <span className="font-semibold text-primary">{diasEstoqueSugerido} dias</span> de estoque.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ConfiguracaoSilo;
