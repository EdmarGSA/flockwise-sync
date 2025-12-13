import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Truck, Calendar, CreditCard, Package, ArrowRight, Printer, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface OrdemCompraViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemId: string;
}

interface OrdemCompra {
  id: string;
  numero_oc: number;
  data_emissao: string;
  data_prevista_entrega: string | null;
  status: string;
  forma_pagamento: string | null;
  prazo_pagamento_dias: number | null;
  data_vencimento: string | null;
  valor_total: number;
  valor_frete: number | null;
  tipo_frete: string | null;
  desconto: number | null;
  observacoes: string | null;
  parceiros: {
    razao_social_nome: string;
    cpf_cnpj: string;
    telefone: string | null;
    celular: string | null;
  };
  itens: {
    id: string;
    quantidade: number;
    unidade_medida: string;
    unidade_compra: string | null;
    fator_conversao: number | null;
    preco_unitario: number;
    preco_total: number;
    quantidade_recebida: number | null;
    produtos: {
      nome: string;
      sku: string;
      unidade_medida: string;
    };
  }[];
}

export default function OrdemCompraViewDialog({
  open,
  onOpenChange,
  ordemId
}: OrdemCompraViewDialogProps) {
  const [ordem, setOrdem] = useState<OrdemCompra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && ordemId) {
      fetchOrdem();
    }
  }, [open, ordemId]);

  const fetchOrdem = async () => {
    setLoading(true);
    try {
      const { data: ordemData, error: ordemError } = await supabase
        .from('ordens_compra')
        .select(`
          id,
          numero_oc,
          data_emissao,
          data_prevista_entrega,
          status,
          forma_pagamento,
          prazo_pagamento_dias,
          data_vencimento,
          valor_total,
          valor_frete,
          tipo_frete,
          desconto,
          observacoes,
          parceiros!inner(razao_social_nome, cpf_cnpj, telefone, celular)
        `)
        .eq('id', ordemId)
        .single();

      if (ordemError) throw ordemError;

      const { data: itensData, error: itensError } = await supabase
        .from('ordens_compra_itens')
        .select(`
          id,
          quantidade,
          unidade_medida,
          unidade_compra,
          fator_conversao,
          preco_unitario,
          preco_total,
          quantidade_recebida,
          produtos!inner(nome, sku, unidade_medida)
        `)
        .eq('ordem_compra_id', ordemId);

      if (itensError) throw itensError;

      setOrdem({
        ...ordemData,
        itens: itensData || []
      } as OrdemCompra);
    } catch (error) {
      console.error('Erro ao buscar ordem:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      pendente: { label: 'Pendente', variant: 'outline' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      parcial_recebida: { label: 'Parcial', variant: 'outline' },
      recebida: { label: 'Recebida', variant: 'default' },
      cancelada: { label: 'Cancelada', variant: 'destructive' }
    };
    const { label, variant } = config[status] || { label: status, variant: 'secondary' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const subtotal = ordem?.itens.reduce((sum, item) => sum + item.preco_total, 0) || 0;

  const generatePDF = () => {
    if (!ordem) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`ORDEM DE COMPRA #${ordem.numero_oc}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // Supplier info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fornecedor: ${ordem.parceiros.razao_social_nome}`, 14, y);
    y += 6;
    doc.text(`CNPJ/CPF: ${ordem.parceiros.cpf_cnpj}`, 14, y);
    y += 10;
    
    // Order details
    doc.setFontSize(10);
    const dataEmissao = format(new Date(ordem.data_emissao), 'dd/MM/yyyy');
    const dataEntrega = ordem.data_prevista_entrega 
      ? format(new Date(ordem.data_prevista_entrega), 'dd/MM/yyyy') 
      : '-';
    const tipoFrete = ordem.tipo_frete === 'cif' ? 'CIF (Frete Incluso)' : 'FOB (Frete por Conta)';
    
    doc.text(`Data Emissão: ${dataEmissao}`, 14, y);
    doc.text(`Previsão Entrega: ${dataEntrega}`, 100, y);
    y += 6;
    doc.text(`Forma Pagamento: ${ordem.forma_pagamento || '-'}`, 14, y);
    doc.text(`Tipo Frete: ${tipoFrete}`, 100, y);
    y += 12;
    
    // Items table header
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    doc.text('Produto', 16, y);
    doc.text('Qtd', 100, y);
    doc.text('Un', 120, y);
    doc.text('Preço Unit.', 140, y);
    doc.text('Total', 175, y);
    y += 8;
    
    // Items
    doc.setFont('helvetica', 'normal');
    ordem.itens.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.produtos.nome.substring(0, 40), 16, y);
      doc.text(item.quantidade.toString(), 100, y);
      doc.text(item.unidade_compra || item.unidade_medida, 120, y);
      doc.text(`R$ ${item.preco_unitario.toFixed(2)}`, 140, y);
      doc.text(`R$ ${item.preco_total.toFixed(2)}`, 175, y);
      y += 6;
    });
    
    // Totals
    y += 8;
    doc.line(14, y - 4, pageWidth - 14, y - 4);
    doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, 140, y);
    y += 6;
    doc.text(`Frete (${ordem.tipo_frete?.toUpperCase() || 'CIF'}): R$ ${(ordem.valor_frete || 0).toFixed(2)}`, 140, y);
    y += 6;
    doc.text(`Desconto: R$ ${(ordem.desconto || 0).toFixed(2)}`, 140, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: R$ ${ordem.valor_total.toFixed(2)}`, 140, y);
    
    // Observations
    if (ordem.observacoes) {
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Observações: ${ordem.observacoes}`, 14, y, { maxWidth: pageWidth - 28 });
    }
    
    // Save
    doc.save(`OC_${ordem.numero_oc}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const sendWhatsApp = () => {
    if (!ordem) return;
    
    const telefone = ordem.parceiros.celular || ordem.parceiros.telefone;
    if (!telefone) {
      toast.error('Fornecedor não possui telefone cadastrado');
      return;
    }
    
    // Clean phone number
    const phoneClean = telefone.replace(/\D/g, '');
    const phoneWithCountry = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;
    
    // Build message
    const dataEntrega = ordem.data_prevista_entrega 
      ? format(new Date(ordem.data_prevista_entrega), 'dd/MM/yyyy') 
      : '-';
    const tipoFrete = ordem.tipo_frete === 'cif' ? 'CIF' : 'FOB';
    
    let message = `*ORDEM DE COMPRA #${ordem.numero_oc}*\n\n`;
    message += `📅 Data: ${format(new Date(ordem.data_emissao), 'dd/MM/yyyy')}\n`;
    message += `🚚 Entrega: ${dataEntrega}\n`;
    message += `📦 Frete: ${tipoFrete}\n\n`;
    message += `*ITENS:*\n`;
    
    ordem.itens.forEach((item, idx) => {
      message += `${idx + 1}. ${item.produtos.nome}\n`;
      message += `   ${item.quantidade} ${item.unidade_compra || item.unidade_medida} x R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.preco_total.toFixed(2)}\n`;
    });
    
    message += `\n*TOTAL: R$ ${ordem.valor_total.toFixed(2)}*\n`;
    
    if (ordem.observacoes) {
      message += `\n📝 ${ordem.observacoes}`;
    }
    
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : !ordem ? (
          <div className="py-8 text-center text-muted-foreground">Ordem não encontrada</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Ordem de Compra #{ordem.numero_oc}
              </DialogTitle>
              <DialogDescription>
                Detalhes da ordem de compra
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={generatePDF}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir PDF
                </Button>
                <Button variant="outline" size="sm" onClick={sendWhatsApp} className="text-green-600 hover:text-green-700">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Truck className="w-4 h-4" />
                    Fornecedor
                  </div>
                  <p className="font-medium">{ordem.parceiros.razao_social_nome}</p>
                  <p className="text-xs text-muted-foreground">{ordem.parceiros.cpf_cnpj}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Previsão Entrega
                  </div>
                  <p className="font-medium">
                    {ordem.data_prevista_entrega 
                      ? format(new Date(ordem.data_prevista_entrega), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Truck className="w-4 h-4" />
                    Tipo Frete
                  </div>
                  <p className="font-medium">
                    {ordem.tipo_frete === 'cif' ? 'CIF (Incluso)' : 'FOB'}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-sm mb-1">Status</div>
                  {getStatusBadge(ordem.status)}
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Data Emissão
                  </div>
                  <p className="font-medium">
                    {format(new Date(ordem.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <CreditCard className="w-4 h-4" />
                    Vencimento
                  </div>
                  <p className="font-medium">
                    {ordem.data_vencimento 
                      ? format(new Date(ordem.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">{ordem.forma_pagamento}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Itens ({ordem.itens.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qtd. Compra</TableHead>
                        <TableHead className="text-right">Qtd. Estoque</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordem.itens.map((item) => {
                        const unidadeCompra = item.unidade_compra || item.unidade_medida;
                        const fatorConversao = item.fator_conversao || 1;
                        const qtdEstoque = item.quantidade * fatorConversao;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.produtos.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{item.produtos.sku}</TableCell>
                            <TableCell className="text-right">
                              {item.quantidade} {unidadeCompra}
                            </TableCell>
                            <TableCell className="text-right">
                              {fatorConversao > 1 ? (
                                <div className="flex items-center justify-end gap-1">
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-green-600">{qtdEstoque}</span>
                                  <span className="text-muted-foreground">{item.produtos.unidade_medida}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {item.preco_unitario.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {item.preco_total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete ({ordem.tipo_frete?.toUpperCase() || 'CIF'}):</span>
                    <span>R$ {(ordem.valor_frete || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span>- R$ {(ordem.desconto || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total:</span>
                    <span className="text-primary">R$ {ordem.valor_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {ordem.observacoes && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm">{ordem.observacoes}</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
