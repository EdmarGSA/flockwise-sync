import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, CheckCircle, Stethoscope, Pill, AlertTriangle, Clock, User } from 'lucide-react';

interface NotificacoesVetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  onSuccess?: () => void;
}

interface Orientacao {
  id: string;
  dia_ciclo: number;
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa' | null;
  created_at: string;
  lido_por: string | null;
  lido_em: string | null;
  profiles: { full_name: string | null } | null;
}

interface Tratamento {
  id: string;
  produto_id: string;
  dosagem: string;
  via_administracao: string;
  data_inicio: string;
  data_fim: string | null;
  carencia_dias: number;
  quantidade_utilizada: number;
  unidade_medida: string;
  status: string;
  aplicacao_confirmada: boolean;
  aplicacao_confirmada_por: string | null;
  aplicacao_confirmada_em: string | null;
  created_at: string;
  produtos: { nome: string } | null;
  profiles: { full_name: string | null } | null;
}

export function NotificacoesVetDialog({ 
  open, 
  onOpenChange, 
  loteId,
  onSuccess 
}: NotificacoesVetDialogProps) {
  const { user } = useAuth();
  const [orientacoes, setOrientacoes] = useState<Orientacao[]>([]);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && loteId) {
      fetchData();
    }
  }, [open, loteId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch orientações não lidas
    const { data: orientacoesData } = await supabase
      .from('observacoes_lote')
      .select(`
        id,
        dia_ciclo,
        descricao,
        prioridade,
        created_at,
        lido_por,
        lido_em,
        criado_por
      `)
      .eq('lote_id', loteId)
      .eq('tipo', 'orientacao')
      .order('created_at', { ascending: false });

    // Fetch profiles for orientacoes
    const orientacoesWithProfiles = await Promise.all(
      (orientacoesData || []).map(async (o) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', o.criado_por)
          .maybeSingle();
        return { ...o, profiles: profile };
      })
    );

    // Fetch tratamentos ativos não confirmados
    const { data: tratamentosData } = await supabase
      .from('tratamentos_lote')
      .select(`
        id,
        produto_id,
        dosagem,
        via_administracao,
        data_inicio,
        data_fim,
        carencia_dias,
        quantidade_utilizada,
        unidade_medida,
        status,
        aplicacao_confirmada,
        aplicacao_confirmada_por,
        aplicacao_confirmada_em,
        created_at,
        criado_por,
        produtos:produto_id(nome)
      `)
      .eq('lote_id', loteId)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false });

    // Fetch profiles for tratamentos
    const tratamentosWithProfiles = await Promise.all(
      (tratamentosData || []).map(async (t) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', t.criado_por)
          .maybeSingle();
        return { ...t, profiles: profile };
      })
    );

    setOrientacoes(orientacoesWithProfiles as Orientacao[]);
    setTratamentos(tratamentosWithProfiles as Tratamento[]);
    setLoading(false);
  };

  const handleMarcarVisto = async (orientacaoId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('observacoes_lote')
      .update({
        lido_por: user.id,
        lido_em: new Date().toISOString()
      })
      .eq('id', orientacaoId);

    if (error) {
      toast.error('Erro ao marcar como visto');
      return;
    }

    toast.success('Orientação marcada como vista');
    fetchData();
    onSuccess?.();
  };

  const handleConfirmarAplicacao = async (tratamentoId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('tratamentos_lote')
      .update({
        aplicacao_confirmada: true,
        aplicacao_confirmada_por: user.id,
        aplicacao_confirmada_em: new Date().toISOString()
      })
      .eq('id', tratamentoId);

    if (error) {
      toast.error('Erro ao confirmar aplicação');
      return;
    }

    toast.success('Aplicação confirmada com sucesso');
    fetchData();
    onSuccess?.();
  };

  const getPrioridadeBadge = (prioridade: string | null) => {
    const config: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' }> = {
      alta: { label: 'Alta', variant: 'destructive' },
      media: { label: 'Média', variant: 'default' },
      baixa: { label: 'Baixa', variant: 'secondary' },
    };
    const p = config[prioridade || 'media'] || config.media;
    return <Badge variant={p.variant}>{p.label}</Badge>;
  };

  const orientacoesNaoLidas = orientacoes.filter(o => !o.lido_por);
  const tratamentosNaoConfirmados = tratamentos.filter(t => !t.aplicacao_confirmada);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Notificações Veterinárias
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="orientacoes" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orientacoes" className="gap-2">
              <Eye className="w-4 h-4" />
              Orientações
              {orientacoesNaoLidas.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {orientacoesNaoLidas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tratamentos" className="gap-2">
              <Pill className="w-4 h-4" />
              Tratamentos
              {tratamentosNaoConfirmados.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {tratamentosNaoConfirmados.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orientacoes" className="flex-1 overflow-auto mt-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : orientacoes.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma orientação veterinária</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orientacoes.map((orientacao) => (
                  <Card 
                    key={orientacao.id} 
                    className={`${!orientacao.lido_por ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Dia {orientacao.dia_ciclo}</Badge>
                            {getPrioridadeBadge(orientacao.prioridade)}
                            {!orientacao.lido_por && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Novo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground mb-2">{orientacao.descricao}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {orientacao.profiles?.full_name || 'Veterinário'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(orientacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {orientacao.lido_por && orientacao.lido_em && (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Visto em {format(new Date(orientacao.lido_em), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        {!orientacao.lido_por && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarcarVisto(orientacao.id)}
                            className="gap-1 shrink-0"
                          >
                            <Eye className="w-4 h-4" />
                            Marcar Visto
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tratamentos" className="flex-1 overflow-auto mt-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : tratamentos.length === 0 ? (
              <div className="text-center py-8">
                <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum tratamento ativo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tratamentos.map((tratamento) => (
                  <Card 
                    key={tratamento.id} 
                    className={`${!tratamento.aplicacao_confirmada ? 'border-amber-500 bg-amber-500/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{tratamento.produtos?.nome || 'Medicamento'}</span>
                            {!tratamento.aplicacao_confirmada && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Aplicar
                              </Badge>
                            )}
                            {tratamento.aplicacao_confirmada && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Aplicado
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                            <span>Dosagem: <strong className="text-foreground">{tratamento.dosagem}</strong></span>
                            <span>Via: <strong className="text-foreground">{tratamento.via_administracao}</strong></span>
                            <span>Qtd: <strong className="text-foreground">{tratamento.quantidade_utilizada} {tratamento.unidade_medida}</strong></span>
                            <span>Carência: <strong className="text-foreground">{tratamento.carencia_dias} dias</strong></span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {tratamento.profiles?.full_name || 'Veterinário'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Início: {format(new Date(tratamento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                          {tratamento.aplicacao_confirmada && tratamento.aplicacao_confirmada_em && (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Confirmado em {format(new Date(tratamento.aplicacao_confirmada_em), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        {!tratamento.aplicacao_confirmada && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmarAplicacao(tratamento.id)}
                            className="gap-1 shrink-0"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirmar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
