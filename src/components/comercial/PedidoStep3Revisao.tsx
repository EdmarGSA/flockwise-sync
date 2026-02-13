import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Calendar, Package, Bird, Egg } from 'lucide-react';

interface PedidoStep3RevisaoProps {
  formData: any;
  clientes: any[];
  itens: any[];
  calcularTotais: () => { subtotal: number; desconto: number; frete: number; total: number };
  formasPagamento: any[];
  selectedFormaId: string;
  prazosPagamento: any[];
  selectedPrazoId: string;
}

export default function PedidoStep3Revisao({
  formData, clientes, itens, calcularTotais,
  formasPagamento, selectedFormaId,
  prazosPagamento, selectedPrazoId
}: PedidoStep3RevisaoProps) {
  const totais = calcularTotais();
  const cliente = clientes.find((c: any) => c.id === formData.cliente_id);
  const forma = formasPagamento.find((f: any) => f.id === selectedFormaId);
  const prazo = prazosPagamento.find((p: any) => p.id === selectedPrazoId);

  return (
    <div className="space-y-5">
      {/* Client Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Nome</p>
            <p className="font-medium">{cliente?.nome_fantasia || cliente?.razao_social_nome || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pagamento</p>
            <p className="font-medium">{forma?.nome || '-'} {prazo ? `• ${prazo.nome}` : ''}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entrega Prevista</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formData.data_entrega_prevista || 'Não informada'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Items Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Itens ({itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {itens.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {item.is_ave_viva && <Bird className="w-4 h-4 text-primary shrink-0" />}
                  {item.is_ovo && <Egg className="w-4 h-4 text-amber-600 shrink-0" />}
                  <span className="truncate">{item.produto_nome}</span>
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0">
                  <span className="text-muted-foreground">{item.quantidade} {item.unidade_medida}</span>
                  <span className="font-medium">R$ {item.valor_total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {totais.subtotal.toFixed(2)}</span>
            </div>
            {totais.desconto > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto</span>
                <span>- R$ {totais.desconto.toFixed(2)}</span>
              </div>
            )}
            {totais.frete > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span>+ R$ {totais.frete.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {totais.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {formData.observacoes && (
        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Observações</p>
          <p className="bg-muted p-3 rounded-md">{formData.observacoes}</p>
        </div>
      )}
    </div>
  );
}
