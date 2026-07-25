import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getLinhagemLabel, getSexoLabel } from '@/lib/utils/labels';

export interface AbateCampos {
  dataAbate: string;
  horaMediaAbate: string;
  avesAbatidas: string;
  pesoTotalAbatido: string;
  consumoTotalRacao: string;
  tipoProduto: string;
  abatedouro: string;
  loteIntegradora: string;
  tecnicoResponsavel: string;
  conversaoPrevista: string;
  mortalidadePrevista: string;
}

interface Props {
  campos: AbateCampos;
  onChangeCampo: (campo: keyof AbateCampos, valor: string) => void;
  quantidadeAlojada: number;
  pesoInicialPintinhos: number | null;
  dataAlojamento: string;
  linhagem: string;
  sexo: string;
  cargasInformadas: boolean;
}

export function AbaAbate({
  campos,
  onChangeCampo,
  quantidadeAlojada,
  pesoInicialPintinhos,
  dataAlojamento,
  linhagem,
  sexo,
  cargasInformadas,
}: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            Dados de alojamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Aves alojadas</p>
              <p className="font-medium">{quantidadeAlojada.toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso inicial</p>
              <p className="font-medium">{((pesoInicialPintinhos || 0.042) * 1000).toFixed(0)} g</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data alojamento</p>
              <p className="font-medium">
                {dataAlojamento && !isNaN(parseISO(dataAlojamento).getTime())
                  ? format(parseISO(dataAlojamento), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Linhagem / sexo</p>
              <p className="font-medium">{getLinhagemLabel(linhagem)} / {getSexoLabel(sexo)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Dados de abate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data média de abate</Label>
              <Input type="date" value={campos.dataAbate} onChange={(e) => onChangeCampo('dataAbate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora média de abate</Label>
              <Input type="time" value={campos.horaMediaAbate} onChange={(e) => onChangeCampo('horaMediaAbate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Aves abatidas</Label>
              <Input
                type="number"
                min={0}
                value={campos.avesAbatidas}
                disabled={cargasInformadas}
                onChange={(e) => onChangeCampo('avesAbatidas', e.target.value)}
              />
              {cargasInformadas && <p className="text-[11px] text-muted-foreground">Somado das cargas</p>}
            </div>
            <div className="space-y-2">
              <Label>Peso recebido (kg)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={campos.pesoTotalAbatido}
                disabled={cargasInformadas}
                onChange={(e) => onChangeCampo('pesoTotalAbatido', e.target.value)}
              />
              {cargasInformadas && <p className="text-[11px] text-muted-foreground">Somado das cargas</p>}
            </div>
            <div className="space-y-2">
              <Label>Ração consumida (kg)</Label>
              <Input type="number" step="0.01" min={0} value={campos.consumoTotalRacao} onChange={(e) => onChangeCampo('consumoTotalRacao', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de produto</Label>
              <Input value={campos.tipoProduto} maxLength={60} placeholder="Pesado, médio…" onChange={(e) => onChangeCampo('tipoProduto', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Abatedouro</Label>
              <Input value={campos.abatedouro} maxLength={120} onChange={(e) => onChangeCampo('abatedouro', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Lote na integradora</Label>
              <Input value={campos.loteIntegradora} maxLength={40} onChange={(e) => onChangeCampo('loteIntegradora', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Técnico responsável</Label>
              <Input value={campos.tecnicoResponsavel} maxLength={120} onChange={(e) => onChangeCampo('tecnicoResponsavel', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Conversão prevista</Label>
              <Input type="number" step="0.0001" value={campos.conversaoPrevista} onChange={(e) => onChangeCampo('conversaoPrevista', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mortalidade prevista (%)</Label>
              <Input type="number" step="0.01" value={campos.mortalidadePrevista} onChange={(e) => onChangeCampo('mortalidadePrevista', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
