import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, DollarSign, Clock, TrendingUp } from 'lucide-react';

interface PedidosKPICardsProps {
  integradoId: string;
}

export default function PedidosKPICards({ integradoId }: PedidosKPICardsProps) {
  const [kpis, setKpis] = useState({
    totalPedidos: 0,
    valorFaturado: 0,
    pendentesAprovacao: 0,
    ticketMedio: 0
  });

  useEffect(() => {
    fetchKPIs();
  }, [integradoId]);

  const fetchKPIs = async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [pedidosRes, faturadosRes, pendentesRes] = await Promise.all([
      supabase.from('pedidos').select('id', { count: 'exact', head: true })
        .eq('integrado_id', integradoId)
        .gte('created_at', firstDay),
      supabase.from('pedidos').select('valor_total')
        .eq('integrado_id', integradoId)
        .eq('status', 'faturado')
        .gte('created_at', firstDay),
      supabase.from('pedidos').select('id', { count: 'exact', head: true })
        .eq('integrado_id', integradoId)
        .eq('status', 'pendente_aprovacao'),
    ]);

    const totalPedidos = pedidosRes.count || 0;
    const valorFaturado = (faturadosRes.data || []).reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const pendentesAprovacao = pendentesRes.count || 0;
    const ticketMedio = totalPedidos > 0 ? valorFaturado / (faturadosRes.data?.length || 1) : 0;

    setKpis({ totalPedidos, valorFaturado, pendentesAprovacao, ticketMedio });
  };

  const cards = [
    {
      title: 'Pedidos (mês)',
      value: kpis.totalPedidos.toString(),
      icon: FileText,
      color: 'text-blue-500'
    },
    {
      title: 'Faturado (mês)',
      value: `R$ ${kpis.valorFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-500'
    },
    {
      title: 'Pendentes Aprovação',
      value: kpis.pendentesAprovacao.toString(),
      icon: Clock,
      color: 'text-amber-500'
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${kpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-primary'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                <p className="text-lg font-bold truncate">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
