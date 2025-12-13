import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Factory, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InsumoVerificacao {
  id: string;
  nome: string;
  quantidadeNecessaria: number;
  estoqueDisponivel: number;
  unidade_medida: string;
  isCritico: boolean;
  maxProduzivel: number;
}

interface RacaoCritica {
  id: string;
  nome: string;
  demandaTotal: number;
  estoqueAtual: number;
  deficit: number;
  sugestaoProducao: number;
  unidade_medida: string;
}

interface GerarOPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racao: RacaoCritica | null;
  integradoId: string;
  onSuccess: () => void;
}

export default function GerarOPDialog({
  open,
  onOpenChange,
  racao,
  integradoId,
  onSuccess
}: GerarOPDialogProps) {
  const [quantidade, setQuantidade] = useState(0);
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [insumos, setInsumos] = useState<InsumoVerificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maxProduzivel, setMaxProduzivel] = useState<number | null>(null);

  useEffect(() => {
    if (open && racao) {
      setQuantidade(racao.sugestaoProducao);
      setDataPrevista(new Date().toISOString().split('T')[0]);
      setObservacoes('');
      fetchFormulacao();
    }
  }, [open, racao]);

  useEffect(() => {
    if (racao && quantidade > 0 && insumos.length > 0) {
      verificarInsumos();
    }
  }, [quantidade]);

  const fetchFormulacao = async () => {
    if (!racao) return;
    setLoading(true);

    try {
      // Fetch BOM for the product
      const { data: formulacao, error: formError } = await supabase
        .from('produto_formulacao')
        .select(`
          id,
          quantidade,
          unidade_medida,
          insumo:produtos!produto_formulacao_insumo_id_fkey(
            id, nome, estoque_atual, unidade_medida
          )
        `)
        .eq('produto_id', racao.id)
        .eq('integrado_id', integradoId);

      if (formError) throw formError;

      if (!formulacao || formulacao.length === 0) {
        toast.warning('Este produto não possui fórmula cadastrada');
        setInsumos([]);
        setMaxProduzivel(null);
        setLoading(false);
        return;
      }

      // Calculate required quantities based on BOM (quantity per 1000kg)
      const insumosVerificados: InsumoVerificacao[] = formulacao.map(item => {
        const insumo = item.insumo as any;
        // Formula quantity is per 1000kg of final product
        const qtdNecessaria = (racao.sugestaoProducao / 1000) * Number(item.quantidade);
        const estoqueDisponivel = Number(insumo.estoque_atual);
        const isCritico = estoqueDisponivel < qtdNecessaria;
        const maxProd = Number(item.quantidade) > 0 
          ? (estoqueDisponivel / Number(item.quantidade)) * 1000 
          : 999999;

        return {
          id: insumo.id,
          nome: insumo.nome,
          quantidadeNecessaria: qtdNecessaria,
          estoqueDisponivel,
          unidade_medida: insumo.unidade_medida,
          isCritico,
          maxProduzivel: maxProd
        };
      });

      setInsumos(insumosVerificados);

      // Calculate max producible quantity (limited by most scarce ingredient)
      const minMax = Math.min(...insumosVerificados.map(i => i.maxProduzivel));
      setMaxProduzivel(minMax === Infinity ? null : Math.floor(minMax));
    } catch (error) {
      console.error('Erro ao buscar formulação:', error);
      toast.error('Erro ao carregar fórmula do produto');
    } finally {
      setLoading(false);
    }
  };

  const verificarInsumos = () => {
    if (!racao || insumos.length === 0) return;

    // Recalculate based on new quantity
    const insumosAtualizados = insumos.map(item => {
      // Find original formula quantity
      const qtdOriginal = (racao.sugestaoProducao / 1000) * (item.quantidadeNecessaria / (racao.sugestaoProducao / 1000));
      const qtdNecessaria = (quantidade / 1000) * (item.quantidadeNecessaria / (racao.sugestaoProducao / 1000)) || 0;
      const isCritico = item.estoqueDisponivel < qtdNecessaria;

      return {
        ...item,
        quantidadeNecessaria: qtdNecessaria,
        isCritico
      };
    });

    setInsumos(insumosAtualizados);
  };

  const handleSave = async (status: 'rascunho' | 'pendente') => {
    if (!racao) return;
    setSaving(true);

    try {
      // Create production order
      const { data: op, error: opError } = await supabase
        .from('ordens_producao')
        .insert({
          integrado_id: integradoId,
          produto_id: racao.id,
          quantidade_planejada: quantidade,
          status,
          data_prevista_producao: dataPrevista || null,
          observacoes: observacoes || null,
          criado_por: integradoId
        })
        .select()
        .single();

      if (opError) throw opError;

      // Create production order items (ingredients)
      if (insumos.length > 0) {
        const itens = insumos.map(insumo => ({
          ordem_producao_id: op.id,
          insumo_id: insumo.id,
          quantidade_necessaria: insumo.quantidadeNecessaria,
          unidade_medida: insumo.unidade_medida,
          estoque_disponivel: insumo.estoqueDisponivel
        }));

        const { error: itensError } = await supabase
          .from('ordens_producao_itens')
          .insert(itens);

        if (itensError) throw itensError;
      }

      toast.success(`OP #${op.numero_op} criada com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar OP:', error);
      toast.error('Erro ao criar ordem de produção');
    } finally {
      setSaving(false);
    }
  };

  const hasInsumosCriticos = insumos.some(i => i.isCritico);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            Gerar Ordem de Produção
          </DialogTitle>
          <DialogDescription>
            {racao?.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Production Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade a Produzir (kg)</Label>
              <Input
                id="quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                min={0}
              />
              {maxProduzivel !== null && quantidade > maxProduzivel && (
                <p className="text-sm text-destructive">
                  Quantidade máxima produzível: {maxProduzivel.toLocaleString('pt-BR')} kg (limitado por insumos)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataPrevista">Data Prevista de Produção</Label>
              <Input
                id="dataPrevista"
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
              />
            </div>
          </div>

          {/* Summary Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Demanda Total</p>
                  <p className="text-lg font-bold">{racao?.demandaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Atual</p>
                  <p className="text-lg font-bold">{racao?.estoqueAtual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Déficit</p>
                  <p className="text-lg font-bold text-destructive">-{Math.abs(racao?.deficit || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Produzindo</p>
                  <p className="text-lg font-bold text-primary">{quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients Verification */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Verificação de Insumos
                {hasInsumosCriticos && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Insumos Críticos
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : insumos.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma fórmula cadastrada para este produto
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Necessário</TableHead>
                      <TableHead className="text-right">Disponível</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insumos.map(insumo => (
                      <TableRow key={insumo.id}>
                        <TableCell className="font-medium">{insumo.nome}</TableCell>
                        <TableCell className="text-right">
                          {insumo.quantidadeNecessaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                        </TableCell>
                        <TableCell className="text-right">
                          {insumo.estoqueDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                        </TableCell>
                        <TableCell className="text-right">
                          {insumo.isCritico ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Insuficiente
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {maxProduzivel !== null && hasInsumosCriticos && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Quantidade máxima produzível: <strong>{maxProduzivel.toLocaleString('pt-BR')} kg</strong> (limitado por insumos)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleSave('rascunho')}
            disabled={saving || quantidade <= 0}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Rascunho
          </Button>
          <Button 
            onClick={() => handleSave('pendente')}
            disabled={saving || quantidade <= 0}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enviar para Aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
