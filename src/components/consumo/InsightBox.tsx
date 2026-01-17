import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface LoteConsumo {
  id: string;
  nucleo?: { nome: string } | null;
  galpao?: { nome: string } | null;
  nivelSilo?: number;
  diasEstoque?: number;
  diasDesdeAlojamento?: number;
  consumoDiarioKg?: number;
  consumoRealKg?: number;
  consumoEsperadoKg?: number;
}

interface InsightBoxProps {
  lotes: LoteConsumo[];
}

interface Insight {
  type: 'warning' | 'info' | 'success';
  message: string;
  icon: React.ReactNode;
}

export function InsightBox({ lotes }: InsightBoxProps) {
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];
    
    // Find lots with consumption above expected
    const lotesAcimaEsperado = lotes.filter(l => {
      if (!l.consumoRealKg || !l.consumoEsperadoKg) return false;
      const desvio = ((l.consumoRealKg - l.consumoEsperadoKg) / l.consumoEsperadoKg) * 100;
      return desvio > 10;
    });
    
    if (lotesAcimaEsperado.length > 0) {
      const lote = lotesAcimaEsperado[0];
      const desvio = ((lote.consumoRealKg! - lote.consumoEsperadoKg!) / lote.consumoEsperadoKg!) * 100;
      result.push({
        type: 'warning',
        message: `${lote.nucleo?.nome || 'Lote'} - ${lote.galpao?.nome || ''} consumiu ${Math.round(desvio)}% acima do esperado.`,
        icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
      });
    }
    
    // Find lots with consumption below expected
    const lotesAbaixoEsperado = lotes.filter(l => {
      if (!l.consumoRealKg || !l.consumoEsperadoKg) return false;
      const desvio = ((l.consumoRealKg - l.consumoEsperadoKg) / l.consumoEsperadoKg) * 100;
      return desvio < -15;
    });
    
    if (lotesAbaixoEsperado.length > 0) {
      const lote = lotesAbaixoEsperado[0];
      const desvio = Math.abs(((lote.consumoRealKg! - lote.consumoEsperadoKg!) / lote.consumoEsperadoKg!) * 100);
      result.push({
        type: 'warning',
        message: `${lote.nucleo?.nome || 'Lote'} - ${lote.galpao?.nome || ''} consumiu ${Math.round(desvio)}% abaixo do esperado. Verificar saúde do lote.`,
        icon: <TrendingDown className="w-4 h-4 text-red-500" />,
      });
    }
    
    // Critical stock warning
    const lotesCriticos = lotes.filter(l => (l.diasEstoque || 0) < 1 && (l.diasDesdeAlojamento || 0) > 0);
    if (lotesCriticos.length > 0) {
      result.push({
        type: 'warning',
        message: `${lotesCriticos.length} lote(s) com estoque crítico (< 1 dia). Ação imediata necessária!`,
        icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
      });
    }
    
    // Total consumption insight
    const totalConsumoDiario = lotes.reduce((sum, l) => sum + (l.consumoDiarioKg || 0), 0);
    if (totalConsumoDiario > 0) {
      result.push({
        type: 'info',
        message: `Consumo total estimado: ${totalConsumoDiario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg/dia em ${lotes.filter(l => (l.diasDesdeAlojamento || 0) > 0).length} lotes ativos.`,
        icon: <Lightbulb className="w-4 h-4 text-primary" />,
      });
    }
    
    return result.slice(0, 3); // Max 3 insights
  }, [lotes]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 mb-6">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">Insights Automáticos</p>
            <div className="space-y-1.5">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  {insight.icon}
                  <span>{insight.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
