import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Eye, FileText, RefreshCw, Mail, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface NfeRacao {
  id: string;
  numero_nfe: string | null;
  serie: string | null;
  chave_nfe: string | null;
  cnpj_fornecedor: string | null;
  razao_social_fornecedor: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  valor_frete: number | null;
  itens: any[];
  status: string;
  solicitacao_racao_id: string | null;
  lote_id: string | null;
  erro_mensagem: string | null;
  created_at: string;
}

interface NfeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export function NfeRacaoRevisaoTab() {
  const [nfes, setNfes] = useState<NfeRacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNfe, setSelectedNfe] = useState<NfeRacao | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [actionNfe, setActionNfe] = useState<NfeRacao | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    fetchNfes();
  }, []);

  const fetchNfes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nfe_racao_recebidas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar NF-es:', error);
      toast.error('Erro ao carregar NF-es recebidas');
    } else {
      setNfes((data || []).map(d => ({
        ...d,
        itens: Array.isArray(d.itens) ? d.itens : [],
      })));
    }
    setLoading(false);
  };

  const handlePollNow = async () => {
    setPolling(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-email-nfe', {
        body: {},
      });
      if (error) throw error;
      toast.success(`Verificação concluída: ${data?.processed || 0} NF-e(s) processada(s)`);
      await fetchNfes();
    } catch (e: any) {
      console.error('Erro ao verificar e-mails:', e);
      toast.error('Erro ao verificar e-mails: ' + (e.message || 'erro desconhecido'));
    } finally {
      setPolling(false);
    }
  };

  const handleConfirm = async () => {
    if (!actionNfe) return;
    try {
      const { error } = await supabase
        .from('nfe_racao_recebidas')
        .update({
          status: 'confirmada',
          processado_em: new Date().toISOString(),
        })
        .eq('id', actionNfe.id);

      if (error) throw error;

      // If linked to solicitacao, update its status
      if (actionNfe.solicitacao_racao_id) {
        await supabase
          .from('solicitacoes_racao')
          .update({ status: 'recebido' })
          .eq('id', actionNfe.solicitacao_racao_id);
      }

      toast.success('NF-e confirmada com sucesso!');
      setConfirmDialogOpen(false);
      setActionNfe(null);
      await fetchNfes();
    } catch (e: any) {
      toast.error('Erro ao confirmar NF-e');
    }
  };

  const handleReject = async () => {
    if (!actionNfe) return;
    try {
      const { error } = await supabase
        .from('nfe_racao_recebidas')
        .update({
          status: 'rejeitada',
          processado_em: new Date().toISOString(),
        })
        .eq('id', actionNfe.id);

      if (error) throw error;
      toast.success('NF-e rejeitada');
      setRejectDialogOpen(false);
      setActionNfe(null);
      await fetchNfes();
    } catch (e: any) {
      toast.error('Erro ao rejeitar NF-e');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pendente_revisao: { label: 'Pendente', variant: 'secondary' },
      confirmada: { label: 'Confirmada', variant: 'default' },
      rejeitada: { label: 'Rejeitada', variant: 'outline' },
      erro: { label: 'Erro', variant: 'destructive' },
    };
    const cfg = map[status] || { label: status, variant: 'outline' };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const formatCnpj = (cnpj: string | null) => {
    if (!cnpj || cnpj.length !== 14) return cnpj || '-';
    return `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12)}`;
  };

  const pendentesCount = nfes.filter(n => n.status === 'pendente_revisao').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">NF-e Recebidas por E-mail</h3>
          {pendentesCount > 0 && (
            <Badge variant="destructive" className="ml-2">{pendentesCount} pendente(s)</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePollNow}
          disabled={polling}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`} />
          Verificar Agora
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : nfes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p>Nenhuma NF-e recebida por e-mail ainda</p>
              <p className="text-sm">Configure o e-mail e clique em "Verificar Agora"</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NF-e</TableHead>
                  <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
                  <TableHead className="hidden md:table-cell">Data Emissão</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Match</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfes.map(nfe => (
                  <TableRow key={nfe.id}>
                    <TableCell className="font-medium">
                      {nfe.numero_nfe || '-'}
                      {nfe.serie && <span className="text-muted-foreground text-xs ml-1">S{nfe.serie}</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="max-w-[200px] truncate">
                        {nfe.razao_social_fornecedor || '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatCnpj(nfe.cnpj_fornecedor)}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {nfe.data_emissao ? format(new Date(nfe.data_emissao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell>
                      {nfe.valor_total ? `R$ ${nfe.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(nfe.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {nfe.solicitacao_racao_id ? (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30">
                          <CheckCircle className="w-3 h-3" /> Match
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setSelectedNfe(nfe); setDetailOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {nfe.status === 'pendente_revisao' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              onClick={() => { setActionNfe(nfe); setConfirmDialogOpen(true); }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                              onClick={() => { setActionNfe(nfe); setRejectDialogOpen(true); }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              NF-e {selectedNfe?.numero_nfe || '-'}
            </DialogTitle>
          </DialogHeader>
          {selectedNfe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{selectedNfe.razao_social_fornecedor || '-'}</p>
                  <p className="text-sm text-muted-foreground">{formatCnpj(selectedNfe.cnpj_fornecedor)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Emissão</p>
                  <p className="font-medium">
                    {selectedNfe.data_emissao ? format(new Date(selectedNfe.data_emissao), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-primary">
                    R$ {selectedNfe.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Frete</p>
                  <p className="font-medium">
                    R$ {selectedNfe.valor_frete?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedNfe.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Match Solicitação</p>
                  <p>{selectedNfe.solicitacao_racao_id ? '✅ Vinculada' : '❌ Não vinculada'}</p>
                </div>
              </div>

              {selectedNfe.chave_nfe && (
                <div>
                  <p className="text-sm text-muted-foreground">Chave NF-e</p>
                  <p className="text-xs font-mono break-all">{selectedNfe.chave_nfe}</p>
                </div>
              )}

              {selectedNfe.erro_mensagem && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-medium">{selectedNfe.erro_mensagem}</p>
                  </div>
                </div>
              )}

              {/* Items table */}
              {selectedNfe.itens && selectedNfe.itens.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Itens ({selectedNfe.itens.length})</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Vlr Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedNfe.itens as NfeItem[]).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="max-w-[250px]">
                              <p className="truncate">{item.descricao}</p>
                              <p className="text-xs text-muted-foreground">
                                NCM: {item.ncm} | {item.unidade}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">
                            R$ {item.valor_unitario?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {item.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedNfe?.status === 'pendente_revisao' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setActionNfe(selectedNfe); setRejectDialogOpen(true); setDetailOpen(false); }}
                  className="gap-2 text-destructive"
                >
                  <XCircle className="w-4 h-4" /> Rejeitar
                </Button>
                <Button
                  onClick={() => { setActionNfe(selectedNfe); setConfirmDialogOpen(true); setDetailOpen(false); }}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Confirmar Recebimento
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja confirmar o recebimento da NF-e {actionNfe?.numero_nfe || ''}
              {actionNfe?.razao_social_fornecedor && ` de ${actionNfe.razao_social_fornecedor}`}?
              {actionNfe?.solicitacao_racao_id && ' A solicitação vinculada será marcada como recebida.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar NF-e</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja rejeitar a NF-e {actionNfe?.numero_nfe || ''}? Ela será marcada como rejeitada mas permanecerá no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
