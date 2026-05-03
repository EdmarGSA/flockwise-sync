import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Fan, Droplets, Lightbulb, Flame, Blinds, Bell, HelpCircle, Loader2, Save, AlertTriangle } from 'lucide-react';

type TipoEquipamento = 'ventilador' | 'nebulizador' | 'iluminacao' | 'aquecimento' | 'cortina' | 'alarme' | 'outro';
type FuncaoAutomacao = 'nenhuma' | 'aquecimento' | 'ventilacao' | 'nebulizacao' | 'iluminacao' | 'cortina' | 'alarme';

interface Canal {
  id?: string;
  canal_numero: number;
  nome: string;
  tipo_equipamento: TipoEquipamento;
  funcao_automacao: FuncaoAutomacao;
  automacao_ativa: boolean;
  ativo: boolean;
  estado_atual: string | null;
  observacoes: string | null;
  suporta_dimer?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispositivoId: string | null;
  dispositivoNome: string;
  integradoId: string | null;
  numCanais: number;
}

const TIPOS: { value: TipoEquipamento; label: string; icon: typeof Fan }[] = [
  { value: 'ventilador', label: 'Ventilador', icon: Fan },
  { value: 'nebulizador', label: 'Nebulizador', icon: Droplets },
  { value: 'iluminacao', label: 'Iluminação', icon: Lightbulb },
  { value: 'aquecimento', label: 'Aquecedor', icon: Flame },
  { value: 'cortina', label: 'Cortina', icon: Blinds },
  { value: 'alarme', label: 'Alarme', icon: Bell },
  { value: 'outro', label: 'Outro', icon: HelpCircle },
];

const FUNCOES: { value: FuncaoAutomacao; label: string }[] = [
  { value: 'nenhuma', label: 'Nenhuma (manual)' },
  { value: 'aquecimento', label: 'Aquecimento (temp baixa)' },
  { value: 'ventilacao', label: 'Ventilação (temp alta)' },
  { value: 'nebulizacao', label: 'Nebulização (temp+umid)' },
  { value: 'iluminacao', label: 'Iluminação (programa luz)' },
  { value: 'cortina', label: 'Cortina (temp+horário)' },
  { value: 'alarme', label: 'Alarme (falhas críticas)' },
];

const tipoIcon = (tipo: TipoEquipamento) => TIPOS.find((t) => t.value === tipo)?.icon || HelpCircle;

export function CanaisDispositivoDialog({ open, onOpenChange, dispositivoId, dispositivoNome, integradoId, numCanais }: Props) {
  const [canais, setCanais] = useState<Canal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && dispositivoId) {
      fetchCanais();
    }
  }, [open, dispositivoId]);

  const fetchCanais = async () => {
    if (!dispositivoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('canais_dispositivo')
      .select('*')
      .eq('dispositivo_id', dispositivoId)
      .order('canal_numero');

    if (error) {
      toast.error('Erro ao carregar canais');
      setLoading(false);
      return;
    }

    // Garante que existam slots para todos os canais físicos
    const existentes = (data || []) as Canal[];
    const completos: Canal[] = [];
    for (let i = 1; i <= numCanais; i++) {
      const ex = existentes.find((c) => c.canal_numero === i);
      completos.push(
        ex || {
          canal_numero: i,
          nome: `Canal ${i}`,
          tipo_equipamento: 'outro',
          funcao_automacao: 'nenhuma',
          automacao_ativa: false,
          ativo: false,
          estado_atual: null,
          observacoes: null,
          suporta_dimer: false,
        },
      );
    }
    setCanais(completos);
    setLoading(false);
  };

  const updateCanal = (idx: number, patch: Partial<Canal>) => {
    setCanais((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleSave = async () => {
    if (!dispositivoId || !integradoId) return;
    setSaving(true);

    try {
      const ativosParaUpsert = canais
        .filter((c) => c.ativo || c.id) // só envia canais ativados ou que já existem
        .map((c) => ({
          ...(c.id ? { id: c.id } : {}),
          dispositivo_id: dispositivoId,
          integrado_id: integradoId,
          canal_numero: c.canal_numero,
          nome: c.nome,
          tipo_equipamento: c.tipo_equipamento,
          funcao_automacao: c.funcao_automacao,
          automacao_ativa: c.automacao_ativa && c.funcao_automacao !== 'nenhuma',
          ativo: c.ativo,
          observacoes: c.observacoes,
          suporta_dimer: c.tipo_equipamento === 'iluminacao' ? !!c.suporta_dimer : false,
        }));

      if (ativosParaUpsert.length > 0) {
        const { error } = await supabase
          .from('canais_dispositivo')
          .upsert(ativosParaUpsert as any, { onConflict: 'dispositivo_id,canal_numero' });
        if (error) throw error;
      }

      toast.success('Canais salvos');
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar canais');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestão de Canais — {dispositivoNome}</DialogTitle>
          <DialogDescription>
            Configure cada relé do dispositivo para um equipamento específico (ventilador, nebulizador, iluminação, etc.).
            Apenas canais ativos serão exibidos no monitoramento e poderão ser controlados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {canais.map((canal, idx) => {
              const Icon = tipoIcon(canal.tipo_equipamento);
              return (
                <Card key={canal.canal_numero} className={`p-4 ${canal.ativo ? '' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">CH{canal.canal_numero}</Badge>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {canal.estado_atual && (
                        <Badge variant={canal.estado_atual === 'on' ? 'default' : 'secondary'} className="text-xs">
                          {canal.estado_atual === 'on' ? 'Ligado' : 'Desligado'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Ativo</Label>
                      <Switch
                        checked={canal.ativo}
                        onCheckedChange={(v) => updateCanal(idx, { ativo: v })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome do canal</Label>
                      <Input
                        value={canal.nome}
                        onChange={(e) => updateCanal(idx, { nome: e.target.value })}
                        placeholder="Ex: Ventilador lateral esquerdo"
                        disabled={!canal.ativo}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Tipo de equipamento</Label>
                      <Select
                        value={canal.tipo_equipamento}
                        onValueChange={(v) => updateCanal(idx, { tipo_equipamento: v as TipoEquipamento })}
                        disabled={!canal.ativo}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS.map((t) => {
                            const I = t.icon;
                            return (
                              <SelectItem key={t.value} value={t.value}>
                                <span className="flex items-center gap-2">
                                  <I className="w-3.5 h-3.5" /> {t.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Função de automação</Label>
                      <Select
                        value={canal.funcao_automacao}
                        onValueChange={(v) => updateCanal(idx, { funcao_automacao: v as FuncaoAutomacao })}
                        disabled={!canal.ativo}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FUNCOES.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end gap-3 pb-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={canal.automacao_ativa}
                          onCheckedChange={(v) => updateCanal(idx, { automacao_ativa: v })}
                          disabled={!canal.ativo || canal.funcao_automacao === 'nenhuma'}
                        />
                        <Label className="text-xs text-muted-foreground">
                          Automação {canal.automacao_ativa ? 'ativa' : 'inativa'}
                        </Label>
                      </div>
                    </div>

                    {canal.tipo_equipamento === 'iluminacao' && (
                      <div className="md:col-span-2 flex items-center gap-2 rounded-md border border-dashed p-2">
                        <Switch
                          checked={!!canal.suporta_dimer}
                          onCheckedChange={(v) => updateCanal(idx, { suporta_dimer: v })}
                          disabled={!canal.ativo}
                        />
                        <Label className="text-xs text-muted-foreground">
                          Canal com dimmer/PWM (envia intensidade 0–100% em vez de só on/off)
                        </Label>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <Label className="text-xs">Observações</Label>
                      <Input
                        value={canal.observacoes || ''}
                        onChange={(e) => updateCanal(idx, { observacoes: e.target.value || null })}
                        placeholder="Ex: alimentação 220V, conectado ao quadro 2"
                        disabled={!canal.ativo}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar canais
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
