import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Star } from "lucide-react";

interface FornecedorVinculado {
  id: string;
  parceiro_id: string;
  codigo_produto_fornecedor: string | null;
  preco_compra: number | null;
  prazo_entrega_dias: number | null;
  quantidade_minima: number | null;
  fornecedor_principal: boolean | null;
  parceiro: {
    razao_social_nome: string;
    nome_fantasia: string | null;
    cpf_cnpj: string;
    telefone: string | null;
    celular: string | null;
  };
}

interface FornecedoresVinculadosDialogProps {
  produto: { id: string; nome: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FornecedoresVinculadosDialog({
  produto,
  open,
  onOpenChange,
}: FornecedoresVinculadosDialogProps) {
  const [fornecedores, setFornecedores] = useState<FornecedorVinculado[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && produto) {
      fetchFornecedores();
    }
  }, [open, produto]);

  const fetchFornecedores = async () => {
    if (!produto) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("produto_fornecedor")
      .select(`
        id,
        parceiro_id,
        codigo_produto_fornecedor,
        preco_compra,
        prazo_entrega_dias,
        quantidade_minima,
        fornecedor_principal,
        parceiros:parceiro_id (
          razao_social_nome,
          nome_fantasia,
          cpf_cnpj,
          telefone,
          celular
        )
      `)
      .eq("produto_id", produto.id)
      .eq("ativo", true);

    if (data) {
      const mapped = data.map((item: any) => ({
        ...item,
        parceiro: item.parceiros,
      }));
      setFornecedores(mapped);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Fornecedores - {produto?.nome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : fornecedores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum fornecedor vinculado a este produto</p>
            <p className="text-sm mt-2">
              Vincule fornecedores através do menu Configurações → Fornecedores e Clientes
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Código Fornecedor</TableHead>
                <TableHead>Preço Compra</TableHead>
                <TableHead>Prazo Entrega</TableHead>
                <TableHead>Qtd. Mínima</TableHead>
                <TableHead>Contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {f.fornecedor_principal && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium">
                          {f.parceiro.nome_fantasia || f.parceiro.razao_social_nome}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {f.parceiro.cpf_cnpj}
                        </div>
                      </div>
                      {f.fornecedor_principal && (
                        <Badge variant="outline" className="text-xs">Principal</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {f.codigo_produto_fornecedor || "-"}
                  </TableCell>
                  <TableCell>
                    {f.preco_compra ? `R$ ${Number(f.preco_compra).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    {f.prazo_entrega_dias ? `${f.prazo_entrega_dias} dias` : "-"}
                  </TableCell>
                  <TableCell>
                    {f.quantidade_minima || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.parceiro.celular || f.parceiro.telefone || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
