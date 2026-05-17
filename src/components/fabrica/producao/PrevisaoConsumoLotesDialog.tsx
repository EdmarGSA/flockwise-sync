import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

interface LoteConsumo {
  id: string;
  galpao_nome: string;
  nucleo_nome: string;
  quantidade_aves: number;
  idade_dias: number;
  consumo_dia1: number;
  consumo_dia2: number;
  consumo_dia3: number;
  total_3d: number;
}

interface PrevisaoConsumoLotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  previsaoTotal: number;
}

export default function PrevisaoConsumoLotesDialog({
  open,
  onOpenChange,
  integradoId,
  previsaoTotal
}: PrevisaoConsumoLotesDialogProps) {
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<LoteConsumo[]>([]);

  useEffect(() => {
    if (open && integradoId) {
      fetchConsumoLotes();
    }
  }, [open, integradoId]);

  const fetchConsumoLotes = async () => {
    setLoading(true);
    try {
      const { data: lotesData, error } = await supabase
        .from('lotes')
        .select(`
          id, quantidade_aves, linhagem, sexo, data_alojamento,
          galpao:galpoes!inner(nome),
          nucleo:nucleos!inner(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');

      if (error) throw error;

      const today = new Date();
      const items: LoteConsumo[] = [];

      for (const lote of lotesData || []) {
        if (!lote.data_alojamento) continue;

        const dataAlojamento = parseISO(lote.data_alojamento);
        const idadeDias = differenceInDays(today, dataAlojamento);

        let consumo_dia1 = 0, consumo_dia2 = 0, consumo_dia3 = 0;

        for (let d = 0; d < 3; d++) {
          const diaRef = idadeDias + d;

          const { data: desempenho } = await supabase
            .from('desempenho_aves')
            .select('consumo_diario_racao_kg')
            .eq('linhagem', lote.linhagem)
            .eq('sexo', lote.sexo)
            .eq('dia', diaRef)
            .maybeSingle();

          if (desempenho) {
            const consumoKg = (Number(desempenho.consumo_diario_racao_kg) / 1000) * lote.quantidade_aves;
            if (d === 0) consumo_dia1 = consumoKg;
            else if (d === 1) consumo_dia2 = consumoKg;
            else consumo_dia3 = consumoKg;
          }
        }

        items.push({
          id: lote.id,
          galpao_nome: lote.galpao?.nome || '-',
          nucleo_nome: lote.nucleo?.nome || '-',
          quantidade_aves: lote.quantidade_aves,
          idade_dias: idadeDias,
          consumo_dia1,
          consumo_dia2,
          consumo_dia3,
          total_3d: consumo_dia1 + consumo_dia2 + consumo_dia3
        });
      }

      // Sort by total consumption descending
      items.sort((a, b) => b.total_3d - a.total_3d);
      setLotes(items);
    } catch (error) {
      console.error('Erro ao buscar consumo por lote:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatKg = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const totalCalculado = lotes.reduce((sum, l) => sum + l.total_3d, 0);
  const maiorConsumidor = lotes[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Previsão de Consumo por Lote (3 dias)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">
              {formatKg(previsaoTotal)} kg
            </p>
            <p className="text-sm text-muted-foreground">Previsão Total</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{lotes.length}</p>
            <p className="text-sm text-muted-foreground">Lotes Ativos</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold truncate">
              {maiorConsumidor?.galpao_nome || '-'}
            </p>
            <p className="text-sm text-muted-foreground">Maior Consumidor</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : lotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lote ativo encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Galpão</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead className="text-right">Aves</TableHead>
                  <TableHead className="text-center">Idade</TableHead>
                  <TableHead className="text-right">Dia 1</TableHead>
                  <TableHead className="text-right">Dia 2</TableHead>
                  <TableHead className="text-right">Dia 3</TableHead>
                  <TableHead className="text-right font-semibold">Total 3d</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.galpao_nome}</TableCell>
                    <TableCell>{l.nucleo_nome}</TableCell>
                    <TableCell className="text-right">
                      {l.quantidade_aves.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-center">{l.idade_dias}d</TableCell>
                    <TableCell className="text-right">{formatKg(l.consumo_dia1)} kg</TableCell>
                    <TableCell className="text-right">{formatKg(l.consumo_dia2)} kg</TableCell>
                    <TableCell className="text-right">{formatKg(l.consumo_dia3)} kg</TableCell>
                    <TableCell className="text-right font-semibold text-purple-500">
                      {formatKg(l.total_3d)} kg
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatKg(lotes.reduce((s, l) => s + l.consumo_dia1, 0))} kg
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKg(lotes.reduce((s, l) => s + l.consumo_dia2, 0))} kg
                  </TableCell>
                  <TableCell className="text-right">
                    {formatKg(lotes.reduce((s, l) => s + l.consumo_dia3, 0))} kg
                  </TableCell>
                  <TableCell className="text-right text-purple-500">
                    {formatKg(totalCalculado)} kg
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
