import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Skull, AlertTriangle, CalendarIcon, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MortalidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  dataAlojamento: string | null;
  quantidadeAves: number;
  onSuccess: () => void;
}

type MotivoMortalidade = 'natural' | 'eliminado';
type SubmotivoEliminacao = 'problema_locomotor' | 'debilitado' | 'deficiente';

interface MortalidadeItem {
  id: string;
  motivo: MotivoMortalidade;
  submotivo: SubmotivoEliminacao | null;
  quantidade: number;
  pesoKg: string;
}

interface MortalidadeSemana {
  semana: number;
  label: string;
  quantidade: number;
  percentual: number;
}

const SUBMOTIVO_LABELS: Record<SubmotivoEliminacao, string> = {
  problema_locomotor: 'Problema Locomotor',
  debilitado: 'Debilitado',
  deficiente: 'Deficiente',
};

export function MortalidadeDialog({
  open,
  onOpenChange,
  loteId,
  integradoId,
  dataAlojamento,
  quantidadeAves,
  onSuccess,
}: MortalidadeDialogProps) {
  const [items, setItems] = useState<MortalidadeItem[]>([]);
  const [dataRegistro, setDataRegistro] = useState<Date>(new Date());
  const [motivo, setMotivo] = useState<MotivoMortalidade>('natural');
  const [submotivo, setSubmotivo] = useState<SubmotivoEliminacao>('problema_locomotor');
  const [quantidade, setQuantidade] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [saving, setSaving] = useState(false);
  const [historicoMortalidade, setHistoricoMortalidade] = useState<MortalidadeSemana[]>([]);
  const [totalMortalidade, setTotalMortalidade] = useState(0);

  // Calcular dias desde alojamento
  const diasDesdeAlojamento = dataAlojamento 
    ? differenceInDays(new Date(), new Date(dataAlojamento)) 
    : 0;

  // Buscar histórico de mortalidade
  useEffect(() => {
    if (open && loteId && dataAlojamento) {
      fetchHistoricoMortalidade();
    }
  }, [open, loteId, dataAlojamento]);

  const fetchHistoricoMortalidade = async () => {
    const { data, error } = await supabase
      .from('mortalidade')
      .select(`
        data_registro,
        mortalidade_itens(quantidade)
      `)
      .eq('lote_id', loteId);

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return;
    }

    // Agrupar por semana
    const semanas: Record<number, number> = {};
    let total = 0;

    data?.forEach((mortalidade: any) => {
      const diasDoRegistro = differenceInDays(
        new Date(mortalidade.data_registro),
        new Date(dataAlojamento!)
      );
      
      // Determinar a semana (7, 14, 21, 28, 35, 42+)
      let semana: number;
      if (diasDoRegistro <= 7) semana = 7;
      else if (diasDoRegistro <= 14) semana = 14;
      else if (diasDoRegistro <= 21) semana = 21;
      else if (diasDoRegistro <= 28) semana = 28;
      else if (diasDoRegistro <= 35) semana = 35;
      else semana = 42;

      const qtdTotal = mortalidade.mortalidade_itens?.reduce(
        (acc: number, item: any) => acc + (item.quantidade || 0), 0
      ) || 0;

      semanas[semana] = (semanas[semana] || 0) + qtdTotal;
      total += qtdTotal;
    });

    // Criar array de semanas para exibição
    const semanasArray: MortalidadeSemana[] = [7, 14, 21, 28, 35, 42].map(dias => ({
      semana: dias,
      label: dias === 42 ? '42+' : `${dias}d`,
      quantidade: semanas[dias] || 0,
      percentual: quantidadeAves > 0 ? ((semanas[dias] || 0) / quantidadeAves) * 100 : 0,
    }));

    setHistoricoMortalidade(semanasArray);
    setTotalMortalidade(total);
  };

  const handleAddItem = () => {
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    const newItem: MortalidadeItem = {
      id: crypto.randomUUID(),
      motivo,
      submotivo: motivo === 'eliminado' ? submotivo : null,
      quantidade: qtd,
      pesoKg: pesoKg || '',
    };

    setItems([...items, newItem]);
    setQuantidade('');
    setPesoKg('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const getTotalNatural = () => {
    return items.filter(i => i.motivo === 'natural').reduce((acc, i) => acc + i.quantidade, 0);
  };

  const getTotalEliminados = () => {
    return items.filter(i => i.motivo === 'eliminado').reduce((acc, i) => acc + i.quantidade, 0);
  };

  const getTotalBySubmotivo = (sub: SubmotivoEliminacao) => {
    return items.filter(i => i.submotivo === sub).reduce((acc, i) => acc + i.quantidade, 0);
  };

  const getTotalGeral = () => {
    return items.reduce((acc, i) => acc + i.quantidade, 0);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um registro de mortalidade');
      return;
    }

    setSaving(true);

    try {
      // Create mortalidade record
      const { data: mortalidadeData, error: mortalidadeError } = await supabase
        .from('mortalidade')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          data_registro: format(dataRegistro, 'yyyy-MM-dd'),
        })
        .select('id')
        .single();

      if (mortalidadeError) throw mortalidadeError;

      // Create mortalidade items
      const mortalidadeItens = items.map(item => ({
        mortalidade_id: mortalidadeData.id,
        motivo: item.motivo,
        submotivo: item.submotivo,
        quantidade: item.quantidade,
        peso_kg: item.pesoKg ? parseFloat(item.pesoKg) : null,
      }));

      const { error: itensError } = await supabase
        .from('mortalidade_itens')
        .insert(mortalidadeItens);

      if (itensError) throw itensError;

      toast.success('Mortalidade registrada com sucesso!');
      setItems([]);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar mortalidade:', error);
      toast.error('Erro ao salvar mortalidade');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setItems([]);
    setDataRegistro(new Date());
    setQuantidade('');
    setPesoKg('');
    setMotivo('natural');
    setSubmotivo('problema_locomotor');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5" />
            Registro de Mortalidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Painel Informativo - Histórico de Mortalidade */}
          {dataAlojamento && diasDesdeAlojamento > 0 && (
            <Card className="border-amber-500/50 bg-amber-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Histórico de Mortalidade</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {historicoMortalidade.map((semana) => {
                    const isActive = diasDesdeAlojamento >= (semana.semana === 42 ? 36 : semana.semana - 6);
                    return (
                      <div 
                        key={semana.semana} 
                        className={cn(
                          "p-2 rounded",
                          isActive ? "bg-muted" : "bg-muted/30 opacity-50"
                        )}
                      >
                        <span className="text-muted-foreground block">{semana.label}</span>
                        <span className="font-bold block text-sm">{semana.quantidade || '--'}</span>
                        <span className="text-muted-foreground">
                          {semana.quantidade > 0 ? `${semana.percentual.toFixed(2)}%` : '--'}
                        </span>
                      </div>
                    );
                  })}
                  <div className="p-2 rounded bg-destructive/20 border border-destructive/30">
                    <span className="text-destructive block font-medium">Total</span>
                    <span className="font-bold block text-sm text-destructive">{totalMortalidade}</span>
                    <span className="text-destructive/80">
                      {quantidadeAves > 0 ? `${((totalMortalidade / quantidadeAves) * 100).toFixed(2)}%` : '--'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Data do Registro</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataRegistro && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataRegistro ? format(dataRegistro, "PPP", { locale: ptBR }) : <span>Selecionar data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataRegistro}
                  onSelect={(date) => date && setDataRegistro(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Input Form */}
          <Card className="border-border">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoMortalidade)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="eliminado">Eliminado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {motivo === 'eliminado' && (
                  <div className="space-y-2">
                    <Label>Submotivo</Label>
                    <Select value={submotivo} onValueChange={(v) => setSubmotivo(v as SubmotivoEliminacao)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="problema_locomotor">Problema Locomotor</SelectItem>
                        <SelectItem value="debilitado">Debilitado</SelectItem>
                        <SelectItem value="deficiente">Deficiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peso (kg) - Opcional</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1.5"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    step="0.01"
                    min={0}
                  />
                </div>
              </div>

              <Button onClick={handleAddItem} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Item
              </Button>
            </CardContent>
          </Card>

          {/* Items List */}
          {items.length > 0 && (
            <Card className="border-border">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={item.motivo === 'natural' ? 'secondary' : 'destructive'}>
                          {item.motivo === 'natural' ? 'Natural' : 'Eliminado'}
                        </Badge>
                        {item.submotivo && (
                          <span className="text-sm text-muted-foreground">
                            {SUBMOTIVO_LABELS[item.submotivo]}
                          </span>
                        )}
                        <span className="font-semibold">{item.quantidade} aves</span>
                        {item.pesoKg && (
                          <span className="text-sm text-muted-foreground">
                            ({item.pesoKg} kg)
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mortes Naturais:</span>
                      <span className="font-semibold">{getTotalNatural()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eliminados Total:</span>
                      <span className="font-semibold">{getTotalEliminados()}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Detalhamento Eliminados:</p>
                    <div className="flex justify-between text-xs">
                      <span>Problema Locomotor:</span>
                      <span>{getTotalBySubmotivo('problema_locomotor')}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Debilitado:</span>
                      <span>{getTotalBySubmotivo('debilitado')}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Deficiente:</span>
                      <span>{getTotalBySubmotivo('deficiente')}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-semibold">Total Geral:</span>
                  </span>
                  <span className="text-xl font-bold text-destructive">{getTotalGeral()} aves</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || items.length === 0}>
              {saving ? 'Salvando...' : 'Salvar Mortalidade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
