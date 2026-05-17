import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface PrevisaoRacao {
  id: string;
  nome: string;
  sku: string;
  fase_nome: string;
  estoque_atual: number;
  unidade_medida: string;
  consumo_dia1: number;
  consumo_dia2: number;
  consumo_dia3: number;
  consumo_total_3d: number;
  lotes_consumindo: number;
  saldo: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
}

interface PrevisaoConsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  totalPrevisao: number;
}

export default function PrevisaoConsumoDialog({
  open,
  onOpenChange,
  integradoId,
  totalPrevisao,
}: PrevisaoConsumoDialogProps) {
  const [loading, setLoading] = useState(true);
  const [previsoes, setPrevisoes] = useState<PrevisaoRacao[]>([]);

  useEffect(() => {
    if (open && integradoId) {
      fetchPrevisaoConsumo();
    }
  }, [open, integradoId]);

  const fetchPrevisaoConsumo = async () => {
    setLoading(true);
    try {
      // 1. Fetch active lots
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes')
        .select(`
          id,
          quantidade_aves,
          data_alojamento,
          linhagem,
          sexo,
          nucleo_id
        `)
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');

      if (lotesError) throw lotesError;
      if (!lotes || lotes.length === 0) {
        setPrevisoes([]);
        setLoading(false);
        return;
      }

      // 2. Fetch products that have fase_animal_id linked (correct linking direction)
      const { data: produtosComFase, error: produtosError } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          sku,
          estoque_atual,
          unidade_medida,
          fase_animal_id,
          fases_animal!produtos_fase_animal_id_fkey (
            id,
            nome,
            dia_inicio,
            dia_fim
          )
        `)
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .not('fase_animal_id', 'is', null);

      if (produtosError) throw produtosError;

      // 3. Fetch all desempenho_aves for efficiency (batch query)
      const { data: desempenhoData } = await supabase
        .from('desempenho_aves')
        .select('linhagem, sexo, dia, consumo_diario_racao_kg');

      // Create a lookup map for desempenho
      const desempenhoMap: Record<string, number> = {};
      (desempenhoData || []).forEach(d => {
        const key = `${d.linhagem}-${d.sexo}-${d.dia}`;
        desempenhoMap[key] = Number(d.consumo_diario_racao_kg);
      });

      // Map to aggregate consumption by product
      const consumoPorProduto: Record<string, {
        produto: {
          id: string;
          nome: string;
          sku: string;
          estoque_atual: number;
          unidade_medida: string;
        };
        fases_nomes: Set<string>;
        consumo_dia1: number;
        consumo_dia2: number;
        consumo_dia3: number;
        lotes: Set<string>;
      }> = {};

      // 4. For each lot, calculate consumption for next 3 days
      for (const lote of lotes) {
        if (!lote.data_alojamento || !lote.linhagem || !lote.sexo) continue;

        const dataAlojamento = new Date(lote.data_alojamento);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const idadeDias = Math.floor((hoje.getTime() - dataAlojamento.getTime()) / (1000 * 60 * 60 * 24));

        // For each of the next 3 days
        for (let d = 0; d < 3; d++) {
          const diaFuturo = idadeDias + d + 1; // +1 porque é previsão para amanhã em diante

          // Find the product whose linked phase covers this day
          const produtoAtual = (produtosComFase || []).find(p => {
            const fase = p.fases_animal as { id: string; nome: string; dia_inicio: number; dia_fim: number } | null;
            return fase && diaFuturo >= fase.dia_inicio && diaFuturo <= fase.dia_fim;
          });

          if (!produtoAtual || !produtoAtual.fases_animal) continue;

          const fase = produtoAtual.fases_animal as { id: string; nome: string; dia_inicio: number; dia_fim: number };

          // Get theoretical consumption from desempenho map (already in kg/ave/dia)
          const desempenhoKey = `${lote.linhagem}-${lote.sexo}-${diaFuturo}`;
          const consumoPorAveKg = desempenhoMap[desempenhoKey] || 0;
          const consumoKg = consumoPorAveKg * lote.quantidade_aves;

          // Initialize if not exists
          if (!consumoPorProduto[produtoAtual.id]) {
            consumoPorProduto[produtoAtual.id] = {
              produto: {
                id: produtoAtual.id,
                nome: produtoAtual.nome,
                sku: produtoAtual.sku,
                estoque_atual: produtoAtual.estoque_atual,
                unidade_medida: produtoAtual.unidade_medida,
              },
              fases_nomes: new Set(),
              consumo_dia1: 0,
              consumo_dia2: 0,
              consumo_dia3: 0,
              lotes: new Set(),
            };
          }

          // Add phase name
          consumoPorProduto[produtoAtual.id].fases_nomes.add(fase.nome);

          // Add consumption to the right day
          if (d === 0) consumoPorProduto[produtoAtual.id].consumo_dia1 += consumoKg;
          else if (d === 1) consumoPorProduto[produtoAtual.id].consumo_dia2 += consumoKg;
          else consumoPorProduto[produtoAtual.id].consumo_dia3 += consumoKg;

          consumoPorProduto[produtoAtual.id].lotes.add(lote.id);
        }
      }

      // 5. Convert to array and calculate totals
      const previsoesArr: PrevisaoRacao[] = Object.entries(consumoPorProduto).map(([id, data]) => {
        const consumo_total_3d = data.consumo_dia1 + data.consumo_dia2 + data.consumo_dia3;
        const saldo = data.produto.estoque_atual - consumo_total_3d;
        
        let nivel_critico: 'critico' | 'atencao' | 'ok' = 'ok';
        if (saldo < 0) {
          nivel_critico = 'critico';
        } else if (saldo < data.consumo_dia1 * 3) { // Less than 3 more days after forecast
          nivel_critico = 'atencao';
        }

        return {
          id: data.produto.id,
          nome: data.produto.nome,
          sku: data.produto.sku,
          fase_nome: Array.from(data.fases_nomes).join(', '),
          estoque_atual: data.produto.estoque_atual,
          unidade_medida: data.produto.unidade_medida,
          consumo_dia1: data.consumo_dia1,
          consumo_dia2: data.consumo_dia2,
          consumo_dia3: data.consumo_dia3,
          consumo_total_3d,
          lotes_consumindo: data.lotes.size,
          saldo,
          nivel_critico,
        };
      });

      // Sort by criticality then by deficit
      previsoesArr.sort((a, b) => {
        const ordem = { critico: 0, atencao: 1, ok: 2 };
        if (ordem[a.nivel_critico] !== ordem[b.nivel_critico]) {
          return ordem[a.nivel_critico] - ordem[b.nivel_critico];
        }
        return a.saldo - b.saldo;
      });

      setPrevisoes(previsoesArr);
    } catch (error) {
      console.error('Erro ao buscar previsão de consumo:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatKg = (value: number) => 
    value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const totalConsumo = previsoes.reduce((sum, p) => sum + p.consumo_total_3d, 0);
  const racoesCriticas = previsoes.filter(p => p.nivel_critico === 'critico').length;
  const racoesAtencao = previsoes.filter(p => p.nivel_critico === 'atencao').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Previsão de Consumo (3 dias) - Por Produto
          </DialogTitle>
          <DialogDescription>
            Consumo baseado na idade dos lotes e fases de alimentação
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Previsão Total</p>
                  <p className="text-lg font-bold text-purple-500">
                    {formatKg(totalConsumo)} kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`${racoesCriticas > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50 border-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${racoesCriticas > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Em Déficit</p>
                  <p className={`text-lg font-bold ${racoesCriticas > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {racoesCriticas}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`${racoesAtencao > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-muted/50 border-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${racoesAtencao > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Atenção</p>
                  <p className={`text-lg font-bold ${racoesAtencao > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    {racoesAtencao}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : previsoes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum lote ativo com fase vinculada a produto encontrado.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique se as fases animais possuem rações vinculadas.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Lotes</TableHead>
                <TableHead className="text-right">D+1</TableHead>
                <TableHead className="text-right">D+2</TableHead>
                <TableHead className="text-right">D+3</TableHead>
                <TableHead className="text-right">Total 3d</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previsoes.map((previsao) => (
                <TableRow 
                  key={previsao.id}
                  className={
                    previsao.nivel_critico === 'critico' 
                      ? 'bg-destructive/5' 
                      : previsao.nivel_critico === 'atencao'
                        ? 'bg-yellow-500/5'
                        : ''
                  }
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{previsao.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {previsao.fase_nome} • {previsao.sku}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {previsao.lotes_consumindo}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatKg(previsao.consumo_dia1)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatKg(previsao.consumo_dia2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatKg(previsao.consumo_dia3)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-purple-500">
                    {formatKg(previsao.consumo_total_3d)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatKg(previsao.estoque_atual)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={
                      previsao.saldo < 0 
                        ? 'text-destructive font-bold' 
                        : previsao.nivel_critico === 'atencao'
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }>
                      {previsao.saldo >= 0 ? '+' : ''}{formatKg(previsao.saldo)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {previsao.nivel_critico === 'critico' ? (
                      <Badge variant="destructive">Déficit</Badge>
                    ) : previsao.nivel_critico === 'atencao' ? (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">Atenção</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-500 border-green-500">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {/* Summary Row */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">
                  {new Set(previsoes.flatMap(p => Array.from({ length: p.lotes_consumindo }))).size || previsoes.reduce((sum, p) => sum + p.lotes_consumindo, 0)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatKg(previsoes.reduce((sum, p) => sum + p.consumo_dia1, 0))}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatKg(previsoes.reduce((sum, p) => sum + p.consumo_dia2, 0))}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatKg(previsoes.reduce((sum, p) => sum + p.consumo_dia3, 0))}
                </TableCell>
                <TableCell className="text-right font-mono text-purple-500">
                  {formatKg(totalConsumo)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatKg(previsoes.reduce((sum, p) => sum + p.estoque_atual, 0))}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatKg(previsoes.reduce((sum, p) => sum + p.saldo, 0))}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          D+1, D+2, D+3 = consumo previsto para os próximos 3 dias baseado na idade dos lotes
        </p>
      </DialogContent>
    </Dialog>
  );
}
