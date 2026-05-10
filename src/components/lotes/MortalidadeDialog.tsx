import { useState, useEffect, useRef, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { calcularMinMaxDia, formatarHora, type MinMaxDia } from '@/lib/utils/calcularMinMaxDia';
import { useDraftSaver, loadDraft, clearDraft, isDraftMeaningful } from '@/hooks/useMortalidadeDraft';
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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Skull, AlertTriangle, CalendarIcon, Target, Clock, Thermometer, Droplets, Scale, Save, RotateCcw, ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MortalidadeSemanaDetalheDialog from './MortalidadeSemanaDetalheDialog';
import { getDateDisabledFunction, isRetroactiveDate, MAX_RETROACTIVE_DAYS } from '@/lib/dateValidation';
import AnaliseIAMortalidadeCard from './AnaliseIAMortalidadeCard';

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
  submotivos: SubmotivoEliminacao[];
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
  const [horaRegistro, setHoraRegistro] = useState<string>('08:00');
  const [motivo, setMotivo] = useState<MotivoMortalidade>('natural');
  const [submotivos, setSubmotivos] = useState<SubmotivoEliminacao[]>([]);
  const [quantidade, setQuantidade] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [temperaturaC, setTemperaturaC] = useState('');
  const [umidadePct, setUmidadePct] = useState('');
  const [saving, setSaving] = useState(false);
  const [historicoMortalidade, setHistoricoMortalidade] = useState<MortalidadeSemana[]>([]);
  const [totalMortalidade, setTotalMortalidade] = useState(0);
  const [selectedSemana, setSelectedSemana] = useState<{
    semana: number;
    diaInicio: number;
    diaFim: number;
  } | null>(null);
  const [savedMortalidadeId, setSavedMortalidadeId] = useState<string | null>(null);

  const getSemanaRange = (semana: number): { diaInicio: number; diaFim: number } => {
    switch (semana) {
      case 7: return { diaInicio: 1, diaFim: 7 };
      case 14: return { diaInicio: 8, diaFim: 14 };
      case 21: return { diaInicio: 15, diaFim: 21 };
      case 28: return { diaInicio: 22, diaFim: 28 };
      case 35: return { diaInicio: 29, diaFim: 35 };
      case 42: return { diaInicio: 36, diaFim: 45 };
      default: return { diaInicio: 1, diaFim: 7 };
    }
  };

  const diasDesdeAlojamento = calcularIdadeLote(dataAlojamento);

  // Auto-fill temperature/humidity from IoT sensors
  useEffect(() => {
    if (open && loteId && integradoId) {
      fetchSensorData();
    }
  }, [open, loteId, integradoId]);

  const fetchSensorData = async () => {
    try {
      // Get galpao_id from lote
      const { data: lote } = await supabase
        .from('lotes')
        .select('galpao_id')
        .eq('id', loteId)
        .single();

      if (!lote?.galpao_id) return;

      // Get device linked to this galpao
      const { data: device } = await supabase
        .from('dispositivos_iot')
        .select('id')
        .eq('galpao_id', lote.galpao_id)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (!device) return;

      // Get latest reading
      const { data: leitura } = await supabase
        .from('leituras_sensores')
        .select('temperatura_c, umidade_pct, lido_em')
        .eq('dispositivo_id', device.id)
        .order('lido_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leitura) {
        // Only auto-fill if reading is recent (< 2 hours)
        const readingAge = Date.now() - new Date(leitura.lido_em).getTime();
        if (readingAge < 2 * 60 * 60 * 1000) {
          if (leitura.temperatura_c && !temperaturaC) setTemperaturaC(String(leitura.temperatura_c));
          if (leitura.umidade_pct && !umidadePct) setUmidadePct(String(leitura.umidade_pct));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do sensor:', err);
    }
  };

  useEffect(() => {
    if (open && loteId && dataAlojamento) {
      const date = new Date(dataAlojamento);
      if (!isNaN(date.getTime())) {
        fetchHistoricoMortalidade();
      }
    }
  }, [open, loteId, dataAlojamento]);

  const fetchHistoricoMortalidade = async () => {
    const { data, error } = await supabase
      .from('mortalidade')
      .select(`data_registro, mortalidade_itens(quantidade)`)
      .eq('lote_id', loteId);

    if (error) { console.error('Erro ao buscar histórico:', error); return; }

    const semanas: Record<number, number> = {};
    let total = 0;

    data?.forEach((mortalidade: any) => {
      const diasDoRegistro = calcularIdadeNaData(dataAlojamento!, mortalidade.data_registro);
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

    const semanasArray: MortalidadeSemana[] = [7, 14, 21, 28, 35, 42].map(dias => ({
      semana: dias,
      label: dias === 42 ? '42+' : `${dias}d`,
      quantidade: semanas[dias] || 0,
      percentual: quantidadeAves > 0 ? ((semanas[dias] || 0) / quantidadeAves) * 100 : 0,
    }));

    setHistoricoMortalidade(semanasArray);
    setTotalMortalidade(total);
  };

  const toggleSubmotivo = (sub: SubmotivoEliminacao) => {
    setSubmotivos(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleAddItem = () => {
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    if (!pesoKg || parseFloat(pesoKg) <= 0) {
      toast.error('Informe o peso das aves (obrigatório)');
      return;
    }
    if (motivo === 'eliminado' && submotivos.length === 0) {
      toast.error('Selecione pelo menos um submotivo');
      return;
    }

    const newItem: MortalidadeItem = {
      id: crypto.randomUUID(),
      motivo,
      submotivos: motivo === 'eliminado' ? [...submotivos] : [],
      quantidade: qtd,
      pesoKg,
    };

    setItems([...items, newItem]);
    setQuantidade('');
    setPesoKg('');
    setSubmotivos([]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const getTotalNatural = () => items.filter(i => i.motivo === 'natural').reduce((acc, i) => acc + i.quantidade, 0);
  const getTotalEliminados = () => items.filter(i => i.motivo === 'eliminado').reduce((acc, i) => acc + i.quantidade, 0);
  const getTotalGeral = () => items.reduce((acc, i) => acc + i.quantidade, 0);

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um registro de mortalidade');
      return;
    }

    setSaving(true);

    try {
      const { data: mortalidadeData, error: mortalidadeError } = await supabase
        .from('mortalidade')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          data_registro: format(dataRegistro, 'yyyy-MM-dd'),
          temperatura_c: temperaturaC ? parseFloat(temperaturaC) : null,
          umidade_pct: umidadePct ? parseFloat(umidadePct) : null,
        })
        .select('id')
        .single();

      if (mortalidadeError) throw mortalidadeError;

      // Save items - one per submotivo for eliminados
      const mortalidadeItens = items.flatMap(item => {
        if (item.motivo === 'eliminado' && item.submotivos.length > 0) {
          return item.submotivos.map(sub => ({
            mortalidade_id: mortalidadeData.id,
            motivo: item.motivo,
            submotivo: sub,
            quantidade: item.quantidade,
            peso_kg: parseFloat(item.pesoKg),
          }));
        }
        return [{
          mortalidade_id: mortalidadeData.id,
          motivo: item.motivo,
          submotivo: item.submotivos[0] || null,
          quantidade: item.quantidade,
          peso_kg: parseFloat(item.pesoKg),
        }];
      });

      const { error: itensError } = await supabase
        .from('mortalidade_itens')
        .insert(mortalidadeItens);

      if (itensError) throw itensError;

      toast.success('Mortalidade registrada com sucesso!');
      setSavedMortalidadeId(mortalidadeData.id);
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
    setHoraRegistro('08:00');
    setQuantidade('');
    setPesoKg('');
    setMotivo('natural');
    setSubmotivos([]);
    setTemperaturaC('');
    setUmidadePct('');
    setSavedMortalidadeId(null);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5" />
            Registro de Mortalidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Histórico */}
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
                    const hasData = semana.quantidade > 0;
                    return (
                      <div
                        key={semana.semana}
                        onClick={() => {
                          if (isActive && hasData) {
                            const range = getSemanaRange(semana.semana);
                            setSelectedSemana({
                              semana: semana.semana === 42 ? 6 : Math.ceil(semana.semana / 7),
                              diaInicio: range.diaInicio,
                              diaFim: range.diaFim,
                            });
                          }
                        }}
                        className={cn(
                          "p-2 rounded transition-colors",
                          isActive ? "bg-muted" : "bg-muted/30 opacity-50",
                          isActive && hasData && "cursor-pointer hover:bg-muted/80 hover:ring-1 hover:ring-primary/50"
                        )}
                      >
                        <span className="text-muted-foreground block">{semana.label}</span>
                        <span className="font-bold block text-sm">{semana.quantidade || '--'}</span>
                        <span className="text-muted-foreground">
                          {hasData ? `${semana.percentual.toFixed(2)}%` : '--'}
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

          {/* Date/Time + Environment */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data e Hora do Registro</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("flex-1 justify-start text-left font-normal", !dataRegistro && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataRegistro ? format(dataRegistro, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataRegistro}
                      onSelect={(date) => date && setDataRegistro(date)}
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
                <Input type="time" value={horaRegistro} onChange={(e) => setHoraRegistro(e.target.value)} className="w-28" />
              </div>
              {isRetroactiveDate(dataRegistro) && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
                  <Clock className="w-3 h-3" />
                  Registro retroativo
                </Badge>
              )}
            </div>

            {/* Temperature & Humidity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  Temperatura (°C)
                </Label>
                <Input
                  type="number"
                  placeholder="Ex: 28.5"
                  value={temperaturaC}
                  onChange={(e) => setTemperaturaC(e.target.value)}
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  Umidade (%)
                </Label>
                <Input
                  type="number"
                  placeholder="Ex: 65"
                  value={umidadePct}
                  onChange={(e) => setUmidadePct(e.target.value)}
                  step="1"
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Input Form */}
          <Card className="border-border">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Select value={motivo} onValueChange={(v) => { setMotivo(v as MotivoMortalidade); setSubmotivos([]); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="eliminado">Eliminado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {motivo === 'eliminado' && (
                  <div className="space-y-2">
                    <Label>Submotivos *</Label>
                    <div className="space-y-2 pt-1">
                      {(Object.entries(SUBMOTIVO_LABELS) as [SubmotivoEliminacao, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`sub-${key}`}
                            checked={submotivos.includes(key)}
                            onCheckedChange={() => toggleSubmotivo(key)}
                          />
                          <label htmlFor={`sub-${key}`} className="text-sm cursor-pointer">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input type="number" placeholder="Ex: 5" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Peso (kg) *</Label>
                  <Input type="number" placeholder="Ex: 1.5" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} step="0.01" min={0.01} />
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
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant={item.motivo === 'natural' ? 'secondary' : 'destructive'}>
                          {item.motivo === 'natural' ? 'Natural' : 'Eliminado'}
                        </Badge>
                        {item.submotivos.map(sub => (
                          <span key={sub} className="text-sm text-muted-foreground">{SUBMOTIVO_LABELS[sub]}</span>
                        ))}
                        <span className="font-semibold">{item.quantidade} aves</span>
                        <span className="text-sm text-muted-foreground">({item.pesoKg} kg)</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
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
                    {(Object.entries(SUBMOTIVO_LABELS) as [SubmotivoEliminacao, string][]).map(([key, label]) => {
                      const total = items.filter(i => i.submotivos.includes(key)).reduce((acc, i) => acc + i.quantidade, 0);
                      return (
                        <div key={key} className="flex justify-between text-xs">
                          <span>{label}:</span>
                          <span>{total}</span>
                        </div>
                      );
                    })}
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

          {/* AI Analysis (after save) */}
          {savedMortalidadeId && (
            <AnaliseIAMortalidadeCard
              mortalidadeId={savedMortalidadeId}
              loteId={loteId}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              {savedMortalidadeId ? 'Fechar' : 'Cancelar'}
            </Button>
            {!savedMortalidadeId && (
              <Button onClick={handleSave} disabled={saving || items.length === 0}>
                {saving ? 'Salvando...' : 'Salvar Mortalidade'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {dataAlojamento && selectedSemana && (
      <MortalidadeSemanaDetalheDialog
        open={!!selectedSemana}
        onOpenChange={(open) => !open && setSelectedSemana(null)}
        loteId={loteId}
        semana={selectedSemana.semana}
        diaInicio={selectedSemana.diaInicio}
        diaFim={selectedSemana.diaFim}
        dataAlojamento={dataAlojamento}
        metaSemana={0}
        quantidadeAlojada={quantidadeAves}
      />
    )}
  </>
  );
}
