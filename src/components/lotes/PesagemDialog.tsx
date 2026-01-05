import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator, Scale, Save, Target, Settings2, CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PesagemItem {
  id: string;
  quantidade_aves: number;
  peso_bruto_kg: number;
  peso_tara_kg: number;
  peso_liquido_kg: number;
}

interface MetasPeso {
  peso_inicial_kg: number;
  meta_7_dias_kg: number;
  meta_14_dias_kg: number;
  meta_21_dias_kg: number;
  meta_28_dias_kg: number;
  meta_35_dias_kg: number;
  meta_42_dias_kg: number;
  gpd_kg: number;
}

interface PesagemHistorico {
  periodo: string;
  label: string;
  diasMin: number;
  diasMax: number;
  pesoReal: number | null;
  meta: number | null;
  percentual: number | null;
}

interface PesagemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  pesoInicialPintinhos?: number | null;
  diasDesdeAlojamento?: number;
  dataAlojamento?: string | null;
  linhagem?: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo?: 'macho' | 'femea' | 'misto';
  onSuccess?: () => void;
}

// Calculate weight targets based on initial weight
function calcularMetas(pesoInicialKg: number): MetasPeso {
  const meta7 = pesoInicialKg * 4.5;
  const meta14 = meta7 * 2.6;
  const meta21 = meta14 * 1.9;
  const meta28 = meta21 * 1.6;
  const meta35 = meta28 * 1.4;
  const meta42 = meta35 * 1.3;
  const gpd = (meta42 - pesoInicialKg) / 42;

  return {
    peso_inicial_kg: pesoInicialKg,
    meta_7_dias_kg: meta7,
    meta_14_dias_kg: meta14,
    meta_21_dias_kg: meta21,
    meta_28_dias_kg: meta28,
    meta_35_dias_kg: meta35,
    meta_42_dias_kg: meta42,
    gpd_kg: gpd,
  };
}

// Get current target based on days since housing
function getMetaAtual(metas: MetasPeso | null, dias: number): { label: string; valor: number } | null {
  if (!metas) return null;
  
  if (dias >= 42) return { label: '42 dias', valor: metas.meta_42_dias_kg };
  if (dias >= 35) return { label: '35 dias', valor: metas.meta_35_dias_kg };
  if (dias >= 28) return { label: '28 dias', valor: metas.meta_28_dias_kg };
  if (dias >= 21) return { label: '21 dias', valor: metas.meta_21_dias_kg };
  if (dias >= 14) return { label: '14 dias', valor: metas.meta_14_dias_kg };
  if (dias >= 7) return { label: '7 dias', valor: metas.meta_7_dias_kg };
  
  return { label: 'Inicial', valor: metas.peso_inicial_kg };
}

export function PesagemDialog({ 
  open, 
  onOpenChange, 
  loteId, 
  integradoId,
  pesoInicialPintinhos,
  diasDesdeAlojamento = 0,
  dataAlojamento,
  linhagem,
  sexo,
  onSuccess 
}: PesagemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<PesagemItem[]>([]);
  const [metas, setMetas] = useState<MetasPeso | null>(null);
  const [pesoReferencia, setPesoReferencia] = useState<number | null>(null);
  const [dataPesagem, setDataPesagem] = useState<Date>(new Date());
  const [historicoPesagens, setHistoricoPesagens] = useState<PesagemHistorico[]>([]);
  
  // Form inputs
  const [quantidadeAves, setQuantidadeAves] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoTara, setPesoTara] = useState('');

  // Fetch reference weight from desempenho_aves
  useEffect(() => {
    const fetchPesoReferencia = async () => {
      if (!open || !linhagem || !sexo || diasDesdeAlojamento <= 0) {
        setPesoReferencia(null);
        return;
      }
      
      const { data } = await supabase
        .from('desempenho_aves')
        .select('peso_g')
        .eq('linhagem', linhagem)
        .eq('sexo', sexo)
        .eq('dia', diasDesdeAlojamento)
        .maybeSingle();
      
      if (data) {
        // Convert grams to kg
        setPesoReferencia(data.peso_g / 1000);
      } else {
        setPesoReferencia(null);
      }
    };
    
    fetchPesoReferencia();
  }, [open, linhagem, sexo, diasDesdeAlojamento]);

  // Fetch pesagem history
  useEffect(() => {
    const fetchHistoricoPesagens = async () => {
      if (!open || !loteId || !dataAlojamento) {
        setHistoricoPesagens([]);
        return;
      }

      const { data: pesagens } = await supabase
        .from('pesagens')
        .select('id, data_pesagem, pesagem_itens(quantidade_aves, peso_bruto_g, peso_tara_g)')
        .eq('lote_id', loteId);

      const alojamento = new Date(dataAlojamento);
      
      // Group by period
      const periodos = [
        { label: 'Inicial', diasMin: 0, diasMax: 6 },
        { label: '7 dias', diasMin: 7, diasMax: 13 },
        { label: '14 dias', diasMin: 14, diasMax: 20 },
        { label: '21 dias', diasMin: 21, diasMax: 27 },
        { label: '28 dias', diasMin: 28, diasMax: 34 },
        { label: '35 dias', diasMin: 35, diasMax: 41 },
        { label: '42 dias', diasMin: 42, diasMax: 999 },
      ];

      const pesoInicialKg = pesoInicialPintinhos || 0.040;
      const metasCalc = calcularMetas(pesoInicialKg);

      const historico: PesagemHistorico[] = periodos.map((periodo, idx) => {
        let pesoLiquidoTotal = 0;
        let quantidadeTotal = 0;

        if (pesagens && pesagens.length > 0) {
          pesagens.forEach(pesagem => {
            const dataPes = new Date(pesagem.data_pesagem);
            const dias = Math.floor((dataPes.getTime() - alojamento.getTime()) / (1000 * 60 * 60 * 24));
            
            if (dias >= periodo.diasMin && dias <= periodo.diasMax) {
              pesagem.pesagem_itens?.forEach((item: any) => {
                const liquido = (item.peso_bruto_g || 0) - (item.peso_tara_g || 0);
                pesoLiquidoTotal += liquido;
                quantidadeTotal += item.quantidade_aves || 0;
              });
            }
          });
        }

        const pesoReal = quantidadeTotal > 0 ? pesoLiquidoTotal / quantidadeTotal : null;
        
        let meta: number | null = null;
        if (idx === 0) meta = metasCalc.peso_inicial_kg;
        else if (idx === 1) meta = metasCalc.meta_7_dias_kg;
        else if (idx === 2) meta = metasCalc.meta_14_dias_kg;
        else if (idx === 3) meta = metasCalc.meta_21_dias_kg;
        else if (idx === 4) meta = metasCalc.meta_28_dias_kg;
        else if (idx === 5) meta = metasCalc.meta_35_dias_kg;
        else if (idx === 6) meta = metasCalc.meta_42_dias_kg;

        const percentual = pesoReal !== null && meta !== null && meta > 0 
          ? (pesoReal / meta) * 100 
          : null;

        return {
          periodo: periodo.label,
          label: periodo.label,
          diasMin: periodo.diasMin,
          diasMax: periodo.diasMax,
          pesoReal,
          meta,
          percentual,
        };
      });

      setHistoricoPesagens(historico);
    };

    fetchHistoricoPesagens();
  }, [open, loteId, dataAlojamento, pesoInicialPintinhos]);

  useEffect(() => {
    if (open) {
      setItens([]);
      setDataPesagem(new Date());
      setQuantidadeAves('');
      setPesoBruto('');
      // Não limpa a tara - mantém o valor anterior
      
      // Calculate metas if initial weight available (já está em kg)
      if (pesoInicialPintinhos && pesoInicialPintinhos > 0) {
        const metasCalculadas = calcularMetas(pesoInicialPintinhos);
        setMetas(metasCalculadas);
      } else {
        setMetas(null);
      }
    }
  }, [open, pesoInicialPintinhos]);

  const handleAddItem = () => {
    const quantidade = parseInt(quantidadeAves) || 0;
    const bruto = parseFloat(pesoBruto) || 0;
    const tara = parseFloat(pesoTara) || 0;

    if (quantidade <= 0) {
      toast.error('Informe a quantidade de aves');
      return;
    }

    if (bruto <= 0) {
      toast.error('Informe o peso bruto');
      return;
    }

    const liquido = bruto - tara;

    if (liquido <= 0) {
      toast.error('Peso líquido deve ser maior que zero');
      return;
    }

    const novoItem: PesagemItem = {
      id: crypto.randomUUID(),
      quantidade_aves: quantidade,
      peso_bruto_kg: bruto,
      peso_tara_kg: tara,
      peso_liquido_kg: liquido,
    };

    setItens([...itens, novoItem]);
    
    // Check if average weight is more than 20% different from reference
    const pesoMedioItem = liquido / quantidade;
    if (pesoReferencia && pesoReferencia > 0) {
      const diferenca = ((pesoMedioItem - pesoReferencia) / pesoReferencia) * 100;
      if (Math.abs(diferenca) > 20) {
        const status = diferenca > 0 ? 'acima' : 'abaixo';
        const emoji = diferenca > 0 ? '⬆️' : '⬇️';
        toast.warning(
          `${emoji} Peso médio ${Math.abs(diferenca).toFixed(1)}% ${status} da referência! ` +
          `(${pesoMedioItem.toFixed(3)} kg vs ${pesoReferencia.toFixed(3)} kg ref.)`,
          { duration: 5000 }
        );
      }
    }
    
    // Clear inputs - mantém a tara para reutilização
    setQuantidadeAves('');
    setPesoBruto('');
  };

  const handleRemoveItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  // Calculate totals
  const totalAves = itens.reduce((acc, item) => acc + item.quantidade_aves, 0);
  const totalPesoBruto = itens.reduce((acc, item) => acc + item.peso_bruto_kg, 0);
  const totalPesoTara = itens.reduce((acc, item) => acc + item.peso_tara_kg, 0);
  const totalPesoLiquido = itens.reduce((acc, item) => acc + item.peso_liquido_kg, 0);
  const pesoMedio = totalAves > 0 ? totalPesoLiquido / totalAves : 0;
  
  // Get current target
  const metaAtual = getMetaAtual(metas, diasDesdeAlojamento);

  const handleSave = async () => {
    if (itens.length === 0) {
      toast.error('Adicione pelo menos uma pesagem');
      return;
    }

    setLoading(true);

    try {
      // Create pesagem record
      const { data: pesagem, error: pesagemError } = await supabase
        .from('pesagens')
        .insert({
          lote_id: loteId,
          integrado_id: integradoId,
          data_pesagem: format(dataPesagem, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (pesagemError) throw pesagemError;

      // Insert all items (using kg values in the columns named _g for backwards compatibility)
      const itensToInsert = itens.map(item => ({
        pesagem_id: pesagem.id,
        quantidade_aves: item.quantidade_aves,
        peso_bruto_g: item.peso_bruto_kg,
        peso_tara_g: item.peso_tara_kg,
      }));

      const { error: itensError } = await supabase
        .from('pesagem_itens')
        .insert(itensToInsert);

      if (itensError) throw itensError;

      // Save metas if available
      if (metas) {
        await supabase
          .from('metas_peso')
          .upsert({
            lote_id: loteId,
            integrado_id: integradoId,
            ...metas,
          }, { onConflict: 'lote_id' });
      }

      toast.success(`Pesagem salva! Peso médio: ${pesoMedio.toFixed(3)} kg`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar pesagem:', error);
      toast.error('Erro ao salvar pesagem');
    } finally {
      setLoading(false);
    }
  };

  // Preview calculation
  const previewQuantidade = parseInt(quantidadeAves) || 0;
  const previewBruto = parseFloat(pesoBruto) || 0;
  const previewTara = parseFloat(pesoTara) || 0;
  const previewLiquido = previewBruto - previewTara;
  const previewMedio = previewQuantidade > 0 ? previewLiquido / previewQuantidade : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Pesagem de Aves (kg)
            {diasDesdeAlojamento > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                | Dia {diasDesdeAlojamento}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Data da Pesagem</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataPesagem && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataPesagem ? format(dataPesagem, "PPP", { locale: ptBR }) : <span>Selecionar data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataPesagem}
                  onSelect={(date) => date && setDataPesagem(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Metas Card with Real Values */}
          {metas && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-700">Metas de Peso</span>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
                  {historicoPesagens.map((hist, idx) => {
                    const isActive = diasDesdeAlojamento >= hist.diasMin && diasDesdeAlojamento <= hist.diasMax;
                    return (
                      <div key={hist.label} className={`p-2 rounded ${isActive ? 'bg-amber-500/20 ring-2 ring-amber-500' : 'bg-background/50'}`}>
                        <p className="text-muted-foreground">{hist.label}</p>
                        <p className="font-bold text-amber-600">{hist.meta?.toFixed(3) || '0.000'}</p>
                        {hist.pesoReal !== null ? (
                          <>
                            <p className={`font-bold ${hist.percentual && hist.percentual >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                              {hist.pesoReal.toFixed(3)}
                            </p>
                            <p className={`text-[10px] ${hist.percentual && hist.percentual >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                              {hist.percentual?.toFixed(0)}%
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground/50">--</p>
                            <p className="text-muted-foreground/50 text-[10px]">--</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <div className="p-2 rounded bg-primary/10">
                    <p className="text-muted-foreground">GPD</p>
                    <p className="font-bold text-primary">{metas.gpd_kg.toFixed(3)}</p>
                  </div>
                </div>
                {metaAtual && (
                  <div className="mt-3 text-sm text-center">
                    <span className="text-muted-foreground">Meta atual ({metaAtual.label}):</span>
                    <span className="font-bold text-amber-600 ml-2">{metaAtual.valor.toFixed(3)} kg</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tara Configuration */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="tara" className="font-medium">Peso Tara (kg)</Label>
                </div>
                <Input
                  id="tara"
                  type="number"
                  min="0"
                  step="0.001"
                  value={pesoTara}
                  onChange={(e) => setPesoTara(e.target.value)}
                  placeholder="Ex: 0.500"
                  className="w-32"
                />
                {parseFloat(pesoTara) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Tara fixa: {parseFloat(pesoTara).toFixed(3)} kg
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Input Form */}
          <Card className="bg-secondary/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Qtd. Aves</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={quantidadeAves}
                    onChange={(e) => setQuantidadeAves(e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bruto">Peso Bruto (kg)</Label>
                  <Input
                    id="bruto"
                    type="number"
                    min="0"
                    step="0.001"
                    value={pesoBruto}
                    onChange={(e) => setPesoBruto(e.target.value)}
                    placeholder="Ex: 5.250"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddItem} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Preview calculation */}
              {previewQuantidade > 0 && previewBruto > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Prévia:</span>
                    <span className="font-medium">
                      Líquido: {previewLiquido.toFixed(3)} kg
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium text-primary">
                      Médio/ave: {previewMedio.toFixed(3)} kg
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          {itens.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Qtd. Aves</TableHead>
                      <TableHead>Peso Bruto</TableHead>
                      <TableHead>Tara</TableHead>
                      <TableHead>Líquido</TableHead>
                      <TableHead>Médio/Ave</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{item.quantidade_aves}</TableCell>
                        <TableCell>{item.peso_bruto_kg.toFixed(3)} kg</TableCell>
                        <TableCell>{item.peso_tara_kg.toFixed(3)} kg</TableCell>
                        <TableCell className="font-medium">{item.peso_liquido_kg.toFixed(3)} kg</TableCell>
                        <TableCell className="text-primary font-medium">
                          {(item.peso_liquido_kg / item.quantidade_aves).toFixed(3)} kg
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Totals Card */}
          {itens.length > 0 && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Aves</p>
                    <p className="text-xl font-bold">{totalAves.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Peso Bruto</p>
                    <p className="text-xl font-bold">{totalPesoBruto.toFixed(3)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Total Tara</p>
                    <p className="text-xl font-bold">{totalPesoTara.toFixed(3)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Peso Líquido</p>
                    <p className="text-xl font-bold">{totalPesoLiquido.toFixed(3)} kg</p>
                  </div>
                  <div className="bg-primary/20 rounded-lg p-2">
                    <p className="text-muted-foreground text-sm">Peso Médio</p>
                    <p className="text-2xl font-bold text-primary">{pesoMedio.toFixed(3)} kg</p>
                    {metaAtual && (
                      <p className={`text-xs mt-1 ${pesoMedio >= metaAtual.valor ? 'text-green-600' : 'text-destructive'}`}>
                        {pesoMedio >= metaAtual.valor ? '✓ Acima da meta' : '✗ Abaixo da meta'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || itens.length === 0} className="gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Pesagem'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
