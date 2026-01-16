import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useConfigSilo } from '@/hooks/useConfigSilo';
import { Package, TrendingDown, Clock, AlertTriangle, CheckCircle, Truck, Sparkles, History } from 'lucide-react';
import { differenceInHours, differenceInMinutes, differenceInDays } from 'date-fns';

interface NivelSiloCardProps {
  loteId: string;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento: number;
  avesVivas: number;
  onSugerirQuantidade?: (quantidade: number) => void;
  galpaoId?: string;
  refreshKey?: number;
}

interface DesempenhoAve {
  dia: number;
  consumo_acumulado_racao_g: number;
  consumo_diario_racao_g: number;
}

interface HistoricoNivel {
  nivel_estimado_kg: number;
  nivel_esperado_kg: number | null;
  divergencia_percentual: number | null;
  created_at: string;
}

export function NivelSiloCard({ 
  loteId, 
  linhagem, 
  sexo, 
  diasDesdeAlojamento, 
  avesVivas,
  onSugerirQuantidade,
  galpaoId,
  refreshKey
}: NivelSiloCardProps) {
  const { config } = useConfigSilo();
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [consumoEstimado, setConsumoEstimado] = useState(0);
  const [consumoDiarioEstimado, setConsumoDiarioEstimado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historicoNivel, setHistoricoNivel] = useState<HistoricoNivel | null>(null);
  const [consumoDesdeHistorico, setConsumoDesdeHistorico] = useState(0);
  const [racaoRecebidaDesdeHistorico, setRacaoRecebidaDesdeHistorico] = useState(0);
  const [divergenciaAcumuladaKg, setDivergenciaAcumuladaKg] = useState(0);

  useEffect(() => {
    fetchData();
  }, [loteId, linhagem, sexo, diasDesdeAlojamento, avesVivas, galpaoId, refreshKey]);

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

      // Fetch last historico_nivel_silo if galpaoId is available
      if (galpaoId) {
        const { data: historico } = await supabase
          .from('historico_nivel_silo')
          .select('nivel_estimado_kg, nivel_esperado_kg, divergencia_percentual, created_at')
          .eq('galpao_id', galpaoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Fetch all historical records to calculate accumulated divergence
        const { data: allHistorico } = await supabase
          .from('historico_nivel_silo')
          .select('nivel_estimado_kg, nivel_esperado_kg')
          .eq('galpao_id', galpaoId)
          .not('nivel_esperado_kg', 'is', null);
        
        const divergenciaTotal = (allHistorico || []).reduce((sum, h) => {
          const diffKg = (h.nivel_estimado_kg || 0) - (h.nivel_esperado_kg || 0);
          return sum + diffKg;
        }, 0);
        setDivergenciaAcumuladaKg(divergenciaTotal);

        if (historico) {
          setHistoricoNivel(historico);
          
          // Calculate consumption since historico was recorded
          const historicoDate = new Date(historico.created_at);
          const now = new Date();
          const horasDecorridas = differenceInHours(now, historicoDate);
          const diasDecorridos = horasDecorridas / 24;
          
          // Get consumption per day and calculate since historico
          if (desempenho) {
            const consumoDiarioKg = (desempenho.consumo_diario_racao_g * avesVivas) / 1000;
            setConsumoDesdeHistorico(consumoDiarioKg * diasDecorridos);
          }

          // NOVO: Buscar ração recebida APÓS o último registro de nível
          const { data: racaoRecebida } = await supabase
            .from('solicitacoes_racao')
            .select('quantidade_recebida_kg, data_recebimento')
            .eq('lote_id', loteId)
            .eq('status', 'recebido')
            .gt('data_recebimento', historicoDate.toISOString());

          const totalRecebidoDesdeHistorico = (racaoRecebida || []).reduce(
            (sum, r) => sum + (r.quantidade_recebida_kg || 0), 
            0
          );
          
          setRacaoRecebidaDesdeHistorico(totalRecebidoDesdeHistorico);
        } else {
          setHistoricoNivel(null);
          setConsumoDesdeHistorico(0);
          setRacaoRecebidaDesdeHistorico(0);
          setDivergenciaAcumuladaKg(0);
        }
      }
    } catch (error) {
      console.error('Erro ao calcular nível do silo:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTempoDesdeAtualizacao = (createdAt: string) => {
    const historicoDate = new Date(createdAt);
    const now = new Date();
    const minutos = differenceInMinutes(now, historicoDate);
    const horas = differenceInHours(now, historicoDate);
    const dias = differenceInDays(now, historicoDate);
    
    if (minutos < 60) return `${minutos} min`;
    if (horas < 24) return `${horas}h`;
    return `${dias} dia${dias > 1 ? 's' : ''}`;
  };

  // Calculate nivelSilo: prefer historico if available, otherwise use calculation
  // Formula: Nível Informado + Ração Recebida Depois - Consumo Desde Registro
  const nivelSiloCalculado = totalRecebido - consumoEstimado;
  const nivelSilo = historicoNivel 
    ? Math.max(0, historicoNivel.nivel_estimado_kg + racaoRecebidaDesdeHistorico - consumoDesdeHistorico)
    : nivelSiloCalculado;
  
  const diasRestantes = consumoDiarioEstimado > 0 ? Math.floor(nivelSilo / consumoDiarioEstimado) : 0;
  const percentualConsumido = totalRecebido > 0 ? Math.min((consumoEstimado / totalRecebido) * 100, 100) : 0;
  
  // Use dynamic config for thresholds
  const quantidadeSugerida = Math.max(0, Math.ceil((config.diasEstoqueSugerido - diasRestantes) * consumoDiarioEstimado));
  const isCritical = diasRestantes < config.diasCritico || nivelSilo < 0;

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
    // Critical: < diasCritico
    if (diasRestantes < config.diasCritico) {
      return { 
        color: 'destructive', 
        bgClass: 'bg-destructive/10 border-destructive/30',
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
        label: 'Crítico',
        badgeVariant: 'destructive' as const
      };
    }
    // Warning: diasCritico to diasAtencao
    if (diasRestantes <= config.diasAtencao) {
      return { 
        color: 'warning', 
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        icon: <Clock className="w-5 h-5 text-amber-500" />,
        label: `${diasRestantes} dias`,
        badgeVariant: 'secondary' as const
      };
    }
    // OK: > diasOk
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

        {/* Indicator for last update */}
        {historicoNivel && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
            <History className="w-3 h-3" />
            <span>Atualizado há {formatTempoDesdeAtualizacao(historicoNivel.created_at)}</span>
          </div>
        )}

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
          <span className={`font-bold ${diasRestantes < config.diasCritico ? 'text-destructive' : diasRestantes <= config.diasAtencao ? 'text-amber-500' : 'text-green-500'}`}>
            {diasRestantes < 0 ? 'Déficit' : `${diasRestantes} dias`}
          </span>
        </div>

        {/* Accumulated divergence display */}
        {divergenciaAcumuladaKg !== 0 && (
          <div className="flex items-center justify-between text-sm border-t pt-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span>Divergência acumulada:</span>
            </div>
            <Badge variant={divergenciaAcumuladaKg < 0 ? "destructive" : "secondary"} className="gap-1">
              {divergenciaAcumuladaKg > 0 ? '+' : ''}{divergenciaAcumuladaKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </Badge>
          </div>
        )}

        {/* Alert for critical silo level */}
        {isCritical && quantidadeSugerida > 0 && (
          <Alert className="bg-destructive/10 border-destructive/30 mt-4">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Truck className="w-5 h-5 text-destructive" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
              </div>
              <AlertDescription className="flex-1">
                <p className="font-semibold text-destructive mb-1">Solicitar Ração Urgente!</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Nível crítico detectado. Sugerimos solicitar ração para manter estoque de {config.diasEstoqueSugerido} dias.
                </p>
                <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 border border-border">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Quantidade sugerida:</span>
                  <span className="text-lg font-bold text-primary">
                    {quantidadeSugerida.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                  </span>
                  {onSugerirQuantidade && (
                    <button
                      onClick={() => onSugerirQuantidade(quantidadeSugerida)}
                      className="ml-auto text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Usar sugestão
                    </button>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}
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
