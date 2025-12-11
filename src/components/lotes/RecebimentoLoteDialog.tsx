import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const recebimentoSchema = z.object({
  quantidade_mortos: z.string().min(1, 'Obrigatório'),
  quantidade_caixas_conferidas: z.string().min(1, 'Obrigatório'),
  quantidade_pintinhos_caixa: z.string().min(1, 'Obrigatório'),
  aspecto_pintinhos: z.enum(['bom', 'ruim', 'regular']),
  quantidade_eliminados_locomotor: z.string().min(1, 'Obrigatório'),
  quantidade_eliminados_classificacao: z.string().min(1, 'Obrigatório'),
  observacoes: z.string().optional(),
});

type RecebimentoFormData = z.infer<typeof recebimentoSchema>;

interface RecebimentoLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  quantidadeAves: number;
  onSuccess?: () => void;
}

export function RecebimentoLoteDialog({ 
  open, 
  onOpenChange, 
  loteId, 
  integradoId,
  quantidadeAves,
  onSuccess 
}: RecebimentoLoteDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RecebimentoFormData>({
    resolver: zodResolver(recebimentoSchema),
    defaultValues: {
      quantidade_mortos: '0',
      quantidade_caixas_conferidas: '0',
      quantidade_pintinhos_caixa: '100',
      aspecto_pintinhos: 'bom',
      quantidade_eliminados_locomotor: '0',
      quantidade_eliminados_classificacao: '0',
      observacoes: '',
    },
  });

  const pintinhosCaixa = parseInt(form.watch('quantidade_pintinhos_caixa') || '0');
  const showDivergenciaAlert = pintinhosCaixa !== 100 && pintinhosCaixa > 0;

  const onSubmit = async (data: RecebimentoFormData) => {
    setLoading(true);
    try {
      const eliminadosLocomotor = parseInt(data.quantidade_eliminados_locomotor);
      const eliminadosClassificacao = parseInt(data.quantidade_eliminados_classificacao);
      const totalEliminados = eliminadosLocomotor + eliminadosClassificacao;

      // Insert reception record
      const { error: recebimentoError } = await supabase
        .from('recebimento_lotes')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          quantidade_mortos: parseInt(data.quantidade_mortos),
          quantidade_caixas_conferidas: parseInt(data.quantidade_caixas_conferidas),
          quantidade_pintinhos_caixa: parseInt(data.quantidade_pintinhos_caixa),
          aspecto_pintinhos: data.aspecto_pintinhos,
          quantidade_eliminados: totalEliminados,
          quantidade_eliminados_locomotor: eliminadosLocomotor,
          quantidade_eliminados_classificacao: eliminadosClassificacao,
          motivo_eliminacao: null,
          observacoes: data.observacoes || null,
        });

      if (recebimentoError) throw recebimentoError;

      // Update lote status to 'alojado'
      const { error: loteError } = await supabase
        .from('lotes')
        .update({
          status: 'alojado',
          data_alojamento: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', loteId);

      if (loteError) throw loteError;

      toast.success('Recebimento confirmado! Lote alojado.');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recebimento do Lote</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cálculo de quantidade alojada */}
            {(() => {
              const mortos = parseInt(form.watch('quantidade_mortos') || '0');
              const eliminadosLocomotor = parseInt(form.watch('quantidade_eliminados_locomotor') || '0');
              const eliminadosClassificacao = parseInt(form.watch('quantidade_eliminados_classificacao') || '0');
              const totalEliminados = eliminadosLocomotor + eliminadosClassificacao;
              const quantidadeAlojada = quantidadeAves - mortos - totalEliminados;
              return (
                <div className="p-4 bg-muted rounded-lg border">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Aves</p>
                      <p className="text-lg font-semibold">{quantidadeAves.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mortos</p>
                      <p className="text-lg font-semibold text-red-500">-{mortos}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Eliminados</p>
                      <p className="text-lg font-semibold text-orange-500">-{totalEliminados}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Qtd. Alojada</p>
                      <p className="text-lg font-bold text-green-600">{quantidadeAlojada.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <FormField
              control={form.control}
              name="quantidade_mortos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade de Mortos</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Conferência de Caixas</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantidade_caixas_conferidas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qtd. Caixas Conferidas</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidade_pintinhos_caixa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pintinhos por Caixa</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showDivergenciaAlert && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Divergência detectada!</strong> A quantidade padrão é de 100 pintinhos por caixa. 
                    Valor informado: <strong>{pintinhosCaixa}</strong> pintinhos/caixa.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <FormField
              control={form.control}
              name="aspecto_pintinhos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aspecto dos Pintinhos</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bom">Bom</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="ruim">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Eliminados por Motivo</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantidade_eliminados_locomotor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locomotor</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidade_eliminados_classificacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classificação</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Confirmando...' : 'Confirmar Recebimento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
