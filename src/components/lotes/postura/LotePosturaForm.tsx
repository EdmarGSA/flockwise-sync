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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

const lotePosturaSchema = z.object({
  nucleo_id: z.string().uuid('Selecione um núcleo'),
  galpao_id: z.string().uuid('Selecione um galpão'),
  quantidade_aves: z.string().min(1, 'Quantidade obrigatória'),
  data_prevista_alojamento: z.date({ required_error: 'Data prevista obrigatória' }),
  linhagem_postura: z.enum([
    'lohmann_brown_lite',
    'lohmann_lsl_lite',
    'hy_line_brown',
    'hy_line_w36',
    'isa_brown',
    'novogen_brown',
    'dekalb_white'
  ]),
  veterinario_id: z.string().optional(),
  observacoes: z.string().optional(),
});

type LotePosturaFormData = z.infer<typeof lotePosturaSchema>;

interface Nucleo {
  id: string;
  nome: string;
  tipo_producao: string;
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

interface LotePosturaFormProps {
  onSuccess?: () => void;
}

const linhagemLabels: Record<string, string> = {
  lohmann_brown_lite: 'Lohmann Brown-Lite',
  lohmann_lsl_lite: 'Lohmann LSL-Lite',
  hy_line_brown: 'Hy-Line Brown',
  hy_line_w36: 'Hy-Line W-36',
  isa_brown: 'ISA Brown',
  novogen_brown: 'Novogen Brown',
  dekalb_white: 'Dekalb White',
};

export function LotePosturaForm({ onSuccess }: LotePosturaFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [selectedNucleoId, setSelectedNucleoId] = useState<string>('');

  const form = useForm<LotePosturaFormData>({
    resolver: zodResolver(lotePosturaSchema),
    defaultValues: {
      nucleo_id: '',
      galpao_id: '',
      quantidade_aves: '',
      linhagem_postura: 'lohmann_brown_lite',
      veterinario_id: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    fetchNucleos();
    fetchVeterinarios();
  }, []);

  useEffect(() => {
    if (selectedNucleoId) {
      fetchGalpoes(selectedNucleoId);
      form.setValue('galpao_id', '');
    }
  }, [selectedNucleoId]);

  const fetchNucleos = async () => {
    // Only fetch nucleos with tipo_producao = 'Aves Postura'
    const { data, error } = await supabase
      .from('nucleos')
      .select('id, nome, tipo_producao')
      .eq('ativo', true)
      .ilike('tipo_producao', '%postura%');
    
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

  const onSubmit = async (data: LotePosturaFormData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    const selectedGalpao = galpoes.find(g => g.id === data.galpao_id);
    if (selectedGalpao?.has_active_lote) {
      toast.error('Este galpão já possui um lote ativo');
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        nucleo_id: data.nucleo_id,
        galpao_id: data.galpao_id,
        quantidade_aves: parseInt(data.quantidade_aves),
        data_prevista_alojamento: format(data.data_prevista_alojamento, 'yyyy-MM-dd'),
        linhagem_postura: data.linhagem_postura,
        sexo: 'femea' as const, // Postura é sempre fêmea
        veterinario_id: data.veterinario_id || null,
        observacoes: data.observacoes || null,
        integrado_id: user.id,
        status: 'previsao' as const,
        fase_postura_atual: 'cria' as const, // Começa na fase cria
      };

      const { error } = await supabase.from('lotes').insert(insertData);

      if (error) throw error;

      toast.success('Lote de postura aberto com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao abrir lote:', error);
      toast.error('Erro ao abrir lote');
    } finally {
      setLoading(false);
    }
  };

  const availableGalpoes = galpoes.filter(g => !g.has_active_lote);
  const unavailableGalpoes = galpoes.filter(g => g.has_active_lote);

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

  if (nucleos.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum núcleo de Aves Postura encontrado. Cadastre um núcleo com tipo de produção "Aves Postura" primeiro.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nucleo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Núcleo (Postura)</FormLabel>
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
                    {nucleos.map((nucleo) => (
                      <SelectItem key={nucleo.id} value={nucleo.id}>
                        {nucleo.nome}
                      </SelectItem>
                    ))}
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
                  <Input type="number" min="1" placeholder="Ex: 10000" {...field} />
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
            name="linhagem_postura"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linhagem</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a linhagem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(linhagemLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
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
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Abrindo...' : 'Abrir Lote de Postura'}
        </Button>
      </form>
    </Form>
  );
}
