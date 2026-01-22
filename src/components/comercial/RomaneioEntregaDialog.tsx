import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Printer, Truck, Package, Egg } from 'lucide-react';
import jsPDF from 'jspdf';

interface RomaneioEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
  integradoId: string;
}

interface ItemRomaneio {
  produto_nome: string;
  quantidade: number;
  unidade: string;
  lote_interno?: string;
  data_producao?: string;
  data_validade?: string;
  is_ovo: boolean;
}

export default function RomaneioEntregaDialog({
  open,
  onOpenChange,
  pedido,
  integradoId,
}: RomaneioEntregaDialogProps) {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemRomaneio[]>([]);
  const [organizacao, setOrganizacao] = useState<any>(null);

  useEffect(() => {
    if (open && pedido) {
      fetchData();
    }
  }, [open, pedido]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar itens de produtos regulares com separação (tipagem explícita)
      const responseProdutos = await supabase
        .from('separacao_pedidos')
        .select('quantidade_separada, produto_id')
        .eq('pedido_id', pedido.id);

      if (responseProdutos.error) throw responseProdutos.error;
      const itensProdutos = responseProdutos.data || [];

      // Buscar reservas de ovos (cast para evitar erro de tipo profundo do Supabase)
      const responseOvos = await (supabase as any)
        .from('reserva_estoque_ovos')
        .select('quantidade_reservada, lote_interno, data_producao, data_validade')
        .eq('pedido_id', pedido.id);
      
      if (responseOvos.error) throw responseOvos.error;
      const reservasOvos: any[] = responseOvos.data || [];

      // Buscar dados da organização
      const { data: org } = await supabase
        .from('organizacoes')
        .select('*')
        .eq('integrado_id', integradoId)
        .maybeSingle();

      setOrganizacao(org);

      // Montar lista simplificada
      const listaItens: ItemRomaneio[] = [];

      // Produtos regulares (simplificado)
      itensProdutos.forEach((item) => {
        listaItens.push({
          produto_nome: 'Produto',
          quantidade: item.quantidade_separada || 0,
          unidade: 'UN',
          is_ovo: false,
        });
      });

      // Ovos com rastreabilidade
      reservasOvos.forEach((reserva) => {
        listaItens.push({
          produto_nome: 'Ovos',
          quantidade: reserva.quantidade_reservada || 0,
          unidade: 'UN',
          lote_interno: reserva.lote_interno || undefined,
          data_producao: reserva.data_producao || undefined,
          data_validade: reserva.data_validade || undefined,
          is_ovo: true,
        });
      });

      setItens(listaItens);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ROMANEIO DE ENTREGA', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Dados da empresa
    if (organizacao) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(organizacao.razao_social || organizacao.nome_fantasia || '', pageWidth / 2, y, { align: 'center' });
      y += 5;
      if (organizacao.cnpj) {
        doc.text(`CNPJ: ${organizacao.cnpj}`, pageWidth / 2, y, { align: 'center' });
        y += 5;
      }
    }
    y += 10;

    // Dados do pedido
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pedido: #${pedido.numero_pedido}`, 20, y);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth - 60, y);
    y += 8;

    // Cliente
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome || '-'}`, 20, y);
    y += 6;
    if (pedido.cliente?.endereco) {
      doc.setFontSize(9);
      doc.text(`Endereço: ${pedido.cliente.endereco}${pedido.cliente.cidade ? ', ' + pedido.cliente.cidade : ''}`, 20, y);
      y += 6;
    }
    y += 5;

    // Separador
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Tabela de itens
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Produto', 20, y);
    doc.text('Qtd', 100, y);
    doc.text('Lote', 120, y);
    doc.text('Produção', 150, y);
    doc.text('Validade', 175, y);
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    itens.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(item.produto_nome.substring(0, 35), 20, y);
      doc.text(`${item.quantidade} ${item.unidade}`, 100, y);
      doc.text(item.lote_interno || '-', 120, y);
      doc.text(item.data_producao ? format(new Date(item.data_producao), 'dd/MM/yy') : '-', 150, y);
      doc.text(item.data_validade ? format(new Date(item.data_validade), 'dd/MM/yy') : '-', 175, y);
      y += 6;
    });

    y += 10;
    doc.line(20, y, pageWidth - 20, y);
    y += 15;

    // Assinaturas
    doc.setFontSize(9);
    doc.text('Conferido por:', 20, y);
    doc.text('Recebido por:', 110, y);
    y += 15;
    doc.line(20, y, 90, y);
    doc.line(110, y, pageWidth - 20, y);
    y += 5;
    doc.text('Assinatura / Data', 45, y);
    doc.text('Assinatura / Data', 145, y);

    // Rodapé
    doc.setFontSize(8);
    doc.text(`Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, 290, { align: 'center' });

    doc.save(`romaneio_${pedido.numero_pedido}.pdf`);
    toast.success('PDF do romaneio gerado com sucesso!');
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Romaneio de Entrega - Pedido #{pedido.numero_pedido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Dados de Entrega</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Cliente:</strong> {pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome || '-'}</p>
                {pedido.cliente?.endereco && (
                  <p><strong>Endereço:</strong> {pedido.cliente.endereco}{pedido.cliente.cidade ? `, ${pedido.cliente.cidade}` : ''}</p>
                )}
                {pedido.cliente?.telefone && (
                  <p><strong>Telefone:</strong> {pedido.cliente.telefone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Itens */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Itens para Conferência
            </h4>

            {loading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : itens.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum item separado encontrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Produção</TableHead>
                    <TableHead>Validade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.is_ovo && <Egg className="w-4 h-4 text-warning" />}
                          {item.produto_nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantidade} {item.unidade}
                      </TableCell>
                      <TableCell>
                        {item.lote_interno ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.lote_interno}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.data_producao 
                          ? format(new Date(item.data_producao), 'dd/MM/yy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {item.data_validade 
                          ? format(new Date(item.data_validade), 'dd/MM/yy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={gerarPDF} disabled={loading || itens.length === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
