import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, GitCompareArrows } from 'lucide-react';
import { Divergencia, formatNum } from '@/lib/utils/fechamentoRipi';

interface Props {
  divergencias: Divergencia[];
  loading?: boolean;
}

const TONE: Record<string, string> = {
  ok: 'text-primary',
  atencao: 'text-amber-500',
  critico: 'text-destructive',
};

export function PainelDivergencias({ divergencias, loading }: Props) {
  const criticas = divergencias.filter((d) => d.severidade !== 'ok');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4" />
          Sistema x Frigorífico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando dados internos do lote…</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Indicador</th>
                    <th className="text-right">Sistema</th>
                    <th className="text-right">Frigorífico</th>
                    <th className="text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {divergencias.map((d) => (
                    <tr key={d.indicador} className="border-b last:border-0">
                      <td className="py-2">{d.indicador} <span className="text-xs text-muted-foreground">({d.unidade})</span></td>
                      <td className="text-right">{d.sistema === null ? '—' : formatNum(d.sistema, d.unidade === 'aves' ? 0 : 2)}</td>
                      <td className="text-right">{d.oficial === null ? '—' : formatNum(d.oficial, d.unidade === 'aves' ? 0 : 2)}</td>
                      <td className={`text-right font-medium ${TONE[d.severidade]}`}>
                        {d.diferenca === null ? '—' : (
                          <>
                            {d.diferenca > 0 ? '+' : ''}
                            {formatNum(d.diferenca, d.unidade === 'aves' ? 0 : 2)}
                            {d.diferencaPercentual !== null && (
                              <span className="text-xs font-normal"> ({d.diferencaPercentual > 0 ? '+' : ''}{formatNum(d.diferencaPercentual, 1)}%)</span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {criticas.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4" />
                Dados internos conferem com o resultado oficial.
              </div>
            ) : (
              <div className="space-y-2">
                {criticas.map((d) => (
                  <div key={d.indicador} className="flex items-start gap-2 text-sm rounded-lg border p-3">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${TONE[d.severidade]}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.indicador}</span>
                        <Badge variant={d.severidade === 'critico' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {d.severidade === 'critico' ? 'Divergência crítica' : 'Atenção'}
                        </Badge>
                      </div>
                      {d.observacao && <p className="text-xs text-muted-foreground mt-0.5">{d.observacao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
