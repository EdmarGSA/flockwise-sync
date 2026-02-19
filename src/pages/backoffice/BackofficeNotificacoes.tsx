import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  created_at: string;
}

export default function BackofficeNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setNotificacoes((data as Notificacao[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ lida: true }).eq('id', id);
    fetch();
  };

  const markAllAsRead = async () => {
    await supabase.from('admin_notifications').update({ lida: true }).eq('lida', false);
    fetch();
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Central de Notificações
            {naoLidas > 0 && <Badge variant="destructive">{naoLidas}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : notificacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma notificação</p>
          ) : (
            <div className="space-y-2">
              {notificacoes.map(n => (
                <div key={n.id} className={`p-3 rounded-lg border ${n.lida ? 'bg-background border-border' : 'bg-primary/5 border-primary/20'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium text-sm ${n.lida ? 'text-muted-foreground' : 'text-foreground'}`}>{n.titulo}</p>
                      {n.mensagem && <p className="text-xs text-muted-foreground mt-1">{n.mensagem}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {!n.lida && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsRead(n.id)}>
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
