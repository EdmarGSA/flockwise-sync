import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { 
  Key, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Trash2,
  FileText
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useSyncErpLogs } from '@/hooks/useSyncErpLogs';
import { ApiKeyDialog } from './ApiKeyDialog';

interface FornecedorIntegracaoERPTabProps {
  fornecedorGlobalId: string;
}

export const FornecedorIntegracaoERPTab = ({ fornecedorGlobalId }: FornecedorIntegracaoERPTabProps) => {
  const { logs, apiKeys, loading, stats, createApiKey, toggleApiKey, deleteApiKey, refetch } = useSyncErpLogs(fornecedorGlobalId);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleToggleKey = async (id: string, ativo: boolean) => {
    const error = await toggleApiKey(id, ativo);
    if (error) {
      toast.error('Erro ao atualizar API Key');
    } else {
      toast.success(ativo ? 'API Key ativada' : 'API Key desativada');
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;
    const error = await deleteApiKey(keyToDelete);
    if (error) {
      toast.error('Erro ao excluir API Key');
    } else {
      toast.success('API Key excluída');
    }
    setKeyToDelete(null);
  };

  const getDirecaoIcon = (direcao: string) => {
    if (direcao === 'erp_para_cloud') {
      return <ArrowUpCircle className="h-4 w-4 text-blue-500" />;
    }
    return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'produtos': 'Produtos',
      'clientes': 'Clientes',
      'credito': 'Crédito',
      'pedidos': 'Pedidos'
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integração ERP</h2>
          <p className="text-muted-foreground">
            Gerencie a sincronização com seu sistema ERP local (Padrão GSA Tibiri)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.apiKeysAtivas > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Não configurado</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Keys Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.apiKeysAtivas}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sincronizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalSyncs}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {stats.ultimaSync 
                  ? formatDistanceToNow(new Date(stats.ultimaSync), { addSuffix: true, locale: ptBR })
                  : 'Nunca'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Suas API Keys
            </CardTitle>
            <CardDescription>
              Chaves de acesso para o Bridge Agent se conectar à API
            </CardDescription>
          </div>
          <Button onClick={() => setShowApiKeyDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova API Key
          </Button>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma API Key criada ainda.</p>
              <p className="text-sm">Crie uma chave para iniciar a integração com seu ERP.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={key.ativo} 
                          onCheckedChange={(v) => handleToggleKey(key.id, v)}
                        />
                        <Badge variant={key.ativo ? 'default' : 'secondary'}>
                          {key.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.ultimo_uso 
                        ? format(new Date(key.ultimo_uso), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : <span className="text-muted-foreground">Nunca</span>}
                    </TableCell>
                    <TableCell>
                      {format(new Date(key.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setKeyToDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log de Sincronizações
          </CardTitle>
          <CardDescription>
            Histórico das últimas operações de sincronização
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sincronização registrada.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Enviados</TableHead>
                    <TableHead className="text-center">OK</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} className={log.registros_erro > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDirecaoIcon(log.direcao)}
                          <span className="text-xs">
                            {log.direcao === 'erp_para_cloud' ? 'ERP → Cloud' : 'Cloud → ERP'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTipoLabel(log.tipo_entidade)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{log.registros_enviados}</TableCell>
                      <TableCell className="text-center text-green-600">{log.registros_processados}</TableCell>
                      <TableCell className="text-center">
                        {log.registros_erro > 0 ? (
                          <span className="text-destructive font-medium">{log.registros_erro}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Documentação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentação da API</CardTitle>
          <CardDescription>
            Referência rápida para integração com o Bridge Agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium mb-2">Endpoint</p>
            <code className="text-sm block bg-background p-2 rounded">
              POST https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp
            </code>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium mb-2">Headers</p>
            <code className="text-sm block bg-background p-2 rounded">
              X-API-Key: sua-chave-aqui<br />
              Content-Type: application/json
            </code>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium mb-2">Ações Disponíveis</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>sync_produtos</code> - Sincronizar produtos</li>
                <li>• <code>sync_clientes</code> - Sincronizar clientes</li>
                <li>• <code>sync_credito</code> - Atualizar crédito</li>
                <li>• <code>buscar_pedidos</code> - Listar pedidos pendentes</li>
                <li>• <code>confirmar_pedido_erp</code> - Confirmar importação</li>
                <li>• <code>atualizar_status</code> - Alterar status</li>
                <li>• <code>confirmar_nfe</code> - Registrar NF-e</li>
                <li>• <code>registrar_erro_pedido</code> - Informar erro</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">Ciclo de Vida do Pedido</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">pendente</Badge>
                  <span>→</span>
                  <Badge variant="outline">exportado</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">exportado</Badge>
                  <span>→</span>
                  <Badge variant="outline">aprovado</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">aprovado</Badge>
                  <span>→</span>
                  <Badge variant="outline">separado</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">separado</Badge>
                  <span>→</span>
                  <Badge variant="default">faturado</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">faturado</Badge>
                  <span>→</span>
                  <Badge variant="secondary">entregue</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de nova API Key */}
      <ApiKeyDialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onGenerate={createApiKey}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir API Key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O Bridge Agent que usa esta chave perderá acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
