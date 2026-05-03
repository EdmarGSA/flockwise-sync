import { useEffect, useState } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sun, Calendar as CalendarLucide, ArrowRight } from 'lucide-react';

interface Faixa {
  dia_inicio: number;
  dia_fim: number;
  horas_luz: number;
  intensidade_pct: number | null;
  blocos: { acender: string; apagar: string; intensidade_pct?: number }[] | null;
}

interface Props {
  dataAlojamentoAtual: string | null;
  novaDataAlojamento: Date | null | undefined;
  programaAtualId: string | null;
  novoProgramaId: string | null | undefined; // 'default' | uuid | null
  integradoId: string | null;
  tipoProducao: 'frango_corte' | 'postura';
}

// ---- Module-level caches (lifetime = page session) ----
const TTL_MS = 60_000;
type CacheEntry<T> = { value: T; expires: number };
const programCache = new Map<string, CacheEntry<{ id: string; nome: string } | null>>();
const defaultProgramCache = new Map<string, CacheEntry<{ id: string; nome: string } | null>>();
const faixasCache = new Map<string, CacheEntry<Faixa[]>>();

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const e = map.get(key);
  if (!e) return undefined;
  if (e.expires < Date.now()) {
    map.delete(key);
    return undefined;
  }
  return e.value;
}
function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { value, expires: Date.now() + TTL_MS });
}

async function fetchProgramaById(programaId: string): Promise<{ id: string; nome: string } | null> {
  const cached = getCached(programCache, programaId);
  if (cached !== undefined) return cached;
  const { data } = await supabase
    .from('programa_iluminacao_lote')
    .select('id, nome')
    .eq('id', programaId)
    .maybeSingle();
  const value = data ? { id: data.id, nome: data.nome } : null;
  setCached(programCache, programaId, value);
  return value;
}

async function fetchProgramaDefault(
  integradoId: string,
  tipoProducao: string,
): Promise<{ id: string; nome: string } | null> {
  const key = `${integradoId}::${tipoProducao}`;
  const cached = getCached(defaultProgramCache, key);
  if (cached !== undefined) return cached;
  const { data: defaults } = await supabase
    .from('programa_iluminacao_lote')
    .select('id, nome, tipo_producao')
    .eq('integrado_id', integradoId)
    .eq('is_default', true)
    .eq('ativo', true);
  const def = defaults?.find((d) => d.tipo_producao === tipoProducao) ?? defaults?.[0];
  const value = def ? { id: def.id, nome: def.nome } : null;
  setCached(defaultProgramCache, key, value);
  return value;
}

async function fetchFaixas(programaId: string): Promise<Faixa[]> {
  const cached = getCached(faixasCache, programaId);
  if (cached !== undefined) return cached;
  const { data } = await supabase
    .from('programa_iluminacao_faixa')
    .select('*')
    .eq('programa_id', programaId)
    .order('dia_inicio', { ascending: true });
  const value = (data ?? []) as unknown as Faixa[];
  setCached(faixasCache, programaId, value);
  return value;
}

function pickFaixaAtual(faixas: Faixa[], idade: number): Faixa | null {
  return faixas.find((f) => f.dia_inicio <= idade && f.dia_fim >= idade) ?? null;
}
function pickProxFaixa(faixas: Faixa[], idade: number): Faixa | null {
  return faixas.find((f) => f.dia_inicio > idade) ?? null;
}

export function PreviewAjusteAlojamento({
  dataAlojamentoAtual,
  novaDataAlojamento,
  programaAtualId,
  novoProgramaId,
  integradoId,
  tipoProducao,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [faixaAtual, setFaixaAtual] = useState<Faixa | null>(null);
  const [faixaNova, setFaixaNova] = useState<Faixa | null>(null);
  const [proxFaixaNova, setProxFaixaNova] = useState<Faixa | null>(null);
  const [nomeAtual, setNomeAtual] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState<string | null>(null);

  const idadeAtual = dataAlojamentoAtual
    ? differenceInDays(new Date(), parseISO(dataAlojamentoAtual))
    : null;
  const idadeNova = novaDataAlojamento ? differenceInDays(new Date(), novaDataAlojamento) : null;

  const programaSelecionado = !novoProgramaId || novoProgramaId === 'default' ? null : novoProgramaId;
  const novaDataKey = novaDataAlojamento ? format(novaDataAlojamento, 'yyyy-MM-dd') : null;
  const mudouData = (dataAlojamentoAtual ?? null) !== novaDataKey;
  const mudouPrograma = (programaAtualId ?? null) !== (programaSelecionado ?? null);
  const houveMudanca = mudouData || mudouPrograma;

  async function resolverPrograma(programaId: string | null) {
    if (programaId) return fetchProgramaById(programaId);
    if (!integradoId) return null;
    return fetchProgramaDefault(integradoId, tipoProducao);
  }

  useEffect(() => {
    if (!houveMudanca) return;
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [progAtual, progNovo] = await Promise.all([
          resolverPrograma(programaAtualId),
          resolverPrograma(programaSelecionado),
        ]);
        if (cancelled) return;
        setNomeAtual(progAtual?.nome ?? null);
        setNomeNovo(progNovo?.nome ?? null);

        const [faixasAtuais, faixasNovas] = await Promise.all([
          progAtual ? fetchFaixas(progAtual.id) : Promise.resolve<Faixa[]>([]),
          progNovo ? fetchFaixas(progNovo.id) : Promise.resolve<Faixa[]>([]),
        ]);
        if (cancelled) return;

        setFaixaAtual(idadeAtual !== null && idadeAtual >= 0 ? pickFaixaAtual(faixasAtuais, idadeAtual) : null);
        setFaixaNova(idadeNova !== null && idadeNova >= 0 ? pickFaixaAtual(faixasNovas, idadeNova) : null);
        setProxFaixaNova(idadeNova !== null && idadeNova >= 0 ? pickProxFaixa(faixasNovas, idadeNova) : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    houveMudanca,
    dataAlojamentoAtual,
    novaDataKey,
    programaAtualId,
    programaSelecionado,
    integradoId,
    tipoProducao,
  ]);

  if (!houveMudanca) return null;

  const renderFaixa = (f: Faixa | null) => {
    if (!f) return <span className="text-muted-foreground">—</span>;
    return (
      <span>
        Dias {f.dia_inicio}–{f.dia_fim} · <strong>{f.horas_luz}h</strong> luz
        {f.intensidade_pct != null ? ` · ${f.intensidade_pct}%` : ''}
      </span>
    );
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <Sun className="h-4 w-4 text-amber-600" />
        Prévia das mudanças
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <CalendarLucide className="h-3.5 w-3.5" /> Idade hoje
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {idadeAtual !== null ? `${idadeAtual}d (S${Math.ceil(idadeAtual / 7)})` : '—'}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <strong className="text-foreground">
            {idadeNova !== null ? `${idadeNova}d (S${Math.ceil(Math.max(idadeNova, 0) / 7)})` : '—'}
          </strong>
          {idadeNova !== null && idadeAtual !== null && idadeNova !== idadeAtual && (
            <span className={idadeNova > idadeAtual ? 'text-amber-600' : 'text-blue-600'}>
              ({idadeNova > idadeAtual ? '+' : ''}
              {idadeNova - idadeAtual}d)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Sun className="h-3.5 w-3.5" /> Programa
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">{nomeAtual ?? 'padrão da org'}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <strong className="text-foreground">{nomeNovo ?? 'padrão da org'}</strong>
        </div>

        <div className="text-muted-foreground">Faixa hoje</div>
        <div className="flex items-center gap-2 flex-wrap">
          {renderFaixa(faixaAtual)}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          {renderFaixa(faixaNova)}
        </div>

        {proxFaixaNova && idadeNova !== null && (
          <>
            <div className="text-muted-foreground">Próxima faixa</div>
            <div>
              em <strong>{proxFaixaNova.dia_inicio - idadeNova}d</strong> →{' '}
              {renderFaixa(proxFaixaNova)}
            </div>
          </>
        )}
      </div>

      {idadeNova !== null && idadeNova < 0 && (
        <p className="text-xs text-destructive">
          A nova data está no futuro: o lote ficaria com idade negativa.
        </p>
      )}
    </div>
  );
}
