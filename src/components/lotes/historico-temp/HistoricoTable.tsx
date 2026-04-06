import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Droplets } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DiaTemperatura } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function HistoricoTable({ dados }: Props) {
  return (
    <div className="overflow-auto max-h-80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Dia</TableHead>
            <TableHead className="text-xs">Data</TableHead>
            <TableHead className="text-xs">Mín °C</TableHead>
            <TableHead className="text-xs">Máx °C</TableHead>
            <TableHead className="text-xs">Desvio</TableHead>
            <TableHead className="text-xs">
              <Droplets className="w-3 h-3 inline mr-1" />Mín %
            </TableHead>
            <TableHead className="text-xs">
              <Droplets className="w-3 h-3 inline mr-1" />Máx %
            </TableHead>
            <TableHead className="text-xs text-center">Temp</TableHead>
            <TableHead className="text-xs text-center">Umid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...dados].reverse().map((d) => (
            <TableRow key={d.data}>
              <TableCell className="text-xs font-medium">D{d.dia}</TableCell>
              <TableCell className="text-xs">
                {format(new Date(d.data + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
              </TableCell>
              <TableCell className="text-xs font-semibold text-primary">
                {d.tempMin.toFixed(1)}°
              </TableCell>
              <TableCell className="text-xs font-semibold text-destructive">
                {d.tempMax.toFixed(1)}°
              </TableCell>
              <TableCell className="text-xs">
                {d.desvioTemp != null && d.desvioTemp > 0 ? (
                  <span className="text-destructive font-medium">+{d.desvioTemp.toFixed(1)}°</span>
                ) : d.desvioTemp === 0 ? (
                  <span className="text-muted-foreground">0</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {d.umidadeMin != null ? `${d.umidadeMin.toFixed(0)}%` : '—'}
              </TableCell>
              <TableCell className="text-xs">
                {d.umidadeMax != null ? `${d.umidadeMax.toFixed(0)}%` : '—'}
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
              <TableCell className="text-center">
                {d.umidadeDentroFaixa === null ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : d.umidadeDentroFaixa ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
