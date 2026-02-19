import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Bird, Ticket } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIs {
  totalGranjas: number;
  totalUsuarios: number;
  totalLotesAtivos: number;
  totalAves: number;
  ticketsAbertos: number;
}

export default function BackofficeDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [profilesRes, lotesRes, ticketsRes] = await Promise.all([
          supabase.from('profiles').select('id, integrado_id'),
          supabase.from('lotes').select('id, quantidade_aves, status').in('status', ['alojado', 'saiu_para_entrega']),
          supabase.from('support_tickets').select('id').eq('status', 'aberto'),
        ]);

        const profiles = profilesRes.data || [];
        const lotes = lotesRes.data || [];
        const tickets = ticketsRes.data || [];

        const uniqueGranjas = new Set(profiles.map(p => p.integrado_id));

        setKpis({
          totalGranjas: uniqueGranjas.size,
          totalUsuarios: profiles.length,
          totalLotesAtivos: lotes.length,
          totalAves: lotes.reduce((sum, l) => sum + (l.quantidade_aves || 0), 0),
          ticketsAbertos: tickets.length,
        });
      } catch (err) {
        console.error('Erro ao carregar KPIs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const cards = [
    { label: 'Granjas Ativas', value: kpis?.totalGranjas, icon: Building2, color: 'text-primary' },
    { label: 'Usuários', value: kpis?.totalUsuarios, icon: Users, color: 'text-blue-500' },
    { label: 'Lotes Ativos', value: kpis?.totalLotesAtivos, icon: Bird, color: 'text-amber-500' },
    { label: 'Aves Alojadas', value: kpis?.totalAves?.toLocaleString('pt-BR'), icon: Bird, color: 'text-emerald-500' },
    { label: 'Tickets Abertos', value: kpis?.ticketsAbertos, icon: Ticket, color: 'text-destructive' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{card.value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
