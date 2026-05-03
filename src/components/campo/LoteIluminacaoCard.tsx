import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Hand, ExternalLink, Loader2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { OverridesIluminacaoDialog } from '@/components/iot/OverridesIluminacaoDialog';
import { EstimuloPosturaDialog } from '@/components/iot/EstimuloPosturaDialog';

interface Bloco { acender: string; apagar: string; intensidade_pct?: number }
interface Faixa {
  dia_inicio: number; dia_fim: number; horas_luz: number;
  blocos: Bloco[] | null; intensidade_pct: number;
}

interface Props {
  loteId: string;
  galpaoId: string | null;
  diasAlojados: number;
  programaIluminacaoId: string | null;
  tipoProducao?: 'frango_corte' | 'postura' | string | null;
}

export function LoteIluminacaoCard({ galpaoId, diasAlojados, programaIluminacaoId, tipoProducao }: Props) {
  const { integradoId } = useIntegradoId();
  const [loading, setLoading] = useState(true);
  const [programaNome, setProgramaNome] = useState<string | null>(null);
  const [faixaAtual, setFaixaAtual] = useState<Faixa | null>(null);
  const [dispositivoId, setDispositivoId] = useState<string | null>(null);
  const [overridesAtivos, setOverridesAtivos] = useState<number>(0);
  const [overrideOpen, setOverrideOpen] = useState(false);

  useEffect(() => {
    if (!integradoId) return;
    (async () => {
      setLoading(true);

      // Programa: vinculado ao lote OU default da org pelo tipo
      let programaId = programaIluminacaoId;
      if (!programaId) {
        const { data: defaults } = await supabase
          .from('programa_iluminacao_lote')
          .select('id, nome, tipo_producao')
          .eq('integrado_id', integradoId)
          .eq('is_default', true)
          .eq('ativo', true);
        const def = defaults?.find((d) => d.tipo_producao === (tipoProducao ?? 'frango_corte')) ?? defaults?.[0];
        programaId = def?.id ?? null;
        setProgramaNome(def?.nome ?? null);
      } else {
        const { data: p } = await supabase
          .from('programa_iluminacao_lote')
          .select('nome').eq('id', programaId).maybeSingle();
        setProgramaNome(p?.nome ?? null);
      }

      if (programaId) {
        const { data: faixas } = await supabase
          .from('programa_iluminacao_faixa')
          .select('*')
          .eq('programa_id', programaId)
          .lte('dia_inicio', diasAlojados)
          .gte('dia_fim', diasAlojados)
          .limit(1);
        setFaixaAtual((faixas?.[0] as unknown as Faixa) ?? null);
      } else {
        setFaixaAtual(null);
      }

      // Dispositivo IoT do galpão (1º ativo) e overrides ativos nos canais de iluminação
      if (galpaoId) {
        const { data: devs } = await supabase
          .from('dispositivos_iot')
          .select('id')
          .eq('galpao_id', galpaoId)
          .eq('ativo', true)
          .limit(1);
        const devId = devs?.[0]?.id ?? null;
        setDispositivoId(devId);

        if (devId) {
          const { data: canais } = await supabase
            .from('canais_dispositivo')
            .select('id')
            .eq('dispositivo_id', devId)
            .eq('tipo_equipamento', 'iluminacao')
            .eq('ativo', true);
          const ids = (canais ?? []).map((c) => c.id);
          if (ids.length) {
            const { count } = await supabase
              .from('override_iluminacao_canal')
              .select('id', { count: 'exact', head: true })
              .in('canal_id', ids)
              .gt('ate_quando', new Date().toISOString());
            setOverridesAtivos(count ?? 0);
          } else {
            setOverridesAtivos(0);
          }
        }
      }
      setLoading(false);
    })();
  }, [integradoId, galpaoId, diasAlojados, programaIluminacaoId, tipoProducao]);

  const blocos = (faixaAtual?.blocos ?? []) as Bloco[];

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Iluminação
            </span>
            <div className="flex items-center gap-2">
              {overridesAtivos > 0 && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  {overridesAtivos} override{overridesAtivos > 1 ? 's' : ''} ativo{overridesAtivos > 1 ? 's' : ''}
                </Badge>
              )}
              <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                <Link to="/iluminacao"><ExternalLink className="w-3.5 h-3.5 mr-1" />Programa</Link>
              </Button>
              {dispositivoId && (
                <Button size="sm" variant="outline" className="h-7 px-2"
                  onClick={() => setOverrideOpen(true)}>
                  <Hand className="w-3.5 h-3.5 mr-1" />Forçar
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : !faixaAtual ? (
            <p className="text-sm text-muted-foreground">
              {programaNome ? 'Nenhuma faixa configurada para este dia.' : 'Sem programa de iluminação vinculado.'}
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Programa</span>
                <span className="font-medium">{programaNome ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Faixa</span>
                <span className="font-medium">
                  Dias {faixaAtual.dia_inicio}-{faixaAtual.dia_fim} · {faixaAtual.horas_luz}h luz
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Intensidade</span>
                <span className="font-medium">{faixaAtual.intensidade_pct}%</span>
              </div>
              {blocos.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {blocos.map((b, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {b.acender}–{b.apagar}{b.intensidade_pct != null ? ` · ${b.intensidade_pct}%` : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {dispositivoId && (
        <OverridesIluminacaoDialog
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          dispositivoId={dispositivoId}
        />
      )}
    </>
  );
}
