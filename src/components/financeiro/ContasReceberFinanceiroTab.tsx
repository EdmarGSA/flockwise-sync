import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isPast, isToday } from "date-fns";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface ContasReceberFinanceiroTabProps {
  userId: string;
}

const ContasReceberFinanceiroTab = ({ userId }: ContasReceberFinanceiroTabProps) => {
  const { data: contas, isLoading } = useQuery({
    queryKey: ['contas-receber-financeiro', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_receber')
        .select(`
          *,
          parceiros:cliente_id(razao_social_nome),
          plano_contas:plano_conta_id(nome),
          centro_custos:centro_custo_id(nome)
        `)
        .eq('integrado_id', userId)
        .order('data_vencimento', { ascending: true });
      
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

  const getStatusBadge = (conta: any) => {
    if (conta.status === 'recebido') {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Recebido</Badge>;
    }
    const vencimento = new Date(conta.data_vencimento);
    if (isPast(vencimento) && !isToday(vencimento)) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    }
    if (isToday(vencimento)) {
      return <Badge variant="secondary" className="bg-amber-500 text-white"><Clock className="h-3 w-3 mr-1" />Vence Hoje</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  const totalPendente = contas?.filter(c => c.status !== 'recebido').reduce((acc, c) => acc + Number(c.valor), 0) || 0;
  const totalRecebido = contas?.filter(c => c.status === 'recebido').reduce((acc, c) => acc + Number(c.valor_recebido || c.valor), 0) || 0;
  const totalVencido = contas?.filter(c => c.status !== 'recebido' && isPast(new Date(c.data_vencimento)) && !isToday(new Date(c.data_vencimento))).reduce((acc, c) => acc + Number(c.valor), 0) || 0;

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalVencido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recebido (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalRecebido)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Centro Custo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas?.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{conta.descricao}</TableCell>
                  <TableCell>{conta.parceiros?.razao_social_nome || '-'}</TableCell>
                  <TableCell>{conta.centro_custos?.nome || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(conta.valor))}</TableCell>
                  <TableCell>{getStatusBadge(conta)}</TableCell>
                </TableRow>
              ))}
              {(!contas || contas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma conta a receber cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContasReceberFinanceiroTab;
