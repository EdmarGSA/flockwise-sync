import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Egg, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface TransferirEstoqueOvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producaoOvosId: string;
  integradoId: string;
  loteProducaoId: string;
  linhagem: string;
  dataProducao: string;
  quantidades: {
    medio: number;
    grande: number;
    extra: number;
    jumbo: number;
  };
  onSuccess?: () => void;
}

const CLASSIFICACOES = [
  { key: 'medio', label: 'Médio', peso: '38-47g' },
  { key: 'grande', label: 'Grande', peso: '48-57g' },
  { key: 'extra', label: 'Extra', peso: '58-67g' },
  { key: 'jumbo', label: 'Jumbo', peso: '68g+' },
];

export default function TransferirEstoqueOvosDialog({
  open,
  onOpenChange,
  producaoOvosId,
  integradoId,
  loteProducaoId,
  linhagem,
  dataProducao,
  quantidades,
  onSuccess,
}: TransferirEstoqueOvosDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tipoOvo, setTipoOvo] = useState<string>('');
  const [dataValidade, setDataValidade] = useState(format(addDays(new Date(dataProducao), 30), 'yyyy-MM-dd'));
  const [custoUnitario, setCustoUnitario] = useState(0);
  const [quantidadesTransferir, setQuantidadesTransferir] = useState(quantidades);

  useEffect(() => {
    // Inferir tipo de ovo baseado na linhagem
    if (linhagem) {
      const linhagemLower = linhagem.toLowerCase();
      if (linhagemLower.includes('lsl') || linhagemLower.includes('white') || linhagemLower.includes('branco')) {
        setTipoOvo('branco');
      } else if (linhagemLower.includes('brown') || linhagemLower.includes('marrom')) {
        setTipoOvo('castanho');
      } else {
        setTipoOvo('castanho'); // Default para castanho
      }
    }
  }, [linhagem]);

  useEffect(() => {
    setQuantidadesTransferir(quantidades);
    setDataValidade(format(addDays(new Date(dataProducao), 30), 'yyyy-MM-dd'));
  }, [quantidades, dataProducao]);

  const handleTransferir = async () => {
    if (!tipoOvo) {
      toast.error('Selecione o tipo de ovo');
      return;
    }

    setSaving(true);
    try {
      const transferencias = [];

      for (const classif of CLASSIFICACOES) {
        const qtd = quantidadesTransferir[classif.key as keyof typeof quantidadesTransferir];
        if (qtd > 0) {
          // Gerar lote interno
          const { data: loteInterno, error: loteError } = await supabase
            .rpc('gerar_lote_interno_ovos', { p_integrado_id: integradoId });

          if (loteError) throw loteError;

          // Criar registro de estoque
          const { data: estoqueData, error: estoqueError } = await supabase
            .from('estoque_ovos')
            .insert([{
              integrado_id: integradoId,
              lote_producao_id: loteProducaoId,
              lote_interno: loteInterno,
              tipo_ovo: tipoOvo as any,
              classificacao_peso: classif.key as any,
              data_producao: dataProducao,
              data_validade: dataValidade,
              quantidade_inicial: qtd,
              quantidade_atual: qtd,
              custo_unitario: custoUnitario,
            }])
            .select()
            .single();

          if (estoqueError) throw estoqueError;

          // Registrar entrada no kardex
          await supabase
            .from('kardex_ovos')
            .insert({
              integrado_id: integradoId,
              estoque_ovo_id: estoqueData.id,
              tipo_movimento: 'entrada_producao',
              quantidade: qtd,
              saldo_anterior: 0,
              saldo_atual: qtd,
              documento_ref: loteInterno,
              producao_ovos_id: producaoOvosId,
              observacao: `Transferência de produção - Lote ${loteInterno}`,
            });

          transferencias.push({ lote: loteInterno, classificacao: classif.label, quantidade: qtd });
        }
      }

      if (transferencias.length === 0) {
        toast.error('Nenhuma quantidade para transferir');
        return;
      }

      toast.success(`${transferencias.length} lote(s) transferido(s) para estoque!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error('Erro ao transferir: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const totalTransferir = Object.values(quantidadesTransferir).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Egg className="w-5 h-5" />
            Transferir para Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info da produção */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data Produção:</span>
                <span className="font-medium">{format(new Date(dataProducao), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Linhagem:</span>
                <span className="font-medium">{linhagem}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tipo de ovo */}
          <div className="space-y-2">
            <Label>Tipo de Ovo *</Label>
            <Select value={tipoOvo} onValueChange={setTipoOvo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branco">Branco</SelectItem>
                <SelectItem value="castanho">Castanho</SelectItem>
                <SelectItem value="vermelho">Vermelho</SelectItem>
                <SelectItem value="caipira">Caipira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data validade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Validade</Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={custoUnitario || ''}
                onChange={(e) => setCustoUnitario(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quantidades por classificação */}
          <div className="space-y-2">
            <Label>Quantidades por Classificação</Label>
            <div className="space-y-2">
              {CLASSIFICACOES.map((classif) => {
                const qtdOriginal = quantidades[classif.key as keyof typeof quantidades];
                const qtdTransferir = quantidadesTransferir[classif.key as keyof typeof quantidadesTransferir];
                return (
                  <div key={classif.key} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="font-medium">{classif.label}</div>
                      <div className="text-xs text-muted-foreground">{classif.peso}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Produzidos: {qtdOriginal}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      type="number"
                      className="w-24"
                      value={qtdTransferir || ''}
                      onChange={(e) => setQuantidadesTransferir(prev => ({
                        ...prev,
                        [classif.key]: Math.min(parseInt(e.target.value) || 0, qtdOriginal)
                      }))}
                      max={qtdOriginal}
                      min={0}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
            <span className="font-medium">Total a transferir:</span>
            <span className="text-xl font-bold text-primary">{totalTransferir.toLocaleString()} un</span>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleTransferir} disabled={saving || !tipoOvo || totalTransferir === 0}>
              {saving ? 'Transferindo...' : 'Transferir para Estoque'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
