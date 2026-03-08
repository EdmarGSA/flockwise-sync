import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Plus, Trash2, FlaskConical } from "lucide-react";

interface FormulacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: any;
  integradoId: string;
  gruposProduto: any[];
  produtos: any[];
}

interface ItemFormulacao {
  id?: string;
  insumo_id: string;
  insumo_nome: string;
  quantidade: number;
  unidade_medida: string;
  grupo_nome?: string;
  custo_unitario: number;
}

const FormulacaoDialog = ({ 
  open, 
  onOpenChange, 
  produto, 
  integradoId, 
  gruposProduto, 
  produtos 
}: FormulacaoDialogProps) => {
  const [itens, setItens] = useState<ItemFormulacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [selectedInsumo, setSelectedInsumo] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("");
  const [unidadeMedida, setUnidadeMedida] = useState<string>("KG");

  const produtosFiltrados = selectedGrupo 
    ? produtos.filter(p => p.grupo_produto_id === selectedGrupo && p.id !== produto?.id)
    : produtos.filter(p => p.id !== produto?.id);

  useEffect(() => {
    if (open && produto?.id) {
      fetchFormulacao();
    }
  }, [open, produto?.id]);

  const fetchFormulacao = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('produto_formulacao')
      .select('*, insumo:produtos!produto_formulacao_insumo_id_fkey(id, nome, unidade_medida, grupo_produto_id, custo_unitario)')
      .eq('produto_id', produto.id);

    if (data) {
      const mappedItens = data.map((item: any) => ({
        id: item.id,
        insumo_id: item.insumo_id,
        insumo_nome: item.insumo?.nome || 'Produto não encontrado',
        quantidade: Number(item.quantidade),
        unidade_medida: item.unidade_medida,
        grupo_nome: gruposProduto.find(g => g.id === item.insumo?.grupo_produto_id)?.nome,
        custo_unitario: Number(item.insumo?.custo_unitario || 0),
      }));
      setItens(mappedItens);
    }
    setLoading(false);
  };

  const handleAddItem = () => {
    if (!selectedInsumo || !quantidade) {
      toast.error("Preencha todos os campos");
      return;
    }

    const insumo = produtos.find(p => p.id === selectedInsumo);
    if (!insumo) return;

    const novoItem: ItemFormulacao = {
      insumo_id: selectedInsumo,
      insumo_nome: insumo.nome,
      quantidade: Number(quantidade),
      unidade_medida: unidadeMedida,
      grupo_nome: gruposProduto.find(g => g.id === insumo.grupo_produto_id)?.nome,
      custo_unitario: Number(insumo.custo_unitario || 0),
    };

    setItens([...itens, novoItem]);
    setSelectedInsumo("");
    setQuantidade("");
  };

  const handleRemoveItem = (index: number) => {
    const newItens = [...itens];
    newItens.splice(index, 1);
    setItens(newItens);
  };

  const handleSave = async () => {
    setLoading(true);

    // Delete existing formulacao
    await supabase
      .from('produto_formulacao')
      .delete()
      .eq('produto_id', produto.id);

    // Insert new items
    if (itens.length > 0) {
      const inserts = itens.map(item => ({
        produto_id: produto.id,
        insumo_id: item.insumo_id,
        quantidade: item.quantidade,
        unidade_medida: item.unidade_medida,
        integrado_id: integradoId,
      }));

      const { error } = await supabase
        .from('produto_formulacao')
        .insert(inserts as any);

      if (error) {
        toast({ title: "Erro ao salvar formulação", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    toast({ title: "Formulação salva com sucesso!" });
    setLoading(false);
    onOpenChange(false);
  };

  const totalQuantidade = itens.reduce((acc, item) => acc + item.quantidade, 0);
  const totalCusto = itens.reduce((acc, item) => acc + (item.quantidade * item.custo_unitario), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Formulação - {produto?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Item Form */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium">Adicionar Insumo</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Filtrar por Grupo</Label>
                <Select value={selectedGrupo || "all"} onValueChange={(val) => setSelectedGrupo(val === "all" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {gruposProduto.map(grupo => (
                      <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Insumo *</Label>
                <Select value={selectedInsumo} onValueChange={setSelectedInsumo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtosFiltrados.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  placeholder="0.000"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={handleAddItem} className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {itens.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="secondary">{item.grupo_nome || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.insumo_nome}</TableCell>
                    <TableCell className="text-right">{item.quantidade.toFixed(3)}</TableCell>
                    <TableCell>{item.unidade_medida}</TableCell>
                    <TableCell className="text-right">
                      R$ {item.custo_unitario.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {(item.quantidade * item.custo_unitario).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{totalQuantidade.toFixed(3)}</TableCell>
                  <TableCell>KG</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-primary">
                    R$ {totalCusto.toFixed(2)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum insumo adicionado à formulação
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Formulação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormulacaoDialog;
