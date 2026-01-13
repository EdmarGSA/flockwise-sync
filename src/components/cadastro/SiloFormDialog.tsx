import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

interface Silo {
  id: string;
  nome: string;
  marca: string | null;
  diametro_m: number;
  numero_pernas: number;
  numero_aneis: number;
  capacidade_volume_m3: number;
  fator_tonelada_m3: number;
  capacidade_toneladas: number;
  ativo: boolean;
  galpao_id: string | null;
}

interface Galpao {
  id: string;
  nome: string;
  nucleo: {
    nome: string;
  };
}

interface SiloFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  silo: Silo | null;
  integradoId: string;
  onSuccess: () => void;
}

const SiloFormDialog = ({ open, onOpenChange, silo, integradoId, onSuccess }: SiloFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  
  // Form state
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [galpaoId, setGalpaoId] = useState<string>('');
  const [diametroM, setDiametroM] = useState('');
  const [numeroPernas, setNumeroPernas] = useState('4');
  const [numeroAneis, setNumeroAneis] = useState('3');
  const [capacidadeVolumeM3, setCapacidadeVolumeM3] = useState('');
  const [fatorToneladaM3, setFatorToneladaM3] = useState('0.650');
  const [ativo, setAtivo] = useState(true);

  // Calculated values
  const calculatedValues = useMemo(() => {
    const volume = parseFloat(capacidadeVolumeM3) || 0;
    const fator = parseFloat(fatorToneladaM3) || 0;
    const aneis = parseInt(numeroAneis) || 1;
    
    const capacidadeToneladas = volume * fator;
    const volumePorAnel = volume / aneis;
    const toneladaPorAnel = volumePorAnel * fator;
    
    return {
      capacidadeToneladas: capacidadeToneladas.toFixed(2),
      volumePorAnel: volumePorAnel.toFixed(2),
      toneladaPorAnel: toneladaPorAnel.toFixed(3),
    };
  }, [capacidadeVolumeM3, fatorToneladaM3, numeroAneis]);

  useEffect(() => {
    if (open) {
      fetchGalpoes();
      if (silo) {
        // Editing mode
        setNome(silo.nome);
        setMarca(silo.marca || '');
        setGalpaoId(silo.galpao_id || '');
        setDiametroM(silo.diametro_m.toString());
        setNumeroPernas(silo.numero_pernas.toString());
        setNumeroAneis(silo.numero_aneis.toString());
        setCapacidadeVolumeM3(silo.capacidade_volume_m3.toString());
        setFatorToneladaM3(silo.fator_tonelada_m3.toString());
        setAtivo(silo.ativo);
      } else {
        // Creating mode - reset form
        resetForm();
      }
    }
  }, [open, silo]);

  const fetchGalpoes = async () => {
    if (!integradoId) return;
    
    try {
      const { data, error } = await supabase
        .from('galpoes')
        .select(`
          id,
          nome,
          nucleo:nucleos(nome)
        `)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setGalpoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar galpões:', error);
    }
  };

  const resetForm = () => {
    setNome('');
    setMarca('');
    setGalpaoId('');
    setDiametroM('');
    setNumeroPernas('4');
    setNumeroAneis('3');
    setCapacidadeVolumeM3('');
    setFatorToneladaM3('0.650');
    setAtivo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('Informe o nome do silo');
      return;
    }
    
    if (!diametroM || parseFloat(diametroM) <= 0) {
      toast.error('Informe um diâmetro válido');
      return;
    }
    
    if (!capacidadeVolumeM3 || parseFloat(capacidadeVolumeM3) <= 0) {
      toast.error('Informe a capacidade em m³');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        integrado_id: integradoId,
        nome: nome.trim(),
        marca: marca.trim() || null,
        galpao_id: galpaoId || null,
        diametro_m: parseFloat(diametroM),
        numero_pernas: parseInt(numeroPernas),
        numero_aneis: parseInt(numeroAneis),
        capacidade_volume_m3: parseFloat(capacidadeVolumeM3),
        fator_tonelada_m3: parseFloat(fatorToneladaM3),
        ativo,
      };

      if (silo) {
        // Update
        const { error } = await supabase
          .from('silos')
          .update(payload)
          .eq('id', silo.id);

        if (error) throw error;
        toast.success('Silo atualizado com sucesso');
      } else {
        // Insert
        const { error } = await supabase
          .from('silos')
          .insert(payload);

        if (error) throw error;
        toast.success('Silo cadastrado com sucesso');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar silo:', error);
      toast.error('Erro ao salvar silo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            {silo ? 'Editar Silo' : 'Novo Silo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Silo 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ex: Kepler Weber"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="galpao">Galpão (opcional)</Label>
            <Select value={galpaoId || "none"} onValueChange={(val) => setGalpaoId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o galpão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {galpoes.map((galpao) => (
                  <SelectItem key={galpao.id} value={galpao.id}>
                    {galpao.nome} - {galpao.nucleo?.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Especificações Técnicas */}
          <div>
            <h3 className="text-sm font-medium mb-4">Especificações Técnicas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="diametro">Diâmetro (m) *</Label>
                <Input
                  id="diametro"
                  type="number"
                  step="0.01"
                  min="0"
                  value={diametroM}
                  onChange={(e) => setDiametroM(e.target.value)}
                  placeholder="Ex: 2.44"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pernas">Nº de Pernas</Label>
                <Select value={numeroPernas} onValueChange={setNumeroPernas}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} pernas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aneis">Nº de Anéis *</Label>
                <Select value={numeroAneis} onValueChange={setNumeroAneis}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'anel' : 'anéis'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Capacidade */}
          <div>
            <h3 className="text-sm font-medium mb-4">Capacidade</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="volume">Volume (m³) *</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.01"
                  min="0"
                  value={capacidadeVolumeM3}
                  onChange={(e) => setCapacidadeVolumeM3(e.target.value)}
                  placeholder="Ex: 17.50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fator">Fator Tonelada/m³ *</Label>
                <Input
                  id="fator"
                  type="number"
                  step="0.001"
                  min="0"
                  value={fatorToneladaM3}
                  onChange={(e) => setFatorToneladaM3(e.target.value)}
                  placeholder="Ex: 0.650"
                />
                <p className="text-xs text-muted-foreground">
                  Densidade da ração (geralmente entre 0.60 e 0.70)
                </p>
              </div>
            </div>
          </div>

          {/* Cálculos Automáticos */}
          <Card className="bg-muted/50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Cálculos Automáticos
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Capacidade Total</p>
                  <p className="text-xl font-bold text-primary">
                    {calculatedValues.capacidadeToneladas} t
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Volume/Anel</p>
                  <p className="text-xl font-bold">
                    {calculatedValues.volumePorAnel} m³
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tonelada/Anel</p>
                  <p className="text-xl font-bold text-primary">
                    {calculatedValues.toneladaPorAnel} t
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Status</Label>
              <p className="text-sm text-muted-foreground">
                Silos inativos não aparecem nas seleções
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : silo ? 'Salvar Alterações' : 'Cadastrar Silo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SiloFormDialog;
