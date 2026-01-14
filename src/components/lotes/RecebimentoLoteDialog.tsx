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
import { AlertTriangle, CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDateDisabledFunction, isRetroactiveDate, MAX_RETROACTIVE_DAYS } from '@/lib/dateValidation';

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
  const [dataAlojamento, setDataAlojamento] = useState<Date>(new Date());
  const [horaAlojamento, setHoraAlojamento] = useState<string>('08:00');

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

  const caixasConferidas = parseInt(form.watch('quantidade_caixas_conferidas') || '0');
  const totalPintinhosConferidos = parseInt(form.watch('quantidade_pintinhos_caixa') || '0');
  const totalEsperado = caixasConferidas * 100;
  const divergencia = totalEsperado - totalPintinhosConferidos;
  const showDivergenciaAlert = caixasConferidas > 0 && totalPintinhosConferidos > 0 && divergencia !== 0;

  const onSubmit = async (data: RecebimentoFormData) => {
    setLoading(true);
    try {
      const mortos = parseInt(data.quantidade_mortos);
      const eliminadosLocomotor = parseInt(data.quantidade_eliminados_locomotor);
      const eliminadosClassificacao = parseInt(data.quantidade_eliminados_classificacao);
      const totalPerdas = mortos + eliminadosLocomotor + eliminadosClassificacao;

      // Validação: perdas não podem exceder 50% das aves
      if (totalPerdas > quantidadeAves * 0.5) {
        toast.error(`Total de perdas (${totalPerdas.toLocaleString()}) excede 50% das aves. Verifique os valores.`);
        setLoading(false);
        return;
      }

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

      // Combine date and time for data_alojamento
      const [hours, minutes] = horaAlojamento.split(':').map(Number);
      const dataAlojamentoCompleta = setMinutes(setHours(dataAlojamento, hours), minutes);

      // Update lote status to 'alojado'
      const { error: loteError } = await supabase
        .from('lotes')
        .update({
          status: 'alojado',
          data_alojamento: format(dataAlojamentoCompleta, 'yyyy-MM-dd'),
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
            {/* Data e Hora do Alojamento */}
            <div className="space-y-2">
              <Label>Data e Hora do Alojamento</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dataAlojamento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataAlojamento ? format(dataAlojamento, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataAlojamento}
                      onSelect={(date) => date && setDataAlojamento(date)}
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
                  value={horaAlojamento}
                  onChange={(e) => setHoraAlojamento(e.target.value)}
                  className="w-28"
                />
              </div>
              {isRetroactiveDate(dataAlojamento) && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
                  <Clock className="w-3 h-3" />
                  Registro retroativo
                </Badge>
              )}
            </div>

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
                      <FormLabel>Total Pintinhos Conferidos</FormLabel>
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
                    <strong>Divergência detectada!</strong> Esperado: <strong>{totalEsperado.toLocaleString()}</strong> pintinhos 
                    ({caixasConferidas} cx × 100). Conferido: <strong>{totalPintinhosConferidos.toLocaleString()}</strong>. 
                    Diferença: <strong className={divergencia > 0 ? 'text-red-400' : 'text-green-400'}>
                      {divergencia > 0 ? `-${divergencia}` : `+${Math.abs(divergencia)}`}
                    </strong> pintinhos.
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
