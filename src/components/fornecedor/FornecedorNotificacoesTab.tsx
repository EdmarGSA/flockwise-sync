import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  ShoppingCart, 
  AlertTriangle, 
  DollarSign, 
  XCircle,
  Clock,
  Check
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificacaoFornecedor } from '@/hooks/useFornecedorData';

interface FornecedorNotificacoesTabProps {
  notificacoes: NotificacaoFornecedor[];
  onMarcarLida: (notificacaoId: string) => void;
}

const tipoConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pedido_novo: { icon: ShoppingCart, color: 'text-green-600' },
  pedido_cancelado: { icon: XCircle, color: 'text-destructive' },
  estoque_baixo: { icon: AlertTriangle, color: 'text-yellow-600' },
  pagamento_recebido: { icon: DollarSign, color: 'text-green-600' },
  promocao_expirada: { icon: Clock, color: 'text-muted-foreground' },
};

export const FornecedorNotificacoesTab = ({ 
  notificacoes, 
  onMarcarLida 
}: FornecedorNotificacoesTabProps) => {
  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const getIcon = (tipo: string) => {
    const config = tipoConfig[tipo] || { icon: Bell, color: 'text-muted-foreground' };
    const IconComponent = config.icon;
    return <IconComponent className={`h-5 w-5 ${config.color}`} />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Notificações</CardTitle>
            <CardDescription>
              Fique por dentro das novidades dos seus clientes
            </CardDescription>
          </div>
          {naoLidas > 0 && (
            <Badge variant="destructive">
              {naoLidas} não lida{naoLidas !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notificacoes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificacoes.map(notif => (
              <div
                key={notif.id}
                className={`
                  flex items-start gap-4 p-4 rounded-lg border transition-colors
                  ${notif.lida ? 'bg-background' : 'bg-accent/50 border-accent'}
                `}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notif.tipo)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${notif.lida ? '' : 'text-foreground'}`}>
                      {notif.titulo}
                    </h4>
                    {!notif.lida && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notif.mensagem}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notif.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                </div>

                {!notif.lida && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarcarLida(notif.id)}
                    className="flex-shrink-0"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Marcar lida
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
