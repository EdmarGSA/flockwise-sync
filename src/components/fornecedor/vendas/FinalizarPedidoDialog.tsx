import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCarrinhoVendas } from '@/hooks/useCarrinhoVendas';
import { useVendedorFornecedor } from '@/hooks/useVendedorFornecedor';

interface FinalizarPedidoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CONDICOES_PAGAMENTO = [
  { value: 'a_vista', label: 'À Vista' },
  { value: '7_dias', label: '7 Dias' },
  { value: '14_dias', label: '14 Dias' },
  { value: '21_dias', label: '21 Dias' },
  { value: '28_dias', label: '28 Dias' },
  { value: '30_dias', label: '30 Dias' },
];

export const FinalizarPedidoDialog = ({
  open,
  onClose,
  onSuccess
}: FinalizarPedidoDialogProps) => {
  const { itens, clienteSelecionado, total, limpar } = useCarrinhoVendas();
  const { vendedor, fornecedorGlobalId } = useVendedorFornecedor();
  
  const [loading, setLoading] = useState(false);
  const [condicaoPagamento, setCondicaoPagamento] = useState('a_vista');
  const [dataEntrega, setDataEntrega] = useState<Date>(addDays(new Date(), 3));
  const [observacoes, setObservacoes] = useState('');
  const [pedidoCriado, setPedidoCriado] = useState<string | null>(null);

  const gerarNumeroPedido = () => {
    const ano = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PED-${ano}-${random}`;
  };

  const handleFinalizar = async () => {
    if (!clienteSelecionado || !fornecedorGlobalId || itens.length === 0) {
      toast.error('Dados incompletos');
      return;
    }

    setLoading(true);

    try {
      const numeroPedido = gerarNumeroPedido();
      const valorBruto = total;

      // Criar pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos_catalogo_fornecedor')
        .insert({
          fornecedor_global_id: fornecedorGlobalId,
          cliente_fornecedor_id: clienteSelecionado.id,
          vendedor_fornecedor_id: vendedor?.id || null,
          numero_pedido: numeroPedido,
          valor_bruto: valorBruto,
          valor_total: total,
          condicao_pagamento: condicaoPagamento,
          data_entrega_prevista: format(dataEntrega, 'yyyy-MM-dd'),
          status: 'pendente',
          observacoes: observacoes || null,
        })
        .select('id, numero_pedido')
        .single();

      if (pedidoError) throw pedidoError;

      // Criar itens
      const itensInsert = itens.map(item => ({
        pedido_id: pedido.id,
        produto_catalogo_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.precoPromocional || item.precoUnitario,
        valor_total: (item.precoPromocional || item.precoUnitario) * item.quantidade,
      }));

      const { error: itensError } = await supabase
        .from('pedidos_catalogo_fornecedor_itens')
        .insert(itensInsert);

      if (itensError) throw itensError;

      // Atualizar saldo do cliente
      const novoSaldo = (clienteSelecionado.saldo_credito || 0) - total;
      await supabase
        .from('clientes_fornecedor')
        .update({ saldo_credito: novoSaldo })
        .eq('id', clienteSelecionado.id);

      setPedidoCriado(pedido.numero_pedido);
      limpar();
      toast.success('Pedido criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pedidoCriado) {
      setPedidoCriado(null);
      onSuccess();
    } else {
      onClose();
    }
  };

  if (pedidoCriado) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Pedido Criado!</h2>
            <p className="text-muted-foreground text-center">
              O pedido <span className="font-mono font-bold">{pedidoCriado}</span> foi criado com sucesso.
            </p>
            <Button onClick={handleClose} className="mt-4">
              Continuar Vendendo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Finalizar Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo do Cliente */}
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-medium">{clienteSelecionado?.razao_social_nome}</p>
            <p className="text-sm text-muted-foreground">{clienteSelecionado?.cpf_cnpj}</p>
          </div>

          {/* Resumo dos Itens */}
          <div>
            <p className="text-sm font-medium mb-2">Itens ({itens.length})</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {itens.map(item => (
                <div key={item.produto.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">
                    {item.quantidade}x {item.produto.nome}
                  </span>
                  <span className="ml-2">
                    R$ {((item.precoPromocional || item.precoUnitario) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Condição de Pagamento */}
          <div className="space-y-2">
            <Label>Condição de Pagamento</Label>
            <Select value={condicaoPagamento} onValueChange={setCondicaoPagamento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDICOES_PAGAMENTO.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Entrega */}
          <div className="space-y-2">
            <Label>Data de Entrega Prevista</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataEntrega, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataEntrega}
                  onSelect={(d) => d && setDataEntrega(d)}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Instruções especiais de entrega, etc."
              rows={3}
            />
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between text-lg font-bold">
            <span>Total do Pedido:</span>
            <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleFinalizar} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Confirmar Pedido'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
