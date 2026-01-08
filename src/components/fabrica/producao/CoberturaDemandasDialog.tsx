import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Factory, TrendingDown, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RacaoCobertura {
  id: string;
  nome: string;
  demanda: number;
  estoque: number;
  saldo: number;
  cobertura: number;
  unidade: string;
}

interface CoberturaDemandasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  demandaTotal: number;
  estoqueTotal: number;
  onGerarOP?: (racaoId: string, racaoNome: string, quantidade: number) => void;
}

export default function CoberturaDemandasDialog({
  open,
  onOpenChange,
  integradoId,
  demandaTotal,
  estoqueTotal,
  onGerarOP
}: CoberturaDemandasDialogProps) {
  const [loading, setLoading] = useState(true);
  const [racoes, setRacoes] = useState<RacaoCobertura[]>([]);

  useEffect(() => {
    if (open && integradoId) {
      fetchCobertura();
    }
  }, [open, integradoId]);

  const fetchCobertura = async () => {
    setLoading(true);
    try {
      // Fetch manufactured feed products
      const { data: racoesData, error } = await supabase
        .from('produtos')
        .select(`
          id, nome, estoque_atual, unidade_medida,
          categoria:categorias!inner(tipo_origem),
          grupo:grupos_produto!inner(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'fabricacao_propria')
        .ilike('grupos_produto.nome', '%ração%');

      if (error) throw error;

      const racoesList = racoesData || [];
      const totalEstoqueCalc = racoesList.reduce((sum, r) => sum + Number(r.estoque_atual), 0);

      // Distribute demand proportionally
      const items: RacaoCobertura[] = racoesList.map(racao => {
        const proporcao = totalEstoqueCalc > 0 
          ? Number(racao.estoque_atual) / totalEstoqueCalc 
          : 1 / racoesList.length;
        const demandaRacao = demandaTotal * proporcao;
        const estoqueRacao = Number(racao.estoque_atual);
        const saldo = estoqueRacao - demandaRacao;
        const cobertura = demandaRacao > 0 ? (estoqueRacao / demandaRacao) * 100 : 100;

        return {
          id: racao.id,
          nome: racao.nome,
          demanda: demandaRacao,
          estoque: estoqueRacao,
          saldo,
          cobertura,
          unidade: racao.unidade_medida
        };
      });

      // Sort by coverage ascending (most critical first)
      items.sort((a, b) => a.cobertura - b.cobertura);
      setRacoes(items);
    } catch (error) {
      console.error('Erro ao calcular cobertura:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatKg = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const saldoGeral = estoqueTotal - demandaTotal;
  const coberturaGeral = demandaTotal > 0 ? (estoqueTotal / demandaTotal) * 100 : 100;
  const isCritico = saldoGeral < 0;

  const racoesComDeficit = racoes.filter(r => r.saldo < 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isCritico ? 'text-destructive' : 'text-amber-500'}`} />
            Análise de Cobertura de Demanda
          </DialogTitle>
        </DialogHeader>

        {/* Executive Summary */}
        <div className={`rounded-lg p-6 ${isCritico ? 'bg-destructive/10 border border-destructive/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            {isCritico ? <TrendingDown className="w-5 h-5 text-destructive" /> : <CheckCircle className="w-5 h-5 text-amber-500" />}
            Resumo Executivo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Demanda Total</p>
              <p className="text-xl font-bold">{formatKg(demandaTotal)} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estoque Disponível</p>
              <p className="text-xl font-bold text-green-500">{formatKg(estoqueTotal)} kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-xl font-bold ${isCritico ? 'text-destructive' : 'text-green-500'}`}>
                {saldoGeral >= 0 ? '+' : ''}{formatKg(saldoGeral)} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cobertura</p>
              <p className={`text-xl font-bold ${coberturaGeral >= 100 ? 'text-green-500' : coberturaGeral >= 70 ? 'text-amber-500' : 'text-destructive'}`}>
                {coberturaGeral.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : racoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma ração fabricada cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ração</TableHead>
                  <TableHead className="text-right">Demanda</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Cobertura</TableHead>
                  {onGerarOP && <TableHead className="text-right">Ação</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {racoes.map(r => {
                  const isDeficit = r.saldo < 0;
                  return (
                    <TableRow key={r.id} className={isDeficit ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="text-right">{formatKg(r.demanda)} kg</TableCell>
                      <TableCell className="text-right text-green-500">{formatKg(r.estoque)} kg</TableCell>
                      <TableCell className={`text-right font-semibold ${isDeficit ? 'text-destructive' : 'text-green-500'}`}>
                        {r.saldo >= 0 ? '+' : ''}{formatKg(r.saldo)} kg
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={r.cobertura >= 100 ? 'default' : r.cobertura >= 70 ? 'secondary' : 'destructive'}
                          className={r.cobertura >= 100 ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                        >
                          {r.cobertura.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      {onGerarOP && (
                        <TableCell className="text-right">
                          {isDeficit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onGerarOP(r.id, r.nome, Math.abs(r.saldo) + 500)}
                            >
                              <Factory className="w-4 h-4 mr-1" />
                              Gerar OP
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {racoesComDeficit.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
              {racoesComDeficit.length} ração(ões) com déficit identificado. 
              Considere gerar ordens de produção para repor o estoque.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
