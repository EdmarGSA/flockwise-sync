import { useState } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClienteFornecedorForm, ClienteFornecedor } from './ClienteFornecedorForm';
import { supabase } from '@/integrations/supabase/client';

interface FornecedorClientesTabProps {
  clientes: ClienteFornecedor[];
  fornecedorGlobalId: string;
  onRefresh: () => void;
}

export function FornecedorClientesTab({ 
  clientes, 
  fornecedorGlobalId, 
  onRefresh 
}: FornecedorClientesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteFornecedor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<ClienteFornecedor | null>(null);

  const filteredClientes = clientes.filter((c) => {
    const matchesSearch = 
      c.razao_social_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf_cnpj.includes(searchTerm.replace(/\D/g, '')) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = showInactive ? true : c.ativo;
    
    return matchesSearch && matchesStatus;
  });

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const handleEdit = (cliente: ClienteFornecedor) => {
    setSelectedCliente(cliente);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedCliente(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!clienteToDelete) return;

    const { error } = await supabase
      .from('clientes_fornecedor')
      .delete()
      .eq('id', clienteToDelete.id);

    if (error) {
      toast.error('Erro ao excluir cliente');
    } else {
      toast.success('Cliente excluído com sucesso');
      onRefresh();
    }
    
    setDeleteDialogOpen(false);
    setClienteToDelete(null);
  };

  const confirmDelete = (cliente: ClienteFornecedor) => {
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const clientesAtivos = clientes.filter(c => c.ativo).length;
  const limiteTotal = clientes.reduce((sum, c) => sum + (c.limite_credito || 0), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Meus Clientes</CardTitle>
              <CardDescription>
                Gerencie seus clientes particulares (não visíveis para outros)
              </CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(!!checked)}
              />
              <label htmlFor="show-inactive" className="text-sm cursor-pointer">
                Mostrar inativos
              </label>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{clientes.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes Ativos</p>
              <p className="text-2xl font-bold text-green-600">{clientesAtivos}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Limite Total</p>
              <p className="text-2xl font-bold">
                R$ {limiteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Tabela */}
          {filteredClientes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {clientes.length === 0 
                ? 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.'
                : 'Nenhum cliente encontrado com os filtros aplicados.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="text-right">Limite</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className={!cliente.ativo ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.razao_social_nome}</p>
                          {cliente.nome_fantasia && (
                            <p className="text-sm text-muted-foreground">{cliente.nome_fantasia}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCpfCnpj(cliente.cpf_cnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {cliente.telefone && (
                            <span className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {cliente.telefone}
                            </span>
                          )}
                          {cliente.email && (
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {cliente.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.cidade && cliente.estado 
                          ? `${cliente.cidade}/${cliente.estado}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(cliente.limite_credito || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.ativo ? (
                          <Badge variant="default" className="gap-1">
                            <UserCheck className="h-3 w-3" /> Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserX className="h-3 w-3" /> Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cliente)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(cliente)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ClienteFornecedorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={selectedCliente}
        fornecedorGlobalId={fornecedorGlobalId}
        onSuccess={onRefresh}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clienteToDelete?.razao_social_nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
