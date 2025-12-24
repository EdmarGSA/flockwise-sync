import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { MessageSquare, Plus, Clock, User, AlertTriangle, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Observacao {
  id: string;
  dia_ciclo: number;
  tipo: 'observacao' | 'orientacao';
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  created_at: string;
  criado_por: string;
  criador?: { full_name: string } | null;
}

interface ObservacoesTabProps {
  loteId: string;
  diasLote: number | null;
}

interface ObservacoesPorDia {
  dia: number;
  observacoes: Observacao[];
}

export default function ObservacoesTab({ loteId, diasLote }: ObservacoesTabProps) {
  const { user } = useAuth();
  const { integradoId } = useIntegradoId();
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedObservacao, setSelectedObservacao] = useState<Observacao | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    dia_ciclo: diasLote || 0,
    tipo: 'observacao' as 'observacao' | 'orientacao',
    descricao: '',
    prioridade: 'media' as 'alta' | 'media' | 'baixa',
  });

  useEffect(() => {
    fetchObservacoes();
  }, [loteId]);

  useEffect(() => {
    if (diasLote !== null) {
      setFormData(prev => ({ ...prev, dia_ciclo: diasLote }));
    }
  }, [diasLote]);

  const fetchObservacoes = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('observacoes_lote')
      .select('*')
      .eq('lote_id', loteId)
      .order('dia_ciclo', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar observações:', error);
      toast.error('Erro ao carregar observações');
      setLoading(false);
      return;
    }

    // Fetch user names
    const userIds = [...new Set((data || []).map(o => o.criado_por))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const observacoesWithNames = (data || []).map(obs => ({
      ...obs,
      criador: profilesMap.get(obs.criado_por) || null,
    }));

    setObservacoes(observacoesWithNames as Observacao[]);

    // Auto-expand current day
    if (diasLote !== null) {
      setExpandedDays(new Set([diasLote]));
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Preencha a descrição');
      return;
    }

    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('observacoes_lote')
      .insert({
        lote_id: loteId,
        integrado_id: integradoId,
        criado_por: user.id,
        dia_ciclo: formData.dia_ciclo,
        tipo: formData.tipo,
        descricao: formData.descricao,
        prioridade: formData.prioridade,
      });

    if (error) {
      console.error('Erro ao salvar observação:', error);
      toast.error('Erro ao salvar observação');
      setSaving(false);
      return;
    }

    toast.success('Observação registrada!');
    setDialogOpen(false);
    setFormData({
      dia_ciclo: diasLote || 0,
      tipo: 'observacao',
      descricao: '',
      prioridade: 'media',
    });
    fetchObservacoes();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedObservacao) return;

    const { error } = await supabase
      .from('observacoes_lote')
      .delete()
      .eq('id', selectedObservacao.id);

    if (error) {
      console.error('Erro ao excluir observação:', error);
      toast.error('Erro ao excluir observação');
      return;
    }

    toast.success('Observação excluída!');
    setDeleteDialogOpen(false);
    setSelectedObservacao(null);
    fetchObservacoes();
  };

  const toggleDay = (dia: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dia)) {
      newExpanded.delete(dia);
    } else {
      newExpanded.add(dia);
    }
    setExpandedDays(newExpanded);
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const config: Record<string, { label: string; className: string }> = {
      alta: { label: 'Alta', className: 'bg-destructive text-destructive-foreground' },
      media: { label: 'Média', className: 'bg-amber-500 text-white' },
      baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
    };
    const c = config[prioridade] || config.media;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'orientacao') {
      return <Badge variant="secondary" className="gap-1"><FileText className="w-3 h-3" />Orientação</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><MessageSquare className="w-3 h-3" />Observação</Badge>;
  };

  // Group by day
  const observacoesPorDia: ObservacoesPorDia[] = [];
  const diasSet = new Set<number>();
  observacoes.forEach(obs => diasSet.add(obs.dia_ciclo));
  
  Array.from(diasSet).sort((a, b) => b - a).forEach(dia => {
    observacoesPorDia.push({
      dia,
      observacoes: observacoes.filter(o => o.dia_ciclo === dia),
    });
  });

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Observações e Orientações
            </CardTitle>
            <CardDescription>
              Registre eventos de manejo e diretrizes veterinárias por dia do ciclo
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando observações...
            </div>
          ) : observacoesPorDia.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma observação registrada</p>
              <p className="text-sm mt-1">Clique em "Nova" para registrar a primeira observação</p>
            </div>
          ) : (
            <div className="space-y-3">
              {observacoesPorDia.map((grupo) => {
                const hasAlta = grupo.observacoes.some(o => o.prioridade === 'alta');
                const isExpanded = expandedDays.has(grupo.dia);

                return (
                  <div key={grupo.dia} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDay(grupo.dia)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                        hasAlta ? 'bg-destructive/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={grupo.dia === diasLote ? 'default' : 'outline'} className="text-sm">
                          Dia {grupo.dia}
                        </Badge>
                        <span className="text-muted-foreground">
                          {grupo.observacoes.length} registro{grupo.observacoes.length !== 1 ? 's' : ''}
                        </span>
                        {hasAlta && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border divide-y divide-border">
                        {grupo.observacoes.map((obs) => (
                          <div key={obs.id} className="p-4 hover:bg-muted/30">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getTipoBadge(obs.tipo)}
                                  {getPrioridadeBadge(obs.prioridade)}
                                </div>
                                <p className="text-foreground whitespace-pre-wrap">{obs.descricao}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {obs.criador?.full_name || 'Usuário'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(obs.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setSelectedObservacao(obs);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Observation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Observação</DialogTitle>
            <DialogDescription>
              Registre um evento de manejo ou diretriz veterinária
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia do Ciclo</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.dia_ciclo}
                  onChange={(e) => setFormData(prev => ({ ...prev, dia_ciclo: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as 'observacao' | 'orientacao' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observacao">Observação</SelectItem>
                    <SelectItem value="orientacao">Orientação (Diretriz)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(v) => setFormData(prev => ({ ...prev, prioridade: v as 'alta' | 'media' | 'baixa' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Alta
                    </div>
                  </SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder={formData.tipo === 'orientacao' 
                  ? "Ex: Aumentar ventilação em 10% devido ao calor excessivo..."
                  : "Ex: Cama úmida na área próxima aos bebedouros..."
                }
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir observação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A observação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
