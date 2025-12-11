import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import KardexForm from "./KardexForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KardexViewProps {
  integradoId: string;
  produtos: any[];
  produtoId?: string;
}

const KardexView = ({ integradoId, produtos, produtoId }: KardexViewProps) => {
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduto, setSelectedProduto] = useState<string>(produtoId || "");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (selectedProduto || produtoId) {
      fetchMovimentos();
    } else {
      setMovimentos([]);
      setLoading(false);
    }
  }, [selectedProduto, produtoId]);

  const fetchMovimentos = async () => {
    setLoading(true);
    const prodId = produtoId || selectedProduto;
    
    const { data, error } = await supabase
      .from('kardex')
      .select('*, produtos(nome, sku)')
      .eq('produto_id', prodId)
      .order('created_at', { ascending: false });

    if (data) setMovimentos(data);
    setLoading(false);
  };

  const handleSuccess = () => {
    setShowForm(false);
    fetchMovimentos();
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'default';
      case 'saida': return 'destructive';
      case 'ajuste': return 'secondary';
      default: return 'outline';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'ajuste': return 'Ajuste';
      default: return tipo;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Movimentações (Kardex)</CardTitle>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!selectedProduto && !produtoId}>
              <Plus className="w-4 h-4" /> Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <KardexForm 
              integradoId={integradoId}
              produtoId={produtoId || selectedProduto}
              produtos={produtos}
              onSuccess={handleSuccess}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!produtoId && (
          <div className="mb-4">
            <Select value={selectedProduto} onValueChange={setSelectedProduto}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((produto) => (
                  <SelectItem key={produto.id} value={produto.id}>
                    {produto.sku} - {produto.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !selectedProduto && !produtoId ? (
          <p className="text-center text-muted-foreground py-8">Selecione um produto para ver as movimentações</p>
        ) : movimentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Saldo Anterior</TableHead>
                <TableHead>Saldo Atual</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentos.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>
                    {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTipoColor(mov.tipo_movimento)}>
                      {getTipoLabel(mov.tipo_movimento)}
                    </Badge>
                  </TableCell>
                  <TableCell className={mov.tipo_movimento === 'entrada' ? 'text-green-600' : mov.tipo_movimento === 'saida' ? 'text-red-600' : ''}>
                    {mov.tipo_movimento === 'entrada' ? '+' : mov.tipo_movimento === 'saida' ? '-' : ''}
                    {Number(mov.quantidade).toFixed(3)}
                  </TableCell>
                  <TableCell>{Number(mov.saldo_anterior).toFixed(3)}</TableCell>
                  <TableCell className="font-bold">{Number(mov.saldo_atual).toFixed(3)}</TableCell>
                  <TableCell>{mov.custo_unitario ? `R$ ${Number(mov.custo_unitario).toFixed(4)}` : '-'}</TableCell>
                  <TableCell>{mov.documento_ref || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{mov.observacao || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default KardexView;
