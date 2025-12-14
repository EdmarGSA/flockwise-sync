import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Package, MoreHorizontal, Eye, FileCheck, AlertTriangle, Plus, Search, DollarSign } from 'lucide-react';
import IniciarRecebimentoDialog from './IniciarRecebimentoDialog';
import RecebimentoViewDialog from './RecebimentoViewDialog';
import LiberacaoPrecoDialog from './LiberacaoPrecoDialog';

interface Recebimento {
  id: string;
  numero_nfe: string | null;
  data_recebimento: string;
  valor_nfe: number;
  status: string;
  razao_social_fornecedor: string | null;
  ordens_compra?: {
    numero_oc: number;
    parceiros?: {
      razao_social_nome: string;
    };
  };
}

interface RecebimentosTableProps {
  integradoId: string;
  onRefresh?: () => void;
}

export default function RecebimentosTable({ integradoId, onRefresh }: RecebimentosTableProps) {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showIniciar, setShowIniciar] = useState(false);
  const [selectedRecebimento, setSelectedRecebimento] = useState<Recebimento | null>(null);
  const [showLiberacao, setShowLiberacao] = useState(false);
  const [liberacaoRecebimento, setLiberacaoRecebimento] = useState<Recebimento | null>(null);

  useEffect(() => {
    fetchRecebimentos();
  }, [integradoId]);

  const fetchRecebimentos = async () => {
    if (!integradoId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('recebimentos_mercadoria')
        .select(`
          id,
          numero_nfe,
          data_recebimento,
          valor_nfe,
          status,
          razao_social_fornecedor,
          ordens_compra(
            numero_oc,
            parceiros(razao_social_nome)
          )
        `)
        .eq('integrado_id', integradoId)
        .order('data_recebimento', { ascending: false });

      if (error) throw error;
      setRecebimentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar recebimentos:', error);
      toast.error('Erro ao carregar recebimentos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'em_conferencia': { label: 'Em Conferência', variant: 'secondary' },
      'divergente': { label: 'Divergente', variant: 'destructive' },
      'divergente_preco': { label: 'Divergente Preço', variant: 'destructive' },
      'aguardando_autorizacao': { label: 'Aguardando Autorização', variant: 'outline' },
      'finalizado': { label: 'Finalizado', variant: 'default' },
      'cancelado': { label: 'Cancelado', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFornecedorNome = (recebimento: Recebimento) => {
    if (recebimento.razao_social_fornecedor) return recebimento.razao_social_fornecedor;
    if (recebimento.ordens_compra?.parceiros?.razao_social_nome) {
      return recebimento.ordens_compra.parceiros.razao_social_nome;
    }
    return 'N/A';
  };

  const filteredRecebimentos = recebimentos.filter(rec => {
    const matchesSearch = 
      (rec.numero_nfe?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      getFornecedorNome(rec).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSuccess = () => {
    fetchRecebimentos();
    onRefresh?.();
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Recebimentos de Mercadoria
              </CardTitle>
              <CardDescription>
                Gestão de recebimento com conferência NF-e e análise de divergências
              </CardDescription>
            </div>
            <Button onClick={() => setShowIniciar(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Recebimento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NF-e ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="em_conferencia">Em Conferência</SelectItem>
                <SelectItem value="divergente">Divergente</SelectItem>
                <SelectItem value="divergente_preco">Divergente Preço</SelectItem>
                <SelectItem value="aguardando_autorizacao">Aguardando Autorização</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF-e / OC</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead className="text-right">Valor NF-e</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredRecebimentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum recebimento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecebimentos.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <div>
                        {rec.numero_nfe ? (
                          <span className="font-medium">NF-e {rec.numero_nfe}</span>
                        ) : (
                          <span className="text-muted-foreground">Sem NF-e</span>
                        )}
                        {rec.ordens_compra && (
                          <div className="text-xs text-muted-foreground">
                            OC #{rec.ordens_compra.numero_oc}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getFornecedorNome(rec)}</TableCell>
                    <TableCell>
                      {format(new Date(rec.data_recebimento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.valor_nfe || 0)}
                    </TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedRecebimento(rec)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {rec.status === 'em_conferencia' && (
                            <DropdownMenuItem onClick={() => setSelectedRecebimento(rec)}>
                              <FileCheck className="w-4 h-4 mr-2" />
                              Continuar Conferência
                            </DropdownMenuItem>
                          )}
                          {rec.status === 'divergente' && (
                            <DropdownMenuItem onClick={() => setSelectedRecebimento(rec)}>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Ver Divergências
                            </DropdownMenuItem>
                          )}
                          {rec.status === 'divergente_preco' && (
                            <DropdownMenuItem onClick={() => {
                              setLiberacaoRecebimento(rec);
                              setShowLiberacao(true);
                            }}>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Liberar Preço
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IniciarRecebimentoDialog
        open={showIniciar}
        onOpenChange={setShowIniciar}
        integradoId={integradoId}
        onSuccess={handleSuccess}
      />

      {selectedRecebimento && (
        <RecebimentoViewDialog
          open={!!selectedRecebimento}
          onOpenChange={(open) => !open && setSelectedRecebimento(null)}
          recebimentoId={selectedRecebimento.id}
          integradoId={integradoId}
          onSuccess={handleSuccess}
        />
      )}

      {liberacaoRecebimento && (
        <LiberacaoPrecoDialog
          open={showLiberacao}
          onOpenChange={(open) => {
            setShowLiberacao(open);
            if (!open) setLiberacaoRecebimento(null);
          }}
          recebimentoId={liberacaoRecebimento.id}
          integradoId={integradoId}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
