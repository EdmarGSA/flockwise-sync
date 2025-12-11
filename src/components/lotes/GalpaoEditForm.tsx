import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

const galpaoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  nucleo_id: z.string().uuid('Selecione um núcleo'),
  comprimento: z.string().min(1, 'Comprimento obrigatório'),
  largura: z.string().min(1, 'Largura obrigatória'),
  altura: z.string().min(1, 'Altura obrigatória'),
  tipo_pressao: z.enum(['positiva', 'negativa', 'darkhouse']),
  total_aves: z.string().min(1, 'Total de aves obrigatório'),
  silo_quantidade: z.string().min(1, 'Quantidade de silos obrigatória'),
  silo_volume_total: z.string().min(1, 'Volume dos silos obrigatório'),
  comedouro_tipo: z.enum(['manual', 'automatico']),
  comedouro_quantidade: z.string().min(1, 'Quantidade de comedouros obrigatória'),
  bebedouro_tipo: z.enum(['niple', 'tacas']),
  bebedouro_quantidade: z.string().min(1, 'Quantidade de bebedouros obrigatória'),
  ventilador_quantidade: z.string().min(1, 'Quantidade de ventiladores obrigatória'),
  caixa_agua_quantidade: z.string().min(1, 'Quantidade de caixas d\'água obrigatória'),
  caixa_agua_volume_total: z.string().min(1, 'Volume das caixas d\'água obrigatório'),
  ativo: z.boolean(),
});

type GalpaoFormData = z.infer<typeof galpaoSchema>;

type GalpaoRow = Database['public']['Tables']['galpoes']['Row'];

interface Nucleo {
  id: string;
  nome: string;
}

interface GalpaoEditFormProps {
  galpao: GalpaoRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GalpaoEditForm({ galpao, onSuccess, onCancel }: GalpaoEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);

  const form = useForm<GalpaoFormData>({
    resolver: zodResolver(galpaoSchema),
    defaultValues: {
      nome: galpao.nome,
      nucleo_id: galpao.nucleo_id,
      comprimento: String(galpao.comprimento),
      largura: String(galpao.largura),
      altura: String(galpao.altura),
      tipo_pressao: galpao.tipo_pressao,
      total_aves: String(galpao.total_aves || 0),
      silo_quantidade: String(galpao.silo_quantidade),
      silo_volume_total: String(galpao.silo_volume_total || 0),
      comedouro_tipo: galpao.comedouro_tipo,
      comedouro_quantidade: String(galpao.comedouro_quantidade),
      bebedouro_tipo: galpao.bebedouro_tipo,
      bebedouro_quantidade: String(galpao.bebedouro_quantidade),
      ventilador_quantidade: String(galpao.ventilador_quantidade),
      caixa_agua_quantidade: String(galpao.caixa_agua_quantidade),
      caixa_agua_volume_total: String(galpao.caixa_agua_volume_total || 0),
      ativo: galpao.ativo,
    },
  });

  useEffect(() => {
    fetchNucleos();
  }, []);

  const fetchNucleos = async () => {
    const { data, error } = await supabase
      .from('nucleos')
      .select('id, nome')
      .eq('ativo', true);
    
    if (error) {
      console.error('Erro ao buscar núcleos:', error);
      return;
    }
    setNucleos(data || []);
  };

  const onSubmit = async (data: GalpaoFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('galpoes')
        .update({
          nome: data.nome,
          nucleo_id: data.nucleo_id,
          comprimento: parseFloat(data.comprimento),
          largura: parseFloat(data.largura),
          altura: parseFloat(data.altura),
          tipo_pressao: data.tipo_pressao,
          total_aves: parseInt(data.total_aves),
          silo_quantidade: parseInt(data.silo_quantidade),
          silo_volume_total: parseFloat(data.silo_volume_total),
          comedouro_tipo: data.comedouro_tipo,
          comedouro_quantidade: parseInt(data.comedouro_quantidade),
          bebedouro_tipo: data.bebedouro_tipo,
          bebedouro_quantidade: parseInt(data.bebedouro_quantidade),
          ventilador_quantidade: parseInt(data.ventilador_quantidade),
          caixa_agua_quantidade: parseInt(data.caixa_agua_quantidade),
          caixa_agua_volume_total: parseFloat(data.caixa_agua_volume_total),
          ativo: data.ativo,
        })
        .eq('id', galpao.id);

      if (error) throw error;

      toast.success('Galpão atualizado com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar galpão:', error);
      toast.error('Erro ao atualizar galpão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Galpão</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Galpão 01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nucleo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Núcleo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Dimensões</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="comprimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprimento (m)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="largura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Largura (m)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="altura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (m)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="tipo_pressao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Pressão</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="positiva">Pressão Positiva</SelectItem>
                  <SelectItem value="negativa">Pressão Negativa</SelectItem>
                  <SelectItem value="darkhouse">Dark House</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Capacidade de Aves</h3>
          <FormField
            control={form.control}
            name="total_aves"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total de Aves</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  A densidade (aves/m²) será calculada automaticamente
                </p>
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Silos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="silo_quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="silo_volume_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volume Total (ton)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Comedouros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="comedouro_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatico">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comedouro_quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Bebedouros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bebedouro_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="niple">Nipple</SelectItem>
                      <SelectItem value="tacas">Taças</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bebedouro_quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Ventiladores</h3>
          <FormField
            control={form.control}
            name="ventilador_quantidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Caixa d'Água</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="caixa_agua_quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caixa_agua_volume_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volume Total (L)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
