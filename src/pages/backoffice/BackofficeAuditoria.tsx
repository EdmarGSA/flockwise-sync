import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AuditRow {
  id: string;
  called_at: string;
  user_id: string | null;
  integrado_id: string | null;
  function_name: string;
  key_param: string | null;
  extra: Record<string, unknown> | null;
}

const FUNCTIONS = [
  'reservar_estoque_ovos_fifo',
  'gerar_lote_interno_ovos',
  'seed_programas_iluminacao_default',
  'initialize_demo_data',
  'dispatch_notificacao',
  'cleanup_orphan_identities_for_email',
];

export default function BackofficeAuditoria() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [integradoId, setIntegradoId] = useState('');
  const [funcName, setFuncName] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    let q = supabase
      .from('security_definer_audit_log' as any)
      .select('*')
      .order('called_at', { ascending: false })
      .limit(500);
    if (userId.trim()) q = q.eq('user_id', userId.trim());
    if (integradoId.trim()) q = q.eq('integrado_id', integradoId.trim());
    if (funcName !== 'all') q = q.eq('function_name', funcName);
    if (from) q = q.gte('called_at', new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      q = q.lte('called_at', end.toISOString());
    }
    const { data, error } = await q;
    if (error) {
      toast.error('Erro ao carregar log', { description: error.message });
      setLoading(false);
      return;
    }
    const list = (data ?? []) as unknown as AuditRow[];
    setRows(list);

    const ids = Array.from(
      new Set(list.map((r) => r.user_id).filter((v): v is string => !!v && !profilesById[v])),
    );
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      if (profs) {
        const map: Record<string, string> = { ...profilesById };
        profs.forEach((p: any) => { map[p.id] = p.full_name ?? p.id; });
        setProfilesById(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const total = rows.length;
  const uniqueUsers = useMemo(() => new Set(rows.map((r) => r.user_id).filter(Boolean)).size, [rows]);
  const uniqueFns = useMemo(() => new Set(rows.map((r) => r.function_name)).size, [rows]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Auditoria de Funções Sensíveis</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Registros de chamadas a funções <code>SECURITY DEFINER</code> instrumentadas. Apenas superadmins têm acesso.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Eventos</div><div className="text-2xl font-semibold">{total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Usuários únicos</div><div className="text-2xl font-semibold">{uniqueUsers}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Funções distintas</div><div className="text-2xl font-semibold">{uniqueFns}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>User ID</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
            </div>
            <div>
              <Label>Integrado ID</Label>
              <Input value={integradoId} onChange={(e) => setIntegradoId(e.target.value)} placeholder="uuid" />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={funcName} onValueChange={setFuncName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {FUNCTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              Aplicar filtros
            </Button>
            <Button variant="outline" onClick={() => { setUserId(''); setIntegradoId(''); setFuncName('all'); setFrom(''); setTo(''); }}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Eventos ({total})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Integrado</TableHead>
                <TableHead>Param-chave</TableHead>
                <TableHead>Extra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem registros</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(r.called_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell><Badge variant="secondary">{r.function_name}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {r.user_id ? (profilesById[r.user_id] ?? r.user_id) : '—'}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.integrado_id?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono max-w-[240px] truncate" title={r.key_param ?? ''}>{r.key_param ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono max-w-[280px] truncate" title={r.extra ? JSON.stringify(r.extra) : ''}>
                    {r.extra ? JSON.stringify(r.extra) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
