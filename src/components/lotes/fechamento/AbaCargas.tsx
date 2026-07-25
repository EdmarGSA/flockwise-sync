import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Truck } from 'lucide-react';
import { CargaAbate, pesoMedioCarga, totalizarCargas, formatNum } from '@/lib/utils/fechamentoRipi';

interface Props {
  cargas: CargaAbate[];
  onChange: (cargas: CargaAbate[]) => void;
  dataAbatePadrao: string;
}

export function AbaCargas({ cargas, onChange, dataAbatePadrao }: Props) {
  const totais = totalizarCargas(cargas);

  const atualizar = (index: number, campo: keyof CargaAbate, valor: string) => {
    const novas = cargas.map((c, i) =>
      i === index
        ? {
            ...c,
            [campo]:
              campo === 'quantidade' || campo === 'peso_total_kg' ? Number(valor) || 0 : valor,
          }
        : c,
    );
    onChange(novas);
  };

  const adicionar = () =>
    onChange([
      ...cargas,
      { abatedouro: cargas[0]?.abatedouro ?? '', data_abate: dataAbatePadrao, quantidade: 0, peso_total_kg: 0, nota_produtor: '' },
    ]);

  const remover = (index: number) => onChange(cargas.filter((_, i) => i !== index));

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Cargas retiradas para abate
        </CardTitle>
        <Button size="sm" variant="outline" onClick={adicionar} className="gap-1">
          <Plus className="w-4 h-4" /> Carga
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {cargas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma carga informada. Adicione as cargas do RIPI para somar automaticamente as aves e o peso abatido.
          </p>
        )}

        <div className="space-y-3">
          {cargas.map((carga, index) => (
            <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end border rounded-lg p-3">
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs">Abatedouro</Label>
                <Input value={carga.abatedouro} onChange={(e) => atualizar(index, 'abatedouro', e.target.value)} maxLength={120} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={carga.data_abate} onChange={(e) => atualizar(index, 'data_abate', e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Qtde abatida</Label>
                <Input type="number" min={0} value={carga.quantidade || ''} onChange={(e) => atualizar(index, 'quantidade', e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Peso total (kg)</Label>
                <Input type="number" step="0.01" min={0} value={carga.peso_total_kg || ''} onChange={(e) => atualizar(index, 'peso_total_kg', e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Nota produtor</Label>
                <Input value={carga.nota_produtor} onChange={(e) => atualizar(index, 'nota_produtor', e.target.value)} maxLength={40} />
              </div>
              <div className="md:col-span-1 flex items-center gap-2 justify-between">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatNum(pesoMedioCarga(carga), 3)} kg</span>
                <Button size="icon" variant="ghost" onClick={() => remover(index)} aria-label="Remover carga">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {cargas.length > 0 && (
          <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total abatido</p>
              <p className="font-bold">{totais.quantidade.toLocaleString('pt-BR')} aves</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peso recebido</p>
              <p className="font-bold">{formatNum(totais.pesoTotal)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peso médio</p>
              <p className="font-bold">{formatNum(totais.pesoMedio, 3)} kg</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
