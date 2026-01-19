import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HistoricoPreco } from '@/hooks/useFornecedorData';

interface FornecedorHistoricoTabProps {
  historicoPrecos: HistoricoPreco[];
}

export const FornecedorHistoricoTab = ({ historicoPrecos }: FornecedorHistoricoTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Aplicar filtros
  const historicoFiltrado = historicoPrecos.filter(item => {
    return (
      item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.integrado_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getVariacaoBadge = (anterior: number | null, novo: number) => {
    if (!anterior) {
      return <Badge variant="outline">Novo</Badge>;
    }
    
    const variacao = ((novo - anterior) / anterior) * 100;
    
    if (variacao > 0) {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-700">
          <TrendingUp className="h-3 w-3" />
          +{variacao.toFixed(1)}%
        </Badge>
      );
    } else if (variacao < 0) {
      return (
        <Badge variant="secondary" className="gap-1 bg-red-500/20 text-red-700">
          <TrendingDown className="h-3 w-3" />
          {variacao.toFixed(1)}%
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" />
        0%
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Preços</CardTitle>
        <CardDescription>
          Acompanhe as alterações de preço dos seus produtos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Preço Anterior</TableHead>
                <TableHead className="text-right">Novo Preço</TableHead>
                <TableHead>Variação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoFiltrado.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum registro de alteração de preço
                  </TableCell>
                </TableRow>
              ) : (
                historicoFiltrado.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.data_alteracao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{item.produto_nome}</TableCell>
                    <TableCell>{item.integrado_nome}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.preco_anterior 
                        ? `R$ ${item.preco_anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {item.preco_novo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getVariacaoBadge(item.preco_anterior, item.preco_novo)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Resumo */}
        <div className="text-sm text-muted-foreground pt-2">
          {historicoFiltrado.length} registro{historicoFiltrado.length !== 1 ? 's' : ''} de alteração
        </div>
      </CardContent>
    </Card>
  );
};
