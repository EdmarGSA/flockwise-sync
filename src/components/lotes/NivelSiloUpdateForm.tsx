import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Package, Save, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { format, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getDateDisabledFunction, isRetroactiveDate, MAX_RETROACTIVE_DAYS } from '@/lib/dateValidation';

interface SiloInfo {
  numero_aneis: number;
  capacidade_toneladas: number;
}

interface NivelSiloUpdateFormProps {
  galpaoId: string;
  loteId: string;
  integradoId: string;
  siloInfo: SiloInfo;
  diasDesdeAlojamento?: number;
  avesVivas?: number;
  linhagem?: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo?: 'macho' | 'femea' | 'misto';
  onLevelSaved: (nivelEstimadoKg: number) => void;
  savedLevel?: number | null;
}

interface HistoricoNivel {
  nivel_estimado_kg: number;
  created_at: string;
}

interface RacaoRecebida {
  quantidade_recebida_kg: number;
  data_recebimento: string;
}

export function NivelSiloUpdateForm({
  galpaoId,
  loteId,
  integradoId,
  siloInfo,
  diasDesdeAlojamento,
  avesVivas,
  linhagem,
  sexo,
  onLevelSaved,
  savedLevel,
}: NivelSiloUpdateFormProps) {
  const { user } = useAuth();
  const [nivelFunil, setNivelFunil] = useState(0);
  const [nivelAneis, setNivelAneis] = useState(0);
  const [loading, setSaving] = useState(false);
  const [nivelEsperado, setNivelEsperado] = useState<number | null>(null);
  const [lastHistorico, setLastHistorico] = useState<HistoricoNivel | null>(null);
  const [dataRegistro, setDataRegistro] = useState<Date>(new Date());
  const [horaRegistro, setHoraRegistro] = useState<string>('08:00');

  // Generate ring options from 0 to numeroAneis in 0.5 increments
  const opcoesAneis = useMemo(() => {
    const opcoes: { value: number; label: string }[] = [];
    for (let i = 0; i <= siloInfo.numero_aneis; i += 0.5) {
      const label = i === 0 ? 'Vazio (0)' : 
                    i === 0.5 ? '½ anel' :
                    i % 1 === 0 ? `${i} ${i === 1 ? 'anel' : 'anéis'}` : 
                    `${Math.floor(i)} ½ anéis`;
      opcoes.push({ value: i, label });
    }
    return opcoes;
  }, [siloInfo.numero_aneis]);

  // Calculate estimated remaining feed in kg
  const capacidadeKg = siloInfo.capacidade_toneladas * 1000;
  const capacidadeFunil = capacidadeKg * 0.15;
  const capacidadeAneis = capacidadeKg * 0.85;

  const nivelEstimadoKg = useMemo(() => {
    const volumeFunil = nivelFunil * capacidadeFunil;
    const volumeAneis = siloInfo.numero_aneis > 0 
      ? (nivelAneis / siloInfo.numero_aneis) * capacidadeAneis 
      : 0;
    return volumeFunil + volumeAneis;
  }, [nivelFunil, nivelAneis, capacidadeFunil, capacidadeAneis, siloInfo.numero_aneis]);

  const percentualPreenchido = capacidadeKg > 0 ? (nivelEstimadoKg / capacidadeKg) * 100 : 0;

  // Calculate divergence
  const divergenciaPercentual = useMemo(() => {
    if (nivelEsperado === null || nivelEsperado === 0) return null;
    return ((nivelEstimadoKg - nivelEsperado) / nivelEsperado) * 100;
  }, [nivelEstimadoKg, nivelEsperado]);

  // Fetch last historical level and calculate expected level
  useEffect(() => {
    fetchLastHistorico();
  }, [galpaoId, loteId, dataRegistro, horaRegistro]);

  const fetchLastHistorico = async () => {
    try {
      // Combine date and time for calculation reference
      const [hours, minutes] = horaRegistro.split(':').map(Number);
      const dataHoraRegistro = setMinutes(setHours(dataRegistro, hours), minutes);
      
      // Get last recorded level BEFORE the selected registration date
      const { data: historico, error: historicoError } = await supabase
        .from('historico_nivel_silo')
        .select('nivel_estimado_kg, created_at')
        .eq('galpao_id', galpaoId)
        .lt('created_at', dataHoraRegistro.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historicoError) {
        console.error('Erro ao buscar histórico:', historicoError);
        return;
      }

      // If no history exists before selected date, calculate expected level from total received - total consumed
      if (!historico) {
        setLastHistorico(null);
        
        // Calculate expected level for first recording (up to selected date)
        if (diasDesdeAlojamento !== undefined && avesVivas && linhagem && sexo) {
          // Get all feed received for this lot UP TO the selected date
          const { data: racaoRecebida } = await supabase
            .from('solicitacoes_racao')
            .select('quantidade_recebida_kg, data_recebimento')
            .eq('lote_id', loteId)
            .eq('status', 'recebido')
            .lte('data_recebimento', dataHoraRegistro.toISOString());

          const totalRecebido = racaoRecebida?.reduce((sum, r) => sum + (r.quantidade_recebida_kg || 0), 0) || 0;

          // Calculate days since housing up to selected date
          // (simplified: use current diasDesdeAlojamento as approximation)
          const { data: consumoData } = await supabase
            .from('desempenho_aves')
            .select('dia, consumo_diario_racao_g')
            .eq('linhagem', linhagem)
            .eq('sexo', sexo)
            .gte('dia', 1)
            .lte('dia', diasDesdeAlojamento);

          if (consumoData && consumoData.length > 0) {
            const consumoTotalGramas = consumoData.reduce((sum, d) => sum + d.consumo_diario_racao_g, 0);
            const consumoEstimado = (consumoTotalGramas * avesVivas) / 1000; // Convert to kg
            const expected = totalRecebido - consumoEstimado;
            setNivelEsperado(Math.max(0, expected));
          } else {
            setNivelEsperado(null);
          }
        } else {
          setNivelEsperado(null);
        }
        return;
      }

      setLastHistorico(historico);

      // Calculate expected level based on:
      // nivel_anterior + racao_recebida_entre_ultima_atualizacao_e_data_selecionada - consumo_estimado

      const lastDate = new Date(historico.created_at);
      let nivelAnterior = historico.nivel_estimado_kg;

      // Get feed received BETWEEN last update and selected date (not current date!)
      const { data: racaoRecebida } = await supabase
        .from('solicitacoes_racao')
        .select('quantidade_recebida_kg, data_recebimento')
        .eq('lote_id', loteId)
        .eq('status', 'recebido')
        .gt('data_recebimento', lastDate.toISOString())
        .lte('data_recebimento', dataHoraRegistro.toISOString());

      const totalRecebido = racaoRecebida?.reduce((sum, r) => sum + (r.quantidade_recebida_kg || 0), 0) || 0;

      // Calculate estimated consumption between last update and selected date
      let consumoEstimado = 0;
      if (diasDesdeAlojamento !== undefined && avesVivas && linhagem && sexo) {
        const diasDesdeUltimaAtualizacao = Math.floor(
          (dataHoraRegistro.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diasDesdeUltimaAtualizacao > 0) {
          // Get consumption data from desempenho_aves
          const diaInicio = Math.max(1, diasDesdeAlojamento - diasDesdeUltimaAtualizacao);
          const { data: consumoData } = await supabase
            .from('desempenho_aves')
            .select('dia, consumo_diario_racao_g')
            .eq('linhagem', linhagem)
            .eq('sexo', sexo)
            .gte('dia', diaInicio)
            .lte('dia', diasDesdeAlojamento);

          if (consumoData && consumoData.length > 0) {
            const consumoTotalGramas = consumoData.reduce((sum, d) => sum + d.consumo_diario_racao_g, 0);
            consumoEstimado = (consumoTotalGramas * avesVivas) / 1000; // Convert to kg
          }
        }
      }

      const expected = nivelAnterior + totalRecebido - consumoEstimado;
      setNivelEsperado(Math.max(0, expected));
    } catch (error) {
      console.error('Erro ao calcular nível esperado:', error);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    setSaving(true);

    try {
      const divergencia = divergenciaPercentual;
      const alertaDivergencia = divergencia !== null && Math.abs(divergencia) > 20;

      // Combine date and time
      const [hours, minutes] = horaRegistro.split(':').map(Number);
      const dataHoraRegistro = setMinutes(setHours(dataRegistro, hours), minutes);

      const { error } = await supabase
        .from('historico_nivel_silo')
        .insert({
          galpao_id: galpaoId,
          lote_id: loteId,
          integrado_id: integradoId,
          nivel_funil: nivelFunil,
          nivel_aneis: nivelAneis,
          nivel_estimado_kg: nivelEstimadoKg,
          nivel_esperado_kg: nivelEsperado,
          divergencia_percentual: divergencia,
          divergencia_alerta: alertaDivergencia,
          registrado_por: user?.id,
          created_at: dataHoraRegistro.toISOString(),
        });

      if (error) throw error;

      toast.success('Nível do silo gravado com sucesso!');
      onLevelSaved(nivelEstimadoKg);
    } catch (error) {
      console.error('Erro ao gravar nível:', error);
      toast.error('Erro ao gravar nível do silo');
    } finally {
      setSaving(false);
    }
  };

  const getDivergenciaBadge = () => {
    if (divergenciaPercentual === null) return null;

    const absDiv = Math.abs(divergenciaPercentual);
    const isPositive = divergenciaPercentual > 0;

    if (absDiv <= 10) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <CheckCircle className="w-3 h-3" />
          Nível consistente
        </Badge>
      );
    } else if (absDiv <= 20) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1">
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          Divergência moderada ({divergenciaPercentual.toFixed(0)}%)
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Divergência significativa ({divergenciaPercentual.toFixed(0)}%)
        </Badge>
      );
    }
  };

  const isAlreadySaved = savedLevel !== null && savedLevel !== undefined;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="w-4 h-4 text-primary" />
          Etapa 1: Atualizar Nível do Silo
          {isAlreadySaved && (
            <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Gravado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date and Time Picker */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Data e Hora do Registro</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isAlreadySaved}
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !dataRegistro && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataRegistro ? format(dataRegistro, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataRegistro}
                  onSelect={(date) => date && setDataRegistro(date)}
                  disabled={getDateDisabledFunction()}
                  initialFocus
                  className="pointer-events-auto"
                  locale={ptBR}
                />
                <div className="px-3 pb-3 text-xs text-muted-foreground text-center border-t pt-2">
                  Limite: até {MAX_RETROACTIVE_DAYS} dias retroativos
                </div>
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={horaRegistro}
              onChange={(e) => setHoraRegistro(e.target.value)}
              disabled={isAlreadySaved}
              className="w-28"
            />
          </div>
          {isRetroactiveDate(dataRegistro) && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
              <Clock className="w-3 h-3" />
              Registro retroativo
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Funil</Label>
            <Select 
              value={nivelFunil.toString()} 
              onValueChange={(v) => setNivelFunil(parseFloat(v))}
              disabled={isAlreadySaved}
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
              disabled={isAlreadySaved}
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

        {/* Visual silo representation and estimates */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-20 flex flex-col">
            {/* Silo body (rings) */}
            <div className="flex-1 bg-muted rounded-t-sm border border-border overflow-hidden flex flex-col-reverse">
              <div 
                className="bg-amber-500/70 transition-all duration-300"
                style={{ height: `${Math.min(percentualPreenchido, 100)}%` }}
              />
            </div>
            {/* Funnel */}
            <div 
              className="h-4 border-l border-r border-b border-border"
              style={{
                clipPath: 'polygon(0% 0%, 100% 0%, 70% 100%, 30% 100%)',
                background: nivelFunil > 0 
                  ? `linear-gradient(to bottom, rgb(245 158 11 / 0.7) ${nivelFunil * 100}%, hsl(var(--muted)) ${nivelFunil * 100}%)`
                  : 'hsl(var(--muted))'
              }}
            />
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">Estimativa informada:</p>
            <p className="text-xl font-bold text-primary">
              {nivelEstimadoKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </p>
            <p className="text-xs text-muted-foreground">
              (~{percentualPreenchido.toFixed(0)}% do silo)
            </p>
          </div>
        </div>

        {/* Expected level comparison */}
        {nivelEsperado !== null && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nível esperado (sistema):</span>
              <span className="font-medium">
                {nivelEsperado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Status:</span>
              {getDivergenciaBadge()}
            </div>
          </div>
        )}

        {/* Divergence alert */}
        {divergenciaPercentual !== null && Math.abs(divergenciaPercentual) > 20 && nivelEsperado !== null && (
          <Alert variant={divergenciaPercentual > 0 ? "default" : "destructive"} className={divergenciaPercentual > 0 ? "border-blue-500 bg-blue-50 text-blue-800" : ""}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">
                Informado: {nivelEstimadoKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg | 
                Esperado: {nivelEsperado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg | 
                Diferença: {divergenciaPercentual > 0 ? '+' : ''}{divergenciaPercentual.toFixed(0)}%
              </span>
              <br />
              {divergenciaPercentual > 0 
                ? 'O nível informado está acima do esperado. Verifique se houve recebimento não registrado no sistema.'
                : 'O nível informado está abaixo do esperado. Verifique se há perdas, vazamentos ou consumo não contabilizado.'}
            </AlertDescription>
          </Alert>
        )}

        {!isAlreadySaved && (
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full gap-2"
            variant="secondary"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Gravando...' : 'Gravar Nível'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
