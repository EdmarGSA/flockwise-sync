import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";

interface MortalidadeMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
  editData?: {
    id: string;
    linhagem: string;
    sexo: string;
    mortalidade_7_dias: number;
    mortalidade_14_dias: number;
    mortalidade_21_dias: number;
    mortalidade_28_dias: number;
    mortalidade_35_dias: number;
    mortalidade_42_dias: number;
    mortalidade_acima_42_dias: number;
  } | null;
}

const DEFAULT_MORTALIDADE = {
  mortalidade_7_dias: 0.5,
  mortalidade_14_dias: 0.3,
  mortalidade_21_dias: 0.3,
  mortalidade_28_dias: 0.3,
  mortalidade_35_dias: 0.5,
  mortalidade_42_dias: 0.5,
  mortalidade_acima_42_dias: 0.8,
};

const linhagemLabels: Record<string, string> = {
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
  hubbard: 'Hubbard',
};

const sexoLabels: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  misto: 'Misto',
};

export default function MortalidadeMediaDialog({
  open,
  onOpenChange,
  integradoId,
  onSuccess,
  editData,
}: MortalidadeMediaDialogProps) {
  const [saving, setSaving] = useState(false);
  const [linhagem, setLinhagem] = useState('cobb_500');
  const [sexo, setSexo] = useState('misto');
  const [valores, setValores] = useState(DEFAULT_MORTALIDADE);

  useEffect(() => {
    if (open) {
      if (editData) {
        setLinhagem(editData.linhagem);
        setSexo(editData.sexo);
        setValores({
          mortalidade_7_dias: editData.mortalidade_7_dias,
          mortalidade_14_dias: editData.mortalidade_14_dias,
          mortalidade_21_dias: editData.mortalidade_21_dias,
          mortalidade_28_dias: editData.mortalidade_28_dias,
          mortalidade_35_dias: editData.mortalidade_35_dias,
          mortalidade_42_dias: editData.mortalidade_42_dias,
          mortalidade_acima_42_dias: editData.mortalidade_acima_42_dias,
        });
      } else {
        setLinhagem('cobb_500');
        setSexo('misto');
        setValores(DEFAULT_MORTALIDADE);
      }
    }
  }, [open, editData]);

  const handleChange = (field: keyof typeof valores, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValores(prev => ({ ...prev, [field]: numValue }));
  };

  const handleResetDefaults = () => {
    setValores(DEFAULT_MORTALIDADE);
    toast.info('Valores restaurados para o padrão');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editData) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('mortalidade_media')
          .update({
            ...valores,
            linhagem: linhagem as 'cobb_500' | 'ross_308' | 'hubbard',
            sexo: sexo as 'macho' | 'femea' | 'misto',
          })
          .eq('id', editData.id);

        if (error) throw error;
        toast.success('Mortalidade média atualizada com sucesso!');
      } else {
        // Verificar se já existe antes de inserir
        const { data: existing } = await supabase
          .from('mortalidade_media')
          .select('id')
          .eq('integrado_id', integradoId)
          .eq('linhagem', linhagem as 'cobb_500' | 'ross_308' | 'hubbard')
          .eq('sexo', sexo as 'macho' | 'femea' | 'misto')
          .maybeSingle();

        if (existing) {
          toast.error('Já existe uma configuração para esta linhagem e sexo');
          setSaving(false);
          return;
        }

        // Inserir novo registro
        const { error } = await supabase
          .from('mortalidade_media')
          .insert({
            integrado_id: integradoId,
            linhagem: linhagem as 'cobb_500' | 'ross_308' | 'hubbard',
            sexo: sexo as 'macho' | 'femea' | 'misto',
            ...valores,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma configuração para esta linhagem e sexo');
            setSaving(false);
            return;
          }
          throw error;
        }
        toast.success('Mortalidade média cadastrada com sucesso!');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setSaving(false);
    }
  };

  const semanas = [
    { key: 'mortalidade_7_dias' as const, label: '7 Dias', week: 1 },
    { key: 'mortalidade_14_dias' as const, label: '14 Dias', week: 2 },
    { key: 'mortalidade_21_dias' as const, label: '21 Dias', week: 3 },
    { key: 'mortalidade_28_dias' as const, label: '28 Dias', week: 4 },
    { key: 'mortalidade_35_dias' as const, label: '35 Dias', week: 5 },
    { key: 'mortalidade_42_dias' as const, label: '42 Dias', week: 6 },
    { key: 'mortalidade_acima_42_dias' as const, label: 'Acima de 42 Dias', week: 7 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Editar Mortalidade Média' : 'Nova Tabela de Mortalidade'}
          </DialogTitle>
          <DialogDescription>
            Configure os percentuais de mortalidade esperada por período
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seletores de Linhagem e Sexo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Linhagem</Label>
              <Select
                value={linhagem}
                onValueChange={setLinhagem}
                disabled={!!editData}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(linhagemLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select
                value={sexo}
                onValueChange={setSexo}
                disabled={!!editData}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sexoLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campos de percentuais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Percentuais por Período</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Padrão
              </Button>
            </div>

            <div className="grid gap-3">
              {semanas.map((semana) => (
                <div key={semana.key} className="flex items-center gap-4">
                  <Label className="w-40 text-sm">
                    Semana {semana.week} ({semana.label})
                  </Label>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={valores[semana.key]}
                      onChange={(e) => handleChange(semana.key, e.target.value)}
                      className="max-w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
