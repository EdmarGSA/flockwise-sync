import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Plus, Truck, Clock, CheckCircle, RefreshCw, Download, CalendarIcon, Lock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NivelSiloCard } from './NivelSiloCard';
import { NivelSiloUpdateForm } from './NivelSiloUpdateForm';
import { CapacidadeAlertCard } from './CapacidadeAlertCard';
import { useConsumoEstimado } from '@/hooks/useConsumoEstimado';

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

interface SiloInfo {
  numero_aneis: number;
  capacidade_toneladas: number;
}

interface RacaoLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  galpaoId: string;
  nucleo: string;
  galpao: string;
  tipoProducao: string | null;
  linhagem?: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo?: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento?: number;
  avesVivas?: number;
  onSuccess: () => void;
}

export function RacaoLoteDialog({ 
  open, 
  onOpenChange, 
  loteId, 
  integradoId,
  galpaoId,
  nucleo,
  galpao,
  tipoProducao,
  linhagem,
  sexo,
  diasDesdeAlojamento,
  avesVivas,
  onSuccess 
}: RacaoLoteDialogProps) {
  const { user } = useAuth();
  const { calcularConsumoAteEntrega } = useConsumoEstimado();
  
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRacao[]>([]);
  const [produtosRacao, setProdutosRacao] = useState<ProdutoRacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('solicitar');

  // Silo info state
  const [siloInfo, setSiloInfo] = useState<SiloInfo | null>(null);
  
  // Two-step state: nivel must be saved before solicitation
  const [nivelSalvo, setNivelSalvo] = useState<number | null>(null);
  
  // Refresh key for NivelSiloCard
  const [siloRefreshKey, setSiloRefreshKey] = useState(0);

  // Form state for new request
  const [tipoRacao, setTipoRacao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dataPrevisao, setDataPrevisao] = useState<Date | undefined>(undefined);
  const [horaPrevisao, setHoraPrevisao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Capacity validation state
  const [consumoEstimado, setConsumoEstimado] = useState<number | null>(null);
  const [diasAteEntrega, setDiasAteEntrega] = useState<number>(0);

  // State for recebimento/devolução
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoRacao | null>(null);
  const [quantidadeRecebida, setQuantidadeRecebida] = useState('');
  const [quantidadeDevolvida, setQuantidadeDevolvida] = useState('');
  
  // State for devolução imediata no recebimento
  const [registrarDevolucaoImediata, setRegistrarDevolucaoImediata] = useState<string | null>(null);
  const [quantidadeDevolucaoImediata, setQuantidadeDevolucaoImediata] = useState('');

  useEffect(() => {
    if (open) {
      fetchSolicitacoes();
      fetchProdutosRacao();
      fetchSiloInfo();
      // Reset states when opening
      setNivelSalvo(null);
      setConsumoEstimado(null);
      setDiasAteEntrega(0);
      setSiloRefreshKey(0);
    }
  }, [open, loteId, tipoProducao, galpaoId]);

  // Handler when silo level is saved - refresh card and use suggestion
  const handleLevelSaved = (nivel: number) => {
    setNivelSalvo(nivel);
    setSiloRefreshKey(prev => prev + 1);
  };

  // Recalculate consumption when delivery date changes
  useEffect(() => {
    if (dataPrevisao && linhagem && sexo && diasDesdeAlojamento !== undefined && avesVivas) {
      calcularConsumoAteEntrega({
        linhagem,
        sexo,
        diasDesdeAlojamento,
        avesVivas,
        dataEntrega: dataPrevisao,
      }).then((result) => {
        if (result) {
          setConsumoEstimado(result.consumoAteEntrega);
          setDiasAteEntrega(result.diasAteEntrega);
        }
      });
    }
  }, [dataPrevisao, linhagem, sexo, diasDesdeAlojamento, avesVivas]);

  const fetchSiloInfo = async () => {
    if (!galpaoId) {
      setSiloInfo(null);
      return;
    }

    // Get silo linked to galpao
    const { data: galpaoData, error: galpaoError } = await supabase
      .from('galpoes')
      .select('silo_id, silo_quantidade')
      .eq('id', galpaoId)
      .single();

    if (galpaoError || !galpaoData?.silo_id) {
      setSiloInfo(null);
      return;
    }

    // Get silo specs
    const { data: siloData, error: siloError } = await supabase
      .from('silos')
      .select('numero_aneis, capacidade_toneladas')
      .eq('id', galpaoData.silo_id)
      .single();

    if (siloError || !siloData) {
      setSiloInfo(null);
      return;
    }

    // Calculate total capacity based on quantity
    const qtdSilos = galpaoData.silo_quantidade || 1;
    setSiloInfo({
      numero_aneis: siloData.numero_aneis,
      capacidade_toneladas: siloData.capacidade_toneladas * qtdSilos,
    });
  };

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes_racao')
      .select('*')
      .eq('lote_id', loteId)
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
      .eq('integrado_id', integradoId)
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
    if (tipoProducao) {
      query = query.eq('grupo_animal_id', tipoProducao);
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

    // Validate capacity if we have silo info
    if (siloInfo && nivelSalvo !== null && consumoEstimado !== null) {
      const capacidadeKg = siloInfo.capacidade_toneladas * 1000;
      const nivelNaEntrega = Math.max(0, nivelSalvo - consumoEstimado);
      const nivelAposRecebimento = nivelNaEntrega + parseFloat(quantidade);
      
      if (nivelAposRecebimento > capacidadeKg) {
        const excesso = nivelAposRecebimento - capacidadeKg;
        toast.error(`Quantidade excede capacidade do silo em ${excesso.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`);
        return;
      }
    }

    setLoading(true);

    try {
      let dataPrevisaoEntrega = null;
      if (dataPrevisao) {
        const hora = horaPrevisao || '08:00';
        const [hours, minutes] = hora.split(':').map(Number);
        const dateWithTime = new Date(dataPrevisao);
        dateWithTime.setHours(hours, minutes, 0, 0);
        dataPrevisaoEntrega = dateWithTime.toISOString();
      }

      const { error } = await supabase
        .from('solicitacoes_racao')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          tipo_racao: tipoRacao,
          quantidade_solicitada_kg: parseFloat(quantidade),
          data_prevista_entrega: dataPrevisaoEntrega,
          observacoes: observacoes || null,
          solicitado_por: user?.id,
          status: 'solicitado',
          nivel_estimado_kg: nivelSalvo,
        });

      if (error) throw error;

      toast.success('Solicitação de ração enviada!');
      setTipoRacao('');
      setQuantidade('');
      setDataPrevisao(undefined);
      setHoraPrevisao('');
      setObservacoes('');
      setNivelSalvo(null);
      setConsumoEstimado(null);
      fetchSolicitacoes();
      onSuccess();
      setActiveTab('pendentes');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarRecebimento = async (s: SolicitacaoRacao) => {
    if (!quantidadeRecebida) {
      toast.error('Informe a quantidade recebida');
      return;
    }

    const qtdRecebida = parseFloat(quantidadeRecebida);
    const qtdSolicitada = s.quantidade_solicitada_kg;
    const divergencia = qtdRecebida - qtdSolicitada;
    
    // Verificar devolução imediata
    const temDevolucaoImediata = registrarDevolucaoImediata === s.id && quantidadeDevolucaoImediata;
    let qtdDevolucao = 0;
    
    if (temDevolucaoImediata) {
      qtdDevolucao = parseFloat(quantidadeDevolucaoImediata);
      if (qtdDevolucao > qtdRecebida) {
        toast.error('Devolução não pode ser maior que o recebido');
        return;
      }
    }

    setLoading(true);
    try {
      // Se há divergência entre solicitado e recebido, gerar movimentação de Kardex
      if (divergencia !== 0) {
        // Buscar produto de ração pelo nome
        const { data: produtoData } = await supabase
          .from('produtos')
          .select('id, estoque_atual')
          .ilike('nome', s.tipo_racao)
          .eq('integrado_id', integradoId)
          .maybeSingle();

        if (produtoData) {
          if (divergencia < 0) {
            // RETORNO: Recebeu menos que o enviado - devolver ao estoque da fábrica
            const qtdRetorno = Math.abs(divergencia);
            
            await supabase.from('kardex').insert({
              produto_id: produtoData.id,
              integrado_id: integradoId,
              tipo_movimento: 'entrada_retorno_racao',
              quantidade: qtdRetorno,
              saldo_anterior: produtoData.estoque_atual,
              saldo_atual: produtoData.estoque_atual + qtdRetorno,
              documento_ref: `RET-${s.id.slice(0, 8)}`,
              observacao: `Retorno de ${qtdRetorno.toLocaleString('pt-BR')}kg não recebidos pelo lote (${nucleo}/${galpao})`,
            });

            // Atualizar estoque do produto
            await supabase
              .from('produtos')
              .update({ estoque_atual: produtoData.estoque_atual + qtdRetorno })
              .eq('id', produtoData.id);
          } else {
            // EXCESSO: Recebeu mais que o enviado - registrar saída extra
            await supabase.from('kardex').insert({
              produto_id: produtoData.id,
              integrado_id: integradoId,
              tipo_movimento: 'saida_extra_racao',
              quantidade: divergencia,
              saldo_anterior: produtoData.estoque_atual,
              saldo_atual: produtoData.estoque_atual - divergencia,
              documento_ref: `EXT-${s.id.slice(0, 8)}`,
              observacao: `${divergencia.toLocaleString('pt-BR')}kg extras enviados ao lote (${nucleo}/${galpao})`,
            });

            // Atualizar estoque do produto
            await supabase
              .from('produtos')
              .update({ estoque_atual: produtoData.estoque_atual - divergencia })
              .eq('id', produtoData.id);
          }
        }
      }

      const updateData: any = {
        status: 'recebido',
        quantidade_recebida_kg: qtdRecebida,
        data_recebimento: new Date().toISOString(),
        divergencia_kg: divergencia !== 0 ? divergencia : null,
      };
      
      // Se registrar devolução imediata
      if (temDevolucaoImediata && qtdDevolucao > 0) {
        updateData.quantidade_devolvida_kg = qtdDevolucao;
        updateData.data_devolucao = new Date().toISOString();
        updateData.devolucao_confirmada = false;
      }
      
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update(updateData)
        .eq('id', s.id);

      if (error) throw error;

      const msgDivergencia = divergencia !== 0 
        ? (divergencia < 0 
            ? ` Retorno de ${Math.abs(divergencia).toLocaleString('pt-BR')}kg registrado.` 
            : ` Saída extra de ${divergencia.toLocaleString('pt-BR')}kg registrada.`)
        : '';
      
      toast.success(
        temDevolucaoImediata 
          ? `Recebimento confirmado com devolução!${msgDivergencia}` 
          : `Recebimento confirmado!${msgDivergencia}`
      );
      setQuantidadeRecebida('');
      setRegistrarDevolucaoImediata(null);
      setQuantidadeDevolucaoImediata('');
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
      onSuccess();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelarSolicitacao = async (s: SolicitacaoRacao) => {
    if (!['solicitado', 'confirmado'].includes(s.status)) {
      toast.error('Solicitação já foi enviada e não pode ser cancelada');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          status: 'cancelado',
        })
        .eq('id', s.id);

      if (error) throw error;

      toast.success('Solicitação cancelada com sucesso');
      fetchSolicitacoes();
      onSuccess();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao cancelar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarDevolucao = async (s: SolicitacaoRacao) => {
    if (!quantidadeDevolvida) {
      toast.error('Informe a quantidade devolvida');
      return;
    }

    const qtdDevolvida = parseFloat(quantidadeDevolvida);
    if (qtdDevolvida > (s.quantidade_recebida_kg || 0)) {
      toast.error('Quantidade devolvida não pode ser maior que a recebida');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          quantidade_devolvida_kg: qtdDevolvida,
          data_devolucao: new Date().toISOString(),
          devolucao_confirmada: false,
        })
        .eq('id', s.id);

      if (error) throw error;

      toast.success('Devolução registrada! Aguardando confirmação do gestor.');
      setQuantidadeDevolvida('');
      setSelectedSolicitacao(null);
      fetchSolicitacoes();
      onSuccess();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao registrar devolução');
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
      cancelado: { label: 'Cancelado', variant: 'outline', icon: <XCircle className="w-3 h-3" /> },
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

  const pendentes = solicitacoes.filter(s => ['solicitado', 'confirmado', 'enviado'].includes(s.status));
  const recebidas = solicitacoes.filter(s => ['recebido', 'parcialmente_devolvido', 'devolvido'].includes(s.status));
  
  // Ordenar recebidas por data (mais recente primeiro) para identificar o último recebimento
  const recebidasOrdenadas = [...recebidas].sort((a, b) => 
    new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
  );
  const ultimoRecebimento = recebidasOrdenadas[0];

  const canShowSiloUpdateForm = siloInfo && linhagem && sexo && diasDesdeAlojamento !== undefined && avesVivas;
  const canRequestFeed = !siloInfo || nivelSalvo !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ração - {nucleo} / {galpao}
          </DialogTitle>
        </DialogHeader>

        {/* Nível do Silo - show only when we have the required data */}
        {linhagem && sexo && diasDesdeAlojamento !== undefined && diasDesdeAlojamento > 0 && avesVivas && avesVivas > 0 ? (
          <div className="mb-4">
            <NivelSiloCard
              key={siloRefreshKey}
              loteId={loteId}
              linhagem={linhagem}
              sexo={sexo}
              diasDesdeAlojamento={diasDesdeAlojamento}
              avesVivas={avesVivas}
              galpaoId={galpaoId}
              refreshKey={siloRefreshKey}
              onSugerirQuantidade={(qtd) => {
                setQuantidade(qtd.toString());
                setActiveTab('solicitar');
              }}
            />
          </div>
        ) : (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ração Recebida no Lote</p>
                <p className="text-2xl font-bold text-primary">{totalRacaoRecebida.toLocaleString('pt-BR')} kg</p>
              </div>
              <Package className="w-8 h-8 text-primary/50" />
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="solicitar" className="gap-2">
              <Plus className="w-4 h-4" />
              Solicitar
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="gap-2">
              <Truck className="w-4 h-4" />
              Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="recebidas" className="gap-2">
              <Download className="w-4 h-4" />
              Recebidas ({recebidas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solicitar" className="space-y-4 mt-4">
            {/* Step 1: Update Silo Level - Only show if silo is linked */}
            {canShowSiloUpdateForm && (
              <NivelSiloUpdateForm
                galpaoId={galpaoId}
                loteId={loteId}
                integradoId={integradoId}
                siloInfo={siloInfo!}
                diasDesdeAlojamento={diasDesdeAlojamento}
                avesVivas={avesVivas}
                linhagem={linhagem}
                sexo={sexo}
                onLevelSaved={handleLevelSaved}
                savedLevel={nivelSalvo}
              />
            )}

            {/* Step 2: Request Feed - Only enabled after saving level (or if no silo) */}
            <div className={cn(
              "border rounded-lg p-4 space-y-4 transition-opacity",
              siloInfo && !canRequestFeed && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">
                  {siloInfo ? 'Etapa 2: Solicitar Ração' : 'Solicitar Ração'}
                </h3>
                {siloInfo && !canRequestFeed && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Grave o nível do silo primeiro
                  </Badge>
                )}
              </div>

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
                    <Label>Data Previsão Entrega</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dataPrevisao && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataPrevisao ? format(dataPrevisao, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataPrevisao}
                          onSelect={setDataPrevisao}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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

                {/* Capacity validation alert */}
                {siloInfo && nivelSalvo !== null && consumoEstimado !== null && quantidade && parseFloat(quantidade) > 0 && (
                  <CapacidadeAlertCard
                    nivelAtual={nivelSalvo}
                    quantidadeSolicitada={parseFloat(quantidade)}
                    consumoAteEntrega={consumoEstimado}
                    capacidadeSilo={siloInfo.capacidade_toneladas * 1000}
                    diasAteEntrega={diasAteEntrega}
                  />
                )}

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

                <Button 
                  type="submit" 
                  disabled={loading || produtosRacao.length === 0 || (siloInfo && !canRequestFeed)} 
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="pendentes" className="mt-4">
            {pendentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-4">
                {pendentes.map((s) => (
                  <div key={s.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.tipo_racao}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(s.data_solicitacao)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSolicitacaoStatusBadge(s.status)}
                        
                        {/* Botão Cancelar - só para solicitado ou confirmado */}
                        {(s.status === 'solicitado' || s.status === 'confirmado') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Solicitação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar esta solicitação de {s.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg de {s.tipo_racao}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleCancelarSolicitacao(s)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirmar Cancelamento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span><strong>Solicitado:</strong> {s.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</span>
                      {s.data_prevista_entrega && (
                        <span><strong>Previsão:</strong> {formatDateTime(s.data_prevista_entrega)}</span>
                      )}
                    </div>
                    
                    {s.status === 'enviado' && (
                      <div className="pt-2 border-t space-y-4">
                        <div className="space-y-2">
                          <Label>Quantidade Recebida (kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={selectedSolicitacao?.id === s.id ? quantidadeRecebida : ''}
                            onChange={(e) => {
                              setSelectedSolicitacao(s);
                              setQuantidadeRecebida(e.target.value);
                            }}
                            placeholder={s.quantidade_solicitada_kg.toString()}
                          />
                        </div>
                        
                        {/* Checkbox para devolução imediata */}
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`devolucao-${s.id}`}
                            checked={registrarDevolucaoImediata === s.id}
                            onCheckedChange={(checked) => {
                              setRegistrarDevolucaoImediata(checked ? s.id : null);
                              if (!checked) setQuantidadeDevolucaoImediata('');
                            }}
                          />
                          <Label htmlFor={`devolucao-${s.id}`} className="text-sm cursor-pointer">
                            Registrar devolução parcial
                          </Label>
                        </div>
                        
                        {registrarDevolucaoImediata === s.id && (
                          <div className="space-y-2 pl-6">
                            <Label>Quantidade a Devolver (kg)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={quantidadeDevolucaoImediata}
                              onChange={(e) => setQuantidadeDevolucaoImediata(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleConfirmarRecebimento(s)}
                          disabled={loading || selectedSolicitacao?.id !== s.id || !quantidadeRecebida}
                          className="w-full gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {registrarDevolucaoImediata === s.id ? 'Receber com Devolução' : 'Confirmar Recebimento'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recebidas" className="mt-4">
            {recebidas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma ração recebida ainda.</p>
            ) : (
              <div className="space-y-4">
                {recebidas.map((s) => (
                  <div key={s.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.tipo_racao}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(s.data_solicitacao)}</p>
                      </div>
                      {getSolicitacaoStatusBadge(s.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span><strong>Recebido:</strong> {(s.quantidade_recebida_kg || 0).toLocaleString('pt-BR')} kg</span>
                      {s.quantidade_devolvida_kg && s.quantidade_devolvida_kg > 0 && (
                        <span className="flex items-center gap-1">
                          <strong>Devolvido:</strong> {s.quantidade_devolvida_kg.toLocaleString('pt-BR')} kg
                          {s.devolucao_confirmada && <CheckCircle className="w-4 h-4 text-primary" />}
                        </span>
                      )}
                    </div>
                    
                    {/* Só permite devolução no último recebimento e se não tiver devolução já */}
                    {s.status === 'recebido' && !s.quantidade_devolvida_kg && s.id === ultimoRecebimento?.id && (
                      <div className="pt-2 border-t space-y-2">
                        <Label>Registrar Devolução (kg)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={s.quantidade_recebida_kg || undefined}
                            value={selectedSolicitacao?.id === s.id ? quantidadeDevolvida : ''}
                            onChange={(e) => {
                              setSelectedSolicitacao(s);
                              setQuantidadeDevolvida(e.target.value);
                            }}
                            placeholder="0"
                          />
                          <Button 
                            variant="secondary"
                            onClick={() => handleRegistrarDevolucao(s)}
                            disabled={loading || selectedSolicitacao?.id !== s.id || !quantidadeDevolvida}
                            className="gap-1"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Devolver
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
