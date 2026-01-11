import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, PlayCircle, Package, Loader2, Info, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrdemProducao {
  id: string;
  numero_op: number;
  produto_id: string;
  quantidade_planejada: number;
  custo_total_estimado?: number;
  nutricao_id?: string | null;
  produto?: {
    nome: string;
    unidade_medida: string;
  };
  nutricao?: {
    nome: string;
  } | null;
}

interface InsumoRevisao {
  id: string;
  insumo_id: string;
  nome: string;
  quantidade_necessaria: number;
  quantidade_ajustada: number;
  estoque_disponivel: number;
  unidade_medida: string;
  custo_unitario: number;
  isOk: boolean;
  variacao_percentual: number;
  status: 'ok' | 'alerta' | 'critico';
}

interface IniciarProducaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
  integradoId: string;
  onSuccess: () => void;
}

const TOLERANCIA_PADRAO = 1; // 1% default tolerance

export default function IniciarProducaoDialog({
  open,
  onOpenChange,
  ordem,
  integradoId,
  onSuccess
}: IniciarProducaoDialogProps) {
  const [insumos, setInsumos] = useState<InsumoRevisao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loteProducao, setLoteProducao] = useState('');
  const [tolerancia, setTolerancia] = useState(TOLERANCIA_PADRAO);
  const [proporcionalidadeAtiva, setProporcionalidadeAtiva] = useState(true);
  const [quantidadeProduzida, setQuantidadeProduzida] = useState(0);

  useEffect(() => {
    if (open && ordem) {
      setQuantidadeProduzida(ordem.quantidade_planejada);
      fetchConfiguracao();
      fetchInsumos();
      gerarLoteProducao();
    }
  }, [open, ordem]);

  const gerarLoteProducao = () => {
    const now = new Date();
    const lote = `LP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    setLoteProducao(lote);
  };

  const fetchConfiguracao = async () => {
    try {
      const { data } = await supabase
        .from('config_producao')
        .select('tolerancia_insumo_percentual')
        .eq('integrado_id', integradoId)
        .maybeSingle();
      
      if (data) {
        setTolerancia(Number(data.tolerancia_insumo_percentual) || TOLERANCIA_PADRAO);
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
    }
  };

  const fetchInsumos = async () => {
    if (!ordem) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ordens_producao_itens')
        .select(`
          id,
          insumo_id,
          quantidade_necessaria,
          estoque_disponivel,
          unidade_medida,
          custo_unitario,
          insumo:produtos!ordens_producao_itens_insumo_id_fkey(nome, estoque_atual, custo_medio)
        `)
        .eq('ordem_producao_id', ordem.id);

      if (error) throw error;

      // Fetch current stock for each item
      const insumosComEstoque: InsumoRevisao[] = await Promise.all(
        (data || []).map(async (item) => {
          const insumoData = item.insumo as any;
          
          // Get current stock
          const { data: produtoAtual } = await supabase
            .from('produtos')
            .select('estoque_atual, custo_medio')
            .eq('id', item.insumo_id)
            .single();
          
          const estoqueAtual = produtoAtual?.estoque_atual || 0;
          const qtdNecessaria = Number(item.quantidade_necessaria);
          const custoUnit = Number(item.custo_unitario) > 0 
            ? Number(item.custo_unitario)
            : (Number(produtoAtual?.custo_medio) > 0 ? Number(produtoAtual.custo_medio) : 0);
          
          return {
            id: item.id,
            insumo_id: item.insumo_id,
            nome: insumoData?.nome || '-',
            quantidade_necessaria: qtdNecessaria,
            quantidade_ajustada: qtdNecessaria,
            estoque_disponivel: estoqueAtual,
            unidade_medida: item.unidade_medida,
            custo_unitario: custoUnit,
            isOk: estoqueAtual >= qtdNecessaria,
            variacao_percentual: 0,
            status: 'ok' as const
          };
        })
      );

      setInsumos(insumosComEstoque);
    } catch (error) {
      console.error('Erro ao buscar insumos:', error);
      toast.error('Erro ao carregar insumos');
    } finally {
      setLoading(false);
    }
  };

  const calcularVariacao = (ajustado: number, necessario: number): number => {
    if (necessario === 0) return 0;
    return ((ajustado - necessario) / necessario) * 100;
  };

  const getStatus = (variacao: number): 'ok' | 'alerta' | 'critico' => {
    const absVariacao = Math.abs(variacao);
    if (absVariacao <= tolerancia) return 'ok';
    if (absVariacao <= tolerancia * 2) return 'alerta';
    return 'critico';
  };

  const updateInsumoQuantidade = (id: string, quantidade: number) => {
    setInsumos(prev => {
      const updated = prev.map(i => {
        if (i.id === id) {
          const variacao = calcularVariacao(quantidade, i.quantidade_necessaria);
          return { 
            ...i, 
            quantidade_ajustada: quantidade,
            isOk: i.estoque_disponivel >= quantidade,
            variacao_percentual: variacao,
            status: getStatus(variacao)
          };
        }
        return i;
      });

      // If proportionality is active, produced quantity = sum of ingredients
      if (proporcionalidadeAtiva) {
        const totalInsumos = updated.reduce((sum, i) => sum + i.quantidade_ajustada, 0);
        setQuantidadeProduzida(Math.round(totalInsumos));
      }

      return updated;
    });
  };

  const allInsumosOk = insumos.every(i => i.isOk);
  const hasInsumosCriticos = insumos.some(i => !i.isOk);
  const hasVariacaoCritica = insumos.some(i => i.status === 'critico');
  const hasVariacaoAlerta = insumos.some(i => i.status === 'alerta');

  // Calculate estimated cost based on adjusted quantities
  const custoTotalEstimado = insumos.reduce((sum, i) => sum + (i.quantidade_ajustada * i.custo_unitario), 0);
  const custoPorKgEstimado = quantidadeProduzida > 0 ? custoTotalEstimado / quantidadeProduzida : 0;

  const getVariacaoBadge = (insumo: InsumoRevisao) => {
    const { variacao_percentual, status } = insumo;
    const prefix = variacao_percentual >= 0 ? '+' : '';
    
    if (status === 'ok') {
      return (
        <Badge variant="default" className="bg-green-600">
          {prefix}{variacao_percentual.toFixed(1)}%
        </Badge>
      );
    }
    if (status === 'alerta') {
      return (
        <Badge variant="secondary" className="bg-amber-500 text-white">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {prefix}{variacao_percentual.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {prefix}{variacao_percentual.toFixed(1)}%
      </Badge>
    );
  };

  const handleIniciarProducao = async () => {
    if (!ordem) return;
    
    if (hasVariacaoCritica) {
      toast.error(`Variação acima de ${tolerancia * 2}% não permitida. Ajuste as quantidades.`);
      return;
    }

    setSaving(true);

    try {
      // 1. Update order status and quantities
      const { error: opError } = await supabase
        .from('ordens_producao')
        .update({ 
          status: 'em_producao',
          data_inicio_producao: new Date().toISOString(),
          lote_producao: loteProducao,
          quantidade_planejada: quantidadeProduzida, // Update with adjusted quantity
          custo_total_estimado: custoTotalEstimado
        })
        .eq('id', ordem.id);

      if (opError) throw opError;

      // 2. Update item quantities with adjusted values
      for (const insumo of insumos) {
        await supabase
          .from('ordens_producao_itens')
          .update({ 
            quantidade_necessaria: insumo.quantidade_ajustada,
            custo_unitario: insumo.custo_unitario,
            custo_total: insumo.quantidade_ajustada * insumo.custo_unitario
          })
          .eq('id', insumo.id);
      }

      // 3. Register production start log
      await supabase
        .from('producao_logs')
        .insert({
          ordem_producao_id: ordem.id,
          tipo_evento: 'inicio',
          origem: 'manual',
          dados_adicionais: { 
            lote_producao: loteProducao,
            quantidade_ajustada: quantidadeProduzida,
            custo_estimado: custoTotalEstimado,
            insumos_ajustados: insumos.map(i => ({
              id: i.insumo_id,
              nome: i.nome,
              quantidade_original: i.quantidade_necessaria,
              quantidade_ajustada: i.quantidade_ajustada,
              variacao: i.variacao_percentual
            }))
          }
        });

      toast.success(`Produção iniciada - Lote: ${loteProducao}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao iniciar produção:', error);
      toast.error('Erro ao iniciar produção');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            Iniciar Produção - OP #{ordem?.numero_op}
          </DialogTitle>
          <DialogDescription>
            {ordem?.produto?.nome}
            {ordem?.nutricao?.nome && (
              <Badge variant="outline" className="ml-2">{ordem.nutricao.nome}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tolerance Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Info className="w-4 h-4" />
            <span>Tolerância de variação: <strong>±{tolerancia}%</strong> | Alerta: <strong>±{tolerancia * 2}%</strong></span>
          </div>

          {/* Production Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Qtd. Planejada Original</Label>
                  <p className="text-lg font-bold text-muted-foreground">
                    {ordem?.quantidade_planejada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem?.produto?.unidade_medida || 'kg'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qtdProduzida" className="text-muted-foreground text-sm">Qtd. a Produzir (ajustada)</Label>
                  <Input
                    id="qtdProduzida"
                    type="number"
                    value={quantidadeProduzida}
                    onChange={(e) => setQuantidadeProduzida(Number(e.target.value))}
                    min={0}
                    disabled={proporcionalidadeAtiva}
                    className="text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loteProducao" className="text-muted-foreground text-sm">Lote de Produção</Label>
                  <Input
                    id="loteProducao"
                    value={loteProducao}
                    onChange={(e) => setLoteProducao(e.target.value)}
                    placeholder="LP-YYYYMMDD-HHMM"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-muted-foreground text-sm">
                    Proporcionalidade 
                    <button 
                      type="button"
                      className={`w-8 h-4 rounded-full transition-colors ${proporcionalidadeAtiva ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      onClick={() => setProporcionalidadeAtiva(!proporcionalidadeAtiva)}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${proporcionalidadeAtiva ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {proporcionalidadeAtiva ? 'Qtd. produzida ajusta automático' : 'Ajuste manual'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className={hasVariacaoCritica ? "bg-red-500/10 border-red-500/30" : hasVariacaoAlerta ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Custo Total Estimado</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {custoTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Custo por kg</span>
                  <p className="text-xl font-bold text-amber-500">
                    R$ {custoPorKgEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          {!loading && (
            <Card className={allInsumosOk ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  {allInsumosOk ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">Todos os insumos disponíveis</p>
                        <p className="text-sm text-muted-foreground">A produção pode ser iniciada</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-400">Alguns insumos insuficientes</p>
                        <p className="text-sm text-muted-foreground">Ajuste as quantidades ou reponha o estoque</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients Review */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Revisão de Insumos - Ajuste de Pesagem
              {hasVariacaoCritica && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Variação Crítica
                </Badge>
              )}
              {!hasVariacaoCritica && hasVariacaoAlerta && (
                <Badge variant="secondary" className="ml-2 bg-amber-500 text-white">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Atenção
                </Badge>
              )}
              {hasInsumosCriticos && !hasVariacaoCritica && !hasVariacaoAlerta && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Estoque
                </Badge>
              )}
            </Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : insumos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum insumo registrado para esta OP
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Previsto</TableHead>
                    <TableHead className="text-right">Usar (kg)</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map(insumo => (
                    <TableRow key={insumo.id} className={
                      insumo.status === 'critico' ? 'bg-destructive/5' : 
                      insumo.status === 'alerta' ? 'bg-amber-500/5' : 
                      !insumo.isOk ? 'bg-destructive/5' : ''
                    }>
                      <TableCell className="font-medium">{insumo.nome}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {insumo.estoque_disponivel.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        {insumo.quantidade_necessaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {insumo.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={insumo.quantidade_ajustada}
                          onChange={(e) => updateInsumoQuantidade(insumo.id, Number(e.target.value))}
                          className="w-28 text-right ml-auto"
                          min={0}
                          step={0.01}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {getVariacaoBadge(insumo)}
                      </TableCell>
                      <TableCell className="text-right">
                        {insumo.isOk ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Insuf.
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleIniciarProducao}
            disabled={saving || !allInsumosOk || hasVariacaoCritica || quantidadeProduzida <= 0}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Iniciar Produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
