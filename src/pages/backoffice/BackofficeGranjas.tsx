import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import GerenciarAssinaturaDialog from '@/components/backoffice/GerenciarAssinaturaDialog';

interface Granja {
  integrado_id: string;
  nome: string;
  totalUsuarios: number;
  totalLotes: number;
  totalAves: number;
  dataCadastro: string;
  planoNome: string | null;
  planoCodigo: string | null;
  assinaturaStatus: string | null;
  addonsAtivos: string[];
  custoIA30d: number;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export default function BackofficeGranjas() {
  const [granjas, setGranjas] = useState<Granja[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [dialogOpen, setDialogOpen] = useState<{ integradoId: string; nome: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();
        const [profilesRes, lotesRes, assinRes, addonsRes, iaRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, integrado_id, created_at'),
          supabase
            .from('lotes')
            .select('id, integrado_id, quantidade_aves, status')
            .in('status', ['alojado', 'previsao', 'saiu_para_entrega']),
          supabase
            .from('assinaturas')
            .select('integrado_id, status, plano:planos(codigo, nome)'),
          supabase
            .from('assinaturas_addons')
            .select('ativo, assinatura:assinaturas(integrado_id), addon:planos_addons(codigo, nome)')
            .eq('ativo', true),
          supabase
            .from('ai_usage_log')
            .select('integrado_id, custo_estimado_brl')
            .gte('created_at', since),
        ]);

        const profiles = profilesRes.data || [];
        const lotes = lotesRes.data || [];
        const assins = (assinRes.data || []) as any[];
        const addons = (addonsRes.data || []) as any[];
        const iaLogs = (iaRes.data || []) as any[];

        const assinMap = new Map<string, { planoNome: string; planoCodigo: string; status: string }>();
        for (const a of assins) {
          assinMap.set(a.integrado_id, {
            planoNome: a.plano?.nome ?? '—',
            planoCodigo: a.plano?.codigo ?? '',
            status: a.status,
          });
        }

        const addonsMap = new Map<string, string[]>();
        for (const ad of addons) {
          const iid = ad.assinatura?.integrado_id;
          if (!iid) continue;
          const arr = addonsMap.get(iid) ?? [];
          if (ad.addon?.nome) arr.push(ad.addon.nome);
          addonsMap.set(iid, arr);
        }

        const iaCustoMap = new Map<string, number>();
        for (const l of iaLogs) {
          const cur = iaCustoMap.get(l.integrado_id) ?? 0;
          iaCustoMap.set(l.integrado_id, cur + Number(l.custo_estimado_brl ?? 0));
        }

        const granjaMap = new Map<string, Granja>();
        for (const p of profiles) {
          const iid = p.integrado_id || p.id;
          if (!granjaMap.has(iid)) {
            const isOwner = p.id === iid;
            const assin = assinMap.get(iid);
            granjaMap.set(iid, {
              integrado_id: iid,
              nome: isOwner ? p.full_name || 'Sem nome' : iid.slice(0, 8),
              totalUsuarios: 0,
              totalLotes: 0,
              totalAves: 0,
              dataCadastro: p.created_at,
              planoNome: assin?.planoNome ?? null,
              planoCodigo: assin?.planoCodigo ?? null,
              assinaturaStatus: assin?.status ?? null,
              addonsAtivos: addonsMap.get(iid) ?? [],
              custoIA30d: iaCustoMap.get(iid) ?? 0,
            });
          }
          const g = granjaMap.get(iid)!;
          g.totalUsuarios++;
          if (p.id === iid && p.full_name) g.nome = p.full_name;
          if (p.created_at < g.dataCadastro) g.dataCadastro = p.created_at;
        }

        for (const l of lotes) {
          const g = granjaMap.get(l.integrado_id);
          if (g) {
            g.totalLotes++;
            g.totalAves += l.quantidade_aves || 0;
          }
        }

        setGranjas(Array.from(granjaMap.values()).sort((a, b) => b.totalAves - a.totalAves));
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [reload]);

  const filtered = granjas.filter((g) => g.nome.toLowerCase().includes(search.toLowerCase()));

  const statusVariant = (s: string | null) => {
    if (s === 'ativa') return 'default';
    if (s === 'trial') return 'secondary';
    if (s === 'atrasada' || s === 'suspensa') return 'destructive';
    return 'outline';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Granjas</h1>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Todas as Organizações</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar granja..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Granja</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Add-ons</TableHead>
                    <TableHead className="text-right">Custo IA 30d</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="text-center">Lotes</TableHead>
                    <TableHead className="text-center">Aves</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => (
                    <TableRow key={g.integrado_id}>
                      <TableCell className="font-medium">{g.nome}</TableCell>
                      <TableCell>
                        {g.planoNome ? (
                          <Badge variant="outline">{g.planoNome}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {g.assinaturaStatus ? (
                          <Badge variant={statusVariant(g.assinaturaStatus) as any} className="capitalize">
                            {g.assinaturaStatus}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {g.addonsAtivos.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {g.addonsAtivos.slice(0, 3).map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px]">
                              {a}
                            </Badge>
                          ))}
                          {g.addonsAtivos.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{g.addonsAtivos.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {g.custoIA30d > 0 ? brl(g.custoIA30d) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{g.totalUsuarios}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{g.totalLotes}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{g.totalAves.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(g.dataCadastro), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDialogOpen({ integradoId: g.integrado_id, nome: g.nome })}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Nenhuma granja encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <GerenciarAssinaturaDialog
          integradoId={dialogOpen.integradoId}
          nomeGranja={dialogOpen.nome}
          open={!!dialogOpen}
          onOpenChange={(v) => !v && setDialogOpen(null)}
          onSaved={() => {
            setReload((r) => r + 1);
            setDialogOpen(null);
          }}
        />
      )}
    </div>
  );
}
