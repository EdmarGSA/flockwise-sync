import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Package, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SolicitacaoRacao {
  id: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  quantidade_recebida_kg: number | null;
  quantidade_devolvida_kg: number | null;
  status: string;
  data_solicitacao: string;
  data_recebimento: string | null;
}

interface ConsumoVetTabProps {
  loteId: string;
}

export default function ConsumoVetTab({ loteId }: ConsumoVetTabProps) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolicitacoes();
  }, [loteId]);

  const fetchSolicitacoes = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('solicitacoes_racao')
      .select('*')
      .eq('lote_id', loteId)
      .order('data_solicitacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      setLoading(false);
      return;
    }

    setSolicitacoes(data || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      solicitado: { label: 'Solicitado', variant: 'outline' },
      confirmado: { label: 'Confirmado', variant: 'secondary' },
      enviado: { label: 'Enviado', variant: 'secondary' },
      recebido: { label: 'Recebido', variant: 'default' },
      devolvido: { label: 'Devolvido', variant: 'destructive' },
    };
    const c = config[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  // Calculate totals
  const totalSolicitado = solicitacoes.reduce((acc, s) => acc + s.quantidade_solicitada_kg, 0);
  const totalRecebido = solicitacoes.reduce((acc, s) => acc + (s.quantidade_recebida_kg || 0), 0);
  const totalDevolvido = solicitacoes.reduce((acc, s) => acc + (s.quantidade_devolvida_kg || 0), 0);
  const consumoLiquido = totalRecebido - totalDevolvido;

  // Pending requests
  const pendentes = solicitacoes.filter(s => ['solicitado', 'confirmado', 'enviado'].includes(s.status)).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-muted-foreground text-sm">Total Recebido</p>
              <p className="text-xl font-bold">{totalRecebido.toLocaleString('pt-BR')} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-muted-foreground text-sm">Total Devolvido</p>
              <p className="text-xl font-bold">{totalDevolvido.toLocaleString('pt-BR')} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-muted-foreground text-sm">Consumo Líquido</p>
              <p className="text-xl font-bold text-primary">{consumoLiquido.toLocaleString('pt-BR')} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border ${pendentes > 0 ? 'bg-amber-500/10 border-amber-500' : 'bg-card border-border'}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <p className="text-muted-foreground text-sm">Pendentes</p>
              <p className="text-xl font-bold">{pendentes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solicitações Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Histórico de Ração
          </CardTitle>
          <CardDescription>Solicitações, recebimentos e devoluções de ração</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma solicitação registrada</p>
              <p className="text-sm mt-1">As solicitações de ração aparecerão aqui</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Solicitado</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Devolvido</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitacoes.map((sol) => (
                    <TableRow key={sol.id}>
                      <TableCell>
                        {format(new Date(sol.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{sol.tipo_racao}</TableCell>
                      <TableCell className="text-right">
                        {sol.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg
                      </TableCell>
                      <TableCell className="text-right">
                        {sol.quantidade_recebida_kg 
                          ? `${sol.quantidade_recebida_kg.toLocaleString('pt-BR')} kg`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {sol.quantidade_devolvida_kg 
                          ? `${sol.quantidade_devolvida_kg.toLocaleString('pt-BR')} kg`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(sol.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
