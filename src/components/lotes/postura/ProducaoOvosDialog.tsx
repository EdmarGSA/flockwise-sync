import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Egg, AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FasePosturaBadge } from './FasePosturaBadge';

const producaoSchema = z.object({
  ovos_totais: z.string().min(1, 'Quantidade obrigatória'),
  ovos_incubaveis: z.string().optional(),
  ovos_trincados: z.string().optional(),
  ovos_sujos: z.string().optional(),
  ovos_quebrados: z.string().optional(),
  ovos_deformados: z.string().optional(),
  ovos_pequenos: z.string().optional(),
  ovos_medio: z.string().optional(),
  ovos_grande: z.string().optional(),
  ovos_extra: z.string().optional(),
  ovos_jumbo: z.string().optional(),
  peso_medio_ovo_g: z.string().optional(),
  observacoes: z.string().optional(),
});

type ProducaoFormData = z.infer<typeof producaoSchema>;

interface ProducaoOvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  semanasVida: number;
  avesVivas: number;
  linhagem: string;
  onSuccess?: () => void;
}

export function ProducaoOvosDialog({
  open,
  onOpenChange,
  loteId,
  integradoId,
  semanasVida,
  avesVivas,
  linhagem,
  onSuccess,
}: ProducaoOvosDialogProps) {
  const [loading, setLoading] = useState(false);
  const [referencia, setReferencia] = useState<{
    producao_percentual: number | null;
    peso_ovo_g: number | null;
  } | null>(null);
  const [existingRecord, setExistingRecord] = useState<boolean>(false);

  const form = useForm<ProducaoFormData>({
    resolver: zodResolver(producaoSchema),
    defaultValues: {
      ovos_totais: '',
      ovos_incubaveis: '',
      ovos_trincados: '',
      ovos_sujos: '',
      ovos_quebrados: '',
      ovos_deformados: '',
      ovos_pequenos: '',
      ovos_medio: '',
      ovos_grande: '',
      ovos_extra: '',
      ovos_jumbo: '',
      peso_medio_ovo_g: '',
      observacoes: '',
    },
  });

  const ovosTotais = parseInt(form.watch('ovos_totais') || '0');
  const percentualPostura = avesVivas > 0 ? (ovosTotais / avesVivas) * 100 : 0;
  
  const diferenca = referencia?.producao_percentual 
    ? percentualPostura - referencia.producao_percentual 
    : null;

  useEffect(() => {
    if (open) {
      fetchReferencia();
      checkExistingRecord();
    }
  }, [open, semanasVida, linhagem]);

  const fetchReferencia = async () => {
    const { data, error } = await supabase
      .from('desempenho_postura')
      .select('producao_percentual, peso_ovo_g')
      .eq('linhagem', linhagem as any)
      .eq('semana', semanasVida)
      .maybeSingle();

    if (!error && data) {
      setReferencia(data);
    }
  };

  const checkExistingRecord = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('producao_ovos')
      .select('id')
      .eq('lote_id', loteId)
      .eq('data_producao', today)
      .maybeSingle();

    setExistingRecord(!!data);
  };

  const onSubmit = async (data: ProducaoFormData) => {
    if (semanasVida < 19) {
      toast.error('Produção só pode ser registrada a partir da semana 19');
      return;
    }

    setLoading(true);
    try {
      const ovosTotais = parseInt(data.ovos_totais) || 0;
      const percentual = avesVivas > 0 ? (ovosTotais / avesVivas) * 100 : 0;

      const insertData = {
        lote_id: loteId,
        integrado_id: integradoId,
        data_producao: format(new Date(), 'yyyy-MM-dd'),
        ovos_totais: ovosTotais,
        ovos_incubaveis: parseInt(data.ovos_incubaveis || '0') || 0,
        ovos_trincados: parseInt(data.ovos_trincados || '0') || 0,
        ovos_sujos: parseInt(data.ovos_sujos || '0') || 0,
        ovos_quebrados: parseInt(data.ovos_quebrados || '0') || 0,
        ovos_deformados: parseInt(data.ovos_deformados || '0') || 0,
        ovos_pequenos: parseInt(data.ovos_pequenos || '0') || 0,
        ovos_medio: parseInt(data.ovos_medio || '0') || 0,
        ovos_grande: parseInt(data.ovos_grande || '0') || 0,
        ovos_extra: parseInt(data.ovos_extra || '0') || 0,
        ovos_jumbo: parseInt(data.ovos_jumbo || '0') || 0,
        peso_medio_ovo_g: parseFloat(data.peso_medio_ovo_g || '0') || null,
        aves_vivas: avesVivas,
        percentual_postura: percentual,
        observacoes: data.observacoes || null,
      };

      const { error } = await supabase
        .from('producao_ovos')
        .upsert(insertData, { 
          onConflict: 'lote_id,data_producao',
        });

      if (error) throw error;

      toast.success('Produção registrada com sucesso!');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao registrar produção:', error);
      toast.error('Erro ao registrar produção');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    if (!diferenca) return <Minus className="w-4 h-4" />;
    if (diferenca > 2) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (diferenca < -5) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-amber-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-5 h-5 text-primary" />
            Registro de Produção
            <FasePosturaBadge semanasVida={semanasVida} />
          </DialogTitle>
        </DialogHeader>

        {semanasVida < 19 ? (
          <div className="py-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Produção só pode ser registrada a partir da <strong>Semana 19</strong>.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Semana atual: {semanasVida}
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Info Header */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aves Vivas</p>
                  <p className="font-medium">{avesVivas.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Semana</p>
                  <p className="font-medium">{semanasVida}</p>
                </div>
              </div>

              {existingRecord && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Já existe registro para hoje. Os dados serão atualizados.</span>
                </div>
              )}

              {/* Produção Total */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Produção Total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="ovos_totais"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ovos Totais *</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_incubaveis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incubáveis</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="peso_medio_ovo_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso Médio (g)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="0" placeholder="0.0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Indicador de % Postura */}
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Egg className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">% Postura</p>
                        <p className="text-xl font-bold">{percentualPostura.toFixed(1)}%</p>
                      </div>
                    </div>
                    {referencia?.producao_percentual && (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Ref: {referencia.producao_percentual.toFixed(1)}%</p>
                          <div className="flex items-center gap-1">
                            {getTrendIcon()}
                            <span className={diferenca && diferenca >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                              {diferenca ? `${diferenca > 0 ? '+' : ''}${diferenca.toFixed(1)}%` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Classificação por Peso */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Classificação por Peso (Padrão 2025)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    <FormField
                      control={form.control}
                      name="ovos_medio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Médio (38-47g)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_grande"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Grande (48-57g)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_extra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Extra (58-67g)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_jumbo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Jumbo (≥68g)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Perdas/Descarte */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Perdas / Descarte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    <FormField
                      control={form.control}
                      name="ovos_trincados"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Trincados</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_sujos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Sujos</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_quebrados"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Quebrados</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_deformados"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Deformados</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ovos_pequenos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Pequenos</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações sobre a produção do dia..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
