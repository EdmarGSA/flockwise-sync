import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

interface ProdutoEstoque {
  id: string;
  nome: string;
  sku: string;
  estoque: number;
  unidade: string;
  percentual: number;
  consumo_diario: number;
  dias_estoque: number;
}

interface EstoqueProducaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  estoqueTotal: number;
}

export default function EstoqueProducaoDialog({
  open,
  onOpenChange,
  integradoId,
  estoqueTotal
}: EstoqueProducaoDialogProps) {
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);

  useEffect(() => {
    if (open && integradoId) {
      fetchEstoque();
    }
  }, [open, integradoId]);

  const fetchEstoque = async () => {
    setLoading(true);
    try {
      // Fetch manufactured feed products
      const { data: racoesData, error: racoesError } = await supabase
        .from('produtos')
        .select(`
          id, nome, sku, estoque_atual, unidade_medida,
          categoria:categorias!inner(tipo_origem),
          grupo:grupos_produto!inner(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'fabricacao_propria')
        .ilike('grupos_produto.nome', '%ração%')
        .order('estoque_atual', { ascending: false });

      if (racoesError) throw racoesError;

      const racoes = racoesData || [];
      const totalEstoque = racoes.reduce((sum, r) => sum + Number(r.estoque_atual), 0);

      // Calculate daily consumption from Kardex (last 15 days)
      const dataInicio = subDays(new Date(), 15).toISOString().split('T')[0];

      const items: ProdutoEstoque[] = [];

      for (const racao of racoes) {
        // Fetch consumption from kardex
        const { data: kardexData } = await supabase
          .from('kardex')
          .select('quantidade')
          .eq('produto_id', racao.id)
          .in('tipo_movimento', ['saida', 'ajuste_saida'])
          .gte('created_at', dataInicio);

        const totalSaidas = (kardexData || []).reduce((sum, k) => sum + Math.abs(Number(k.quantidade)), 0);
        const consumoDiario = totalSaidas / 15;
        const diasEstoque = consumoDiario > 0 ? Number(racao.estoque_atual) / consumoDiario : 999;

        items.push({
          id: racao.id,
          nome: racao.nome,
          sku: racao.sku || '-',
          estoque: Number(racao.estoque_atual),
          unidade: racao.unidade_medida,
          percentual: totalEstoque > 0 ? (Number(racao.estoque_atual) / totalEstoque) * 100 : 0,
          consumo_diario: consumoDiario,
          dias_estoque: Math.round(diasEstoque)
        });
      }

      setProdutos(items);
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatKg = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const getStatusBadge = (dias: number) => {
    if (dias >= 999) return <Badge variant="outline" className="text-muted-foreground">Sem consumo</Badge>;
    if (dias > 7) return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">&gt; 7 dias</Badge>;
    if (dias >= 3) return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">3-7 dias</Badge>;
    return <Badge variant="destructive">&lt; 3 dias</Badge>;
  };

  const produtosCriticos = produtos.filter(p => p.dias_estoque < 3 && p.dias_estoque < 999).length;
  const produtosAtencao = produtos.filter(p => p.dias_estoque >= 3 && p.dias_estoque <= 7).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Estoque de Rações Fabricadas
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 py-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              {formatKg(estoqueTotal)} kg
            </p>
            <p className="text-sm text-muted-foreground">Estoque Total</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{produtos.length}</p>
            <p className="text-sm text-muted-foreground">Produtos</p>
          </div>
          <div className={`rounded-lg p-4 text-center ${produtosCriticos > 0 ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
            <p className={`text-2xl font-bold ${produtosCriticos > 0 ? 'text-destructive' : ''}`}>
              {produtosCriticos}
            </p>
            <p className="text-sm text-muted-foreground">Críticos</p>
          </div>
          <div className={`rounded-lg p-4 text-center ${produtosAtencao > 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/50'}`}>
            <p className={`text-2xl font-bold ${produtosAtencao > 0 ? 'text-amber-500' : ''}`}>
              {produtosAtencao}
            </p>
            <p className="text-sm text-muted-foreground">Atenção</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              Nenhuma ração fabricada cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">% Total</TableHead>
                  <TableHead className="text-right">Consumo/Dia</TableHead>
                  <TableHead className="text-center">Dias Estoque</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map(p => (
                  <TableRow key={p.id} className={p.dias_estoque < 3 && p.dias_estoque < 999 ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right">
                      {formatKg(p.estoque)} {p.unidade}
                    </TableCell>
                    <TableCell className="text-right">{p.percentual.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      {formatKg(p.consumo_diario)} {p.unidade}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {p.dias_estoque >= 999 ? '-' : p.dias_estoque}
                    </TableCell>
                    <TableCell>{getStatusBadge(p.dias_estoque)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
