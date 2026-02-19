import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Granja {
  integrado_id: string;
  nome: string;
  totalUsuarios: number;
  totalLotes: number;
  totalAves: number;
  dataCadastro: string;
}

export default function BackofficeGranjas() {
  const [granjas, setGranjas] = useState<Granja[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [profilesRes, lotesRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, integrado_id, created_at'),
          supabase.from('lotes').select('id, integrado_id, quantidade_aves, status').in('status', ['alojado', 'previsao', 'saiu_para_entrega']),
        ]);

        const profiles = profilesRes.data || [];
        const lotes = lotesRes.data || [];

        const granjaMap = new Map<string, Granja>();

        for (const p of profiles) {
          const iid = p.integrado_id || p.id;
          if (!granjaMap.has(iid)) {
            // The "owner" profile is the one where id === integrado_id
            const isOwner = p.id === iid;
            granjaMap.set(iid, {
              integrado_id: iid,
              nome: isOwner ? (p.full_name || 'Sem nome') : iid.slice(0, 8),
              totalUsuarios: 0,
              totalLotes: 0,
              totalAves: 0,
              dataCadastro: p.created_at,
            });
          }
          const g = granjaMap.get(iid)!;
          g.totalUsuarios++;
          // Update name if this is the owner
          if (p.id === iid && p.full_name) {
            g.nome = p.full_name;
          }
          // Keep earliest date
          if (p.created_at < g.dataCadastro) {
            g.dataCadastro = p.created_at;
          }
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
  }, []);

  const filtered = granjas.filter(g => g.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Granjas</h1>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Todas as Organizações</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar granja..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Granja</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="text-center">Lotes</TableHead>
                  <TableHead className="text-center">Aves</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(g => (
                  <TableRow key={g.integrado_id}>
                    <TableCell className="font-medium">{g.nome}</TableCell>
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
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma granja encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
