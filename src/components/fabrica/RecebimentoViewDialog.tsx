import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, FileText, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import ConferenciaFisicaDialog from './ConferenciaFisicaDialog';

interface RecebimentoViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recebimentoId: string;
  integradoId: string;
  onSuccess: () => void;
}

interface RecebimentoData {
  id: string;
  numero_nfe: string | null;
  chave_nfe: string | null;
  serie_nfe: string | null;
  data_emissao_nfe: string | null;
  data_recebimento: string;
  valor_nfe: number;
  valor_frete_nfe: number;
  valor_desconto_nfe: number;
  condicao_pagamento_nfe: string | null;
  cnpj_fornecedor: string | null;
  razao_social_fornecedor: string | null;
  status: string;
  observacoes: string | null;
  autorizado_por: string | null;
  data_autorizacao: string | null;
  justificativa_autorizacao: string | null;
  ordens_compra?: {
    numero_oc: number;
    parceiros?: {
      razao_social_nome: string;
    };
  };
}

interface RecebimentoItem {
  id: string;
  quantidade_oc: number;
  quantidade_nfe: number;
  quantidade_fisica: number;
  preco_oc: number;
  preco_nfe: number;
  lote_fornecedor: string | null;
  produtos: {
    nome: string;
    sku: string;
    unidade_medida: string;
  } | null;
}

interface Divergencia {
  id: string;
  tipo: string;
  descricao: string;
  valor_oc: number;
  valor_nfe: number;
  valor_fisico: number | null;
  percentual_diferenca: number;
  status: string;
  aceita: boolean;
}

export default function RecebimentoViewDialog({
  open,
  onOpenChange,
  recebimentoId,
  integradoId,
  onSuccess
}: RecebimentoViewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [recebimento, setRecebimento] = useState<RecebimentoData | null>(null);
  const [itens, setItens] = useState<RecebimentoItem[]>([]);
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  const [showConferencia, setShowConferencia] = useState(false);

  useEffect(() => {
    if (open && recebimentoId) {
      fetchData();
    }
  }, [open, recebimentoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch recebimento
      const { data: recData, error: recError } = await supabase
        .from('recebimentos_mercadoria')
        .select(`
          *,
          ordens_compra(
            numero_oc,
            parceiros(razao_social_nome)
          )
        `)
        .eq('id', recebimentoId)
        .single();

      if (recError) throw recError;
      setRecebimento(recData);

      // Fetch items
      const { data: itensData, error: itensError } = await supabase
        .from('recebimento_itens')
        .select(`
          id,
          quantidade_oc,
          quantidade_nfe,
          quantidade_fisica,
          preco_oc,
          preco_nfe,
          lote_fornecedor,
          produtos(nome, sku, unidade_medida)
        `)
        .eq('recebimento_id', recebimentoId);

      if (itensError) throw itensError;
      setItens(itensData || []);

      // Fetch divergences
      const { data: divData, error: divError } = await supabase
        .from('divergencias_recebimento')
        .select('*')
        .eq('recebimento_id', recebimentoId);

      if (divError) throw divError;
      setDivergencias(divData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do recebimento');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      'em_conferencia': { label: 'Em Conferência', variant: 'secondary', icon: <Clock className="w-3 h-3 mr-1" /> },
      'divergente': { label: 'Divergente', variant: 'destructive', icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
      'aguardando_autorizacao': { label: 'Aguardando Autorização', variant: 'outline', icon: <Clock className="w-3 h-3 mr-1" /> },
      'finalizado': { label: 'Finalizado', variant: 'default', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      'cancelado': { label: 'Cancelado', variant: 'destructive', icon: <XCircle className="w-3 h-3 mr-1" /> }
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' as const, icon: null };
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const handleContinuarConferencia = () => {
    setShowConferencia(true);
  };

  if (showConferencia) {
    return (
      <ConferenciaFisicaDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setShowConferencia(false);
            fetchData();
          }
        }}
        recebimentoId={recebimentoId}
        integradoId={integradoId}
        onSuccess={() => {
          setShowConferencia(false);
          onSuccess();
        }}
      />
    );
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!recebimento) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8 text-muted-foreground">Recebimento não encontrado</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalhes do Recebimento
          </DialogTitle>
          <DialogDescription>
            {recebimento.numero_nfe ? `NF-e ${recebimento.numero_nfe}` : 'Sem NF-e'}
            {recebimento.ordens_compra && ` | OC #${recebimento.ordens_compra.numero_oc}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="itens">Itens ({itens.length})</TabsTrigger>
            <TabsTrigger value="divergencias">
              Divergências ({divergencias.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4">
            <div className="flex items-center gap-4">
              {getStatusBadge(recebimento.status)}
              {recebimento.status === 'em_conferencia' && (
                <Button size="sm" onClick={handleContinuarConferencia}>
                  Continuar Conferência
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dados do Fornecedor</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Razão Social: </span>
                    {recebimento.razao_social_fornecedor || recebimento.ordens_compra?.parceiros?.razao_social_nome || 'N/A'}
                  </p>
                  {recebimento.cnpj_fornecedor && (
                    <p>
                      <span className="text-muted-foreground">CNPJ: </span>
                      {recebimento.cnpj_fornecedor}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dados da NF-e</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {recebimento.numero_nfe ? (
                    <>
                      <p>
                        <span className="text-muted-foreground">Número: </span>
                        {recebimento.numero_nfe} (Série {recebimento.serie_nfe || 'N/A'})
                      </p>
                      {recebimento.data_emissao_nfe && (
                        <p>
                          <span className="text-muted-foreground">Emissão: </span>
                          {format(new Date(recebimento.data_emissao_nfe), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">NF-e não informada</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Valores</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Total NF-e: </span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebimento.valor_nfe)}
                    </span>
                  </p>
                  {recebimento.valor_frete_nfe > 0 && (
                    <p>
                      <span className="text-muted-foreground">Frete: </span>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebimento.valor_frete_nfe)}
                    </p>
                  )}
                  {recebimento.valor_desconto_nfe > 0 && (
                    <p>
                      <span className="text-muted-foreground">Desconto: </span>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebimento.valor_desconto_nfe)}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recebimento</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Data: </span>
                    {format(new Date(recebimento.data_recebimento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                  {recebimento.condicao_pagamento_nfe && (
                    <p>
                      <span className="text-muted-foreground">Condição: </span>
                      {recebimento.condicao_pagamento_nfe}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {recebimento.autorizado_por && (
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Autorização
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {recebimento.data_autorizacao && (
                    <p>
                      <span className="text-muted-foreground">Data: </span>
                      {format(new Date(recebimento.data_autorizacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  )}
                  {recebimento.justificativa_autorizacao && (
                    <p>
                      <span className="text-muted-foreground">Justificativa: </span>
                      {recebimento.justificativa_autorizacao}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="itens">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd OC</TableHead>
                  <TableHead className="text-center">Qtd NF-e</TableHead>
                  <TableHead className="text-center">Qtd Física</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Preço OC</TableHead>
                  <TableHead className="text-right">Preço NF-e</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {item.produtos?.nome || <span className="text-muted-foreground italic">Produto não vinculado</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.produtos ? `${item.produtos.sku} | ${item.produtos.unidade_medida}` : 'Pendente de vinculação'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantidade_oc || '-'}</TableCell>
                    <TableCell className="text-center">{item.quantidade_nfe || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{item.quantidade_fisica}</TableCell>
                    <TableCell>{item.lote_fornecedor || '-'}</TableCell>
                    <TableCell className="text-right">
                      {item.preco_oc > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_oc) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.preco_nfe > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_nfe) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="divergencias">
            {divergencias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                Nenhuma divergência registrada
              </div>
            ) : (
              <div className="space-y-3">
                {divergencias.map((div) => (
                  <Card key={div.id} className={div.aceita ? 'border-green-500/50' : 'border-yellow-500/50'}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{div.tipo}</Badge>
                            {div.aceita && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aceita
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{div.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Diferença: {div.percentual_diferenca?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
