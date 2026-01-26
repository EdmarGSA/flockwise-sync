import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Building2, Warehouse, Package, Plus, Search, Edit2, Trash2, MapPin, AlertTriangle, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VendedorFornecedorForm } from './VendedorFornecedorForm';
import { NucleoFornecedorForm } from './NucleoFornecedorForm';
import { GalpaoFornecedorForm } from './GalpaoFornecedorForm';
import { LoteFornecedorForm } from './LoteFornecedorForm';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FornecedorGestaoCampoTabProps {
  fornecedorGlobalId: string;
  clientes: any[];
}

export function FornecedorGestaoCampoTab({ fornecedorGlobalId, clientes }: FornecedorGestaoCampoTabProps) {
  const [activeTab, setActiveTab] = useState('vendedores');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para dados
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [galpoes, setGalpoes] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para formulários
  const [vendedorFormOpen, setVendedorFormOpen] = useState(false);
  const [nucleoFormOpen, setNucleoFormOpen] = useState(false);
  const [galpaoFormOpen, setGalpaoFormOpen] = useState(false);
  const [loteFormOpen, setLoteFormOpen] = useState(false);

  // Estados para edição
  const [selectedVendedor, setSelectedVendedor] = useState<any>(null);
  const [selectedNucleo, setSelectedNucleo] = useState<any>(null);
  const [selectedGalpao, setSelectedGalpao] = useState<any>(null);
  const [selectedLote, setSelectedLote] = useState<any>(null);

  // Estados para exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vendedoresRes, nucleosRes, galpoesRes, lotesRes] = await Promise.all([
        supabase.from('vendedores_fornecedor').select('*, user_id').order('nome'),
        supabase.from('nucleos_fornecedor').select('*, cliente_fornecedor:clientes_fornecedor(id, razao_social_nome, nome_fantasia)').order('nome'),
        supabase.from('galpoes_fornecedor').select('*, nucleo_fornecedor:nucleos_fornecedor(id, nome, cliente_fornecedor:clientes_fornecedor(razao_social_nome, nome_fantasia))').order('nome'),
        supabase.from('lotes_fornecedor').select('*, galpao_fornecedor:galpoes_fornecedor(id, nome, nucleo_fornecedor:nucleos_fornecedor(nome, cliente_fornecedor:clientes_fornecedor(razao_social_nome, nome_fantasia))), vendedor_fornecedor:vendedores_fornecedor(nome)').order('created_at', { ascending: false }),
      ]);

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (nucleosRes.error) throw nucleosRes.error;
      if (galpoesRes.error) throw galpoesRes.error;
      if (lotesRes.error) throw lotesRes.error;

      setVendedores(vendedoresRes.data || []);
      setNucleos(nucleosRes.data || []);
      setGalpoes(galpoesRes.data || []);
      setLotes(lotesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fornecedorGlobalId) {
      fetchData();
    }
  }, [fornecedorGlobalId]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      type TableName = 'vendedores_fornecedor' | 'nucleos_fornecedor' | 'galpoes_fornecedor' | 'lotes_fornecedor';
      const tableMap: Record<string, TableName> = {
        vendedor: 'vendedores_fornecedor',
        nucleo: 'nucleos_fornecedor',
        galpao: 'galpoes_fornecedor',
        lote: 'lotes_fornecedor',
      };

      const tableName = tableMap[itemToDelete.type];
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;
      toast.success('Item excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error(error.message || 'Erro ao excluir item');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const calcularSemana = (dataAlojamento: string | null): number | null => {
    if (!dataAlojamento) return null;
    const dias = differenceInDays(new Date(), new Date(dataAlojamento));
    return Math.floor(dias / 7) + 1;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'secondary' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Estatísticas
  const stats = {
    vendedoresAtivos: vendedores.filter(v => v.ativo).length,
    totalNucleos: nucleos.length,
    nucleosAtivos: nucleos.filter(n => n.ativo).length,
    totalGalpoes: galpoes.length,
    lotesAtivos: lotes.filter(l => l.status !== 'fechado').length,
    lotesAlojados: lotes.filter(l => l.status === 'alojado').length,
    totalAves: lotes.filter(l => l.status === 'alojado').reduce((acc, l) => acc + (l.quantidade_aves || 0), 0),
  };

  const clientesAtivos = clientes.filter(c => c.ativo);
  const nucleosAtivos = nucleos.filter(n => n.ativo);
  const galpoesAtivos = galpoes.filter(g => g.ativo);

  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vendedoresAtivos}</p>
                <p className="text-xs text-muted-foreground">Vendedores Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.nucleosAtivos}</p>
                <p className="text-xs text-muted-foreground">Núcleos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.lotesAlojados}</p>
                <p className="text-xs text-muted-foreground">Lotes Alojados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAves.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Aves em Produção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card de orientação quando não há clientes */}
      {clientesAtivos.length === 0 && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Configure seus clientes primeiro
                </p>
                <p className="text-sm text-muted-foreground">
                  Para criar núcleos, galpões e lotes, você precisa ter pelo menos um cliente cadastrado. 
                  Acesse a aba "Clientes" para cadastrar seu primeiro cliente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="nucleos">Núcleos</TabsTrigger>
          <TabsTrigger value="galpoes">Galpões</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
        </TabsList>

        {/* Vendedores */}
        <TabsContent value="vendedores" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setSelectedVendedor(null); setVendedorFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Vendedor
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores
                  .filter(v => v.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((vendedor) => (
                    <TableRow key={vendedor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {vendedor.nome}
                          {vendedor.user_id && (
                            <Badge variant="outline" className="text-xs">
                              <KeyRound className="h-3 w-3 mr-1" />
                              Portal
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{vendedor.codigo_vendedor || '-'}</TableCell>
                      <TableCell>{vendedor.telefone || '-'}</TableCell>
                      <TableCell>{vendedor.regiao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={vendedor.ativo ? 'default' : 'secondary'}>
                          {vendedor.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedVendedor(vendedor); setVendedorFormOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setItemToDelete({ type: 'vendedor', id: vendedor.id, name: vendedor.nome }); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {vendedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum vendedor cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Núcleos */}
        <TabsContent value="nucleos" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar núcleo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setSelectedNucleo(null); setNucleoFormOpen(true); }} disabled={clientesAtivos.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Novo Núcleo
            </Button>
          </div>

          {clientesAtivos.length === 0 && (
            <Card className="border-border bg-muted">
              <CardContent className="p-4 text-muted-foreground text-sm">
                Cadastre pelo menos um cliente ativo para criar núcleos.
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nucleos
                  .filter(n => n.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((nucleo) => (
                    <TableRow key={nucleo.id}>
                      <TableCell className="font-medium">{nucleo.nome}</TableCell>
                      <TableCell>{nucleo.cliente_fornecedor?.nome_fantasia || nucleo.cliente_fornecedor?.razao_social_nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {nucleo.cidade && nucleo.estado ? `${nucleo.cidade}/${nucleo.estado}` : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{nucleo.tipo_producao === 'corte' ? 'Corte' : 'Postura'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={nucleo.ativo ? 'default' : 'secondary'}>
                          {nucleo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedNucleo(nucleo); setNucleoFormOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setItemToDelete({ type: 'nucleo', id: nucleo.id, name: nucleo.nome }); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {nucleos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum núcleo cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Galpões */}
        <TabsContent value="galpoes" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar galpão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setSelectedGalpao(null); setGalpaoFormOpen(true); }} disabled={nucleosAtivos.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Novo Galpão
            </Button>
          </div>

          {nucleosAtivos.length === 0 && (
            <Card className="border-border bg-muted">
              <CardContent className="p-4 text-muted-foreground text-sm">
                Cadastre pelo menos um núcleo ativo para criar galpões.
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Dimensões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {galpoes
                  .filter(g => g.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((galpao) => (
                    <TableRow key={galpao.id}>
                      <TableCell className="font-medium">{galpao.nome}</TableCell>
                      <TableCell>{galpao.nucleo_fornecedor?.nome}</TableCell>
                      <TableCell>{galpao.nucleo_fornecedor?.cliente_fornecedor?.nome_fantasia || galpao.nucleo_fornecedor?.cliente_fornecedor?.razao_social_nome}</TableCell>
                      <TableCell>{galpao.capacidade_aves?.toLocaleString('pt-BR')} aves</TableCell>
                      <TableCell>
                        {galpao.comprimento && galpao.largura
                          ? `${galpao.comprimento}m x ${galpao.largura}m`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={galpao.ativo ? 'default' : 'secondary'}>
                          {galpao.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedGalpao(galpao); setGalpaoFormOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setItemToDelete({ type: 'galpao', id: galpao.id, name: galpao.nome }); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {galpoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum galpão cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Lotes */}
        <TabsContent value="lotes" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setSelectedLote(null); setLoteFormOpen(true); }} disabled={galpoesAtivos.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Novo Lote
            </Button>
          </div>

          {galpoesAtivos.length === 0 && (
            <Card className="border-border bg-muted">
              <CardContent className="p-4 text-muted-foreground text-sm">
                Cadastre pelo menos um galpão ativo para criar lotes.
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Galpão</TableHead>
                  <TableHead>Aves</TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes
                  .filter(l => 
                    (l.codigo_lote?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (l.galpao_fornecedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((lote) => {
                    const semana = calcularSemana(lote.data_alojamento);
                    return (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.codigo_lote || '-'}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lote.galpao_fornecedor?.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {lote.galpao_fornecedor?.nucleo_fornecedor?.nome} - {lote.galpao_fornecedor?.nucleo_fornecedor?.cliente_fornecedor?.nome_fantasia || lote.galpao_fornecedor?.nucleo_fornecedor?.cliente_fornecedor?.razao_social_nome}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{lote.quantidade_aves?.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          {semana ? (
                            <Badge variant="outline">Sem. {semana}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{lote.vendedor_fornecedor?.nome || '-'}</TableCell>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedLote(lote); setLoteFormOpen(true); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setItemToDelete({ type: 'lote', id: lote.id, name: lote.codigo_lote || 'Lote' }); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {lotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lote cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Formulários */}
      <VendedorFornecedorForm
        open={vendedorFormOpen}
        onOpenChange={setVendedorFormOpen}
        vendedor={selectedVendedor}
        fornecedorGlobalId={fornecedorGlobalId}
        onSuccess={fetchData}
      />

      <NucleoFornecedorForm
        open={nucleoFormOpen}
        onOpenChange={setNucleoFormOpen}
        nucleo={selectedNucleo}
        fornecedorGlobalId={fornecedorGlobalId}
        clientes={clientesAtivos}
        onSuccess={fetchData}
      />

      <GalpaoFornecedorForm
        open={galpaoFormOpen}
        onOpenChange={setGalpaoFormOpen}
        galpao={selectedGalpao}
        fornecedorGlobalId={fornecedorGlobalId}
        nucleos={nucleos.filter(n => n.ativo)}
        onSuccess={fetchData}
      />

      <LoteFornecedorForm
        open={loteFormOpen}
        onOpenChange={setLoteFormOpen}
        lote={selectedLote}
        fornecedorGlobalId={fornecedorGlobalId}
        galpoes={galpoes.filter(g => g.ativo)}
        vendedores={vendedores.filter(v => v.ativo)}
        onSuccess={fetchData}
      />

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
