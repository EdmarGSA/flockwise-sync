import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface FluxoCaixaTabProps {
  userId: string;
}

const FluxoCaixaTab = ({ userId }: FluxoCaixaTabProps) => {
  const [periodo, setPeriodo] = useState("30");
  const hoje = new Date();
  const dataFim = addDays(hoje, parseInt(periodo));

  // Saldo bancário atual
  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-fluxo', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('integrado_id', userId)
        .eq('ativo', true);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Contas a Pagar
  const { data: contasPagar } = useQuery({
    queryKey: ['contas-pagar-fluxo', userId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('integrado_id', userId)
        .in('status', ['previsto', 'pendente'])
        .gte('data_vencimento', format(hoje, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(dataFim, 'yyyy-MM-dd'))
        .order('data_vencimento', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Contas a Receber
  const { data: contasReceber } = useQuery({
    queryKey: ['contas-receber-fluxo', userId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('integrado_id', userId)
        .in('status', ['previsao', 'pendente'])
        .gte('data_vencimento', format(hoje, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(dataFim, 'yyyy-MM-dd'))
        .order('data_vencimento', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  const saldoAtual = contasBancarias?.reduce((acc, conta) => acc + Number(conta.saldo_atual), 0) || 0;

  // Gerar dados para o gráfico por semana
  const semanas = eachWeekOfInterval({ start: hoje, end: dataFim }, { weekStartsOn: 1 });
  
  const dadosGrafico = semanas.map((inicioSemana, index) => {
    const fimSemana = endOfWeek(inicioSemana, { weekStartsOn: 1 });
    
    const entradasSemana = contasReceber?.filter(conta => {
      const dataVenc = new Date(conta.data_vencimento);
      return isWithinInterval(dataVenc, { start: inicioSemana, end: fimSemana });
    }).reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;

    const saidasSemana = contasPagar?.filter(conta => {
      const dataVenc = new Date(conta.data_vencimento);
      return isWithinInterval(dataVenc, { start: inicioSemana, end: fimSemana });
    }).reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;

    // Calcular saldo acumulado
    const entradasAcumuladas = contasReceber?.filter(conta => {
      const dataVenc = new Date(conta.data_vencimento);
      return dataVenc <= fimSemana;
    }).reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;

    const saidasAcumuladas = contasPagar?.filter(conta => {
      const dataVenc = new Date(conta.data_vencimento);
      return dataVenc <= fimSemana;
    }).reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;

    const saldoProjetado = saldoAtual + entradasAcumuladas - saidasAcumuladas;

    return {
      semana: `Sem ${index + 1}`,
      periodo: `${format(inicioSemana, 'dd/MM')} - ${format(fimSemana, 'dd/MM')}`,
      entradas: entradasSemana,
      saidas: saidasSemana,
      saldo: saldoProjetado
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const saldoMinimo = Math.min(...dadosGrafico.map(d => d.saldo));
  const temPeriodoCritico = saldoMinimo < 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Fluxo de Caixa Projetado</h2>
          <p className="text-sm text-muted-foreground">Projeção de entradas e saídas</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {temPeriodoCritico && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
          <TrendingDown className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Atenção: Período crítico detectado</p>
            <p className="text-sm text-muted-foreground">
              O saldo projetado ficará negativo em {formatCurrency(saldoMinimo)}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Projeção por Semana
          </CardTitle>
          <CardDescription>
            Saldo inicial: {formatCurrency(saldoAtual)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="semana" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label, payload) => payload[0]?.payload?.periodo || label}
                />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                <Line 
                  type="monotone" 
                  dataKey="entradas" 
                  stroke="hsl(142, 76%, 36%)" 
                  name="Entradas"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="saidas" 
                  stroke="hsl(var(--destructive))" 
                  name="Saídas"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="hsl(var(--primary))" 
                  name="Saldo Projetado"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Entradas Previstas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasReceber?.slice(0, 10).map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM')}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{conta.descricao}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(Number(conta.valor))}
                    </TableCell>
                  </TableRow>
                ))}
                {(!contasReceber || contasReceber.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma entrada prevista
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              Saídas Previstas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasPagar?.slice(0, 10).map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM')}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{conta.descricao}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      {formatCurrency(Number(conta.valor))}
                    </TableCell>
                  </TableRow>
                ))}
                {(!contasPagar || contasPagar.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma saída prevista
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FluxoCaixaTab;
