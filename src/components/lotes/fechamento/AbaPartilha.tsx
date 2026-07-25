import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import {
  DescontoItem,
  calcularPartilha,
  calcularValoresFinais,
  formatMoeda,
  formatNum,
} from '@/lib/utils/fechamentoRipi';

export interface PartilhaCampos {
  precoKgFrango: string;
  valorRacao: string;
  percentualBasico: string;
  avalConversao: string;
  avalCondenacao: string;
  avalCaloPata: string;
  avalChecklist: string;
}

interface Props {
  campos: PartilhaCampos;
  onChangeCampo: (campo: keyof PartilhaCampos, valor: string) => void;
  descontos: DescontoItem[];
  onChangeDescontos: (descontos: DescontoItem[]) => void;
  pesoTotalKg: number;
  avesAbatidas: number;
}

export function AbaPartilha({ campos, onChangeCampo, descontos, onChangeDescontos, pesoTotalKg, avesAbatidas }: Props) {
  const partilha = calcularPartilha({
    pesoTotalKg,
    avesAbatidas,
    precoKgFrango: Number(campos.precoKgFrango) || 0,
    percentualBasico: Number(campos.percentualBasico) || 0,
    avalConversao: Number(campos.avalConversao) || 0,
    avalCondenacao: Number(campos.avalCondenacao) || 0,
    avalCaloPata: Number(campos.avalCaloPata) || 0,
    avalChecklist: Number(campos.avalChecklist) || 0,
  });

  const valores = calcularValoresFinais(partilha.resultadoBruto.valor, descontos);

  const atualizarDesconto = (index: number, campo: keyof DescontoItem, valor: string) => {
    onChangeDescontos(
      descontos.map((d, i) =>
        i === index ? { ...d, [campo]: campo === 'descricao' ? valor : Number(valor) || 0 } : d,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cálculo da partilha do integrado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Preço do kg do frango (R$)</Label>
              <Input type="number" step="0.0001" value={campos.precoKgFrango} onChange={(e) => onChangeCampo('precoKgFrango', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor das rações</Label>
              <Input type="number" step="0.0001" value={campos.valorRacao} onChange={(e) => onChangeCampo('valorRacao', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>% Básico de partilha</Label>
              <Input type="number" step="0.0001" value={campos.percentualBasico} onChange={(e) => onChangeCampo('percentualBasico', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avaliação conversão (%)</Label>
              <Input type="number" step="0.0001" value={campos.avalConversao} onChange={(e) => onChangeCampo('avalConversao', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avaliação condenação (%)</Label>
              <Input type="number" step="0.0001" value={campos.avalCondenacao} onChange={(e) => onChangeCampo('avalCondenacao', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avaliação calo de patas (%)</Label>
              <Input type="number" step="0.0001" value={campos.avalCaloPata} onChange={(e) => onChangeCampo('avalCaloPata', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avaliação check-list (%)</Label>
              <Input type="number" step="0.0001" value={campos.avalChecklist} onChange={(e) => onChangeCampo('avalChecklist', e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right">%</th>
                  <th className="text-right">Kg</th>
                  <th className="text-right">R$</th>
                  <th className="text-right">R$/Cab</th>
                </tr>
              </thead>
              <tbody>
                {partilha.linhas.map((l) => (
                  <tr key={l.label} className="border-b last:border-0">
                    <td className="py-2">{l.label}</td>
                    <td className="text-right">{formatNum(l.percentual, 3)}</td>
                    <td className="text-right">{formatNum(l.kg)}</td>
                    <td className="text-right">{formatMoeda(l.valor)}</td>
                    <td className="text-right">{formatNum(l.porCabeca, 4)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-muted/50">
                  <td className="py-2">Resultado bruto do lote</td>
                  <td className="text-right">{formatNum(partilha.resultadoBruto.percentual, 3)}</td>
                  <td className="text-right">{formatNum(partilha.resultadoBruto.kg)}</td>
                  <td className="text-right">{formatMoeda(partilha.resultadoBruto.valor)}</td>
                  <td className="text-right">{formatNum(partilha.resultadoBruto.porCabeca, 4)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Valores (débitos e créditos)</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => onChangeDescontos([...descontos, { descricao: '', debito: 0, credito: 0 }])}
          >
            <Plus className="w-4 h-4" /> Lançamento
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {descontos.map((d, index) => (
            <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end border rounded-lg p-3">
              <div className="md:col-span-6 space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input value={d.descricao} onChange={(e) => atualizarDesconto(index, 'descricao', e.target.value)} maxLength={120} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Débito</Label>
                <Input type="number" step="0.01" value={d.debito || ''} onChange={(e) => atualizarDesconto(index, 'debito', e.target.value)} />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs">Crédito</Label>
                <Input type="number" step="0.01" value={d.credito || ''} onChange={(e) => atualizarDesconto(index, 'credito', e.target.value)} />
              </div>
              <div className="md:col-span-1">
                <Button size="icon" variant="ghost" onClick={() => onChangeDescontos(descontos.filter((_, i) => i !== index))} aria-label="Remover lançamento">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Subtotal D/C</p>
              <p className="text-lg font-bold">{formatMoeda(valores.subtotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Valor renda bruta</p>
              <p className="text-lg font-bold">{formatMoeda(valores.rendaBruta)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground">Total a depositar</p>
              <p className="text-lg font-bold text-primary">{formatMoeda(valores.totalDepositar)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Registro apenas informativo — nenhum lançamento é criado no módulo financeiro.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
