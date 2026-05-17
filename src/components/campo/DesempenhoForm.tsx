import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type LinhagemAves = Database['public']['Enums']['linhagem_aves'];
type SexoAve = Database['public']['Enums']['sexo_ave'];

const formSchema = z.object({
  linhagem: z.enum(['cobb_500', 'ross_308', 'hubbard'] as const),
  sexo: z.enum(['macho', 'femea', 'misto'] as const),
  dia: z.coerce.number().min(0, 'Dia deve ser maior ou igual a 0'),
  peso_kg: z.coerce.number().min(0, 'Peso deve ser positivo'),
  ganho_diario_kg: z.coerce.number().min(0, 'Ganho diário deve ser positivo'),
  ganho_medio_diario_kg: z.coerce.number().min(0, 'Ganho médio diário deve ser positivo'),
  conversao_alimentar_acumulada: z.coerce.number().min(0, 'Conversão alimentar deve ser positiva'),
  consumo_diario_racao_kg: z.coerce.number().min(0, 'Consumo diário deve ser positivo'),
  consumo_acumulado_racao_kg: z.coerce.number().min(0, 'Consumo acumulado deve ser positivo'),
});

type FormValues = z.infer<typeof formSchema>;

interface DesempenhoFormProps {
  onSuccess: () => void;
}

export function DesempenhoForm({ onSuccess }: DesempenhoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      linhagem: 'cobb_500',
      sexo: 'misto',
      dia: 0,
      peso_kg: 0,
      ganho_diario_kg: 0,
      ganho_medio_diario_kg: 0,
      conversao_alimentar_acumulada: 0,
      consumo_diario_racao_kg: 0,
      consumo_acumulado_racao_kg: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('desempenho_aves').insert({
        linhagem: values.linhagem as LinhagemAves,
        sexo: values.sexo as SexoAve,
        dia: values.dia,
        peso_kg: values.peso_kg,
        ganho_diario_kg: values.ganho_diario_kg,
        ganho_medio_diario_kg: values.ganho_medio_diario_kg,
        conversao_alimentar_acumulada: values.conversao_alimentar_acumulada,
        consumo_diario_racao_kg: values.consumo_diario_racao_kg,
        consumo_acumulado_racao_kg: values.consumo_acumulado_racao_kg,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um registro para esta combinação de linhagem, sexo e dia');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Registro de desempenho adicionado com sucesso!');
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar desempenho:', error);
      toast.error('Erro ao salvar registro de desempenho');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Novo Registro de Desempenho</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="linhagem"
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <FormField
                control={form.control}
                name="dia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="peso_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ganho_diario_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ganho Diário (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ganho_medio_diario_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ganho Médio Diário (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conversao_alimentar_acumulada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversão Alimentar Acumulada</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" min={0} placeholder="0.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consumo_diario_racao_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumo Diário de Ração (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consumo_acumulado_racao_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumo Acumulado de Ração (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
