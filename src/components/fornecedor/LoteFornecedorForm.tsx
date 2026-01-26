import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const loteSchema = z.object({
  galpao_fornecedor_id: z.string().min(1, 'Galpão é obrigatório'),
  vendedor_fornecedor_id: z.string().optional(),
  codigo_lote: z.string().optional(),
  quantidade_aves: z.coerce.number().min(1, 'Quantidade de aves é obrigatória'),
  linhagem: z.string().optional(),
  data_alojamento: z.date().optional(),
  data_prevista_saida: z.date().optional(),
  status: z.enum(['previsao', 'alojado', 'fechado']).default('previsao'),
  sexo: z.enum(['macho', 'femea', 'misto']).default('misto'),
  observacoes: z.string().optional(),
});

type LoteFormData = z.infer<typeof loteSchema>;

interface GalpaoFornecedor {
  id: string;
  nome: string;
  capacidade_aves: number;
  nucleo_fornecedor?: {
    nome: string;
    cliente_fornecedor?: {
      razao_social_nome: string;
      nome_fantasia?: string;
    };
  };
}

interface VendedorFornecedor {
  id: string;
  nome: string;
  codigo_vendedor?: string;
}

interface LoteFornecedorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote?: any;
  fornecedorGlobalId: string;
  galpoes: GalpaoFornecedor[];
  vendedores: VendedorFornecedor[];
  onSuccess: () => void;
}

const LINHAGENS = [
  { value: 'cobb_500', label: 'Cobb 500' },
  { value: 'ross_308', label: 'Ross 308' },
  { value: 'hubbard', label: 'Hubbard' },
  { value: 'hy_line', label: 'Hy-Line' },
  { value: 'lohmann', label: 'Lohmann' },
  { value: 'dekalb', label: 'Dekalb' },
  { value: 'outro', label: 'Outro' },
];

export function LoteFornecedorForm({
  open,
  onOpenChange,
  lote,
  fornecedorGlobalId,
  galpoes,
  vendedores,
  onSuccess,
}: LoteFornecedorFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!lote;

  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      galpao_fornecedor_id: '',
      vendedor_fornecedor_id: '',
      codigo_lote: '',
      quantidade_aves: 0,
      linhagem: '',
      status: 'previsao',
      sexo: 'misto',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (lote) {
      form.reset({
        galpao_fornecedor_id: lote.galpao_fornecedor_id || '',
        vendedor_fornecedor_id: lote.vendedor_fornecedor_id || '',
        codigo_lote: lote.codigo_lote || '',
        quantidade_aves: lote.quantidade_aves || 0,
        linhagem: lote.linhagem || '',
        data_alojamento: lote.data_alojamento ? new Date(lote.data_alojamento) : undefined,
        data_prevista_saida: lote.data_prevista_saida ? new Date(lote.data_prevista_saida) : undefined,
        status: lote.status || 'previsao',
        sexo: lote.sexo || 'misto',
        observacoes: lote.observacoes || '',
      });
    } else {
      form.reset({
        galpao_fornecedor_id: '',
        vendedor_fornecedor_id: '',
        codigo_lote: '',
        quantidade_aves: 0,
        linhagem: '',
        status: 'previsao',
        sexo: 'misto',
        observacoes: '',
      });
    }
  }, [lote, form, open]);

  const onSubmit = async (data: LoteFormData) => {
    setLoading(true);
    try {
      // Buscar nucleo_fornecedor_id do galpão selecionado
      const galpaoSelecionado = galpoes.find(g => g.id === data.galpao_fornecedor_id);
      if (!galpaoSelecionado) {
        throw new Error('Galpão não encontrado');
      }

      const { data: galpaoData, error: galpaoError } = await supabase
        .from('galpoes_fornecedor')
        .select('nucleo_fornecedor_id')
        .eq('id', data.galpao_fornecedor_id)
        .single();

      if (galpaoError) throw galpaoError;

      const payload = {
        galpao_fornecedor_id: data.galpao_fornecedor_id,
        nucleo_fornecedor_id: galpaoData.nucleo_fornecedor_id,
        vendedor_fornecedor_id: data.vendedor_fornecedor_id && data.vendedor_fornecedor_id !== 'none' ? data.vendedor_fornecedor_id : null,
        codigo_lote: data.codigo_lote || null,
        quantidade_aves: data.quantidade_aves,
        linhagem: data.linhagem || null,
        data_alojamento: data.data_alojamento ? format(data.data_alojamento, 'yyyy-MM-dd') : null,
        data_prevista_saida: data.data_prevista_saida ? format(data.data_prevista_saida, 'yyyy-MM-dd') : null,
        status: data.status,
        sexo: data.sexo,
        observacoes: data.observacoes || null,
        fornecedor_global_id: fornecedorGlobalId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('lotes_fornecedor')
          .update(payload)
          .eq('id', lote.id);
        if (error) throw error;
        toast.success('Lote atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('lotes_fornecedor')
          .insert([payload]);
        if (error) throw error;
        toast.success('Lote cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar lote:', error);
      toast.error(error.message || 'Erro ao salvar lote');
    } finally {
      setLoading(false);
    }
  };

  const galpaoSelecionado = galpoes.find(g => g.id === form.watch('galpao_fornecedor_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Lote' : 'Novo Lote'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="galpao_fornecedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Galpão *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o galpão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {galpoes.map((galpao) => (
                        <SelectItem key={galpao.id} value={galpao.id}>
                          {galpao.nome} - {galpao.nucleo_fornecedor?.nome} ({galpao.nucleo_fornecedor?.cliente_fornecedor?.nome_fantasia || galpao.nucleo_fornecedor?.cliente_fornecedor?.razao_social_nome})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {galpaoSelecionado && (
                    <p className="text-xs text-muted-foreground">
                      Capacidade: {galpaoSelecionado.capacidade_aves.toLocaleString('pt-BR')} aves
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo_lote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Lote</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: LT2025-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidade_aves"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Aves *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="linhagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linhagem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LINHAGENS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="misto">Misto</SelectItem>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="femea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="previsao">Previsão</SelectItem>
                        <SelectItem value="alojado">Alojado</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                            ) : (
                              <span>Selecionar data</span>
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
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_prevista_saida"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Prevista Saída</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                            ) : (
                              <span>Selecionar data</span>
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
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vendedor_fornecedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nome} {v.codigo_vendedor ? `(${v.codigo_vendedor})` : ''}
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
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre o lote..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
