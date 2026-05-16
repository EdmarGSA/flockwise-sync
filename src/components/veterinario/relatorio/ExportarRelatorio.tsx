import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileDown, Printer } from 'lucide-react';
import type { RelatorioDiario } from '@/hooks/useRelatorioDiarioLote';

interface Props {
  data: RelatorioDiario;
}

export default function ExportarRelatorio({ data }: Props) {
  const exportarCSV = () => {
    const header = [
      'Data','Idade','Semana','Temp min','Temp max','Temp med','Umid min','Umid max',
      'Faixa ideal min','Faixa ideal max','Horas luz','Acender','Apagar',
      'Mort natural','Mort eliminada','Mort total','Mort % dia','Mort % acum',
      'Peso médio kg','CV %','Padrão peso kg','Delta peso %'
    ];
    const linhas = data.dias.map(d => [
      d.data, d.idade_dias, d.semana, d.temp_min ?? '', d.temp_max ?? '', d.temp_med?.toFixed(2) ?? '',
      d.umid_min ?? '', d.umid_max ?? '', d.faixa_temp_min, d.faixa_temp_max,
      d.horas_luz ?? '', d.acender ?? '', d.apagar ?? '',
      d.mortalidade_natural, d.mortalidade_eliminada, d.mortalidade_total,
      d.mortalidade_pct_dia.toFixed(3), d.mortalidade_pct_acum.toFixed(3),
      d.peso_medio_kg?.toFixed(3) ?? '', d.cv_pct?.toFixed(2) ?? '',
      d.padrao_peso_kg?.toFixed(3) ?? '', d.delta_peso_pct?.toFixed(2) ?? ''
    ]);
    const csv = [header, ...linhas].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-lote-${data.lote.id.slice(0, 8)}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">Exportar relatório</h3>
        <p className="text-sm text-muted-foreground">
          Baixe os dados em CSV ou imprima/salve a página em PDF.
        </p>
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline"><FileDown className="w-4 h-4 mr-2" /> CSV</Button>
          <Button onClick={() => window.print()} variant="outline"><Printer className="w-4 h-4 mr-2" /> Imprimir / PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}
