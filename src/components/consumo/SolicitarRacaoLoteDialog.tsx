import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Truck, SkipForward } from 'lucide-react';
import { format, subDays, setHours, setMinutes, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NivelSiloSelector } from '@/components/lotes/NivelSiloSelector';

interface Produto {
  id: string;
  nome: string;
  sku: string;
}

interface SiloInfo {
  numero_aneis: number;
  capacidade_toneladas: number;
}

interface SolicitarRacaoLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  galpaoId: string;
  tipoProducao: string;
  quantidadeAves: number;
  dataPrevistaAlojamento: Date;
  onSuccess?: () => void;
  onSkip?: () => void;
}

export function SolicitarRacaoLoteDialog({
  open,
  onOpenChange,
  loteId,
  integradoId,
  galpaoId,
  tipoProducao,
  quantidadeAves,
  dataPrevistaAlojamento,
  onSuccess,
  onSkip,
}: SolicitarRacaoLoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>('');
  const [dataEntrega, setDataEntrega] = useState<Date | undefined>();
  const [horaEntrega, setHoraEntrega] = useState<string>('08:00');

  // Silo state
  const [siloInfo, setSiloInfo] = useState<SiloInfo | null>(null);
  const [nivelFunil, setNivelFunil] = useState(0);
  const [nivelAneis, setNivelAneis] = useState(0);

  // Calculate suggested quantity (approx 50g per bird for initial days)
  const suggestedQuantity = Math.ceil((quantidadeAves * 50) / 1000); // Convert to kg

  // Ensure dataPrevistaAlojamento is a valid Date
  const validDataAlojamento = dataPrevistaAlojamento instanceof Date && isValid(dataPrevistaAlojamento) 
    ? dataPrevistaAlojamento 
    : new Date();

  useEffect(() => {
    if (open) {
      fetchProdutosRacao();
      fetchSiloInfo();
      // Suggest delivery 1 day before housing
      setDataEntrega(subDays(validDataAlojamento, 1));
      setQuantidade(suggestedQuantity.toString());
      // Reset silo levels
      setNivelFunil(0);
      setNivelAneis(0);
    }
  }, [open, tipoProducao, validDataAlojamento, suggestedQuantity, galpaoId]);

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

  const fetchProdutosRacao = async () => {
    try {
      // Get products that are type 'racao' and belong to the correct animal group
      const { data: fases, error: fasesError } = await supabase
        .from('fases_animal')
        .select('produto_racao_id')
        .eq('grupo_id', tipoProducao)
        .not('produto_racao_id', 'is', null);

      if (fasesError) {
        console.error('Erro ao buscar fases:', fasesError);
      }

      const produtoIds = fases?.map(f => f.produto_racao_id).filter(Boolean) || [];

      if (produtoIds.length > 0) {
        const { data: produtosData, error } = await supabase
          .from('produtos')
          .select('id, nome, sku')
          .in('id', produtoIds)
          .eq('ativo', true);

        if (!error && produtosData) {
          setProdutos(produtosData as Produto[]);
          if (produtosData.length > 0) {
            setSelectedProdutoId(produtosData[0].id);
          }
        }
      }

      // Fallback: get all products from fases_animal (any group) if no specific ones found
      if (produtoIds.length === 0) {
        const { data: todasFases } = await supabase
          .from('fases_animal')
          .select('produto_racao_id')
          .not('produto_racao_id', 'is', null);
        
        const todosIds = [...new Set(todasFases?.map(f => f.produto_racao_id).filter(Boolean) || [])];
        
        if (todosIds.length > 0) {
          const { data: allRacoes, error } = await supabase
            .from('produtos')
            .select('id, nome, sku')
            .in('id', todosIds)
            .eq('ativo', true)
            .limit(20);

          if (!error && allRacoes) {
            setProdutos(allRacoes as Produto[]);
            if (allRacoes.length > 0) {
              setSelectedProdutoId(allRacoes[0].id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  // Calculate estimated level in kg based on silo selector
  const calcularNivelEstimadoKg = () => {
    if (!siloInfo) return null;
    const capacidadeKg = siloInfo.capacidade_toneladas * 1000;
    const capacidadeFunil = capacidadeKg * 0.15;
    const capacidadeAneis = capacidadeKg * 0.85;
    
    const volumeFunil = nivelFunil * capacidadeFunil;
    const volumeAneis = siloInfo.numero_aneis > 0 
      ? (nivelAneis / siloInfo.numero_aneis) * capacidadeAneis 
      : 0;
    return volumeFunil + volumeAneis;
  };

  const handleSubmit = async () => {
    if (!selectedProdutoId) {
      toast.error('Selecione um tipo de ração');
      return;
    }
    if (!quantidade || parseFloat(quantidade) <= 0) {
      toast.error('Informe a quantidade');
      return;
    }
    if (!dataEntrega) {
      toast.error('Selecione a data de entrega');
      return;
    }

    setLoading(true);
    try {
      // Get product name for tipo_racao field
      const selectedProduto = produtos.find(p => p.id === selectedProdutoId);
      
      // Combine date and time
      const [hours, minutes] = horaEntrega.split(':').map(Number);
      const dataHoraPrevista = setMinutes(setHours(dataEntrega, hours), minutes);

      // Calculate estimated silo level
      const nivelEstimadoKg = calcularNivelEstimadoKg();

      const { error } = await supabase.from('solicitacoes_racao').insert({
        lote_id: loteId,
        integrado_id: integradoId,
        tipo_racao: selectedProduto?.nome || 'Ração Inicial',
        quantidade_solicitada_kg: parseFloat(quantidade),
        data_prevista_entrega: dataHoraPrevista.toISOString(),
        status: 'solicitado',
        observacoes: 'Solicitação criada ao abrir lote',
        nivel_funil: siloInfo ? nivelFunil : null,
        nivel_aneis: siloInfo ? nivelAneis : null,
        nivel_estimado_kg: nivelEstimadoKg,
      });

      if (error) throw error;

      toast.success('Solicitação de ração criada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao criar solicitação de ração');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSkip?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Solicitar Ração para o Novo Lote
          </DialogTitle>
          <DialogDescription>
            Garanta que a ração chegue antes dos pintinhos. Você pode pular esta etapa e criar a solicitação depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p><strong>Alojamento previsto:</strong> {format(validDataAlojamento, "dd/MM/yyyy", { locale: ptBR })}</p>
            <p><strong>Quantidade de aves:</strong> {quantidadeAves.toLocaleString('pt-BR')}</p>
          </div>

          {/* Silo level selector - only show if silo is linked */}
          {siloInfo && (
            <NivelSiloSelector
              numeroAneis={siloInfo.numero_aneis}
              capacidadeToneladas={siloInfo.capacidade_toneladas}
              nivelFunil={nivelFunil}
              nivelAneis={nivelAneis}
              onNivelFunilChange={setNivelFunil}
              onNivelAneisChange={setNivelAneis}
            />
          )}

          <div className="space-y-2">
            <Label>Tipo de Ração</Label>
            <Select value={selectedProdutoId} onValueChange={setSelectedProdutoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a ração" />
              </SelectTrigger>
              <SelectContent>
                {produtos.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma ração cadastrada
                  </SelectItem>
                ) : (
                  produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.sku} - {produto.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade (kg)</Label>
            <Input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Quantidade em kg"
            />
            <p className="text-xs text-muted-foreground">
              Sugestão: {suggestedQuantity.toLocaleString('pt-BR')} kg (50g/ave)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataEntrega && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataEntrega ? format(dataEntrega, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataEntrega}
                    onSelect={setDataEntrega}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={horaEntrega}
                onChange={(e) => setHoraEntrega(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Pular
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || produtos.length === 0}
            className="flex-1 sm:flex-none"
          >
            {loading ? 'Enviando...' : 'Solicitar Ração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
