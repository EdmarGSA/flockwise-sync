import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertTriangle, TrendingDown, Package } from 'lucide-react';
import { ClienteEstoque } from '@/hooks/useFornecedorData';

interface FornecedorEstoqueTabProps {
  clientesEstoque: ClienteEstoque[];
}

export const FornecedorEstoqueTab = ({ clientesEstoque }: FornecedorEstoqueTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState<string>('todos');
  const [apenasAbaixoMinimo, setApenasAbaixoMinimo] = useState(false);

  // Clientes únicos para o filtro (usando integrado_id como chave estável)
  const clientesUnicos = (() => {
    const map = new Map<string, string>();
    clientesEstoque.forEach(e => {
      if (e.integrado_id && !map.has(e.integrado_id)) {
        map.set(e.integrado_id, e.integrado_nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  })();

  // Aplicar filtros
  const estoquesFiltrados = clientesEstoque.filter(item => {
    const matchSearch = 
      item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo_fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCliente = filterCliente === 'todos' || item.integrado_id === filterCliente;
    
    const matchEstoqueMinimo = !apenasAbaixoMinimo || item.estoque_atual <= item.estoque_minimo;

    return matchSearch && matchCliente && matchEstoqueMinimo;
  });

  const getStatusBadge = (item: ClienteEstoque) => {
    if (item.estoque_atual <= item.estoque_minimo) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Crítico</Badge>;
    }
    if (item.dias_estoque <= 7) {
      return <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700"><TrendingDown className="h-3 w-3" /> Baixo</Badge>;
    }
    return <Badge variant="outline" className="gap-1 text-green-600"><Package className="h-3 w-3" /> Normal</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estoque nos Clientes</CardTitle>
        <CardDescription>
          Visualize o estoque de seus produtos em cada cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientesUnicos.map(cliente => (
                  <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="abaixo-minimo" 
              checked={apenasAbaixoMinimo}
              onCheckedChange={(checked) => setApenasAbaixoMinimo(checked === true)}
            />
            <Label 
              htmlFor="abaixo-minimo" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Apenas abaixo do estoque mínimo
            </Label>
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Est. Mínimo</TableHead>
                <TableHead className="text-right">Dias Est.</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estoquesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                estoquesFiltrados.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.produto_nome}</p>
                        {item.codigo_fornecedor && (
                          <p className="text-xs text-muted-foreground">
                            Cód: {item.codigo_fornecedor}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.integrado_nome}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.estoque_atual.toLocaleString('pt-BR')} {item.unidade}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.estoque_minimo.toLocaleString('pt-BR')} {item.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        item.dias_estoque <= 3 ? 'text-destructive font-medium' :
                        item.dias_estoque <= 7 ? 'text-yellow-600' : ''
                      }>
                        {item.dias_estoque > 30 ? '30+' : item.dias_estoque} dias
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.preco_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Resumo */}
        <div className="flex justify-between text-sm text-muted-foreground pt-2">
          <span>
            {estoquesFiltrados.length} de {clientesEstoque.length} produtos
          </span>
          <span>
            {estoquesFiltrados.filter(e => e.estoque_atual <= e.estoque_minimo).length} em situação crítica
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
