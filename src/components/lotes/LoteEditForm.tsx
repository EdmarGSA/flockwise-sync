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
import { CalendarIcon, Home } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

const loteSchema = z.object({
  quantidade_aves: z.string().min(1, 'Quantidade obrigatória'),
  data_prevista_alojamento: z.date({ required_error: 'Data prevista obrigatória' }),
  data_alojamento: z.date().optional().nullable(),
  data_fechamento: z.date().optional().nullable(),
  linhagem: z.enum(['cobb_500', 'ross_308', 'hubbard']),
  sexo: z.enum(['macho', 'femea', 'misto']),
  status: z.enum(['previsao', 'alojado', 'fechado']),
  veterinario_id: z.string().optional(),
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
  
  const isEditable = lote.status === 'previsao';

  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      quantidade_aves: String(lote.quantidade_aves),
      data_prevista_alojamento: parseISO(lote.data_prevista_alojamento),
      data_alojamento: lote.data_alojamento ? parseISO(lote.data_alojamento) : null,
      data_fechamento: lote.data_fechamento ? parseISO(lote.data_fechamento) : null,
      linhagem: lote.linhagem,
      sexo: lote.sexo,
      status: lote.status,
      veterinario_id: lote.veterinario_id || 'none',
      observacoes: lote.observacoes || '',
    },
  });

  useEffect(() => {
    fetchVeterinarios();
  }, []);

  const fetchVeterinarios = async () => {
    const { data, error } = await supabase.rpc('get_veterinarios');
    if (error) {
      console.error('Erro ao buscar veterinários:', error);
      return;
    }
    setVeterinarios(data || []);
  };

  const handleAlojar = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('lotes')
        .update({
          status: 'alojado',
          data_alojamento: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', lote.id);

      if (error) throw error;

      toast.success('Lote alojado com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao alojar lote:', error);
      toast.error('Erro ao alojar lote');
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
          data_prevista_alojamento: format(data.data_prevista_alojamento, 'yyyy-MM-dd'),
          data_alojamento: data.data_alojamento ? format(data.data_alojamento, 'yyyy-MM-dd') : null,
          data_fechamento: data.data_fechamento ? format(data.data_fechamento, 'yyyy-MM-dd') : null,
          linhagem: data.linhagem,
          sexo: data.sexo,
          status: data.status,
          veterinario_id: data.veterinario_id === 'none' ? null : data.veterinario_id || null,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="linhagem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linhagem</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a linhagem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cobb_500">Cobb 500</SelectItem>
                    <SelectItem value="ross_308">Ross 308</SelectItem>
                    <SelectItem value="hubbard">Hubbard</SelectItem>
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
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={loading}
                onClick={handleAlojar}
              >
                <Home className="w-4 h-4 mr-2" />
                {loading ? 'Alojando...' : 'Alojar'}
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
