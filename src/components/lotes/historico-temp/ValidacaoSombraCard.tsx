import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useValidacaoSombra } from '@/hooks/useValidacaoSombra';

export function ValidacaoSombraCard() {
  const { loading, agregados, divergencias } = useValidacaoSombra(7);
  const [verDetalhes, setVerDetalhes] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Validação Sombra (últimos 7 dias)
          </CardTitle>
          <CardDescription>
            O cérebro climático calcula sempre as duas decisões (com e sem percentis).
            Aqui você vê quanto elas concordam por galpão. Considere “pronto” quando a
            divergência crítica fica abaixo de 5% com pelo menos 50 amostras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!loading && agregados.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sem decisões registradas ainda. O coordenador roda a cada minuto e começa a coletar dados a partir do próximo ciclo.
            </p>
          )}
          {!loading && agregados.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Galpão</TableHead>
                    <TableHead className="text-right">Decisões</TableHead>
                    <TableHead className="text-right">Divergências</TableHead>
                    <TableHead className="text-right">% diverg.</TableHead>
                    <TableHead className="text-right">Maior Δ°C</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agregados.map((a) => (
                    <TableRow key={a.galpao_id}>
                      <TableCell className="font-medium">{a.galpao_nome}</TableCell>
                      <TableCell className="text-right">{a.total}</TableCell>
                      <TableCell className="text-right">{a.divergentes}</TableCell>
                      <TableCell className="text-right">{a.pctDivergencia.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{a.maiorDelta.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {a.prontoAtivar ? (
                          <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Pronto</Badge>
                        ) : a.total < 50 ? (
                          <Badge variant="outline">Coletando</Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Revisar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {divergencias.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setVerDetalhes(true)}>
                Ver últimas {divergencias.length} divergências
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={verDetalhes} onOpenChange={setVerDetalhes}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Divergências recentes (real × sombra)</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Galpão</TableHead>
                <TableHead>Real</TableHead>
                <TableHead>Sombra</TableHead>
                <TableHead className="text-right">Δ°C</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {divergencias.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{new Date(d.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{d.galpao_nome}</TableCell>
                  <TableCell><Badge variant="outline">{d.modo_real}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{d.modo_sombra}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{d.delta_temp_c.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
