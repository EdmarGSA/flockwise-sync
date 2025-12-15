import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInHours, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Truck, Clock, CheckCircle, AlertTriangle, ShoppingCart, Building, Scissors } from 'lucide-react';

interface SaidaLoteInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataPrevistaSaida: string | null;
  horarioInicioJejum: string | null;
  saidaVendaLocal: number;
  saidaVendaExterna: number;
  saidaAbate: number;
  jejumConfirmado: boolean;
  jejumConfirmadoEm: string | null;
}

export function SaidaLoteInfoDialog({
  open,
  onOpenChange,
  dataPrevistaSaida,
  horarioInicioJejum,
  saidaVendaLocal,
  saidaVendaExterna,
  saidaAbate,
  jejumConfirmado,
  jejumConfirmadoEm,
}: SaidaLoteInfoDialogProps) {
  const now = new Date();
  const dataSaida = dataPrevistaSaida ? parseISO(dataPrevistaSaida) : null;
  const horarioJejum = horarioInicioJejum ? parseISO(horarioInicioJejum) : null;
  
  const horasParaSaida = dataSaida ? differenceInHours(dataSaida, now) : null;
  const jejumAtrasado = horarioJejum && isBefore(horarioJejum, now) && !jejumConfirmado;
  
  const totalSaida = saidaVendaLocal + saidaVendaExterna + saidaAbate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            Informações de Saída
          </DialogTitle>
          <DialogDescription>
            Detalhes da saída programada para este lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Previsão de Saída */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Previsão Saída:</span>
            </div>
            {dataSaida ? (
              <div className="text-right">
                <div className="text-sm font-medium">
                  {format(dataSaida, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                {horasParaSaida !== null && horasParaSaida > 0 && (
                  <div className="text-xs text-muted-foreground">
                    em {horasParaSaida}h
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="secondary">Não definida</Badge>
            )}
          </div>

          {/* Horário Jejum */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Início Jejum:</span>
            </div>
            {horarioJejum ? (
              <div className="text-right">
                <div className="text-sm font-medium">
                  {format(horarioJejum, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                {jejumConfirmado ? (
                  <Badge variant="default" className="bg-green-500 mt-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Confirmado
                  </Badge>
                ) : jejumAtrasado ? (
                  <Badge variant="destructive" className="mt-1">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Atrasado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-1">Pendente</Badge>
                )}
              </div>
            ) : (
              <Badge variant="secondary">Não definido</Badge>
            )}
          </div>

          {/* Destinos */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Destino das Aves</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingCart className="w-4 h-4" />
                  Venda Local
                </div>
                <span className="font-medium">{saidaVendaLocal.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" />
                  Venda Externa
                </div>
                <span className="font-medium">{saidaVendaExterna.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Scissors className="w-4 h-4" />
                  Abate
                </div>
                <span className="font-medium">{saidaAbate.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Total</span>
                <span className="font-bold text-lg">{totalSaida.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Confirmação do Jejum */}
          {jejumConfirmado && jejumConfirmadoEm && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Jejum confirmado</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                em {format(parseISO(jejumConfirmadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
