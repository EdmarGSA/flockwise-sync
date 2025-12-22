import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, PlayCircle, Package, Loader2, Factory } from 'lucide-react';
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
}

interface IniciarProducaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemProducao | null;
  integradoId: string;
  onSuccess: () => void;
}

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

  useEffect(() => {
    if (open && ordem) {
      fetchInsumos();
      gerarLoteProducao();
    }
  }, [open, ordem]);

  const gerarLoteProducao = () => {
    const now = new Date();
    const lote = `LP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    setLoteProducao(lote);
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
          insumo:produtos!ordens_producao_itens_insumo_id_fkey(nome, estoque_atual)
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
            .select('estoque_atual')
            .eq('id', item.insumo_id)
            .single();
          
          const estoqueAtual = produtoAtual?.estoque_atual || 0;
          const qtdNecessaria = Number(item.quantidade_necessaria);
          
          return {
            id: item.id,
            insumo_id: item.insumo_id,
            nome: insumoData?.nome || '-',
            quantidade_necessaria: qtdNecessaria,
            quantidade_ajustada: qtdNecessaria,
            estoque_disponivel: estoqueAtual,
            unidade_medida: item.unidade_medida,
            custo_unitario: Number(item.custo_unitario) || 0,
            isOk: estoqueAtual >= qtdNecessaria
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

  const updateInsumoQuantidade = (id: string, quantidade: number) => {
    setInsumos(prev => prev.map(i => 
      i.id === id 
        ? { 
            ...i, 
            quantidade_ajustada: quantidade,
            isOk: i.estoque_disponivel >= quantidade 
          } 
        : i
    ));
  };

  const allInsumosOk = insumos.every(i => i.isOk);
  const hasInsumosCriticos = insumos.some(i => !i.isOk);

  const handleIniciarProducao = async () => {
    if (!ordem) return;
    setSaving(true);

    try {
      // Update order status
      const { error: opError } = await supabase
        .from('ordens_producao')
        .update({ 
          status: 'em_producao',
          data_inicio_producao: new Date().toISOString(),
          lote_producao: loteProducao
        })
        .eq('id', ordem.id);

      if (opError) throw opError;

      // Update item quantities if adjusted
      for (const insumo of insumos) {
        if (insumo.quantidade_ajustada !== insumo.quantidade_necessaria) {
          await supabase
            .from('ordens_producao_itens')
            .update({ 
              quantidade_necessaria: insumo.quantidade_ajustada,
              custo_total: insumo.quantidade_ajustada * insumo.custo_unitario
            })
            .eq('id', insumo.id);
        }
      }

      // Register production start log
      await supabase
        .from('producao_logs')
        .insert({
          ordem_producao_id: ordem.id,
          tipo_evento: 'inicio',
          origem: 'manual',
          dados_adicionais: { lote_producao: loteProducao }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          {/* Production Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Quantidade Planejada</Label>
                  <p className="text-lg font-bold">
                    {ordem?.quantidade_planejada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {ordem?.produto?.unidade_medida || 'kg'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">Custo Estimado</Label>
                  <p className="text-lg font-bold text-amber-500">
                    R$ {(ordem?.custo_total_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
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
              Revisão de Insumos
              {hasInsumosCriticos && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Atenção
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
                    <TableHead className="text-right">Necessário</TableHead>
                    <TableHead className="text-right">Usar</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insumos.map(insumo => (
                    <TableRow key={insumo.id} className={!insumo.isOk ? 'bg-destructive/5' : ''}>
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
                        {insumo.isOk ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Insuficiente
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
            disabled={saving || !allInsumosOk}
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
