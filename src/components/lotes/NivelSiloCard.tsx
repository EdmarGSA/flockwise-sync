import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Package, TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface NivelSiloCardProps {
  loteId: string;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento: number;
  avesVivas: number;
}

interface DesempenhoAve {
  dia: number;
  consumo_acumulado_racao_g: number;
  consumo_diario_racao_g: number;
}

export function NivelSiloCard({ 
  loteId, 
  linhagem, 
  sexo, 
  diasDesdeAlojamento, 
  avesVivas 
}: NivelSiloCardProps) {
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [consumoEstimado, setConsumoEstimado] = useState(0);
  const [consumoDiarioEstimado, setConsumoDiarioEstimado] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [loteId, linhagem, sexo, diasDesdeAlojamento, avesVivas]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch total received feed (minus returns)
      const { data: solicitacoes } = await supabase
        .from('solicitacoes_racao')
        .select('quantidade_recebida_kg, quantidade_devolvida_kg, devolucao_confirmada, status')
        .eq('lote_id', loteId);

      const recebido = (solicitacoes || []).reduce((total, s) => {
        if (s.status === 'recebido' || s.status === 'parcialmente_devolvido') {
          const rec = s.quantidade_recebida_kg || 0;
          const dev = s.devolucao_confirmada ? (s.quantidade_devolvida_kg || 0) : 0;
          return total + (rec - dev);
        }
        return total;
      }, 0);

      setTotalRecebido(recebido);

      // Fetch performance reference for consumption calculation
      const { data: desempenho } = await supabase
        .from('desempenho_aves')
        .select('dia, consumo_acumulado_racao_g, consumo_diario_racao_g')
        .eq('linhagem', linhagem)
        .eq('sexo', sexo)
        .lte('dia', Math.max(diasDesdeAlojamento, 1))
        .order('dia', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (desempenho) {
        // Consumo acumulado em gramas -> converter para kg
        const consumoAcumuladoKg = (desempenho.consumo_acumulado_racao_g * avesVivas) / 1000;
        setConsumoEstimado(consumoAcumuladoKg);

        // Consumo diário em gramas -> converter para kg
        const consumoDiarioKg = (desempenho.consumo_diario_racao_g * avesVivas) / 1000;
        setConsumoDiarioEstimado(consumoDiarioKg);
      }
    } catch (error) {
      console.error('Erro ao calcular nível do silo:', error);
    } finally {
      setLoading(false);
    }
  };

  const nivelSilo = totalRecebido - consumoEstimado;
  const diasRestantes = consumoDiarioEstimado > 0 ? Math.floor(nivelSilo / consumoDiarioEstimado) : 0;
  const percentualConsumido = totalRecebido > 0 ? Math.min((consumoEstimado / totalRecebido) * 100, 100) : 0;

  const getStatusConfig = () => {
    if (diasRestantes < 0 || nivelSilo < 0) {
      return { 
        color: 'destructive', 
        bgClass: 'bg-destructive/10 border-destructive/30',
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
        label: 'Déficit',
        badgeVariant: 'destructive' as const
      };
    }
    // Critical: < 2 days
    if (diasRestantes < 2) {
      return { 
        color: 'destructive', 
        bgClass: 'bg-destructive/10 border-destructive/30',
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
        label: 'Crítico',
        badgeVariant: 'destructive' as const
      };
    }
    // Warning: 2-4 days
    if (diasRestantes <= 4) {
      return { 
        color: 'warning', 
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        icon: <Clock className="w-5 h-5 text-amber-500" />,
        label: `${diasRestantes} dias`,
        badgeVariant: 'secondary' as const
      };
    }
    // OK: > 5 days
    return { 
      color: 'success', 
      bgClass: 'bg-green-500/10 border-green-500/30',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      label: 'OK',
      badgeVariant: 'default' as const
    };
  };

  const status = getStatusConfig();

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${status.bgClass}`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Nível do Silo</span>
          </div>
          <div className="flex items-center gap-2">
            {status.icon}
            <Badge variant={status.badgeVariant}>{status.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Recebido</p>
            <p className="text-lg font-bold text-foreground">{totalRecebido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Consumo (est.)</p>
            <p className="text-lg font-bold text-muted-foreground">{consumoEstimado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">No Silo</p>
            <p className={`text-lg font-bold ${nivelSilo < 0 ? 'text-destructive' : 'text-primary'}`}>
              {nivelSilo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Consumido</span>
            <span>{percentualConsumido.toFixed(0)}%</span>
          </div>
          <Progress value={percentualConsumido} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm border-t pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="w-4 h-4" />
            <span>Consumo diário estimado:</span>
          </div>
          <span className="font-medium">{consumoDiarioEstimado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg/dia</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Duração estimada:</span>
          </div>
          <span className={`font-bold ${diasRestantes < 2 ? 'text-destructive' : diasRestantes <= 4 ? 'text-amber-500' : 'text-green-500'}`}>
            {diasRestantes < 0 ? 'Déficit' : `${diasRestantes} dias`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Export a simplified hook for listing
export function useSiloLevel(
  loteId: string, 
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard', 
  sexo: 'macho' | 'femea' | 'misto', 
  diasDesdeAlojamento: number, 
  avesVivas: number
) {
  const [siloData, setSiloData] = useState<{
    nivelSilo: number;
    diasRestantes: number;
    consumoDiarioEstimado: number;
    loading: boolean;
  }>({ nivelSilo: 0, diasRestantes: 0, consumoDiarioEstimado: 0, loading: true });

  useEffect(() => {
    const fetchData = async () => {
      if (!loteId || diasDesdeAlojamento <= 0 || avesVivas <= 0) {
        setSiloData({ nivelSilo: 0, diasRestantes: 0, consumoDiarioEstimado: 0, loading: false });
        return;
      }

      try {
        // Fetch total received feed
        const { data: solicitacoes } = await supabase
          .from('solicitacoes_racao')
          .select('quantidade_recebida_kg, quantidade_devolvida_kg, devolucao_confirmada, status')
          .eq('lote_id', loteId);

        const totalRecebido = (solicitacoes || []).reduce((total, s) => {
          if (s.status === 'recebido' || s.status === 'parcialmente_devolvido') {
            const rec = s.quantidade_recebida_kg || 0;
            const dev = s.devolucao_confirmada ? (s.quantidade_devolvida_kg || 0) : 0;
            return total + (rec - dev);
          }
          return total;
        }, 0);

        // Fetch performance reference
        const { data: desempenho } = await supabase
          .from('desempenho_aves')
          .select('consumo_acumulado_racao_g, consumo_diario_racao_g')
          .eq('linhagem', linhagem)
          .eq('sexo', sexo)
          .lte('dia', Math.max(diasDesdeAlojamento, 1))
          .order('dia', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (desempenho) {
          const consumoEstimadoKg = (desempenho.consumo_acumulado_racao_g * avesVivas) / 1000;
          const consumoDiarioKg = (desempenho.consumo_diario_racao_g * avesVivas) / 1000;
          const nivel = totalRecebido - consumoEstimadoKg;
          const dias = consumoDiarioKg > 0 ? Math.floor(nivel / consumoDiarioKg) : 0;
          
          setSiloData({ nivelSilo: nivel, diasRestantes: dias, consumoDiarioEstimado: consumoDiarioKg, loading: false });
        } else {
          setSiloData({ nivelSilo: totalRecebido, diasRestantes: 0, consumoDiarioEstimado: 0, loading: false });
        }
      } catch (error) {
        console.error('Erro ao calcular nível do silo:', error);
        setSiloData({ nivelSilo: 0, diasRestantes: 0, consumoDiarioEstimado: 0, loading: false });
      }
    };

    fetchData();
  }, [loteId, linhagem, sexo, diasDesdeAlojamento, avesVivas]);

  return siloData;
}
