import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Status = 'pendente' | 'processando' | 'aprovada' | 'reprovada' | 'cancelada';

interface Solicitacao {
  id: string;
  full_name: string;
  email: string;
  telefone: string | null;
  nome_organizacao: string;
  cidade: string | null;
  estado: string | null;
  tipo_producao: string | null;
  mensagem: string | null;
  origem: string;
  status: Status;
  motivo_reprovacao: string | null;
  created_at: string;
  revisado_em: string | null;
}

const statusVariant = (s: Status) => {
  if (s === 'pendente') return 'secondary' as const;
  if (s === 'processando') return 'outline' as const;
  if (s === 'aprovada') return 'default' as const;
  return 'destructive' as const;
};

export default function BackofficeSolicitacoes() {
  const [data, setData] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status | 'todas'>('pendente');
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Solicitacao | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitacoes_cadastro' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error('Erro ao carregar solicitações', { description: error.message });
    setData((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approve = async (s: Solicitacao) => {
    setActing(s.id);
    const { data: res, error } = await supabase.functions.invoke('approve-signup-request', { body: { id: s.id } });
    setActing(null);
    if (error || (res as any)?.error) {
      toast.error('Falha ao aprovar', { description: (res as any)?.error || error?.message });
      return;
    }
    toast.success('Solicitação aprovada', { description: `Convite enviado para ${s.email}` });
    fetchData();
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    const { data: res, error } = await supabase.functions.invoke('reject-signup-request', {
      body: { id: rejectTarget.id, motivo: rejectMotivo },
    });
    setActing(null);
    if (error || (res as any)?.error) {
      toast.error('Falha ao reprovar', { description: (res as any)?.error || error?.message });
      return;
    }
    toast.success('Solicitação reprovada');
    setRejectOpen(false);
    setRejectTarget(null);
    setRejectMotivo('');
    fetchData();
  };

  const filtered = data.filter(s => {
    if (tab !== 'todas' && s.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      return [s.full_name, s.email, s.nome_organizacao, s.cidade].some(v => (v || '').toLowerCase().includes(q));
    }
    return true;
  });

  const counts = {
    pendente: data.filter(d => d.status === 'pendente').length,
    processando: data.filter(d => d.status === 'processando').length,
    aprovada: data.filter(d => d.status === 'aprovada').length,
    reprovada: data.filter(d => d.status === 'reprovada').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Solicitações de Cadastro</h1>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="pendente">Pendentes ({counts.pendente})</TabsTrigger>
          <TabsTrigger value="processando">Processando ({counts.processando})</TabsTrigger>
          <TabsTrigger value="aprovada">Aprovadas ({counts.aprovada})</TabsTrigger>
          <TabsTrigger value="reprovada">Reprovadas ({counts.reprovada})</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Lista</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar nome, email, organização..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma solicitação encontrada</TableCell></TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-sm">{s.email}</TableCell>
                      <TableCell>{s.nome_organizacao}</TableCell>
                      <TableCell className="text-sm">{[s.cidade, s.estado].filter(Boolean).join('/') || '—'}</TableCell>
                      <TableCell className="text-sm capitalize">{s.tipo_producao || '—'}</TableCell>
                      <TableCell className="text-xs">{s.origem === 'google_oauth' ? 'Google' : 'Público'}</TableCell>
                      <TableCell><Badge variant={statusVariant(s.status)}>{s.status}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(s.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">
                        {s.status === 'pendente' && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="default" onClick={() => approve(s)} disabled={acting === s.id}>
                              {acting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Aprovar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectTarget(s); setRejectMotivo(''); setRejectOpen(true); }} disabled={acting === s.id}>
                              <XCircle className="w-3 h-3 mr-1" /> Reprovar
                            </Button>
                          </div>
                        )}
                        {s.status === 'reprovada' && s.motivo_reprovacao && (
                          <span className="text-xs text-muted-foreground" title={s.motivo_reprovacao}>Motivo: {s.motivo_reprovacao.slice(0, 30)}{s.motivo_reprovacao.length > 30 ? '…' : ''}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar solicitação</DialogTitle>
            <DialogDescription>{rejectTarget?.full_name} — {rejectTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Textarea value={rejectMotivo} onChange={e => setRejectMotivo(e.target.value)} placeholder="Descreva brevemente o motivo da reprovação..." rows={4} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={submitReject} disabled={acting === rejectTarget?.id}>
              {acting === rejectTarget?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar reprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
