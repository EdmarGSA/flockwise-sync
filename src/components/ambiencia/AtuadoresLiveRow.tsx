import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fan, Blinds, CloudFog, Flame, Lightbulb } from 'lucide-react';
import {
  selecionarFaixa, calcularEstadoIluminacao, type FaixaIluminacao,
} from '@/lib/utils/calcularEstadoIluminacao';
import type { AmbienciaLoteData } from '@/types/ambienciaLote';

interface Props { data: AmbienciaLoteData; }

export function AtuadoresLiveRow({ data }: Props) {
  const ilumEstado = (() => {
    if (!data.programa?.faixas?.length || !data.idadeDias) return null;
    const faixa = selecionarFaixa(data.programa.faixas as unknown as FaixaIluminacao[], data.idadeDias);
    if (!faixa) return null;
    return calcularEstadoIluminacao(faixa);
  })();

  const aquecCanal = data.canais.find((c) => c.funcao_automacao === 'aquecimento');

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Atuador
        Icon={Fan}
        title="Ventilação"
        value={`Estágio ${data.ventilacao?.estagio_atual ?? '—'}`}
        sub={data.ventilacao?.velocidade_estimada_ms != null ? `${data.ventilacao.velocidade_estimada_ms.toFixed(1)} m/s` : undefined}
      />
      <Atuador
        Icon={Blinds}
        title="Cortina"
        value={`${data.cortina?.posicao_atual_pct ?? '—'}%`}
        sub={data.cortina?.posicao_alvo_pct != null && data.cortina.posicao_alvo_pct !== data.cortina.posicao_atual_pct ? `→ ${data.cortina.posicao_alvo_pct}%` : undefined}
      />
      <Atuador
        Icon={CloudFog}
        title="Nebulização"
        value={data.nebulizacao?.ativo ? (data.nebulizacao?.ultimo_estado === 'on' ? 'ON' : 'OFF') : 'Desativada'}
        sub={data.nebulizacao?.ativo ? `> ${data.nebulizacao.ur_max_pct}% UR` : undefined}
      />
      <Atuador
        Icon={Flame}
        title="Aquecimento"
        value={aquecCanal?.estado_atual?.toUpperCase() ?? '—'}
      />
      <Atuador
        Icon={Lightbulb}
        title="Iluminação"
        value={ilumEstado ? `${ilumEstado.intensidade_pct}%` : '—'}
        sub={ilumEstado?.estado === 'on' ? 'ON' : 'OFF'}
      />
    </div>
  );
}

function Atuador({ Icon, title, value, sub }: { Icon: any; title: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </div>
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <Badge variant="outline" className="mt-1 text-xs">{sub}</Badge>}
    </Card>
  );
}
