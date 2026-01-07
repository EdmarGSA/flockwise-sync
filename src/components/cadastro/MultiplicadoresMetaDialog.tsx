import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

interface MultiplicadoresMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
  editData?: {
    id: string;
    linhagem: string;
    sexo: string;
    mult_7_dias: number;
    mult_14_dias: number;
    mult_21_dias: number;
    mult_28_dias: number;
    mult_35_dias: number;
    mult_42_dias: number;
  } | null;
}

const DEFAULT_MULTIPLICADORES = {
  mult_7_dias: 4.9,
  mult_14_dias: 13.9,
  mult_21_dias: 27.2,
  mult_28_dias: 43.5,
  mult_35_dias: 61.5,
  mult_42_dias: 80.0,
};

const linhagemLabels: Record<string, string> = {
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
};

const sexoLabels: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  misto: 'Misto',
};

export function MultiplicadoresMetaDialog({
  open,
  onOpenChange,
  integradoId,
  onSuccess,
  editData,
}: MultiplicadoresMetaDialogProps) {
  const [saving, setSaving] = useState(false);
  const [linhagem, setLinhagem] = useState('');
  const [sexo, setSexo] = useState('');
  const [multiplicadores, setMultiplicadores] = useState(DEFAULT_MULTIPLICADORES);
  const [pesoSimulacao, setPesoSimulacao] = useState(0.041);

  useEffect(() => {
    if (open) {
      if (editData) {
        setLinhagem(editData.linhagem);
        setSexo(editData.sexo);
        setMultiplicadores({
          mult_7_dias: editData.mult_7_dias,
          mult_14_dias: editData.mult_14_dias,
          mult_21_dias: editData.mult_21_dias,
          mult_28_dias: editData.mult_28_dias,
          mult_35_dias: editData.mult_35_dias,
          mult_42_dias: editData.mult_42_dias,
        });
      } else {
        setLinhagem('');
        setSexo('');
        setMultiplicadores(DEFAULT_MULTIPLICADORES);
      }
      setPesoSimulacao(0.041);
    }
  }, [open, editData]);

  const handleSave = async () => {
    if (!linhagem || !sexo) {
      toast.error('Selecione a linhagem e o sexo');
      return;
    }

    setSaving(true);
    try {
      if (editData) {
        const { error } = await supabase
          .from('multiplicadores_meta_peso')
          .update({
            ...multiplicadores,
          })
          .eq('id', editData.id);

        if (error) throw error;
        toast.success('Multiplicadores atualizados com sucesso!');
      } else {
        const { error } = await supabase
          .from('multiplicadores_meta_peso')
          .insert({
            integrado_id: integradoId,
            linhagem: linhagem as 'cobb_500' | 'ross_308',
            sexo: sexo as 'macho' | 'femea' | 'misto',
            ...multiplicadores,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma tabela de multiplicadores para esta linhagem e sexo');
            return;
          }
          throw error;
        }
        toast.success('Multiplicadores cadastrados com sucesso!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar multiplicadores:', error);
      toast.error('Erro ao salvar multiplicadores');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setMultiplicadores(DEFAULT_MULTIPLICADORES);
  };

  const calcularPesoMeta = (multiplicador: number) => {
    return (pesoSimulacao * multiplicador).toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Editar Multiplicadores' : 'Nova Tabela de Multiplicadores'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de linhagem e sexo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Linhagem</Label>
              <Select value={linhagem} onValueChange={setLinhagem} disabled={!!editData}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(linhagemLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={sexo} onValueChange={setSexo} disabled={!!editData}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sexoLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Multiplicadores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Multiplicadores (peso_meta = peso_inicial × mult)</Label>
              <Button variant="ghost" size="sm" onClick={handleResetDefaults}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Padrão
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">7 dias</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={multiplicadores.mult_7_dias}
                  onChange={(e) => setMultiplicadores({
                    ...multiplicadores,
                    mult_7_dias: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">14 dias</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={multiplicadores.mult_14_dias}
                  onChange={(e) => setMultiplicadores({
                    ...multiplicadores,
                    mult_14_dias: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">21 dias</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={multiplicadores.mult_21_dias}
                  onChange={(e) => setMultiplicadores({
                    ...multiplicadores,
                    mult_21_dias: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">28 dias</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={multiplicadores.mult_28_dias}
                  onChange={(e) => setMultiplicadores({
                    ...multiplicadores,
                    mult_28_dias: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">35 dias</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={multiplicadores.mult_35_dias}
                  onChange={(e) => setMultiplicadores({
                    ...multiplicadores,
                    mult_35_dias: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">42 dias</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={multiplicadores.mult_42_dias}
                  onChange={(e) => setMultiplicadores({
                    ...multiplicadores,
                    mult_42_dias: parseFloat(e.target.value) || 0,
                  })}
                />
              </div>
            </div>
          </div>

          {/* Simulação */}
          <Card className="bg-muted/50">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Simulação
                <Input
                  type="number"
                  step="0.001"
                  className="w-24 h-7 text-sm"
                  value={pesoSimulacao}
                  onChange={(e) => setPesoSimulacao(parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs text-muted-foreground">kg inicial</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="grid grid-cols-6 gap-2 text-center text-xs">
                <div>
                  <div className="font-medium text-muted-foreground">7d</div>
                  <div className="font-semibold">{calcularPesoMeta(multiplicadores.mult_7_dias)}kg</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">14d</div>
                  <div className="font-semibold">{calcularPesoMeta(multiplicadores.mult_14_dias)}kg</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">21d</div>
                  <div className="font-semibold">{calcularPesoMeta(multiplicadores.mult_21_dias)}kg</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">28d</div>
                  <div className="font-semibold">{calcularPesoMeta(multiplicadores.mult_28_dias)}kg</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">35d</div>
                  <div className="font-semibold">{calcularPesoMeta(multiplicadores.mult_35_dias)}kg</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">42d</div>
                  <div className="font-semibold">{calcularPesoMeta(multiplicadores.mult_42_dias)}kg</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
