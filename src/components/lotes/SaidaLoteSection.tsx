import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, AlertTriangle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SaidaLoteSectionProps {
  quantidadeAvesLote: number;
  dataPrevistaSaida: string | null;
  horarioInicioJejum: string | null;
  saidaVendaLocal: number;
  saidaVendaExterna: number;
  saidaAbate: number;
  onDataPrevistaSaidaChange: (value: string | null) => void;
  onHorarioInicioJejumChange: (value: string | null) => void;
  onSaidaVendaLocalChange: (value: number) => void;
  onSaidaVendaExternaChange: (value: number) => void;
  onSaidaAbateChange: (value: number) => void;
  disabled?: boolean;
}

export function SaidaLoteSection({
  quantidadeAvesLote,
  dataPrevistaSaida,
  horarioInicioJejum,
  saidaVendaLocal,
  saidaVendaExterna,
  saidaAbate,
  onDataPrevistaSaidaChange,
  onHorarioInicioJejumChange,
  onSaidaVendaLocalChange,
  onSaidaVendaExternaChange,
  onSaidaAbateChange,
  disabled = false,
}: SaidaLoteSectionProps) {
  const totalDestino = saidaVendaLocal + saidaVendaExterna + saidaAbate;
  const excedeuQuantidade = totalDestino > quantidadeAvesLote;

  const formatDateTimeForInput = (dateStr: string | null): string => {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch {
      return '';
    }
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
          <Truck className="w-5 h-5" />
          Saída de Lote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_prevista_saida" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Previsão de Saída
            </Label>
            <Input
              id="data_prevista_saida"
              type="datetime-local"
              value={formatDateTimeForInput(dataPrevistaSaida)}
              onChange={(e) => onDataPrevistaSaidaChange(e.target.value || null)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horario_inicio_jejum" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Início do Jejum
            </Label>
            <Input
              id="horario_inicio_jejum"
              type="datetime-local"
              value={formatDateTimeForInput(horarioInicioJejum)}
              onChange={(e) => onHorarioInicioJejumChange(e.target.value || null)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <Label className="text-sm font-medium mb-3 block">Destino das Aves</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saida_venda_local" className="text-sm text-muted-foreground">
                Venda Local
              </Label>
              <Input
                id="saida_venda_local"
                type="number"
                min="0"
                value={saidaVendaLocal || ''}
                onChange={(e) => onSaidaVendaLocalChange(parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saida_venda_externa" className="text-sm text-muted-foreground">
                Venda Externa
              </Label>
              <Input
                id="saida_venda_externa"
                type="number"
                min="0"
                value={saidaVendaExterna || ''}
                onChange={(e) => onSaidaVendaExternaChange(parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saida_abate" className="text-sm text-muted-foreground">
                Abate
              </Label>
              <Input
                id="saida_abate"
                type="number"
                min="0"
                value={saidaAbate || ''}
                onChange={(e) => onSaidaAbateChange(parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Total:</span>
          <span className={`text-lg font-bold ${excedeuQuantidade ? 'text-destructive' : 'text-foreground'}`}>
            {totalDestino.toLocaleString('pt-BR')} / {quantidadeAvesLote.toLocaleString('pt-BR')} aves
          </span>
        </div>

        {excedeuQuantidade && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O total de saídas excede a quantidade de aves do lote.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
