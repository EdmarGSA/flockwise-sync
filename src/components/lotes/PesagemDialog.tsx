import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator, Scale, Save } from 'lucide-react';

interface PesagemItem {
  id: string;
  quantidade_aves: number;
  peso_bruto_g: number;
  peso_tara_g: number;
  peso_liquido_g: number;
}

interface PesagemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  integradoId: string;
  onSuccess?: () => void;
}

export function PesagemDialog({ 
  open, 
  onOpenChange, 
  loteId, 
  integradoId,
  onSuccess 
}: PesagemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<PesagemItem[]>([]);
  
  // Form inputs
  const [quantidadeAves, setQuantidadeAves] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoTara, setPesoTara] = useState('');

  useEffect(() => {
    if (open) {
      setItens([]);
      setQuantidadeAves('');
      setPesoBruto('');
      setPesoTara('');
    }
  }, [open]);

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
      peso_bruto_g: bruto,
      peso_tara_g: tara,
      peso_liquido_g: liquido,
    };

    setItens([...itens, novoItem]);
    
    // Clear inputs
    setQuantidadeAves('');
    setPesoBruto('');
    setPesoTara('');
  };

  const handleRemoveItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  // Calculate totals
  const totalAves = itens.reduce((acc, item) => acc + item.quantidade_aves, 0);
  const totalPesoBruto = itens.reduce((acc, item) => acc + item.peso_bruto_g, 0);
  const totalPesoTara = itens.reduce((acc, item) => acc + item.peso_tara_g, 0);
  const totalPesoLiquido = itens.reduce((acc, item) => acc + item.peso_liquido_g, 0);
  const pesoMedio = totalAves > 0 ? totalPesoLiquido / totalAves : 0;

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
          data_pesagem: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (pesagemError) throw pesagemError;

      // Insert all items
      const itensToInsert = itens.map(item => ({
        pesagem_id: pesagem.id,
        quantidade_aves: item.quantidade_aves,
        peso_bruto_g: item.peso_bruto_g,
        peso_tara_g: item.peso_tara_g,
      }));

      const { error: itensError } = await supabase
        .from('pesagem_itens')
        .insert(itensToInsert);

      if (itensError) throw itensError;

      toast.success(`Pesagem salva! Peso médio: ${pesoMedio.toFixed(0)}g`);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Pesagem de Aves
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Form */}
          <Card className="bg-secondary/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <Label htmlFor="bruto">Peso Bruto (g)</Label>
                  <Input
                    id="bruto"
                    type="number"
                    min="0"
                    step="0.1"
                    value={pesoBruto}
                    onChange={(e) => setPesoBruto(e.target.value)}
                    placeholder="Ex: 5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tara">Peso Tara (g)</Label>
                  <Input
                    id="tara"
                    type="number"
                    min="0"
                    step="0.1"
                    value={pesoTara}
                    onChange={(e) => setPesoTara(e.target.value)}
                    placeholder="Ex: 500"
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
                      Líquido: {previewLiquido.toLocaleString('pt-BR')}g
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium text-primary">
                      Médio/ave: {previewMedio.toFixed(0)}g
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
                        <TableCell>{item.peso_bruto_g.toLocaleString('pt-BR')}g</TableCell>
                        <TableCell>{item.peso_tara_g.toLocaleString('pt-BR')}g</TableCell>
                        <TableCell className="font-medium">{item.peso_liquido_g.toLocaleString('pt-BR')}g</TableCell>
                        <TableCell className="text-primary font-medium">
                          {(item.peso_liquido_g / item.quantidade_aves).toFixed(0)}g
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
                    <p className="text-xl font-bold">{totalPesoBruto.toLocaleString('pt-BR')}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Total Tara</p>
                    <p className="text-xl font-bold">{totalPesoTara.toLocaleString('pt-BR')}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Peso Líquido</p>
                    <p className="text-xl font-bold">{totalPesoLiquido.toLocaleString('pt-BR')}g</p>
                  </div>
                  <div className="bg-primary/20 rounded-lg p-2">
                    <p className="text-muted-foreground text-sm">Peso Médio</p>
                    <p className="text-2xl font-bold text-primary">{pesoMedio.toFixed(0)}g</p>
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
