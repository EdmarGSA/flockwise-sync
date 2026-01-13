import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface KardexOvo {
  id: string;
  tipo_movimento: string;
  quantidade: number;
  saldo_anterior: number;
  saldo_atual: number;
  documento_ref: string | null;
  observacao: string | null;
  created_at: string;
  estoque_ovo: {
    lote_interno: string;
    tipo_ovo: string;
    classificacao_peso: string;
  };
}

interface KardexOvosViewProps {
  integradoId: string;
}

const TIPOS_MOVIMENTO = [
  { value: 'entrada_producao', label: 'Entrada Produção', cor: 'bg-green-500' },
  { value: 'entrada_manual', label: 'Entrada Manual', cor: 'bg-green-500' },
  { value: 'saida_venda', label: 'Saída Venda', cor: 'bg-blue-500' },
  { value: 'saida_perda', label: 'Saída Perda', cor: 'bg-red-500' },
  { value: 'saida_descarte', label: 'Saída Descarte', cor: 'bg-red-500' },
  { value: 'ajuste_positivo', label: 'Ajuste +', cor: 'bg-amber-500' },
  { value: 'ajuste_negativo', label: 'Ajuste -', cor: 'bg-amber-500' },
];

export default function KardexOvosView({ integradoId }: KardexOvosViewProps) {
  const [movimentos, setMovimentos] = useState<KardexOvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');

  useEffect(() => {
    fetchMovimentos();
  }, [integradoId]);

  const fetchMovimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('kardex_ovos')
        .select(`
          *,
          estoque_ovo:estoque_ovos(
            lote_interno,
            tipo_ovo,
            classificacao_peso
          )
        `)
        .eq('integrado_id', integradoId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setMovimentos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar movimentações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMovimentoInfo = (tipo: string) => {
    return TIPOS_MOVIMENTO.find(t => t.value === tipo) || { label: tipo, cor: 'bg-gray-500' };
  };

  const filteredMovimentos = movimentos.filter(m => {
    const matchSearch = m.estoque_ovo?.lote_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.documento_ref?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filterTipo || m.tipo_movimento === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Movimentação</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por lote ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filterTipo || 'all'} onValueChange={(v) => setFilterTipo(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de movimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS_MOVIMENTO.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredMovimentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Saldo Ant.</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimentos.map((mov) => {
                  const info = getMovimentoInfo(mov.tipo_movimento);
                  const isEntrada = mov.tipo_movimento.includes('entrada') || mov.tipo_movimento === 'ajuste_positivo';
                  return (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm">
                        {format(new Date(mov.created_at), 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {mov.estoque_ovo?.lote_interno || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={info.cor}>{info.label}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                        {isEntrada ? '+' : '-'}{mov.quantidade.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {mov.saldo_anterior.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mov.saldo_atual.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mov.documento_ref || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {mov.observacao || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
