import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const galpaoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  nucleo_id: z.string().uuid('Selecione um núcleo'),
  comprimento: z.string().min(1, 'Comprimento obrigatório'),
  largura: z.string().min(1, 'Largura obrigatória'),
  altura: z.string().min(1, 'Altura obrigatória'),
  tipo_pressao: z.enum(['positiva', 'negativa', 'darkhouse']),
  aves_por_m2: z.string().min(1, 'Densidade de aves obrigatória'),
  silo_quantidade: z.string().min(1, 'Quantidade de silos obrigatória'),
  silo_volume_total: z.string().min(1, 'Volume dos silos obrigatório'),
  comedouro_tipo: z.enum(['manual', 'automatico']),
  comedouro_quantidade: z.string().min(1, 'Quantidade de comedouros obrigatória'),
  bebedouro_tipo: z.enum(['niple', 'tacas']),
  bebedouro_quantidade: z.string().min(1, 'Quantidade de bebedouros obrigatória'),
  ventilador_quantidade: z.string().min(1, 'Quantidade de ventiladores obrigatória'),
  caixa_agua_quantidade: z.string().min(1, 'Quantidade de caixas d\'água obrigatória'),
  caixa_agua_volume_total: z.string().min(1, 'Volume das caixas d\'água obrigatório'),
});

type GalpaoFormData = z.infer<typeof galpaoSchema>;

interface Nucleo {
  id: string;
  nome: string;
}

interface GalpaoFormProps {
  onSuccess?: () => void;
}

export function GalpaoForm({ onSuccess }: GalpaoFormProps) {
  const [loading, setLoading] = useState(false);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);

  const form = useForm<GalpaoFormData>({
    resolver: zodResolver(galpaoSchema),
    defaultValues: {
      nome: '',
      nucleo_id: '',
      comprimento: '',
      largura: '',
      altura: '',
      tipo_pressao: 'positiva',
      aves_por_m2: '0',
      silo_quantidade: '0',
      silo_volume_total: '0',
      comedouro_tipo: 'automatico',
      comedouro_quantidade: '0',
      bebedouro_tipo: 'niple',
      bebedouro_quantidade: '0',
      ventilador_quantidade: '0',
      caixa_agua_quantidade: '0',
      caixa_agua_volume_total: '0',
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
      const { error } = await supabase.from('galpoes').insert({
        nome: data.nome,
        nucleo_id: data.nucleo_id,
        comprimento: parseFloat(data.comprimento),
        largura: parseFloat(data.largura),
        altura: parseFloat(data.altura),
        tipo_pressao: data.tipo_pressao,
        aves_por_m2: parseFloat(data.aves_por_m2),
        silo_quantidade: parseInt(data.silo_quantidade),
        silo_volume_total: parseFloat(data.silo_volume_total),
        comedouro_tipo: data.comedouro_tipo,
        comedouro_quantidade: parseInt(data.comedouro_quantidade),
        bebedouro_tipo: data.bebedouro_tipo,
        bebedouro_quantidade: parseInt(data.bebedouro_quantidade),
        ventilador_quantidade: parseInt(data.ventilador_quantidade),
        caixa_agua_quantidade: parseInt(data.caixa_agua_quantidade),
        caixa_agua_volume_total: parseFloat(data.caixa_agua_volume_total),
      });

      if (error) throw error;

      toast.success('Galpão cadastrado com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cadastrar galpão:', error);
      toast.error('Erro ao cadastrar galpão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Cadastro de Galpão</CardTitle>
      </CardHeader>
      <CardContent>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>

            {/* Dimensões */}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Capacidade de Aves */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Capacidade de Aves</h3>
              <FormField
                control={form.control}
                name="aves_por_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Densidade (Aves/m²)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      O total de aves será calculado automaticamente (densidade × área)
                    </p>
                  </FormItem>
                )}
              />
            </div>

            {/* Silos */}
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

            {/* Comedouros */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Comedouros</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="comedouro_tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Bebedouros */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Bebedouros</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bebedouro_tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Ventiladores */}
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

            {/* Caixa d'água */}
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

            <Button type="submit" className="w-full" disabled={loading || nucleos.length === 0}>
              {loading ? 'Salvando...' : 'Cadastrar Galpão'}
            </Button>

            {nucleos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Cadastre um núcleo primeiro para poder adicionar galpões.
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
