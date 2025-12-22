import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Factory, Package, Loader2, DollarSign, FlaskConical, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
  unidade_medida: string;
  estoque_atual: number;
}

interface InsumoVerificacao {
  id: string;
  nome: string;
  quantidadeNecessaria: number;
  estoqueDisponivel: number;
  unidade_medida: string;
  isCritico: boolean;
  maxProduzivel: number;
  custoUnitario: number;
  custoTotal: number;
}

interface Nutricao {
  id: string;
  nome: string;
  padrao: boolean;
  ativo: boolean;
}

interface NovaOrdemProducaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
}

export default function NovaOrdemProducaoDialog({
  open,
  onOpenChange,
  integradoId,
  onSuccess
}: NovaOrdemProducaoDialogProps) {
  const [racoes, setRacoes] = useState<Produto[]>([]);
  const [selectedRacaoId, setSelectedRacaoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState(0);
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [insumos, setInsumos] = useState<InsumoVerificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRacoes, setLoadingRacoes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maxProduzivel, setMaxProduzivel] = useState<number | null>(null);
  
  const [nutricoes, setNutricoes] = useState<Nutricao[]>([]);
  const [selectedNutricaoId, setSelectedNutricaoId] = useState<string>("");
  const [loadingNutricoes, setLoadingNutricoes] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedRacaoId("");
      setSelectedNutricaoId("");
      setQuantidade(1000);
      setDataPrevista(new Date().toISOString().split('T')[0]);
      setObservacoes('');
      setInsumos([]);
      setMaxProduzivel(null);
      fetchRacoes();
    }
  }, [open]);

  useEffect(() => {
    if (selectedRacaoId) {
      fetchNutricoes();
    }
  }, [selectedRacaoId]);

  useEffect(() => {
    if (selectedNutricaoId && quantidade > 0) {
      fetchFormulacao();
    }
  }, [selectedNutricaoId, quantidade]);

  const fetchRacoes = async () => {
    setLoadingRacoes(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, nome, estoque_atual, unidade_medida,
          categoria:categorias!inner(tipo_origem),
          grupo:grupos_produto!inner(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'fabricacao_propria')
        .ilike('grupos_produto.nome', '%ração%')
        .order('nome');

      if (error) throw error;
      setRacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar rações:', error);
      toast.error('Erro ao carregar rações');
    } finally {
      setLoadingRacoes(false);
    }
  };

  const fetchNutricoes = async () => {
    if (!selectedRacaoId) return;
    setLoadingNutricoes(true);
    setNutricoes([]);
    setSelectedNutricaoId("");

    try {
      const { data, error } = await supabase
        .from('nutricoes')
        .select('id, nome, padrao, ativo')
        .eq('produto_id', selectedRacaoId)
        .eq('ativo', true)
        .order('padrao', { ascending: false })
        .order('nome');

      if (error) throw error;
      setNutricoes(data || []);
      
      const padrao = data?.find(n => n.padrao);
      if (padrao) {
        setSelectedNutricaoId(padrao.id);
      } else if (data && data.length > 0) {
        setSelectedNutricaoId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar nutrições:', error);
    } finally {
      setLoadingNutricoes(false);
    }
  };

  const fetchFormulacao = async () => {
    if (!selectedNutricaoId) return;
    setLoading(true);

    try {
      const { data: formulacao, error } = await supabase
        .from('nutricao_itens')
        .select(`
          id,
          quantidade,
          unidade_medida,
          insumo:produtos!nutricao_itens_insumo_id_fkey(
            id, nome, estoque_atual, unidade_medida, custo_unitario, custo_medio
          )
        `)
        .eq('nutricao_id', selectedNutricaoId);

      if (error) throw error;

      if (!formulacao || formulacao.length === 0) {
        setInsumos([]);
        setMaxProduzivel(null);
        return;
      }

      const insumosVerificados: InsumoVerificacao[] = formulacao.map(item => {
        const insumo = item.insumo as any;
        const qtdNecessaria = (quantidade / 1000) * Number(item.quantidade);
        const estoqueDisponivel = Number(insumo.estoque_atual);
        const isCritico = estoqueDisponivel < qtdNecessaria;
        const maxProd = Number(item.quantidade) > 0 
          ? (estoqueDisponivel / Number(item.quantidade)) * 1000 
          : 999999;
        
        const custoUnitario = Number(insumo.custo_medio) > 0 
          ? Number(insumo.custo_medio) 
          : Number(insumo.custo_unitario) || 0;
        const custoTotal = qtdNecessaria * custoUnitario;

        return {
          id: insumo.id,
          nome: insumo.nome,
          quantidadeNecessaria: qtdNecessaria,
          estoqueDisponivel,
          unidade_medida: insumo.unidade_medida,
          isCritico,
          maxProduzivel: maxProd,
          custoUnitario,
          custoTotal
        };
      });

      setInsumos(insumosVerificados);
      const minMax = Math.min(...insumosVerificados.map(i => i.maxProduzivel));
      setMaxProduzivel(minMax === Infinity ? null : Math.floor(minMax));
    } catch (error) {
      console.error('Erro ao buscar formulação:', error);
    } finally {
      setLoading(false);
    }
  };

  const custoTotalEstimado = insumos.reduce((sum, i) => sum + i.custoTotal, 0);
  const custoPorKg = quantidade > 0 ? custoTotalEstimado / quantidade : 0;
  const hasInsumosCriticos = insumos.some(i => i.isCritico);
  const selectedRacao = racoes.find(r => r.id === selectedRacaoId);

  const handleSave = async (status: 'rascunho' | 'pendente') => {
    if (!selectedRacaoId) {
      toast.error('Selecione uma ração');
      return;
    }
    setSaving(true);

    try {
      const { data: op, error: opError } = await supabase
        .from('ordens_producao')
        .insert({
          integrado_id: integradoId,
          produto_id: selectedRacaoId,
          quantidade_planejada: quantidade,
          status,
          data_prevista_producao: dataPrevista || null,
          observacoes: observacoes || null,
          criado_por: integradoId,
          custo_total_estimado: custoTotalEstimado,
          custo_por_kg: custoPorKg,
          nutricao_id: selectedNutricaoId || null,
          modo_execucao: 'manual'
        })
        .select()
        .single();

      if (opError) throw opError;

      if (insumos.length > 0) {
        const itens = insumos.map(insumo => ({
          ordem_producao_id: op.id,
          insumo_id: insumo.id,
          quantidade_necessaria: insumo.quantidadeNecessaria,
          unidade_medida: insumo.unidade_medida,
          estoque_disponivel: insumo.estoqueDisponivel,
          custo_unitario: insumo.custoUnitario,
          custo_total: insumo.custoTotal
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Nova Ordem de Produção
          </DialogTitle>
          <DialogDescription>
            Criar manualmente uma ordem de produção de ração
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ração Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Factory className="w-4 h-4" />
              Ração
            </Label>
            <Select 
              value={selectedRacaoId || "__none__"} 
              onValueChange={(val) => setSelectedRacaoId(val === "__none__" ? "" : val)}
              disabled={loadingRacoes}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a ração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione uma ração</SelectItem>
                {racoes.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome} (Estoque: {r.estoque_atual.toLocaleString('pt-BR')} {r.unidade_medida})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nutrition Selection */}
          {selectedRacaoId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Nutrição
              </Label>
              {loadingNutricoes ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando nutrições...
                </div>
              ) : nutricoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma nutrição cadastrada para esta ração</p>
              ) : (
                <Select 
                  value={selectedNutricaoId || "__none__"} 
                  onValueChange={(val) => setSelectedNutricaoId(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a nutrição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione uma nutrição</SelectItem>
                    {nutricoes.map(n => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.nome} {n.padrao && "(Padrão)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

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
                  Máximo: {maxProduzivel.toLocaleString('pt-BR')} kg
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

          {/* Cost Summary */}
          {insumos.length > 0 && (
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Custo Total Estimado</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">
                      R$ {custoTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {custoPorKg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients Verification */}
          {selectedNutricaoId && (
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
                    Nenhum insumo na formulação
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Necessário</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
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
                            R$ {insumo.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              </CardContent>
            </Card>
          )}

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
            disabled={saving || quantidade <= 0 || !selectedRacaoId}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Rascunho
          </Button>
          <Button 
            onClick={() => handleSave('pendente')}
            disabled={saving || quantidade <= 0 || !selectedRacaoId}
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
