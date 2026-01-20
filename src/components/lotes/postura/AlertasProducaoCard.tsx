import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingDown, ArrowDown, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertaProducao {
  tipo: 'queda_diaria' | 'tendencia_negativa' | 'pico_negativo';
  severidade: 'critico' | 'atencao';
  mensagem: string;
  data?: string;
  valor?: number;
}

interface AlertasProducaoCardProps {
  loteId: string;
  integradoId: string;
}

interface ProducaoData {
  data_producao: string;
  percentual_postura: number | null;
  ovos_totais: number;
}

export function AlertasProducaoCard({ loteId, integradoId }: AlertasProducaoCardProps) {
  const [alertas, setAlertas] = useState<AlertaProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [producoes, setProducoes] = useState<ProducaoData[]>([]);

  useEffect(() => {
    analisarProducao();
  }, [loteId]);

  const analisarProducao = async () => {
    try {
      // Buscar últimos 7 dias de produção
      const { data, error } = await supabase
        .from('producao_ovos')
        .select('data_producao, percentual_postura, ovos_totais')
        .eq('lote_id', loteId)
        .order('data_producao', { ascending: false })
        .limit(7);

      if (error) throw error;
      if (!data || data.length < 2) {
        setLoading(false);
        return;
      }

      setProducoes(data);
      const alertasDetectados: AlertaProducao[] = [];

      // Regra 1: Queda > 5% em relação ao dia anterior
      for (let i = 0; i < data.length - 1; i++) {
        const atual = data[i].percentual_postura || 0;
        const anterior = data[i + 1].percentual_postura || 0;
        
        if (anterior > 0) {
          const variacao = ((atual - anterior) / anterior) * 100;
          
          if (variacao < -10) {
            alertasDetectados.push({
              tipo: 'queda_diaria',
              severidade: 'critico',
              mensagem: `Queda crítica de ${Math.abs(variacao).toFixed(1)}% na produção`,
              data: data[i].data_producao,
              valor: variacao,
            });
          } else if (variacao < -5) {
            alertasDetectados.push({
              tipo: 'queda_diaria',
              severidade: 'atencao',
              mensagem: `Queda de ${Math.abs(variacao).toFixed(1)}% na produção`,
              data: data[i].data_producao,
              valor: variacao,
            });
          }
        }
      }

      // Regra 2: Tendência negativa por 3+ dias consecutivos
      if (data.length >= 3) {
        let diasEmQueda = 0;
        for (let i = 0; i < data.length - 1; i++) {
          const atual = data[i].percentual_postura || 0;
          const anterior = data[i + 1].percentual_postura || 0;
          
          if (atual < anterior) {
            diasEmQueda++;
          } else {
            break;
          }
        }

        if (diasEmQueda >= 3) {
          alertasDetectados.push({
            tipo: 'tendencia_negativa',
            severidade: diasEmQueda >= 5 ? 'critico' : 'atencao',
            mensagem: `Produção em queda por ${diasEmQueda} dias consecutivos`,
          });
        }
      }

      // Regra 3: Produção muito abaixo da média
      if (data.length >= 3) {
        const mediaRecente = data.slice(1).reduce((acc, d) => acc + (d.percentual_postura || 0), 0) / (data.length - 1);
        const producaoHoje = data[0].percentual_postura || 0;
        
        if (mediaRecente > 0 && producaoHoje < mediaRecente * 0.85) {
          alertasDetectados.push({
            tipo: 'pico_negativo',
            severidade: 'atencao',
            mensagem: `Produção de hoje (${producaoHoje.toFixed(1)}%) está 15% abaixo da média (${mediaRecente.toFixed(1)}%)`,
          });
        }
      }

      setAlertas(alertasDetectados);
    } catch (error) {
      console.error('Erro ao analisar produção:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Se não há alertas e tem produção, mostrar status positivo
  if (alertas.length === 0 && producoes.length >= 2) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Produção Estável</p>
              <p className="text-sm text-muted-foreground">
                Últimos {producoes.length} dias sem quedas significativas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alertas.length === 0) {
    return null;
  }

  const alertasCriticos = alertas.filter(a => a.severidade === 'critico');
  const alertasAtencao = alertas.filter(a => a.severidade === 'atencao');

  return (
    <Card className={alertasCriticos.length > 0 ? 'border-destructive/50' : 'border-amber-500/50'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={`w-5 h-5 ${alertasCriticos.length > 0 ? 'text-destructive' : 'text-amber-500'}`} />
          Alertas de Produção
          <Badge variant={alertasCriticos.length > 0 ? 'destructive' : 'secondary'}>
            {alertas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertasCriticos.map((alerta, index) => (
          <Alert key={`critico-${index}`} variant="destructive" className="py-3">
            <TrendingDown className="h-4 w-4" />
            <AlertTitle className="text-sm font-medium">
              {alerta.tipo === 'tendencia_negativa' ? 'Tendência de Queda' : 'Queda Crítica'}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {alerta.mensagem}
              {alerta.data && (
                <span className="block text-xs opacity-70 mt-1">
                  {format(new Date(alerta.data), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ))}

        {alertasAtencao.map((alerta, index) => (
          <Alert key={`atencao-${index}`} className="border-amber-500/50 bg-amber-500/10 py-3">
            <ArrowDown className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Atenção
            </AlertTitle>
            <AlertDescription className="text-sm text-amber-600 dark:text-amber-300">
              {alerta.mensagem}
              {alerta.data && (
                <span className="block text-xs opacity-70 mt-1">
                  {format(new Date(alerta.data), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ))}

        <p className="text-xs text-muted-foreground pt-2">
          Recomenda-se verificar saúde das aves, consumo de água e ração, e condições ambientais.
        </p>
      </CardContent>
    </Card>
  );
}
