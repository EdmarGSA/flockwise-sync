import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import {
  CATALOGO_SIF,
  CondenacaoItem,
  formatNum,
  percentualCondenacao,
} from '@/lib/utils/fechamentoRipi';

interface Props {
  avesAbatidas: number;
  condenadasTotal: string;
  condenadasParcial: string;
  caloPataQtd: string;
  patasCondenadas: string;
  pcCondenacaoPrevisto: string;
  pcCaloPataPrevisto: string;
  onChangeCampo: (campo: string, valor: string) => void;
  itens: CondenacaoItem[];
  onChangeItens: (itens: CondenacaoItem[]) => void;
}

export function AbaCondenacoes({
  avesAbatidas,
  condenadasTotal,
  condenadasParcial,
  caloPataQtd,
  patasCondenadas,
  pcCondenacaoPrevisto,
  pcCaloPataPrevisto,
  onChangeCampo,
  itens,
  onChangeItens,
}: Props) {
  const totalFT = itens.filter((i) => i.tipo === 'FT').reduce((a, i) => a + (Number(i.quantidade) || 0), 0);
  const totalFP = itens.filter((i) => i.tipo === 'FP').reduce((a, i) => a + (Number(i.quantidade) || 0), 0);

  const pcCondenacaoReal = percentualCondenacao(
    (Number(condenadasTotal) || 0) + (Number(condenadasParcial) || 0),
    avesAbatidas,
  );
  const pcCaloReal = percentualCondenacao(Number(caloPataQtd) || 0, avesAbatidas);

  const atualizar = (index: number, campo: keyof CondenacaoItem, valor: string) => {
    onChangeItens(
      itens.map((it, i) =>
        i === index ? { ...it, [campo]: campo === 'quantidade' ? Number(valor) || 0 : valor } : it,
      ),
    );
  };

  const adicionar = () => onChangeItens([...itens, { tipo: 'FT', codigo: '', descricao: '', quantidade: 0 }]);
  const remover = (index: number) => onChangeItens(itens.filter((_, i) => i !== index));

  const aplicarCatalogo = (index: number, chave: string) => {
    const ref = CATALOGO_SIF.find((c) => `${c.tipo}-${c.codigo}` === chave);
    if (!ref) return;
    onChangeItens(
      itens.map((it, i) => (i === index ? { ...it, tipo: ref.tipo, codigo: ref.codigo, descricao: ref.descricao } : it)),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Resumo de condenações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Condenadas total (FT)</Label>
              <Input type="number" min={0} value={condenadasTotal} onChange={(e) => onChangeCampo('condenadasTotal', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Condenadas parcial (FP)</Label>
              <Input type="number" min={0} value={condenadasParcial} onChange={(e) => onChangeCampo('condenadasParcial', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Calo de pata (aves)</Label>
              <Input type="number" min={0} value={caloPataQtd} onChange={(e) => onChangeCampo('caloPataQtd', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Patas condenadas</Label>
              <Input type="number" min={0} value={patasCondenadas} onChange={(e) => onChangeCampo('patasCondenadas', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>% Condenação prevista</Label>
              <Input type="number" step="0.0001" value={pcCondenacaoPrevisto} onChange={(e) => onChangeCampo('pcCondenacaoPrevisto', e.target.value)} />
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">% Condenação real</p>
              <p className="text-lg font-bold">{formatNum(pcCondenacaoReal, 4)}</p>
            </div>
            <div className="space-y-2">
              <Label>% Calo de pata previsto</Label>
              <Input type="number" step="0.0001" value={pcCaloPataPrevisto} onChange={(e) => onChangeCampo('pcCaloPataPrevisto', e.target.value)} />
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">% Calo de pata real</p>
              <p className="text-lg font-bold">{formatNum(pcCaloReal, 4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Causas de condenação (SIF)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={adicionar} className="gap-1">
            <Plus className="w-4 h-4" /> Causa
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">Informe as causas do bloco "Condenações do SIF" do RIPI.</p>
          )}

          {itens.map((item, index) => (
            <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end border rounded-lg p-3">
              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs">Causa</Label>
                <Select value={item.codigo ? `${item.tipo}-${item.codigo}` : undefined} onValueChange={(v) => aplicarCatalogo(index, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar do catálogo" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {CATALOGO_SIF.map((c) => (
                      <SelectItem key={`${c.tipo}-${c.codigo}`} value={`${c.tipo}-${c.codigo}`}>
                        {c.tipo} {c.codigo} — {c.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={item.tipo} onValueChange={(v) => atualizar(index, 'tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="FT">FT (total)</SelectItem>
                    <SelectItem value="FP">FP (parcial)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input value={item.descricao} onChange={(e) => atualizar(index, 'descricao', e.target.value)} maxLength={120} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Qtde</Label>
                <Input type="number" min={0} value={item.quantidade || ''} onChange={(e) => atualizar(index, 'quantidade', e.target.value)} />
              </div>
              <div className="md:col-span-1 flex items-center justify-between gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {formatNum(percentualCondenacao(Number(item.quantidade) || 0, avesAbatidas), 3)}%
                </Badge>
                <Button size="icon" variant="ghost" onClick={() => remover(index)} aria-label="Remover causa">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {itens.length > 0 && (
            <div className="flex gap-6 text-sm rounded-lg bg-muted/50 p-3">
              <span>Total FT: <strong>{totalFT.toLocaleString('pt-BR')}</strong></span>
              <span>Total FP: <strong>{totalFP.toLocaleString('pt-BR')}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
