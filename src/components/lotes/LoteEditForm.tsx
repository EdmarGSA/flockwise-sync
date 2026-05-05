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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Home, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { SaidaLoteSection } from './SaidaLoteSection';
import { PreviewAjusteAlojamento } from './PreviewAjusteAlojamento';
import { useIntegradoId } from '@/hooks/useIntegradoId';
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

// Labels for lineages
const linhagemCorteLabels: Record<string, string> = {
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
  hubbard: 'Hubbard'
};

const linhagemPosturaLabels: Record<string, string> = {
  lohmann_brown_lite: 'Lohmann Brown-Lite',
  lohmann_lsl_lite: 'Lohmann LSL Lite'
};

const loteSchema = z.object({
  quantidade_aves: z.string().min(1, 'Quantidade obrigatória'),
  peso_medio_pintinhos: z.string().optional(),
  data_prevista_alojamento: z.date({ required_error: 'Data prevista obrigatória' }),
  data_alojamento: z.date().optional().nullable(),
  data_fechamento: z.date().optional().nullable(),
  sexo: z.enum(['macho', 'femea', 'misto']).optional(),
  status: z.enum(['previsao', 'saiu_para_entrega', 'alojado', 'fechado']),
  veterinario_id: z.string().optional(),
  programa_iluminacao_id: z.string().optional(),
  curva_climatica_id: z.string().optional(),
  observacoes: z.string().optional(),
});

type LoteFormData = z.infer<typeof loteSchema>;
type LoteRow = Database['public']['Tables']['lotes']['Row'];

interface Veterinario {
  id: string;
  full_name: string;
}

interface LoteEditFormProps {
  lote: LoteRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LoteEditForm({ lote, onSuccess, onCancel }: LoteEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [programasIluminacao, setProgramasIluminacao] = useState<{ id: string; nome: string; is_default: boolean }[]>([]);
  const [curvasClimaticas, setCurvasClimaticas] = useState<{ id: string; nome: string; publica: boolean }[]>([]);
  const [totalMortalidade, setTotalMortalidade] = useState<number>(0);
  const [ultimoPesoMedio, setUltimoPesoMedio] = useState<number | null>(null);
  const [modoEdicaoAvancada, setModoEdicaoAvancada] = useState(false);
  const { integradoId } = useIntegradoId();
  const [confirmAjustesOpen, setConfirmAjustesOpen] = useState(false);
  
  // Saída de Lote fields
  const [dataPrevistaSaida, setDataPrevistaSaida] = useState<string | null>(
    (lote as any).data_prevista_saida || null
  );
  const [horarioInicioJejum, setHorarioInicioJejum] = useState<string | null>(
    (lote as any).horario_inicio_jejum || null
  );
  const [saidaVendaLocal, setSaidaVendaLocal] = useState<number>(
    (lote as any).saida_venda_local || 0
  );
  const [saidaVendaExterna, setSaidaVendaExterna] = useState<number>(
    (lote as any).saida_venda_externa || 0
  );
  const [saidaAbate, setSaidaAbate] = useState<number>(
    (lote as any).saida_abate || 0
  );
  
  const isEditable = lote.status === 'previsao';
  const isAlojado = lote.status === 'alojado';
  const quantidadeAvesReal = lote.quantidade_aves - totalMortalidade;
  
  // Detect batch type: postura uses linhagem_postura, corte uses linhagem
  const isPostura = !!lote.linhagem_postura;
  const linhagemDisplay = isPostura 
    ? linhagemPosturaLabels[lote.linhagem_postura || ''] || lote.linhagem_postura
    : linhagemCorteLabels[lote.linhagem || ''] || lote.linhagem;

  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      quantidade_aves: String(lote.quantidade_aves),
      peso_medio_pintinhos: lote.peso_medio_pintinhos ? String(lote.peso_medio_pintinhos) : '',
      data_prevista_alojamento: parseISO(lote.data_prevista_alojamento),
      data_alojamento: lote.data_alojamento ? parseISO(lote.data_alojamento) : null,
      data_fechamento: lote.data_fechamento ? parseISO(lote.data_fechamento) : null,
      sexo: lote.sexo,
      status: lote.status,
      veterinario_id: lote.veterinario_id || 'none',
      programa_iluminacao_id: (lote as any).programa_iluminacao_id || 'default',
      curva_climatica_id: (lote as any).curva_climatica_id || 'auto',
      observacoes: lote.observacoes || '',
    },
  });

  useEffect(() => {
    fetchVeterinarios();
    fetchProgramasIluminacao();
    fetchCurvasClimaticas();
    if (isAlojado) {
      fetchMortalidade();
      fetchUltimoPeso();
    }
  }, [lote.id, isAlojado]);

  const fetchVeterinarios = async () => {
    const { data, error } = await supabase.rpc('get_veterinarios');
    if (error) {
      console.error('Erro ao buscar veterinários:', error);
      return;
    }
    setVeterinarios(data || []);
  };

  const fetchProgramasIluminacao = async () => {
    const tipo = isPostura ? 'postura' : 'frango_corte';
    const { data } = await supabase
      .from('programa_iluminacao_lote')
      .select('id, nome, is_default, tipo_producao')
      .eq('ativo', true)
      .eq('tipo_producao', tipo)
      .order('is_default', { ascending: false })
      .order('nome');
    setProgramasIluminacao((data || []) as any);
  };

  const fetchCurvasClimaticas = async () => {
    if (!integradoId) return;
    const tipo = isPostura ? 'postura' : 'frango_corte';
    const { data } = await supabase
      .from('curva_climatica_referencia')
      .select('id, nome, publica')
      .eq('tipo_producao', tipo)
      .or(`publica.eq.true,integrado_id.eq.${integradoId}`)
      .order('publica', { ascending: false })
      .order('nome');
    setCurvasClimaticas((data || []) as any);
  };

  const fetchMortalidade = async () => {
    // Buscar total de mortalidade (mortes + eliminados)
    const { data, error } = await supabase
      .from('mortalidade')
      .select('id, mortalidade_itens(quantidade)')
      .eq('lote_id', lote.id);

    if (error) {
      console.error('Erro ao buscar mortalidade:', error);
      return;
    }

    let total = 0;
    data?.forEach((m: any) => {
      m.mortalidade_itens?.forEach((item: any) => {
        total += item.quantidade || 0;
      });
    });
    setTotalMortalidade(total);
  };

  const fetchUltimoPeso = async () => {
    // Buscar última pesagem e calcular peso médio
    const { data, error } = await supabase
      .from('pesagens')
      .select('id, data_pesagem, pesagem_itens(quantidade_aves, peso_liquido_g)')
      .eq('lote_id', lote.id)
      .order('data_pesagem', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Erro ao buscar pesagens:', error);
      return;
    }

    if (data && data.length > 0 && data[0].pesagem_itens) {
      let totalAves = 0;
      let totalPeso = 0;
      data[0].pesagem_itens.forEach((item: any) => {
        totalAves += item.quantidade_aves || 0;
        totalPeso += item.peso_liquido_g || 0;
      });
      if (totalAves > 0) {
        // peso_liquido_g armazenado em kg
        setUltimoPesoMedio(totalPeso / totalAves);
      }
    }
  };

  const handleAlojar = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('lotes')
        .update({
          status: 'saiu_para_entrega',
        })
        .eq('id', lote.id);

      if (error) throw error;

      toast.success('Status alterado para "Saiu para Entrega"');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSaida = async () => {
    const totalSaida = saidaVendaLocal + saidaVendaExterna + saidaAbate;
    if (totalSaida > quantidadeAvesReal) {
      toast.error('O total de saídas excede a quantidade atual de aves do lote');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lotes')
        .update({
          data_prevista_saida: dataPrevistaSaida ? new Date(dataPrevistaSaida).toISOString() : null,
          horario_inicio_jejum: horarioInicioJejum ? new Date(horarioInicioJejum).toISOString() : null,
          saida_venda_local: saidaVendaLocal,
          saida_venda_externa: saidaVendaExterna,
          saida_abate: saidaAbate,
        })
        .eq('id', lote.id);

      if (error) throw error;

      toast.success('Informações de saída salvas com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar saída:', error);
      toast.error('Erro ao salvar informações de saída');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LoteFormData) => {
    if (!isEditable) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('lotes')
        .update({
          quantidade_aves: parseInt(data.quantidade_aves),
          peso_medio_pintinhos: data.peso_medio_pintinhos ? parseFloat(data.peso_medio_pintinhos) : null,
          data_prevista_alojamento: format(data.data_prevista_alojamento, 'yyyy-MM-dd'),
          data_alojamento: data.data_alojamento ? format(data.data_alojamento, 'yyyy-MM-dd') : null,
          data_fechamento: data.data_fechamento ? format(data.data_fechamento, 'yyyy-MM-dd') : null,
          sexo: isPostura ? 'femea' : data.sexo,
          status: data.status,
          veterinario_id: data.veterinario_id === 'none' ? null : data.veterinario_id || null,
          programa_iluminacao_id: !data.programa_iluminacao_id || data.programa_iluminacao_id === 'default' ? null : data.programa_iluminacao_id,
          curva_climatica_id: !data.curva_climatica_id || data.curva_climatica_id === 'auto' ? null : data.curva_climatica_id,
          observacoes: data.observacoes || null,
        })
        .eq('id', lote.id);

      if (error) throw error;

      toast.success('Lote atualizado com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar lote:', error);
      toast.error('Erro ao atualizar lote');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAjustes = async () => {
    setLoading(true);
    try {
      const values = form.getValues();
      const { error } = await supabase
        .from('lotes')
        .update({
          data_alojamento: values.data_alojamento ? format(values.data_alojamento, 'yyyy-MM-dd') : null,
          programa_iluminacao_id: !values.programa_iluminacao_id || values.programa_iluminacao_id === 'default' ? null : values.programa_iluminacao_id,
        })
        .eq('id', lote.id);

      if (error) throw error;
      toast.success('Ajustes salvos com sucesso!');
      setModoEdicaoAvancada(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar ajustes:', error);
      toast.error('Erro ao salvar ajustes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isEditable && !modoEdicaoAvancada && (
        <div className="flex items-center justify-between rounded-md border border-dashed p-3 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Lote em status <strong>{lote.status}</strong>. Você pode ajustar a data de alojamento e o programa de iluminação.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setModoEdicaoAvancada(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar Lote
          </Button>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="quantidade_aves"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade de Aves</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="Ex: 25000" disabled={!isEditable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="peso_medio_pintinhos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso Médio Pintinhos (g)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" placeholder="Ex: 42.5" disabled={!isEditable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status - Read-only display */}
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Input 
                value={
                  lote.status === 'previsao' ? 'Previsão' :
                  lote.status === 'saiu_para_entrega' ? 'Saiu p/ Entrega' :
                  lote.status === 'alojado' ? 'Alojado' :
                  lote.status === 'fechado' ? 'Fechado' : '-'
                } 
                disabled 
                className="bg-muted"
              />
            </FormItem>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Linhagem - Read-only display */}
            <FormItem>
              <FormLabel>Linhagem</FormLabel>
              <Input 
                value={linhagemDisplay || '-'} 
                disabled 
                className="bg-muted"
              />
            </FormItem>

            {/* Sexo - Read-only for postura (always female), editable for corte */}
            {isPostura ? (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Input 
                  value="Fêmea" 
                  disabled 
                  className="bg-muted"
                />
              </FormItem>
            ) : (
              <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o sexo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="femea">Fêmea</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="data_prevista_alojamento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Prevista</FormLabel>
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
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_alojamento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Alojamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          disabled={!isEditable && !modoEdicaoAvancada}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_fechamento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Fechamento</FormLabel>
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
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="veterinario_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veterinário (opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veterinário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {veterinarios.map((vet) => (
                      <SelectItem key={vet.id} value={vet.id}>
                        {vet.full_name}
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
            name="programa_iluminacao_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Programa de Iluminação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable && !modoEdicaoAvancada}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um programa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="default">Usar programa padrão da organização</SelectItem>
                    {programasIluminacao.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}{p.is_default ? ' (padrão)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Define o fotoperíodo automático aplicado por <a href="/configuracoes/iluminacao" className="underline">auto-iluminacao</a>.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="curva_climatica_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Curva Climática (Linhagem)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable && !modoEdicaoAvancada}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma curva" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="auto">Automática (faixas tradicionais)</SelectItem>
                    {curvasClimaticas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}{c.publica ? ' · template' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Define os setpoints diários de temperatura, umidade e velocidade de ar usados pela{' '}
                  <a href="/configuracoes/curva-climatica" className="underline">automação climática</a>.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditable && modoEdicaoAvancada && (
            <PreviewAjusteAlojamento
              dataAlojamentoAtual={lote.data_alojamento}
              novaDataAlojamento={form.watch('data_alojamento')}
              programaAtualId={(lote as any).programa_iluminacao_id ?? null}
              novoProgramaId={form.watch('programa_iluminacao_id')}
              integradoId={integradoId}
              tipoProducao={isPostura ? 'postura' : 'frango_corte'}
            />
          )}

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações (opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Observações sobre o lote..." className="resize-none" disabled={!isEditable} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              {isEditable ? 'Cancelar' : 'Fechar'}
            </Button>
            {isEditable && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={loading}
                  onClick={handleAlojar}
                >
                  <Home className="w-4 h-4 mr-2" />
                  {loading ? 'Atualizando...' : 'Saiu p/ Entrega'}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
            {!isEditable && modoEdicaoAvancada && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => {
                    form.reset();
                    setModoEdicaoAvancada(false);
                  }}
                >
                  Cancelar Ajustes
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => setConfirmAjustesOpen(true)}
                >
                  {loading ? 'Salvando...' : 'Salvar Ajustes'}
                </Button>
              </>
            )}
          </div>
          {!isEditable && modoEdicaoAvancada && (
            <p className="text-xs text-amber-600">
              Modo edição: alterar a data de alojamento recalcula idade do lote e curvas de fotoperíodo.
            </p>
          )}
        </form>
      </Form>

      {/* Seção de Saída de Lote - apenas para lotes alojados */}
      {isAlojado && (
        <div className="space-y-4">
          <SaidaLoteSection
            quantidadeAvesLote={lote.quantidade_aves}
            quantidadeAvesReal={quantidadeAvesReal}
            ultimoPesoMedio={ultimoPesoMedio}
            dataPrevistaSaida={dataPrevistaSaida}
            horarioInicioJejum={horarioInicioJejum}
            saidaVendaLocal={saidaVendaLocal}
            saidaVendaExterna={saidaVendaExterna}
            saidaAbate={saidaAbate}
            onDataPrevistaSaidaChange={setDataPrevistaSaida}
            onHorarioInicioJejumChange={setHorarioInicioJejum}
            onSaidaVendaLocalChange={setSaidaVendaLocal}
            onSaidaVendaExternaChange={setSaidaVendaExterna}
            onSaidaAbateChange={setSaidaAbate}
          />
          <Button 
            onClick={handleSaveSaida} 
            disabled={loading} 
            className="w-full"
          >
            {loading ? 'Salvando...' : 'Salvar Informações de Saída'}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmAjustesOpen} onOpenChange={setConfirmAjustesOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ajustes do lote</AlertDialogTitle>
            <AlertDialogDescription>
              Revise as alterações antes de salvar. Mudar a data de alojamento recalcula a idade do lote
              em todo o sistema (mortalidade, pesagens, fotoperíodo).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase">Data de Alojamento</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {lote.data_alojamento
                    ? format(parseISO(lote.data_alojamento), 'dd/MM/yyyy', { locale: ptBR })
                    : '—'}
                </span>
                <span className="text-foreground font-medium">
                  →{' '}
                  {form.watch('data_alojamento')
                    ? format(form.watch('data_alojamento') as Date, 'dd/MM/yyyy', { locale: ptBR })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase">Programa de Iluminação</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate">
                  {programasIluminacao.find((p) => p.id === ((lote as any).programa_iluminacao_id))?.nome ?? 'padrão da org'}
                </span>
                <span className="text-foreground font-medium truncate">
                  →{' '}
                  {(() => {
                    const v = form.watch('programa_iluminacao_id');
                    if (!v || v === 'default') return 'padrão da org';
                    return programasIluminacao.find((p) => p.id === v)?.nome ?? v;
                  })()}
                </span>
              </div>
            </div>

            <PreviewAjusteAlojamento
              dataAlojamentoAtual={lote.data_alojamento}
              novaDataAlojamento={form.watch('data_alojamento')}
              programaAtualId={(lote as any).programa_iluminacao_id ?? null}
              novoProgramaId={form.watch('programa_iluminacao_id')}
              integradoId={integradoId}
              tipoProducao={isPostura ? 'postura' : 'frango_corte'}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={async (e) => {
                e.preventDefault();
                await handleSaveAjustes();
                setConfirmAjustesOpen(false);
              }}
            >
              {loading ? 'Salvando...' : 'Confirmar e salvar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
