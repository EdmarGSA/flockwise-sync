import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Ticket {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  categoria: string | null;
  integrado_id: string;
  created_at: string;
}

export default function BackofficeCS() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media', categoria: '' });

  const fetchTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async () => {
    if (!form.titulo.trim()) return;
    const { error } = await supabase.from('support_tickets').insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      prioridade: form.prioridade as any,
      categoria: form.categoria || null,
      integrado_id: user?.id || '',
      criado_por: user?.id,
    });
    if (error) {
      toast({ title: 'Erro ao criar ticket', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ticket criado com sucesso' });
      setDialogOpen(false);
      setForm({ titulo: '', descricao: '', prioridade: 'media', categoria: '' });
      fetchTickets();
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === 'resolvido') updateData.resolvido_at = new Date().toISOString();
    await supabase.from('support_tickets').update(updateData).eq('id', ticketId);
    fetchTickets();
  };

  const statusColors: Record<string, string> = {
    aberto: 'bg-red-500/10 text-red-600',
    em_andamento: 'bg-amber-500/10 text-amber-600',
    resolvido: 'bg-emerald-500/10 text-emerald-600',
    fechado: 'bg-muted text-muted-foreground',
  };

  const prioridadeColors: Record<string, string> = {
    baixa: 'bg-blue-500/10 text-blue-600',
    media: 'bg-amber-500/10 text-amber-600',
    alta: 'bg-orange-500/10 text-orange-600',
    critica: 'bg-red-500/10 text-red-600',
  };

  const filtered = tickets.filter(t => t.titulo.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Customer Success</h1>
      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets de Suporte</TabsTrigger>
          <TabsTrigger value="health">Health Score</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg">Tickets</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo Ticket</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <Input placeholder="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
                        <Textarea placeholder="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                        <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="critica">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Categoria (opcional)" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
                        <Button onClick={handleCreate} className="w-full">Criar Ticket</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.titulo}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${prioridadeColors[t.prioridade] || ''}`}>
                            {t.prioridade}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.status] || ''}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(t.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <Select value={t.status} onValueChange={v => handleStatusChange(t.id, v)}>
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aberto">Aberto</SelectItem>
                              <SelectItem value="em_andamento">Em andamento</SelectItem>
                              <SelectItem value="resolvido">Resolvido</SelectItem>
                              <SelectItem value="fechado">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum ticket encontrado</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle>Health Score das Granjas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Análise automática de saúde das granjas baseada em frequência de uso, lotes ativos e mortalidade. Em desenvolvimento.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader><CardTitle>Onboarding Tracker</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Acompanhamento do progresso de onboarding de cada granja. Em desenvolvimento.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
