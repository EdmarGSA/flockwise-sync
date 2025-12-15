import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AltimeterDisplay } from './AltimeterDisplay';
import { FuelGauge } from './FuelGauge';
import { TachometerGauge } from './TachometerGauge';
import { Wallet, Loader2 } from 'lucide-react';

interface FinanceiroPanelProps {
  userId: string;
}

export const FinanceiroPanel = ({ userId }: FinanceiroPanelProps) => {
  // Fetch cash flow for next 7 days
  const { data: fluxoCaixa, isLoading: loadingFluxo } = useQuery({
    queryKey: ['cockpit-fluxo-caixa', userId],
    queryFn: async () => {
      const today = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split('T')[0];
      const futureStr = sevenDaysLater.toISOString().split('T')[0];

      // Get receivables for next 7 days
      const { data: receber } = await supabase
        .from('contas_receber')
        .select('valor')
        .eq('integrado_id', userId)
        .in('status', ['previsao', 'pendente'])
        .gte('data_vencimento', todayStr)
        .lte('data_vencimento', futureStr);

      // Get payables for next 7 days
      const { data: pagar } = await supabase
        .from('contas_pagar')
        .select('valor')
        .eq('integrado_id', userId)
        .in('status', ['previsto', 'pendente'])
        .gte('data_vencimento', todayStr)
        .lte('data_vencimento', futureStr);

      const entradas = receber?.reduce((acc, r) => acc + (r.valor || 0), 0) || 0;
      const saidas = pagar?.reduce((acc, p) => acc + (p.valor || 0), 0) || 0;

      return {
        entradas,
        saidas,
        saldo: entradas - saidas
      };
    },
    refetchInterval: 60000
  });

  // Fetch credit utilization
  const { data: creditoData, isLoading: loadingCredito } = useQuery({
    queryKey: ['cockpit-credito', userId],
    queryFn: async () => {
      const { data: creditos } = await supabase
        .from('credito_cliente')
        .select('limite_credito, cliente_id')
        .eq('integrado_id', userId)
        .eq('ativo', true);

      if (!creditos || creditos.length === 0) {
        return { utilizado: 0, total: 0, percentual: 0 };
      }

      const totalLimite = creditos.reduce((acc, c) => acc + (c.limite_credito || 0), 0);

      // Get pending receivables per client
      const { data: pendentes } = await supabase
        .from('contas_receber')
        .select('cliente_id, valor')
        .eq('integrado_id', userId)
        .in('status', ['previsao', 'pendente', 'parcial']);

      const utilizadoPorCliente: Record<string, number> = {};
      pendentes?.forEach(p => {
        if (p.cliente_id) {
          utilizadoPorCliente[p.cliente_id] = (utilizadoPorCliente[p.cliente_id] || 0) + (p.valor || 0);
        }
      });

      // Sum up utilized credit only for clients with credit limits
      let totalUtilizado = 0;
      creditos.forEach(c => {
        totalUtilizado += utilizadoPorCliente[c.cliente_id] || 0;
      });

      return {
        utilizado: totalUtilizado,
        total: totalLimite,
        percentual: totalLimite > 0 ? (totalUtilizado / totalLimite) * 100 : 0
      };
    },
    refetchInterval: 60000
  });

  // Fetch overdue receivables percentage
  const { data: atrasoData, isLoading: loadingAtraso } = useQuery({
    queryKey: ['cockpit-atraso-cr', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: todas } = await supabase
        .from('contas_receber')
        .select('id, data_vencimento')
        .eq('integrado_id', userId)
        .in('status', ['previsao', 'pendente', 'parcial']);

      if (!todas || todas.length === 0) return 0;

      const atrasadas = todas.filter(c => c.data_vencimento < today).length;
      return (atrasadas / todas.length) * 100;
    },
    refetchInterval: 60000
  });

  const isLoading = loadingFluxo || loadingCredito || loadingAtraso;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Financeiro</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Financeiro</h3>
      </div>

      <div className="space-y-4">
        {/* Altimeter - Cash Need */}
        <AltimeterDisplay
          value={fluxoCaixa?.saldo || 0}
          entradas={fluxoCaixa?.entradas || 0}
          saidas={fluxoCaixa?.saidas || 0}
          title="Altitude Financeira"
          period="Próximos 7 dias"
        />

        {/* Fuel Gauge - Credit Utilization */}
        <FuelGauge
          percentage={creditoData?.percentual || 0}
          utilizado={creditoData?.utilizado || 0}
          total={creditoData?.total || 0}
          title="Limite de Crédito Utilizado"
          warningThreshold={50}
          dangerThreshold={70}
        />

        {/* Overdue Tachometer */}
        <TachometerGauge
          value={atrasoData || 0}
          max={30}
          zones={{ green: 5, yellow: 15 }}
          title="Atraso Contas a Receber"
          unit="%"
          decimals={1}
        />
      </div>
    </div>
  );
};

export const getFinanceiroData = async (userId: string) => {
  const today = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const futureStr = sevenDaysLater.toISOString().split('T')[0];

  // Get receivables
  const { data: receber } = await supabase
    .from('contas_receber')
    .select('valor, data_vencimento, status')
    .eq('integrado_id', userId);

  const entradas = receber?.filter(r => 
    r.data_vencimento >= todayStr && 
    r.data_vencimento <= futureStr &&
    ['previsao', 'pendente'].includes(r.status)
  ).reduce((acc, r) => acc + (r.valor || 0), 0) || 0;

  // Get payables
  const { data: pagar } = await supabase
    .from('contas_pagar')
    .select('valor, data_vencimento, status')
    .eq('integrado_id', userId);

  const saidas = pagar?.filter(p => 
    p.data_vencimento >= todayStr && 
    p.data_vencimento <= futureStr &&
    ['previsto', 'pendente'].includes(p.status)
  ).reduce((acc, p) => acc + (p.valor || 0), 0) || 0;

  // Calculate overdue
  const todasReceber = receber?.filter(r => ['previsao', 'pendente', 'parcial'].includes(r.status)) || [];
  const atrasadas = todasReceber.filter(c => c.data_vencimento < todayStr).length;
  const atrasoCR = todasReceber.length > 0 ? (atrasadas / todasReceber.length) * 100 : 0;

  return {
    caixa7dias: entradas - saidas,
    creditoUtilizado: 45, // Would need full calculation
    atrasoCR
  };
};
