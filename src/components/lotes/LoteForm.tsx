import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SolicitarRacaoLoteDialog } from '@/components/consumo/SolicitarRacaoLoteDialog';
const loteSchema = z.object({
  nucleo_id: z.string().uuid('Selecione um núcleo'),
  galpao_id: z.string().uuid('Selecione um galpão'),
  quantidade_aves: z.string().min(1, 'Quantidade obrigatória'),
  data_prevista_alojamento: z.date({ required_error: 'Data prevista obrigatória' }),
  linhagem: z.string().min(1, 'Selecione uma linhagem'),
  sexo: z.enum(['macho', 'femea', 'misto']),
  veterinario_id: z.string().optional(),
  criador_id: z.string().optional(),
  observacoes: z.string().optional(),
  custo_aves: z.string().optional(),
});

type LoteFormData = z.infer<typeof loteSchema>;

interface LinhagemOption {
  value: string;
  label: string;
}

interface Nucleo {
  id: string;
  nome: string;
}

interface Galpao {
  id: string;
  nome: string;
  nucleo_id: string;
  total_aves: number | null;
  has_active_lote?: boolean;
}

interface Veterinario {
  id: string;
  full_name: string;
}

interface Criador {
  id: string;
  full_name: string;
}

interface LoteFormProps {
  onSuccess?: () => void;
}

export function LoteForm({ onSuccess }: LoteFormProps) {
  const { user } = useAuth();
  const { integradoId } = useIntegradoId();
  const [loading, setLoading] = useState(false);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [criadores, setCriadores] = useState<Criador[]>([]);
  const [selectedNucleoId, setSelectedNucleoId] = useState<string>('');
  const [availableSexos, setAvailableSexos] = useState<string[]>([]);
  const [selectedLinhagem, setSelectedLinhagem] = useState<string>('');
  const [linhagens, setLinhagens] = useState<LinhagemOption[]>([]);
  
  // State for feed request dialog
  const [showRacaoDialog, setShowRacaoDialog] = useState(false);
  const [novoLoteData, setNovoLoteData] = useState<{
    loteId: string;
    galpaoId: string;
    tipoProducao: string;
    quantidadeAves: number;
    dataPrevistaAlojamento: Date;
  } | null>(null);
  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      nucleo_id: '',
      galpao_id: '',
      quantidade_aves: '',
      linhagem: '',
      sexo: 'misto',
      veterinario_id: '',
      criador_id: '',
      observacoes: '',
      custo_aves: '',
    },
  });

  useEffect(() => {
    fetchNucleos();
    fetchVeterinarios();
    fetchLinhagens();
    fetchCriadores();
  }, []);

  useEffect(() => {
    if (selectedNucleoId) {
      fetchGalpoes(selectedNucleoId);
      form.setValue('galpao_id', '');
    }
  }, [selectedNucleoId]);

  useEffect(() => {
    if (selectedLinhagem) {
      fetchSexosByLinhagem(selectedLinhagem);
      form.setValue('sexo', 'misto');
    }
  }, [selectedLinhagem]);

  const linhagemLabels: Record<string, string> = {
    cobb_500: 'Cobb 500',
    ross_308: 'Ross 308',
    hubbard: 'Hubbard',
  };

  const fetchLinhagens = async () => {
    const { data, error } = await supabase
      .from('desempenho_aves')
      .select('linhagem');
    
    if (error) {
      console.error('Erro ao buscar linhagens:', error);
      return;
    }
    
    const uniqueLinhagens = [...new Set(data?.map(d => d.linhagem).filter(Boolean) || [])];
    const options = uniqueLinhagens.map(l => ({
      value: l,
      label: linhagemLabels[l] || l
    }));
    setLinhagens(options);
    
    // Set default if available
    if (options.length > 0 && !form.getValues('linhagem')) {
      form.setValue('linhagem', options[0].value);
      setSelectedLinhagem(options[0].value);
      fetchSexosByLinhagem(options[0].value);
    }
  };

  const fetchSexosByLinhagem = async (linhagem: string) => {
    if (!linhagem) return;
    
    const { data, error } = await supabase
      .from('desempenho_aves')
      .select('sexo')
      .eq('linhagem', linhagem as any);
    
    if (error) {
      console.error('Erro ao buscar sexos:', error);
      return;
    }
    
    const uniqueSexos = [...new Set(data?.map(d => d.sexo).filter(Boolean) || [])];
    setAvailableSexos(uniqueSexos.length > 0 ? uniqueSexos : ['misto']);
  };

  const fetchNucleos = async () => {
    // Fetch grupo_animal "Aves Corte" to get its ID
    const { data: gruposData } = await supabase
      .from('grupos_animal')
      .select('id')
      .ilike('nome', '%corte%')
      .limit(1);
    
    const grupoCorteId = gruposData?.[0]?.id;
    
    let query = supabase
      .from('nucleos')
      .select('id, nome')
      .eq('ativo', true);
    
    if (grupoCorteId) {
      query = query.eq('tipo_producao', grupoCorteId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar núcleos:', error);
      return;
    }
    setNucleos(data || []);
  };

  const fetchGalpoes = async (nucleoId: string) => {
    const { data: galpoesData, error } = await supabase
      .from('galpoes')
      .select('id, nome, nucleo_id, total_aves')
      .eq('nucleo_id', nucleoId)
      .eq('ativo', true);
    
    if (error) {
      console.error('Erro ao buscar galpões:', error);
      return;
    }

    // Check which galpoes have active lotes
    const galpoesWithStatus = await Promise.all(
      (galpoesData || []).map(async (galpao) => {
        const { data: lotes } = await supabase
          .from('lotes')
          .select('id')
          .eq('galpao_id', galpao.id)
          .in('status', ['previsao', 'alojado'])
          .limit(1);
        
        return {
          ...galpao,
          has_active_lote: (lotes && lotes.length > 0),
        };
      })
    );

    setGalpoes(galpoesWithStatus);
  };

  const fetchVeterinarios = async () => {
    const { data, error } = await supabase.rpc('get_veterinarios');
    
    if (error) {
      console.error('Erro ao buscar veterinários:', error);
      return;
    }
    setVeterinarios(data || []);
  };

  const fetchCriadores = async () => {
    const { data, error } = await supabase.rpc('get_criadores' as any);
    
    if (error) {
      console.error('Erro ao buscar criadores:', error);
      return;
    }
    setCriadores((data as Criador[]) || []);
  };

  const onSubmit = async (data: LoteFormData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    // Check if galpao has active lote
    const selectedGalpao = galpoes.find(g => g.id === data.galpao_id);
    if (selectedGalpao?.has_active_lote) {
      toast.error('Este galpão já possui um lote ativo');
      return;
    }

    setLoading(true);
    try {
      // Get tipo_producao from nucleo
      const selectedNucleo = nucleos.find(n => n.id === data.nucleo_id);
      const { data: nucleoData } = await supabase
        .from('nucleos')
        .select('tipo_producao')
        .eq('id', data.nucleo_id)
        .single();

      const { data: insertedLote, error } = await supabase.from('lotes').insert({
        nucleo_id: data.nucleo_id,
        galpao_id: data.galpao_id,
        quantidade_aves: parseInt(data.quantidade_aves),
        data_prevista_alojamento: format(data.data_prevista_alojamento, 'yyyy-MM-dd'),
        linhagem: data.linhagem as any,
        sexo: data.sexo,
        veterinario_id: data.veterinario_id || null,
        criador_id: data.criador_id || null,
        observacoes: data.observacoes || null,
        integrado_id: integradoId,
        status: 'previsao',
        custo_aves: data.custo_aves ? parseFloat(data.custo_aves) * parseInt(data.quantidade_aves) : null,
      }).select('id').single();

      if (error) throw error;

      // Buscar multiplicadores para a linhagem e sexo selecionados
      const { data: multiplicadores } = await supabase
        .from('multiplicadores_meta_peso')
        .select('*')
        .eq('integrado_id', integradoId)
        .eq('linhagem', data.linhagem as 'cobb_500' | 'ross_308' | 'hubbard')
        .eq('sexo', data.sexo as 'macho' | 'femea' | 'misto')
        .maybeSingle();

      // Se existirem multiplicadores cadastrados, criar metas automaticamente
      if (multiplicadores && insertedLote) {
        // Usar peso médio padrão de pintinhos se não informado (40g = 0.040kg)
        const pesoInicialKg = 0.040;
        const meta7 = pesoInicialKg * multiplicadores.mult_7_dias;
        const meta14 = meta7 * multiplicadores.mult_14_dias;
        const meta21 = meta14 * multiplicadores.mult_21_dias;
        const meta28 = meta21 * multiplicadores.mult_28_dias;
        const meta35 = meta28 * multiplicadores.mult_35_dias;
        const meta42 = meta35 * multiplicadores.mult_42_dias;
        const gpd = (meta42 - pesoInicialKg) / 42;

        await supabase.from('metas_peso').insert({
          lote_id: insertedLote.id,
          integrado_id: integradoId,
          peso_inicial_kg: pesoInicialKg,
          meta_7_dias_kg: meta7,
          meta_14_dias_kg: meta14,
          meta_21_dias_kg: meta21,
          meta_28_dias_kg: meta28,
          meta_35_dias_kg: meta35,
          meta_42_dias_kg: meta42,
          gpd_kg: gpd,
        });
      }

      toast.success('Lote aberto com sucesso!');
      
      // Store data for feed request dialog
      if (insertedLote && integradoId) {
        setNovoLoteData({
          loteId: insertedLote.id,
          galpaoId: data.galpao_id,
          tipoProducao: nucleoData?.tipo_producao || '',
          quantidadeAves: parseInt(data.quantidade_aves),
          dataPrevistaAlojamento: data.data_prevista_alojamento,
        });
        setShowRacaoDialog(true);
      } else {
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Erro ao abrir lote:', error);
      toast.error('Erro ao abrir lote');
    } finally {
      setLoading(false);
    }
  };

  const handleRacaoDialogClose = () => {
    setShowRacaoDialog(false);
    setNovoLoteData(null);
    form.reset();
    onSuccess?.();
  };

  const availableGalpoes = galpoes.filter(g => !g.has_active_lote);
  const unavailableGalpoes = galpoes.filter(g => g.has_active_lote);

  // Capacity alert logic
  const selectedGalpaoId = form.watch('galpao_id');
  const quantidadeAvesStr = form.watch('quantidade_aves');
  const selectedGalpaoData = galpoes.find(g => g.id === selectedGalpaoId);
  const capacidadeGalpao = selectedGalpaoData?.total_aves || 0;
  const quantidadeAves = parseInt(quantidadeAvesStr) || 0;
  
  const getCapacityAlert = () => {
    if (!selectedGalpaoId || !capacidadeGalpao || !quantidadeAves) return null;
    
    const minCapacity = capacidadeGalpao * 0.9;
    const maxCapacity = capacidadeGalpao * 1.1;
    
    if (quantidadeAves < minCapacity) {
      const percentBelow = (((capacidadeGalpao - quantidadeAves) / capacidadeGalpao) * 100).toFixed(1);
      return {
        type: 'warning' as const,
        message: `Quantidade ${percentBelow}% abaixo da capacidade do galpão (${capacidadeGalpao.toLocaleString('pt-BR')} aves)`
      };
    }
    
    if (quantidadeAves > maxCapacity) {
      const percentAbove = (((quantidadeAves - capacidadeGalpao) / capacidadeGalpao) * 100).toFixed(1);
      return {
        type: 'destructive' as const,
        message: `Quantidade ${percentAbove}% acima da capacidade do galpão (${capacidadeGalpao.toLocaleString('pt-BR')} aves)`
      };
    }
    
    return null;
  };
  
  const capacityAlert = getCapacityAlert();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nucleo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Núcleo</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedNucleoId(value);
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o núcleo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {nucleos.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum núcleo cadastrado
                      </SelectItem>
                    ) : (
                      nucleos.map((nucleo) => (
                        <SelectItem key={nucleo.id} value={nucleo.id}>
                          {nucleo.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="galpao_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Galpão</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={!selectedNucleoId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedNucleoId ? "Selecione o galpão" : "Selecione um núcleo primeiro"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {galpoes.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum galpão neste núcleo
                      </SelectItem>
                    ) : (
                      <>
                        {availableGalpoes.map((galpao) => (
                          <SelectItem key={galpao.id} value={galpao.id}>
                            {galpao.nome} - Disponível
                          </SelectItem>
                        ))}
                        {unavailableGalpoes.map((galpao) => (
                          <SelectItem key={galpao.id} value={galpao.id} disabled>
                            {galpao.nome} - Lote Ativo
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {unavailableGalpoes.length > 0 && selectedNucleoId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {unavailableGalpoes.length} galpão(ões) com lote ativo não podem ser selecionados.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantidade_aves"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade de Aves</FormLabel>
                <FormControl>
                  <Input type="number" min="1" placeholder="Ex: 25000" {...field} />
                </FormControl>
                {capacidadeGalpao > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Capacidade do galpão: {capacidadeGalpao.toLocaleString('pt-BR')} aves
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linhagem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linhagem</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedLinhagem(value);
                    fetchSexosByLinhagem(value);
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a linhagem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {linhagens.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhuma linhagem disponível
                      </SelectItem>
                    ) : (
                      linhagens.map((lin) => (
                        <SelectItem key={lin.value} value={lin.value}>
                          {lin.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSexos.length === 0 ? (
                      <SelectItem value="misto">Misto</SelectItem>
                    ) : (
                      availableSexos.map((sexo) => (
                        <SelectItem key={sexo} value={sexo}>
                          {sexo === 'macho' ? 'Macho' : sexo === 'femea' ? 'Fêmea' : 'Misto'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {capacityAlert && (
          <Alert variant={capacityAlert.type === 'destructive' ? 'destructive' : 'default'} className={capacityAlert.type === 'warning' ? 'border-amber-500 bg-amber-500/10' : ''}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {capacityAlert.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_prevista_alojamento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Prevista de Alojamento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="veterinario_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veterinário (opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veterinário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {veterinarios.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum veterinário cadastrado
                      </SelectItem>
                    ) : (
                      veterinarios.map((vet) => (
                        <SelectItem key={vet.id} value={vet.id}>
                          {vet.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="criador_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Criador (opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o criador" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {criadores.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum criador cadastrado
                      </SelectItem>
                    ) : (
                      criadores.map((criador) => (
                        <SelectItem key={criador.id} value={criador.id}>
                          {criador.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="custo_aves"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custo por Ave (R$) - opcional</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="Ex: 2.50" {...field} />
                </FormControl>
                {quantidadeAves > 0 && field.value && parseFloat(field.value) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Custo total: R$ {(parseFloat(field.value) * quantidadeAves).toFixed(2)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre o lote..."
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading || nucleos.length === 0 || availableGalpoes.length === 0}
        >
          {loading ? 'Abrindo Lote...' : 'Abrir Lote'}
        </Button>

        {nucleos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Cadastre um núcleo e galpão primeiro para abrir um lote.
          </p>
        )}
      </form>
      
      {/* Dialog para solicitar ração ao criar lote */}
      {novoLoteData && integradoId && (
        <SolicitarRacaoLoteDialog
          open={showRacaoDialog}
          onOpenChange={setShowRacaoDialog}
          loteId={novoLoteData.loteId}
          integradoId={integradoId}
          galpaoId={novoLoteData.galpaoId}
          tipoProducao={novoLoteData.tipoProducao}
          quantidadeAves={novoLoteData.quantidadeAves}
          dataPrevistaAlojamento={novoLoteData.dataPrevistaAlojamento}
          onSuccess={handleRacaoDialogClose}
          onSkip={handleRacaoDialogClose}
        />
      )}
    </Form>
  );
}
