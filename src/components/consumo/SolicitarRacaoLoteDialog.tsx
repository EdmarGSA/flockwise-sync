import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Truck, SkipForward, Package, Save, CheckCircle, Clock } from 'lucide-react';
import { format, subDays, setHours, setMinutes, isValid, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { getDateDisabledFunction, isRetroactiveDate, MAX_RETROACTIVE_DAYS } from '@/lib/dateValidation';

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
  const { user } = useAuth();
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
  const [nivelSalvo, setNivelSalvo] = useState<number | null>(null);
  const [salvandoNivel, setSalvandoNivel] = useState(false);

  // Calculate suggested quantity (approx 50g per bird for initial days)
  const suggestedQuantity = Math.ceil((quantidadeAves * 50) / 1000); // Convert to kg

  // Ensure dataPrevistaAlojamento is a valid Date
  const validDataAlojamento = dataPrevistaAlojamento instanceof Date && isValid(dataPrevistaAlojamento) 
    ? dataPrevistaAlojamento 
    : new Date();

  // Generate ring options
  const opcoesAneis = useMemo(() => {
    if (!siloInfo) return [];
    const opcoes: { value: number; label: string }[] = [];
    for (let i = 0; i <= siloInfo.numero_aneis; i += 0.5) {
      const label = i === 0 ? 'Vazio (0)' : 
                    i === 0.5 ? '½ anel' :
                    i % 1 === 0 ? `${i} ${i === 1 ? 'anel' : 'anéis'}` : 
                    `${Math.floor(i)} ½ anéis`;
      opcoes.push({ value: i, label });
    }
    return opcoes;
  }, [siloInfo?.numero_aneis]);

  // Calculate estimated level in kg
  const nivelEstimadoKg = useMemo(() => {
    if (!siloInfo) return 0;
    const capacidadeKg = siloInfo.capacidade_toneladas * 1000;
    const capacidadeFunil = capacidadeKg * 0.15;
    const capacidadeAneis = capacidadeKg * 0.85;
    
    const volumeFunil = nivelFunil * capacidadeFunil;
    const volumeAneis = siloInfo.numero_aneis > 0 
      ? (nivelAneis / siloInfo.numero_aneis) * capacidadeAneis 
      : 0;
    return volumeFunil + volumeAneis;
  }, [nivelFunil, nivelAneis, siloInfo]);

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
      setNivelSalvo(null);
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
      // Buscar produtos de ração diretamente pelo grupo_animal_id (tipoProducao = UUID do grupo)
      const { data: produtosData, error } = await supabase
        .from('produtos')
        .select('id, nome, sku')
        .eq('grupo_animal_id', tipoProducao)
        .eq('ativo', true)
        .order('nome');

      if (!error && produtosData && produtosData.length > 0) {
        setProdutos(produtosData as Produto[]);
        setSelectedProdutoId(produtosData[0].id);
        return;
      }

      // Fallback 1: buscar produtos do grupo "Ração" do integrado
      const { data: grupoRacao } = await supabase
        .from('grupos_produto')
        .select('id')
        .eq('integrado_id', integradoId)
        .ilike('nome', '%ração%')
        .maybeSingle();

      if (grupoRacao) {
        const { data: racoes } = await supabase
          .from('produtos')
          .select('id, nome, sku')
          .eq('grupo_produto_id', grupoRacao.id)
          .eq('ativo', true)
          .order('nome')
          .limit(20);

        if (racoes && racoes.length > 0) {
          setProdutos(racoes as Produto[]);
          setSelectedProdutoId(racoes[0].id);
          return;
        }
      }

      // Fallback 2: buscar produtos com fase_animal vinculada (do integrado)
      const { data: allRacoes } = await supabase
        .from('produtos')
        .select('id, nome, sku')
        .not('fase_animal_id', 'is', null)
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome')
        .limit(20);

      if (allRacoes && allRacoes.length > 0) {
        setProdutos(allRacoes as Produto[]);
        setSelectedProdutoId(allRacoes[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const handleSaveNivel = async () => {
    if (salvandoNivel) return;
    setSalvandoNivel(true);

    try {
      const { error } = await supabase
        .from('historico_nivel_silo')
        .insert({
          galpao_id: galpaoId,
          lote_id: loteId,
          integrado_id: integradoId,
          nivel_funil: nivelFunil,
          nivel_aneis: nivelAneis,
          nivel_estimado_kg: nivelEstimadoKg,
          registrado_por: user?.id,
          observacoes: 'Nível inicial ao abrir lote',
        });

      if (error) throw error;

      setNivelSalvo(nivelEstimadoKg);
      toast.success('Nível do silo gravado!');
    } catch (error) {
      console.error('Erro ao gravar nível:', error);
      toast.error('Erro ao gravar nível do silo');
    } finally {
      setSalvandoNivel(false);
    }
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

    // Capacity validation
    if (siloInfo && nivelSalvo !== null) {
      const capacidadeKg = siloInfo.capacidade_toneladas * 1000;
      const nivelAposRecebimento = nivelSalvo + parseFloat(quantidade);
      
      if (nivelAposRecebimento > capacidadeKg) {
        const excesso = nivelAposRecebimento - capacidadeKg;
        toast.error(`Quantidade excede capacidade do silo em ${excesso.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`);
        return;
      }
    }

    setLoading(true);
    try {
      // Get product name for tipo_racao field
      const selectedProduto = produtos.find(p => p.id === selectedProdutoId);
      
      // Combine date and time
      const [hours, minutes] = horaEntrega.split(':').map(Number);
      const dataHoraPrevista = setMinutes(setHours(dataEntrega, hours), minutes);

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
        nivel_estimado_kg: nivelSalvo,
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

  const capacidadeKg = siloInfo ? siloInfo.capacidade_toneladas * 1000 : 0;
  const percentualPreenchido = capacidadeKg > 0 ? (nivelEstimadoKg / capacidadeKg) * 100 : 0;
  const canRequestFeed = !siloInfo || nivelSalvo !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Step 1: Silo level selector - only show if silo is linked */}
          {siloInfo && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4 text-primary" />
                  Etapa 1: Nível do Silo
                  {nivelSalvo !== null && (
                    <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Gravado
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Funil</Label>
                    <Select 
                      value={nivelFunil.toString()} 
                      onValueChange={(v) => setNivelFunil(parseFloat(v))}
                      disabled={nivelSalvo !== null}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Vazio (0)</SelectItem>
                        <SelectItem value="0.5">Meio (½)</SelectItem>
                        <SelectItem value="1">Cheio (1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Anéis preenchidos</Label>
                    <Select 
                      value={nivelAneis.toString()} 
                      onValueChange={(v) => setNivelAneis(parseFloat(v))}
                      disabled={nivelSalvo !== null}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesAneis.map((opcao) => (
                          <SelectItem key={opcao.value} value={opcao.value.toString()}>
                            {opcao.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Visual representation */}
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-16 flex flex-col">
                    <div className="flex-1 bg-muted rounded-t-sm border border-border overflow-hidden flex flex-col-reverse">
                      <div 
                        className="bg-amber-500/70 transition-all duration-300"
                        style={{ height: `${Math.min(percentualPreenchido, 100)}%` }}
                      />
                    </div>
                    <div 
                      className="h-3 border-l border-r border-b border-border"
                      style={{
                        clipPath: 'polygon(0% 0%, 100% 0%, 70% 100%, 30% 100%)',
                        background: nivelFunil > 0 
                          ? `linear-gradient(to bottom, rgb(245 158 11 / 0.7) ${nivelFunil * 100}%, hsl(var(--muted)) ${nivelFunil * 100}%)`
                          : 'hsl(var(--muted))'
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Estimativa:</p>
                    <p className="text-lg font-bold text-primary">
                      {nivelEstimadoKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (~{percentualPreenchido.toFixed(0)}% do silo)
                    </p>
                  </div>
                </div>

                {nivelSalvo === null && (
                  <Button 
                    onClick={handleSaveNivel} 
                    disabled={salvandoNivel}
                    className="w-full gap-2"
                    variant="secondary"
                    size="sm"
                  >
                    <Save className="w-4 h-4" />
                    {salvandoNivel ? 'Gravando...' : 'Gravar Nível'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Feed request form */}
          <div className={cn(
            "space-y-4 transition-opacity",
            siloInfo && !canRequestFeed && "opacity-50 pointer-events-none"
          )}>
            {siloInfo && (
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">Etapa 2: Solicitar Ração</h4>
                {!canRequestFeed && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Grave o nível primeiro
                  </Badge>
                )}
              </div>
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

            {/* Capacity check */}
            {siloInfo && nivelSalvo !== null && quantidade && parseFloat(quantidade) > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nível atual:</span>
                  <span>{nivelSalvo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Após recebimento:</span>
                  <span className={cn(
                    "font-medium",
                    (nivelSalvo + parseFloat(quantidade)) > capacidadeKg ? "text-red-600" : "text-green-600"
                  )}>
                    {(nivelSalvo + parseFloat(quantidade)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Capacidade:</span>
                  <span>{capacidadeKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
                </div>
                {(nivelSalvo + parseFloat(quantidade)) > capacidadeKg && (
                  <p className="text-red-600 text-xs mt-2">
                    ⚠️ Excede capacidade em {((nivelSalvo + parseFloat(quantidade)) - capacidadeKg).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                  </p>
                )}
              </div>
            )}

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
                      disabled={getDateDisabledFunction(true)}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                    <div className="px-3 pb-3 text-xs text-muted-foreground text-center border-t pt-2">
                      Retroativo até {MAX_RETROACTIVE_DAYS} dias | Futuro liberado
                    </div>
                  </PopoverContent>
                </Popover>
                {dataEntrega && isRetroactiveDate(dataEntrega) && (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1 mt-1 ml-0">
                    <Clock className="w-3 h-3" />
                    Retroativo
                  </Badge>
                )}
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
            disabled={loading || produtos.length === 0 || (siloInfo && !canRequestFeed)}
            className="flex-1 sm:flex-none"
          >
            {loading ? 'Enviando...' : 'Solicitar Ração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
