import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Bird, Package, Pill, Zap, Users, TrendingUp, TrendingDown } from "lucide-react";

interface RelatorioCustoPorLoteProps {
  userId: string;
}

const RelatorioCustoPorLote = ({ userId }: RelatorioCustoPorLoteProps) => {
  const [loteSelecionado, setLoteSelecionado] = useState<string>("");

  // Lotes fechados
  const { data: lotesFechados } = useQuery({
    queryKey: ['lotes-fechados', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          *,
          nucleos:nucleo_id(nome),
          galpoes:galpao_id(nome),
          fechamento_lotes(*)
        `)
        .eq('integrado_id', userId)
        .eq('status', 'fechado')
        .order('data_fechamento', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Centro de custos do lote selecionado
  const { data: centroCusto } = useQuery({
    queryKey: ['centro-custo-lote', loteSelecionado],
    queryFn: async () => {
      if (!loteSelecionado) return null;
      
      const { data, error } = await supabase
        .from('centro_custos')
        .select('*')
        .eq('lote_id', loteSelecionado)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!loteSelecionado
  });

  // Custos vinculados ao centro de custo
  const { data: custos } = useQuery({
    queryKey: ['custos-lote', centroCusto?.id],
    queryFn: async () => {
      if (!centroCusto?.id) return [];
      
      const { data, error } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          plano_contas:plano_conta_id(nome, tipo)
        `)
        .eq('centro_custo_id', centroCusto.id)
        .eq('status', 'pago');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!centroCusto?.id
  });

  // Receitas do lote (pedidos faturados)
  const { data: receitas } = useQuery({
    queryKey: ['receitas-lote', loteSelecionado],
    queryFn: async () => {
      if (!loteSelecionado) return [];
      
      const { data, error } = await supabase
        .from('pedido_itens')
        .select(`
          *,
          pedidos:pedido_id(status, data_faturamento)
        `)
        .eq('lote_producao_id', loteSelecionado);
      
      if (error) throw error;
      return data?.filter(item => item.pedidos?.status === 'faturado') || [];
    },
    enabled: !!loteSelecionado
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const loteAtual = lotesFechados?.find(l => l.id === loteSelecionado);
  const fechamento = loteAtual?.fechamento_lotes?.[0];

  // Agrupar custos por categoria
  const custosAgrupados = custos?.reduce((acc: any, custo: any) => {
    const categoria = custo.plano_contas?.nome || custo.categoria || 'Outros';
    if (!acc[categoria]) acc[categoria] = 0;
    acc[categoria] += Number(custo.valor_pago || custo.valor);
    return acc;
  }, {}) || {};

  const totalCustos = Object.values(custosAgrupados).reduce((a: number, b: any) => a + b, 0) as number;
  const totalReceitas = receitas?.reduce((acc, item) => acc + Number(item.valor_total), 0) || 0;
  const margemBruta = totalReceitas - totalCustos;
  const margemPercentual = totalReceitas > 0 ? (margemBruta / totalReceitas) * 100 : 0;
  const custoPorKg = fechamento?.peso_total_abatido_kg ? totalCustos / Number(fechamento.peso_total_abatido_kg) : 0;
  const custoPorAve = fechamento?.aves_abatidas ? totalCustos / fechamento.aves_abatidas : 0;

  // Dados para gráfico de pizza
  const dadosGrafico = Object.entries(custosAgrupados).map(([nome, valor], index) => ({
    name: nome,
    value: valor as number,
    percentage: totalCustos > 0 ? ((valor as number / totalCustos) * 100).toFixed(1) : 0
  }));

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const getCategoriaIcon = (categoria: string) => {
    const lower = categoria.toLowerCase();
    if (lower.includes('ração') || lower.includes('racao')) return <Package className="h-4 w-4" />;
    if (lower.includes('medicamento') || lower.includes('vacina')) return <Pill className="h-4 w-4" />;
    if (lower.includes('energia') || lower.includes('água')) return <Zap className="h-4 w-4" />;
    if (lower.includes('mão de obra') || lower.includes('salário')) return <Users className="h-4 w-4" />;
    if (lower.includes('pintinho')) return <Bird className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Custo por Lote</h2>
          <p className="text-sm text-muted-foreground">Análise detalhada de custos e margem</p>
        </div>
        <Select value={loteSelecionado} onValueChange={setLoteSelecionado}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione um lote fechado..." />
          </SelectTrigger>
          <SelectContent>
            {lotesFechados?.map((lote) => (
              <SelectItem key={lote.id} value={lote.id}>
                {lote.galpoes?.nome} - {lote.nucleos?.nome} ({format(new Date(lote.data_fechamento!), 'MM/yyyy')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loteSelecionado && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Selecione um lote para visualizar o relatório</p>
          </CardContent>
        </Card>
      )}

      {loteSelecionado && loteAtual && (
        <>
          {/* Resumo do Lote */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{loteAtual.galpoes?.nome} - {loteAtual.nucleos?.nome}</CardTitle>
                  <CardDescription>
                    Alojamento: {format(new Date(loteAtual.data_alojamento!), 'dd/MM/yyyy')} | 
                    Fechamento: {format(new Date(loteAtual.data_fechamento!), 'dd/MM/yyyy')}
                  </CardDescription>
                </div>
                <Badge variant={margemPercentual >= 20 ? "default" : margemPercentual >= 10 ? "secondary" : "destructive"}>
                  Margem: {margemPercentual.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Aves Alojadas</p>
                  <p className="text-2xl font-bold">{fechamento?.aves_alojadas?.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Aves Abatidas</p>
                  <p className="text-2xl font-bold">{fechamento?.aves_abatidas?.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Peso Total</p>
                  <p className="text-2xl font-bold">{Number(fechamento?.peso_total_abatido_kg).toLocaleString()} kg</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Peso Médio</p>
                  <p className="text-2xl font-bold">{Number(fechamento?.peso_medio_real_kg).toFixed(3)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico de Custos */}
            <Card>
              <CardHeader>
                <CardTitle>Composição de Custos</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosGrafico.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosGrafico}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percentage }) => `${percentage}%`}
                        >
                          {dadosGrafico.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">Nenhum custo vinculado a este lote</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Indicadores */}
            <Card>
              <CardHeader>
                <CardTitle>Indicadores Financeiros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Receita Total</span>
                    <span className="font-bold text-green-500">{formatCurrency(totalReceitas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Custo Total</span>
                    <span className="font-bold text-destructive">{formatCurrency(totalCustos)}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Margem Bruta</span>
                    <span className={`font-bold ${margemBruta >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {formatCurrency(margemBruta)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Margem (%)</span>
                      <span className="text-sm font-medium">{margemPercentual.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, margemPercentual))} 
                      className={margemPercentual >= 20 ? "bg-muted" : margemPercentual >= 10 ? "bg-amber-100" : "bg-red-100"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Custo/kg</p>
                      <p className="text-lg font-bold">{formatCurrency(custoPorKg)}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Custo/Ave</p>
                      <p className="text-lg font-bold">{formatCurrency(custoPorAve)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhamento de Custos */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Custos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Custo/kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(custosAgrupados)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([categoria, valor]) => {
                      const perc = totalCustos > 0 ? ((valor as number / totalCustos) * 100) : 0;
                      const custoKg = fechamento?.peso_total_abatido_kg 
                        ? (valor as number) / Number(fechamento.peso_total_abatido_kg) 
                        : 0;
                      
                      return (
                        <TableRow key={categoria}>
                          <TableCell className="flex items-center gap-2">
                            {getCategoriaIcon(categoria)}
                            {categoria}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(valor as number)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{perc.toFixed(1)}%</Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(custoKg)}/kg
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {Object.keys(custosAgrupados).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum custo vinculado ao centro de custo deste lote
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCustos)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                    <TableCell className="text-right">{formatCurrency(custoPorKg)}/kg</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioCustoPorLote;
