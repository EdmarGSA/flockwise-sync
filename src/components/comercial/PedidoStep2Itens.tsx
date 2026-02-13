import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, AlertTriangle, Package, Bird, Egg } from 'lucide-react';
import { toast } from 'sonner';
import LotesVendaSection from './LotesVendaSection';
import OvosVendaSection, { OvoVendaItem } from './OvosVendaSection';

interface PedidoStep2ItensProps {
  integradoId: string;
  produtos: any[];
  tabelaItens: any[];
  itens: any[];
  setItens: (itens: any[]) => void;
  itensOvos: OvoVendaItem[];
  setItensOvos: (itens: OvoVendaItem[]) => void;
  novoItem: { produto_id: string; quantidade: number; preco_unitario: number };
  setNovoItem: (item: any) => void;
  margemMinima: number;
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  handleAddItem: () => void;
  handleAddLoteItem: (item: any) => void;
  handleAddOvoItem: (item: OvoVendaItem) => void;
  handleRemoveItem: (index: number) => void;
  handleUpdateItemPrice: (index: number, price: number) => void;
  calcularTotais: () => { subtotal: number; desconto: number; frete: number; total: number };
}

export default function PedidoStep2Itens({
  integradoId, produtos, tabelaItens, itens, setItens,
  itensOvos, setItensOvos, novoItem, setNovoItem,
  margemMinima, formData, setFormData,
  handleAddItem, handleAddLoteItem, handleAddOvoItem,
  handleRemoveItem, handleUpdateItemPrice, calcularTotais
}: PedidoStep2ItensProps) {
  const totais = calcularTotais();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && novoItem.produto_id && novoItem.quantidade > 0) {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="produtos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="produtos" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="aves" className="flex items-center gap-2">
            <Bird className="w-4 h-4" />
            <span className="hidden sm:inline">Aves Vivas</span>
          </TabsTrigger>
          <TabsTrigger value="ovos" className="flex items-center gap-2">
            <Egg className="w-4 h-4" />
            <span className="hidden sm:inline">Ovos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                  <Label>Produto</Label>
                  <Select
                    value={novoItem.produto_id}
                    onValueChange={(v) => {
                      const produto = produtos.find((p: any) => p.id === v);
                      const tabelaItem = tabelaItens.find((ti: any) => ti.produto_id === v);
                      const preco = tabelaItem?.preco_unitario || produto?.preco_venda || 0;
                      setNovoItem({ ...novoItem, produto_id: v, preco_unitario: preco });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((produto: any) => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.nome} (Est: {produto.estoque_atual} {produto.unidade_medida})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseFloat(e.target.value) || 0 })}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço Unit.</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={novoItem.preco_unitario}
                      onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })}
                      onKeyDown={handleKeyDown}
                    />
                    <Button onClick={handleAddItem} size="icon" className="shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aves" className="mt-4">
          <LotesVendaSection integradoId={integradoId} onAddItem={handleAddLoteItem} />
        </TabsContent>

        <TabsContent value="ovos" className="mt-4">
          <OvosVendaSection integradoId={integradoId} margemMinima={margemMinima} onAddItem={handleAddOvoItem} />
        </TabsContent>
      </Tabs>

      {/* Items Table */}
      {itens.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.is_ave_viva && <Bird className="w-4 h-4 text-primary" />}
                          {item.is_ovo && <Egg className="w-4 h-4 text-amber-600" />}
                          <span className="truncate max-w-[200px]">{item.produto_nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {item.quantidade} {item.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.is_ave_viva || item.is_ovo ? (
                          <span>R$ {item.preco_unitario.toFixed(2)}</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) => handleUpdateItemPrice(index, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        R$ {item.valor_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.is_ave_viva ? (
                          <Badge variant="secondary">Ave</Badge>
                        ) : item.is_ovo ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">Ovo</Badge>
                        ) : (
                          <Badge variant={item.margem_calculada < margemMinima ? 'destructive' : 'default'}>
                            {item.custo_medio > 0 ? `${item.margem_calculada.toFixed(1)}%` : '-'}
                            {item.margem_calculada < margemMinima && item.custo_medio > 0 && <AlertTriangle className="w-3 h-3 ml-1" />}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky Totalizer */}
      <div className="sticky bottom-0 z-10 bg-background border-t border-border pt-3 pb-1">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desconto (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.desconto}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Frete (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.valor_frete}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, valor_frete: parseFloat(e.target.value) || 0 }))}
              className="h-9"
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-medium">R$ {totais.subtotal.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Desconto</p>
            <p className="font-medium text-destructive">- R$ {totais.desconto.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">R$ {totais.total.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
