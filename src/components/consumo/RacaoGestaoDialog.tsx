import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Plus, Truck, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoteConsumo {
  id: string;
  quantidade_aves: number;
  linhagem: string;
  sexo: string;
  data_alojamento: string | null;
  status: string;
  integrado_id: string;
  nucleo_id: string;
  nucleo: { nome: string; tipo_producao: string } | null;
  galpao: { nome: string } | null;
}

interface SolicitacaoRacao {
  id: string;
  lote_id: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  data_prevista_entrega: string | null;
  status: string;
  data_solicitacao: string;
  quantidade_recebida_kg: number | null;
  quantidade_devolvida_kg: number | null;
  devolucao_confirmada: boolean;
  observacoes: string | null;
}

interface ProdutoRacao {
  id: string;
  nome: string;
  estoque_atual: number;
  unidade_medida: string;
}

interface RacaoGestaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: LoteConsumo;
  onSuccess: () => void;
}

export function RacaoGestaoDialog({ open, onOpenChange, lote, onSuccess }: RacaoGestaoDialogProps) {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRacao[]>([]);
  const [produtosRacao, setProdutosRacao] = useState<ProdutoRacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('nova');

  // Form state for new request
  const [tipoRacao, setTipoRacao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dataPrevisao, setDataPrevisao] = useState('');
  const [horaPrevisao, setHoraPrevisao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open) {
      fetchSolicitacoes();
      fetchProdutosRacao();
    }
  }, [open, lote.id, lote.nucleo?.tipo_producao]);

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes_racao')
      .select('*')
      .eq('lote_id', lote.id)
      .order('data_solicitacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      return;
    }

    setSolicitacoes(data || []);
  };

  const fetchProdutosRacao = async () => {
    // First, find the "Ração" product group
    const { data: grupoData, error: grupoError } = await supabase
      .from('grupos_produto')
      .select('id')
      .eq('nome', 'Ração')
      .eq('ativo', true)
      .eq('integrado_id', lote.integrado_id)
      .maybeSingle();

    if (grupoError || !grupoData) {
      console.error('Erro ao buscar grupo Ração:', grupoError);
      return;
    }

    // Then fetch products from that group, filtered by animal group
    let query = supabase
      .from('produtos')
      .select('id, nome, estoque_atual, unidade_medida')
      .eq('grupo_produto_id', grupoData.id)
      .eq('ativo', true)
      .order('nome');

    // Filter by animal group if tipoProducao is available
    if (lote.nucleo?.tipo_producao) {
      query = query.eq('grupo_animal_id', lote.nucleo.tipo_producao);
    }

    const { data: produtosData, error: produtosError } = await query;

    if (produtosError) {
      console.error('Erro ao buscar produtos de ração:', produtosError);
      return;
    }

    setProdutosRacao(produtosData || []);
  };

  const handleNovaSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoRacao || !quantidade) {
      toast.error('Preencha o tipo de ração e quantidade');
      return;
    }

    setLoading(true);

    try {
      let dataPrevisaoEntrega = null;
      if (dataPrevisao) {
        const hora = horaPrevisao || '08:00';
        dataPrevisaoEntrega = new Date(`${dataPrevisao}T${hora}`).toISOString();
      }

      const { error } = await supabase
        .from('solicitacoes_racao')
        .insert({
          lote_id: lote.id,
          integrado_id: lote.integrado_id,
          tipo_racao: tipoRacao,
          quantidade_solicitada_kg: parseFloat(quantidade),
          data_prevista_entrega: dataPrevisaoEntrega,
          observacoes: observacoes || null,
          solicitado_por: user?.id,
          status: 'solicitado',
        });

      if (error) throw error;

      toast.success('Solicitação de ração enviada!');
      setTipoRacao('');
      setQuantidade('');
      setDataPrevisao('');
      setHoraPrevisao('');
      setObservacoes('');
      fetchSolicitacoes();
      onSuccess();
      setActiveTab('historico');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getSolicitacaoStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
      solicitado: { label: 'Solicitado', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
      confirmado: { label: 'Confirmado', variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
      enviado: { label: 'Enviado', variant: 'destructive', icon: <Truck className="w-3 h-3" /> },
      recebido: { label: 'Recebido', variant: 'default', icon: <Package className="w-3 h-3" /> },
      parcialmente_devolvido: { label: 'Devol. Parcial', variant: 'secondary', icon: <RefreshCw className="w-3 h-3" /> },
      devolvido: { label: 'Devolvido', variant: 'outline', icon: <RefreshCw className="w-3 h-3" /> },
    };
    const config = variants[status] || { label: status, variant: 'outline', icon: null };
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Calculate total ração recebida (not devolvida)
  const totalRacaoRecebida = solicitacoes.reduce((total, s) => {
    if (s.status === 'recebido' || s.status === 'parcialmente_devolvido') {
      const recebido = s.quantidade_recebida_kg || 0;
      const devolvido = s.devolucao_confirmada ? (s.quantidade_devolvida_kg || 0) : 0;
      return total + (recebido - devolvido);
    }
    return total;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ração - {lote.nucleo?.nome} / {lote.galpao?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Ração Recebida no Lote</p>
              <p className="text-2xl font-bold text-primary">{totalRacaoRecebida.toLocaleString('pt-BR')} kg</p>
            </div>
            <Package className="w-8 h-8 text-primary/50" />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nova" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Solicitação
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <Clock className="w-4 h-4" />
              Histórico ({solicitacoes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nova" className="space-y-4 mt-4">
            <form onSubmit={handleNovaSolicitacao} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoRacao">Tipo de Ração *</Label>
                  <Select value={tipoRacao} onValueChange={setTipoRacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a ração" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtosRacao.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum produto de ração cadastrado
                        </SelectItem>
                      ) : (
                        produtosRacao.map((produto) => (
                          <SelectItem key={produto.id} value={produto.nome}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{produto.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                Estoque: {produto.estoque_atual.toLocaleString('pt-BR')} {produto.unidade_medida}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade (kg) *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    step="0.01"
                    min="0"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataPrevisao">Data Previsão Entrega</Label>
                  <Input
                    id="dataPrevisao"
                    type="date"
                    value={dataPrevisao}
                    onChange={(e) => setDataPrevisao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaPrevisao">Hora Previsão</Label>
                  <Input
                    id="horaPrevisao"
                    type="time"
                    value={horaPrevisao}
                    onChange={(e) => setHoraPrevisao(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading || produtosRacao.length === 0} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            {solicitacoes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma solicitação de ração para este lote.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Solicitado</TableHead>
                      <TableHead>Recebido</TableHead>
                      <TableHead>Devolvido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">{formatDateTime(s.data_solicitacao)}</TableCell>
                        <TableCell className="font-medium">{s.tipo_racao}</TableCell>
                        <TableCell>{s.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</TableCell>
                        <TableCell>
                          {s.quantidade_recebida_kg 
                            ? `${s.quantidade_recebida_kg.toLocaleString('pt-BR')} kg` 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {s.quantidade_devolvida_kg && s.quantidade_devolvida_kg > 0 ? (
                            <div className="flex items-center gap-1">
                              <span>{s.quantidade_devolvida_kg.toLocaleString('pt-BR')} kg</span>
                              {s.devolucao_confirmada && (
                                <CheckCircle className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getSolicitacaoStatusBadge(s.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
