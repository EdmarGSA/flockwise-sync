import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Droplets } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DiaTemperatura } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function HistoricoTable({ dados }: Props) {
  return (
    <TooltipProvider>
      <div className="overflow-auto max-h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Dia</TableHead>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Mediana</TableHead>
              <TableHead className="text-xs">P5–P95 °C</TableHead>
              <TableHead className="text-xs">Min/Máx sust.</TableHead>
              <TableHead className="text-xs">Min fora</TableHead>
              <TableHead className="text-xs">
                <Droplets className="w-3 h-3 inline mr-1" />Umid.
              </TableHead>
              <TableHead className="text-xs text-center">Temp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...dados].reverse().map((d) => (
              <TableRow key={d.data}>
                <TableCell className="text-xs font-medium">D{d.dia}</TableCell>
                <TableCell className="text-xs">
                  {format(new Date(d.data + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-xs font-semibold">
                  {d.tempMediana != null ? `${d.tempMediana.toFixed(1)}°` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.tempP5 != null && d.tempP95 != null
                    ? `${d.tempP5.toFixed(1)}–${d.tempP95.toFixed(1)}°`
                    : '—'}
                </TableCell>
                <TableCell className="text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted">
                        <span className="text-primary">{d.tempMin.toFixed(1)}°</span>
                        {' / '}
                        <span className="text-destructive">{d.tempMax.toFixed(1)}°</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium">Picos absolutos do dia</p>
                        <p>Mín: {d.tempMinAbsoluto != null ? `${d.tempMinAbsoluto.toFixed(1)}°` : '—'}</p>
                        <p>Máx: {d.tempMaxAbsoluto != null ? `${d.tempMaxAbsoluto.toFixed(1)}°` : '—'}</p>
                        <p className="text-muted-foreground pt-1">
                          Sensores: {d.sensoresUsados}/{d.sensoresTotal} ({d.zonaAtiva})
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-xs">
                  {d.minutosForaFaixa > 0 ? (
                    <span className={d.minutosForaFaixa > 60 ? 'text-destructive font-medium' : 'text-amber-600'}>
                      {d.minutosForaFaixa} min
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {d.umidadeMediana != null ? `${d.umidadeMediana.toFixed(0)}%` : '—'}
                </TableCell>
                <TableCell className="text-center">
                  {d.dentroFaixa === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : d.dentroFaixa ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-destructive mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
