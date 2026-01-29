import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  AlertTriangle,
  CheckCircle2,
  User,
  CreditCard
} from 'lucide-react';
import { useCarrinhoVendas } from '@/hooks/useCarrinhoVendas';
import { ClienteFornecedor } from '@/hooks/useFornecedorData';
import { FinalizarPedidoDialog } from './FinalizarPedidoDialog';

interface CarrinhoDrawerProps {
  open: boolean;
  onClose: () => void;
  clientes: ClienteFornecedor[];
}

export const CarrinhoDrawer = ({
  open,
  onClose,
  clientes
}: CarrinhoDrawerProps) => {
  const {
    itens,
    clienteSelecionado,
    removeItem,
    updateQuantidade,
    setCliente,
    limpar,
    subtotal,
    total,
    validarCredito
  } = useCarrinhoVendas();

  const [showFinalizar, setShowFinalizar] = useState(false);

  const validacao = validarCredito();

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setCliente(cliente || null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrinho
              {itens.length > 0 && (
                <Badge variant="secondary">{itens.length} itens</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Seleção de Cliente */}
            <div className="space-y-3 py-4 border-b">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Cliente
              </div>
              
              <Select
                value={clienteSelecionado?.id || ''}
                onValueChange={handleSelectCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex flex-col">
                        <span>{c.razao_social_nome}</span>
                        <span className="text-xs text-muted-foreground">{c.cpf_cnpj}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Info de Crédito */}
              {clienteSelecionado && (
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Limite:
                    </span>
                    <span className="font-medium">
                      R$ {(clienteSelecionado.limite_credito || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo Disponível:</span>
                    <span className={`font-medium ${
                      (clienteSelecionado.saldo_credito || 0) < total 
                        ? 'text-destructive' 
                        : 'text-primary'
                    }`}>
                      R$ {(clienteSelecionado.saldo_credito || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {validacao.valido ? (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Crédito suficiente
                    </div>
                  ) : total > 0 && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {validacao.mensagem}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lista de Itens */}
            <ScrollArea className="flex-1 py-4">
              {itens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Package className="h-12 w-12 mb-2" />
                  <p>Carrinho vazio</p>
                  <p className="text-xs">Adicione produtos para continuar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {itens.map(item => (
                    <div
                      key={item.produto.id}
                      className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      {/* Imagem */}
                      <div className="w-16 h-16 rounded bg-background flex-shrink-0 overflow-hidden">
                        {item.produto.imagem_url ? (
                          <img
                            src={item.produto.imagem_url}
                            alt={item.produto.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.produto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {(item.precoPromocional || item.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {' '}por {item.produto.unidade_venda}
                        </p>
                        
                        {/* Quantidade */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantidade(item.produto.id, item.quantidade - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => updateQuantidade(
                              item.produto.id,
                              parseInt(e.target.value) || 1
                            )}
                            className="h-6 w-12 text-center text-xs p-0"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantidade(item.produto.id, item.quantidade + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeItem(item.produto.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Total do item */}
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          R$ {((item.precoPromocional || item.precoUnitario) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Totais */}
            {itens.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              size="lg"
              disabled={itens.length === 0 || !clienteSelecionado || !validacao.valido}
              onClick={() => setShowFinalizar(true)}
            >
              Finalizar Pedido
            </Button>
            
            {itens.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={limpar}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Carrinho
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FinalizarPedidoDialog
        open={showFinalizar}
        onClose={() => setShowFinalizar(false)}
        onSuccess={() => {
          setShowFinalizar(false);
          onClose();
        }}
      />
    </>
  );
};
