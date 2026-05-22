import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { useConfigZonas } from '@/hooks/useConfigZonas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface GalpaoOverride {
  id: string;
  nome: string;
  nucleo_nome: string;
  usar_percentis_automacao: boolean | null;
}

type Modo = 'herdar' | 'on' | 'off';

const modoFromValue = (v: boolean | null): Modo => (v === null ? 'herdar' : v ? 'on' : 'off');
const valueFromModo = (m: Modo): boolean | null => (m === 'herdar' ? null : m === 'on');

export function OverridePercentisGalpaoCard() {
  const { integradoId } = useIntegradoId();
  const { configOrg } = useConfigZonas();
  const [galpoes, setGalpoes] = useState<GalpaoOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const carregar = async () => {
    if (!integradoId) return;
    setLoading(true);
    const { data: nucleos } = await supabase
      .from('nucleos').select('id, nome').eq('integrado_id', integradoId);
    const nucleoIds = (nucleos ?? []).map((n: any) => n.id);
    if (nucleoIds.length === 0) { setGalpoes([]); setLoading(false); return; }
    const { data } = await supabase
      .from('galpoes')
      .select('id, nome, nucleo_id, usar_percentis_automacao, ativo')
      .in('nucleo_id', nucleoIds)
      .eq('ativo', true)
      .order('nome');
    const nomeNucleo = new Map((nucleos ?? []).map((n: any) => [n.id, n.nome]));
    setGalpoes((data ?? []).map((g: any) => ({
      id: g.id, nome: g.nome,
      nucleo_nome: nomeNucleo.get(g.nucleo_id) ?? '',
      usar_percentis_automacao: g.usar_percentis_automacao,
    })));
    setLoading(false);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [integradoId]);

  const handleChange = async (galpao_id: string, modo: Modo) => {
    setSavingId(galpao_id);
    const novoValor = valueFromModo(modo);
    const { error } = await supabase
      .from('galpoes')
      .update({ usar_percentis_automacao: novoValor })
      .eq('id', galpao_id);
    setSavingId(null);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Override atualizado.');
    setGalpoes((prev) => prev.map((g) => g.id === galpao_id ? { ...g, usar_percentis_automacao: novoValor } : g));
  };

  if (!integradoId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Percentis na automação — por galpão
        </CardTitle>
        <CardDescription>
          Comece ativando 1-2 galpões piloto antes de ligar para a organização inteira.
          “Herdar” usa a configuração da organização (atualmente {configOrg.usarPercentisAutomacao ? 'ON' : 'OFF'}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando galpões…</p>}
        {!loading && galpoes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum galpão ativo encontrado.</p>
        )}
        {galpoes.map((g) => {
          const efetivo = g.usar_percentis_automacao ?? configOrg.usarPercentisAutomacao;
          return (
            <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{g.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{g.nucleo_nome}</div>
              </div>
              <Badge variant={efetivo ? 'default' : 'outline'} className="text-[10px] shrink-0">
                {efetivo ? 'ON' : 'OFF'}
              </Badge>
              <Select
                value={modoFromValue(g.usar_percentis_automacao)}
                onValueChange={(v) => handleChange(g.id, v as Modo)}
                disabled={savingId === g.id}
              >
                <SelectTrigger className="w-[140px] h-9 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="herdar">Herdar (org)</SelectItem>
                  <SelectItem value="on">Forçar ON</SelectItem>
                  <SelectItem value="off">Forçar OFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
