import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CloudAlert, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface AlertaClimatico {
  id: string;
  nucleo_id: string;
  tipo: string;
  severidade: string;
  titulo: string;
  mensagem: string;
  horario_evento: string;
  horario_acao: string | null;
  nucleo_nome?: string;
}

const SEV_ORDER: Record<string, number> = { critico: 0, alto: 1, atencao: 2, medio: 3, baixo: 4 };
const SEV_VARIANT: Record<string, 'destructive' | 'default' | 'secondary'> = {
  critico: 'destructive', alto: 'destructive', atencao: 'default', medio: 'default', baixo: 'secondary',
};

export function AlertasClimaticosBar() {
  const { integradoId } = useIntegradoId();
  const [alertas, setAlertas] = useState<AlertaClimatico[]>([]);
  const [nucleoFiltro, setNucleoFiltro] = useState<string>('todos');
  const [sevFiltro, setSevFiltro] = useState<string>('todos');
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (!integradoId) return;
    fetchAlertas();
    const channel = supabase
      .channel('alertas-clima-bar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_climaticos' }, () => fetchAlertas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [integradoId]);

  const fetchAlertas = async () => {
    if (!integradoId) return;
    const { data } = await supabase
      .from('alertas_climaticos')
      .select('id, nucleo_id, tipo, severidade, titulo, mensagem, horario_evento, horario_acao')
      .eq('integrado_id', integradoId)
      .is('reconhecido_em', null)
      .order('horario_evento', { ascending: true })
      .limit(50);

    if (!data || data.length === 0) { setAlertas([]); return; }

    const nucleoIds = [...new Set(data.map(a => a.nucleo_id))];
    const { data: nucleos } = await supabase.from('nucleos').select('id, nome').in('id', nucleoIds);
    const map = new Map((nucleos || []).map((n: any) => [n.id, n.nome]));

    setAlertas(data.map((a: any) => ({ ...a, nucleo_nome: map.get(a.nucleo_id) || 'Núcleo' })));
  };

  const reconhecer = async (id: string) => {
    const { error } = await supabase
      .from('alertas_climaticos')
      .update({ reconhecido_em: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error('Erro ao reconhecer'); else setAlertas(prev => prev.filter(a => a.id !== id));
  };

  const nucleosDisponiveis = useMemo(() => {
    const u = new Map<string, string>();
    alertas.forEach(a => u.set(a.nucleo_id, a.nucleo_nome || 'Núcleo'));
    return Array.from(u, ([id, nome]) => ({ id, nome }));
  }, [alertas]);

  const filtrados = useMemo(() => {
    return alertas
      .filter(a => nucleoFiltro === 'todos' || a.nucleo_id === nucleoFiltro)
      .filter(a => sevFiltro === 'todos' || a.severidade === sevFiltro)
      .sort((a, b) => (SEV_ORDER[a.severidade] ?? 9) - (SEV_ORDER[b.severidade] ?? 9));
  }, [alertas, nucleoFiltro, sevFiltro]);

  if (alertas.length === 0) {
    return (
      <Card className="mb-4 border-muted bg-muted/30">
        <CardContent className="py-2.5 px-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CloudAlert className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <span>
              <span className="font-medium text-foreground">Sem alertas climáticos ativos.</span>{' '}
              Avaliamos a previsão dos próximos 3 dias a cada sincronização e geramos alertas para picos de calor (acima do crítico do núcleo), frio extremo, ITH alto e vento forte (≥ 50 km/h).
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visiveis = expandido ? filtrados : filtrados.slice(0, 3);
  const criticos = filtrados.filter(a => a.severidade === 'critico' || a.severidade === 'alto').length;

  return (
    <Card className="mb-4 border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/10">
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CloudAlert className="h-4 w-4 text-orange-600" />
            <span>Alertas climáticos ({filtrados.length})</span>
            {criticos > 0 && (
              <Badge variant="destructive" className="text-[10px]">{criticos} críticos</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={nucleoFiltro} onValueChange={setNucleoFiltro}>
              <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os núcleos</SelectItem>
                {nucleosDisponiveis.map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sevFiltro} onValueChange={setSevFiltro}>
              <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda severidade</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
            {filtrados.length > 3 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandido(v => !v)}>
                {expandido ? <><ChevronUp className="h-3 w-3 mr-1" />Recolher</> : <><ChevronDown className="h-3 w-3 mr-1" />Ver todos</>}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          {visiveis.map(a => (
            <div key={a.id} className="flex items-start justify-between gap-2 rounded border bg-background/60 px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={SEV_VARIANT[a.severidade] || 'secondary'} className="text-[10px] h-4">{a.severidade}</Badge>
                  <span className="text-xs font-medium truncate">{a.nucleo_nome} — {a.titulo}</span>
                </div>
                {a.mensagem && <p className="text-[11px] text-muted-foreground mt-0.5">{a.mensagem}</p>}
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />{format(new Date(a.horario_evento), 'dd/MM HH:mm', { locale: ptBR })}</span>
                  {a.horario_acao && <span>Ação: {format(new Date(a.horario_acao), 'dd/MM HH:mm', { locale: ptBR })}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => reconhecer(a.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
