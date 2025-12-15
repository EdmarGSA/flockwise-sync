import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RelatorioDREProps {
  userId: string;
}

const RelatorioDRE = ({ userId }: RelatorioDREProps) => {
  const [mesOffset, setMesOffset] = useState("0");
  
  const mesReferencia = subMonths(new Date(), parseInt(mesOffset));
  const inicioMes = startOfMonth(mesReferencia);
  const fimMes = endOfMonth(mesReferencia);

  // Receitas (contas recebidas)
  const { data: receitas } = useQuery({
    queryKey: ['dre-receitas', userId, mesOffset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select(`
          *,
          plano_contas:plano_conta_id(id, codigo, nome, tipo)
        `)
        .eq('integrado_id', userId)
        .eq('status', 'recebido')
        .gte('data_recebimento', format(inicioMes, 'yyyy-MM-dd'))
        .lte('data_recebimento', format(fimMes, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    }
  });

  // Despesas (contas pagas)
  const { data: despesas } = useQuery({
    queryKey: ['dre-despesas', userId, mesOffset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          plano_contas:plano_conta_id(id, codigo, nome, tipo)
        `)
        .eq('integrado_id', userId)
        .eq('status', 'pago')
        .gte('data_pagamento', format(inicioMes, 'yyyy-MM-dd'))
        .lte('data_pagamento', format(fimMes, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    }
  });

  // Plano de contas
  const { data: planoContas } = useQuery({
    queryKey: ['plano-contas-dre', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('integrado_id', userId)
        .eq('ativo', true)
        .order('codigo');
      
      if (error) throw error;
      return data || [];
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Agrupar receitas por plano de contas
  const receitasAgrupadas = receitas?.reduce((acc: any, conta: any) => {
    const planoConta = conta.plano_contas?.nome || 'Outros';
    if (!acc[planoConta]) acc[planoConta] = 0;
    acc[planoConta] += Number(conta.valor_recebido || conta.valor);
    return acc;
  }, {}) || {};

  // Agrupar despesas por plano de contas
  const despesasAgrupadas = despesas?.reduce((acc: any, conta: any) => {
    const planoConta = conta.plano_contas?.nome || 'Outros';
    if (!acc[planoConta]) acc[planoConta] = 0;
    acc[planoConta] += Number(conta.valor_pago || conta.valor);
    return acc;
  }, {}) || {};

  // Separar custos operacionais de despesas administrativas
  const custosOperacionais = ['Ração', 'Medicamentos', 'Pintinhos', 'Insumos'];
  const custos = Object.entries(despesasAgrupadas)
    .filter(([nome]) => custosOperacionais.some(c => nome.toLowerCase().includes(c.toLowerCase())))
    .reduce((acc, [_, val]) => acc + (val as number), 0);
  
  const despesasAdmin = Object.entries(despesasAgrupadas)
    .filter(([nome]) => !custosOperacionais.some(c => nome.toLowerCase().includes(c.toLowerCase())))
    .reduce((acc, [_, val]) => acc + (val as number), 0);

  const totalReceitas = Object.values(receitasAgrupadas).reduce((a: number, b: any) => a + b, 0) as number;
  const totalDespesas = Object.values(despesasAgrupadas).reduce((a: number, b: any) => a + b, 0) as number;
  const lucroBruto = totalReceitas - custos;
  const resultadoOperacional = lucroBruto - despesasAdmin;

  const meses = [
    { value: "0", label: format(new Date(), 'MMMM yyyy', { locale: ptBR }) },
    { value: "1", label: format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR }) },
    { value: "2", label: format(subMonths(new Date(), 2), 'MMMM yyyy', { locale: ptBR }) },
    { value: "3", label: format(subMonths(new Date(), 3), 'MMMM yyyy', { locale: ptBR }) },
    { value: "6", label: format(subMonths(new Date(), 6), 'MMMM yyyy', { locale: ptBR }) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Demonstrativo de Resultado (DRE)</h2>
          <p className="text-sm text-muted-foreground">
            {format(inicioMes, "dd 'de' MMMM", { locale: ptBR })} a {format(fimMes, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Select value={mesOffset} onValueChange={setMesOffset}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meses.map((mes) => (
              <SelectItem key={mes.value} value={mes.value} className="capitalize">
                {mes.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultado do Exercício</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">DESCRIÇÃO</TableHead>
                <TableHead className="text-right font-bold">VALOR</TableHead>
                <TableHead className="text-right font-bold">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* RECEITAS */}
              <TableRow className="bg-green-500/10 font-bold">
                <TableCell className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  RECEITA BRUTA
                </TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(totalReceitas)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
              {Object.entries(receitasAgrupadas).map(([nome, valor]) => (
                <TableRow key={nome}>
                  <TableCell className="pl-8">{nome}</TableCell>
                  <TableCell className="text-right">{formatCurrency(valor as number)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalReceitas > 0 ? ((valor as number / totalReceitas) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}

              {/* CUSTOS */}
              <TableRow className="bg-destructive/10 font-bold">
                <TableCell className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-destructive" />
                  CUSTOS OPERACIONAIS
                </TableCell>
                <TableCell className="text-right text-destructive">({formatCurrency(custos)})</TableCell>
                <TableCell className="text-right">
                  {totalReceitas > 0 ? ((custos / totalReceitas) * 100).toFixed(1) : 0}%
                </TableCell>
              </TableRow>
              {Object.entries(despesasAgrupadas)
                .filter(([nome]) => custosOperacionais.some(c => nome.toLowerCase().includes(c.toLowerCase())))
                .map(([nome, valor]) => (
                <TableRow key={nome}>
                  <TableCell className="pl-8">{nome}</TableCell>
                  <TableCell className="text-right">({formatCurrency(valor as number)})</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalReceitas > 0 ? ((valor as number / totalReceitas) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}

              {/* LUCRO BRUTO */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell>= LUCRO BRUTO</TableCell>
                <TableCell className={`text-right ${lucroBruto >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(lucroBruto)}
                </TableCell>
                <TableCell className="text-right">
                  {totalReceitas > 0 ? ((lucroBruto / totalReceitas) * 100).toFixed(1) : 0}%
                </TableCell>
              </TableRow>

              {/* DESPESAS OPERACIONAIS */}
              <TableRow className="bg-amber-500/10 font-bold">
                <TableCell className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-amber-600" />
                  DESPESAS OPERACIONAIS
                </TableCell>
                <TableCell className="text-right text-amber-600">({formatCurrency(despesasAdmin)})</TableCell>
                <TableCell className="text-right">
                  {totalReceitas > 0 ? ((despesasAdmin / totalReceitas) * 100).toFixed(1) : 0}%
                </TableCell>
              </TableRow>
              {Object.entries(despesasAgrupadas)
                .filter(([nome]) => !custosOperacionais.some(c => nome.toLowerCase().includes(c.toLowerCase())))
                .map(([nome, valor]) => (
                <TableRow key={nome}>
                  <TableCell className="pl-8">{nome}</TableCell>
                  <TableCell className="text-right">({formatCurrency(valor as number)})</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalReceitas > 0 ? ((valor as number / totalReceitas) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}

              {/* RESULTADO OPERACIONAL */}
              <TableRow className="bg-primary/20 font-bold border-t-2 text-lg">
                <TableCell className="flex items-center gap-2">
                  {resultadoOperacional >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  = RESULTADO OPERACIONAL
                </TableCell>
                <TableCell className={`text-right ${resultadoOperacional >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(resultadoOperacional)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={resultadoOperacional >= 0 ? "default" : "destructive"}>
                    {totalReceitas > 0 ? ((resultadoOperacional / totalReceitas) * 100).toFixed(1) : 0}%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalReceitas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Despesa Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Margem Líquida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${resultadoOperacional >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {totalReceitas > 0 ? ((resultadoOperacional / totalReceitas) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatorioDRE;
