import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isBefore, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, AlertTriangle, Truck } from 'lucide-react';

interface ConfirmarJejumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  horarioInicioJejum: string | null;
  dataPrevistaSaida: string | null;
  jejumConfirmado: boolean;
  jejumConfirmadoEm: string | null;
  onSuccess?: () => void;
}

export function ConfirmarJejumDialog({
  open,
  onOpenChange,
  loteId,
  horarioInicioJejum,
  dataPrevistaSaida,
  jejumConfirmado,
  jejumConfirmadoEm,
  onSuccess,
}: ConfirmarJejumDialogProps) {
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const horarioJejum = horarioInicioJejum ? parseISO(horarioInicioJejum) : null;
  const dataSaida = dataPrevistaSaida ? parseISO(dataPrevistaSaida) : null;
  
  const podeConfirmarJejum = horarioJejum && isBefore(horarioJejum, now);
  const horasParaJejum = horarioJejum ? differenceInHours(horarioJejum, now) : null;
  const horasParaSaida = dataSaida ? differenceInHours(dataSaida, now) : null;

  const handleConfirmarJejum = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('lotes')
        .update({
          jejum_confirmado: true,
          jejum_confirmado_por: userData.user?.id,
          jejum_confirmado_em: new Date().toISOString(),
        })
        .eq('id', loteId);

      if (error) throw error;

      toast.success('Início do jejum confirmado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao confirmar jejum:', error);
      toast.error('Erro ao confirmar jejum');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Confirmação de Jejum
          </DialogTitle>
          <DialogDescription>
            Confirme o início do período de jejum para este lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {jejumConfirmado ? (
            <Alert className="bg-green-500/10 border-green-500/50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                Jejum confirmado em{' '}
                {jejumConfirmadoEm
                  ? format(parseISO(jejumConfirmadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '-'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Horário Programado:</span>
                  </div>
                  {horarioJejum ? (
                    <Badge variant="outline">
                      {format(horarioJejum, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Não definido</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Saída Prevista:</span>
                  </div>
                  {dataSaida ? (
                    <Badge variant="outline">
                      {format(dataSaida, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Não definida</Badge>
                  )}
                </div>

                {horasParaJejum !== null && horasParaJejum > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Faltam {horasParaJejum} hora(s) para o horário programado de jejum.
                    </AlertDescription>
                  </Alert>
                )}

                {!horarioJejum && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum horário de jejum foi definido. Configure na edição do lote.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {!jejumConfirmado && podeConfirmarJejum && (
            <Button onClick={handleConfirmarJejum} disabled={loading} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Confirmando...' : 'Confirmar Jejum'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
