import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Wallet, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardFinanceiroCardsProps {
  userId: string;
}

const DashboardFinanceiroCards = ({ userId }: DashboardFinanceiroCardsProps) => {
  const hoje = new Date();
  const em30Dias = addDays(hoje, 30);

  // Contas a Pagar próximos 30 dias
  const { data: contasPagar } = useQuery({
    queryKey: ['contas-pagar-dashboard', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('integrado_id', userId)
        .in('status', ['previsto', 'pendente'])
        .gte('data_vencimento', format(hoje, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(em30Dias, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    }
  });

  // Contas a Receber próximos 30 dias
  const { data: contasReceber } = useQuery({
    queryKey: ['contas-receber-dashboard', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('integrado_id', userId)
        .in('status', ['previsao', 'pendente'])
        .gte('data_vencimento', format(hoje, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(em30Dias, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    }
  });

  // Saldo bancário total
  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-dashboard', userId],
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

  // Contas vencidas
  const { data: contasVencidas } = useQuery({
    queryKey: ['contas-vencidas-dashboard', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('integrado_id', userId)
        .in('status', ['previsto', 'pendente'])
        .lt('data_vencimento', format(hoje, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    }
  });

  const totalAPagar = contasPagar?.reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;
  const totalAReceber = contasReceber?.reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;
  const saldoBancario = contasBancarias?.reduce((acc, conta) => acc + Number(conta.saldo_atual), 0) || 0;
  const totalVencido = contasVencidas?.reduce((acc, conta) => acc + Number(conta.valor), 0) || 0;
  const saldoProjetado = saldoBancario + totalAReceber - totalAPagar;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalAPagar)}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias • {contasPagar?.length || 0} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalAReceber)}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias • {contasReceber?.length || 0} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Bancário</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(saldoBancario)}</div>
            <p className="text-xs text-muted-foreground">
              {contasBancarias?.length || 0} contas ativas
            </p>
          </CardContent>
        </Card>

        <Card className={totalVencido > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalVencido > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVencido > 0 ? "text-destructive" : ""}`}>
              {formatCurrency(totalVencido)}
            </div>
            <p className="text-xs text-muted-foreground">
              {contasVencidas?.length || 0} contas em atraso
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {saldoProjetado >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              Saldo Projetado (30 dias)
            </CardTitle>
            <CardDescription>
              Saldo atual + recebimentos - pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${saldoProjetado >= 0 ? "text-green-500" : "text-destructive"}`}>
              {formatCurrency(saldoProjetado)}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Atual:</span>
                <span>{formatCurrency(saldoBancario)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>+ Recebimentos:</span>
                <span>{formatCurrency(totalAReceber)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>- Pagamentos:</span>
                <span>{formatCurrency(totalAPagar)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas Bancárias</CardTitle>
            <CardDescription>Saldo por conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contasBancarias?.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
              )}
              {contasBancarias?.map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{conta.banco_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Ag: {conta.agencia} | Cc: {conta.conta}
                    </p>
                  </div>
                  <div className={`font-bold ${Number(conta.saldo_atual) >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {formatCurrency(Number(conta.saldo_atual))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardFinanceiroCards;
