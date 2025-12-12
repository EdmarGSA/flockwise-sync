import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  categoria_id: z.string().optional(),
  grupo_produto_id: z.string().optional(),
  grupo_animal_id: z.string().optional(),
  fase_animal_id: z.string().optional(),
  marca: z.string().optional(),
  ativo: z.boolean().default(true),
  unidade_medida: z.string().default("UN"),
  codigo_barras_ean: z.string().optional(),
  estoque_atual: z.coerce.number().default(0),
  estoque_minimo: z.coerce.number().default(0),
  localizacao_estoque: z.string().optional(),
  custo_unitario: z.coerce.number().default(0),
  custo_medio: z.coerce.number().default(0),
  preco_venda: z.coerce.number().default(0),
  ncm: z.string().optional(),
  cest: z.string().optional(),
  origem_mercadoria: z.string().default("0"),
  embalagem_tipo: z.string().optional(),
  embalagem_primaria: z.string().optional(),
  embalagem_secundaria: z.string().optional(),
});

interface ProdutoFormProps {
  integradoId: string;
  userId: string;
  categorias: any[];
  gruposProduto: any[];
  gruposAnimal: any[];
  fasesAnimal: any[];
  onSuccess: () => void;
}

const unidadesMedida = ["UN", "KG", "G", "L", "ML", "M", "CM", "M2", "M3", "CX", "PCT", "SC", "FD", "TON"];
const origensOptions = [
  { value: "0", label: "0 - Nacional" },
  { value: "1", label: "1 - Estrangeira - Importação Direta" },
  { value: "2", label: "2 - Estrangeira - Mercado Interno" },
  { value: "3", label: "3 - Nacional com Conteúdo de Importação 40-70%" },
  { value: "4", label: "4 - Nacional - PPB" },
  { value: "5", label: "5 - Nacional com Conteúdo de Importação < 40%" },
  { value: "6", label: "6 - Estrangeira - Importação Direta s/ Similar Nacional" },
  { value: "7", label: "7 - Estrangeira - Mercado Interno s/ Similar Nacional" },
  { value: "8", label: "8 - Nacional com Conteúdo de Importação > 70%" },
];

const ProdutoForm = ({ integradoId, userId, categorias, gruposProduto, gruposAnimal, fasesAnimal, onSuccess }: ProdutoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [fasesDisponiveis, setFasesDisponiveis] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      nome: "",
      descricao: "",
      categoria_id: "",
      grupo_produto_id: "",
      grupo_animal_id: "",
      fase_animal_id: "",
      marca: "",
      ativo: true,
      unidade_medida: "UN",
      codigo_barras_ean: "",
      estoque_atual: 0,
      estoque_minimo: 0,
      localizacao_estoque: "",
      custo_unitario: 0,
      custo_medio: 0,
      preco_venda: 0,
      ncm: "",
      cest: "",
      origem_mercadoria: "0",
      embalagem_tipo: "",
      embalagem_primaria: "",
      embalagem_secundaria: "",
    },
  });

  const selectedGrupoAnimal = form.watch("grupo_animal_id");

  useEffect(() => {
    if (selectedGrupoAnimal) {
      const fases = fasesAnimal.filter(f => f.grupo_id === selectedGrupoAnimal);
      setFasesDisponiveis(fases);
    } else {
      setFasesDisponiveis([]);
    }
    form.setValue("fase_animal_id", "");
  }, [selectedGrupoAnimal, fasesAnimal]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    const { error } = await supabase.from('produtos').insert({
      ...values,
      categoria_id: values.categoria_id || null,
      grupo_produto_id: values.grupo_produto_id || null,
      grupo_animal_id: values.grupo_animal_id || null,
      fase_animal_id: values.fase_animal_id || null,
      integrado_id: integradoId,
      criado_por: userId,
    } as any);

    setLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🆔 Identificação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU *</FormLabel>
                  <FormControl>
                    <Input placeholder="SKU001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grupo_produto_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo de Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gruposProduto.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grupo_animal_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo de Animal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gruposAnimal.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fase_animal_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fase do Animal</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                    disabled={!selectedGrupoAnimal}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedGrupoAnimal ? "Selecione" : "Selecione um grupo primeiro"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fasesDisponiveis.map((fase) => (
                        <SelectItem key={fase.id} value={fase.id}>
                          {fase.nome} ({fase.dia_inicio}-{fase.dia_fim} dias)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Marca" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unidade_medida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade de Medida</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unidadesMedida.map((un) => (
                        <SelectItem key={un} value={un}>{un}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo_barras_ean"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Barras (EAN)</FormLabel>
                  <FormControl>
                    <Input placeholder="7891234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 pt-6">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Ativo</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Inventário */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📦 Inventário e Logística
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="estoque_atual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque Atual</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estoque_minimo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque Mínimo</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="localizacao_estoque"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização</FormLabel>
                  <FormControl>
                    <Input placeholder="A1-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Preços */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            💲 Preços e Custos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="custo_unitario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo Unitário (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="custo_medio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo Médio (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preco_venda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de Venda (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Fiscal */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📄 Informações Fiscais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="ncm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NCM</FormLabel>
                  <FormControl>
                    <Input placeholder="0000.00.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEST</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="origem_mercadoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem da Mercadoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {origensOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Embalagens */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📦 Embalagens
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="embalagem_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Embalagem</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Saco, Caixa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embalagem_primaria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embalagem Primária</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embalagem_secundaria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embalagem Secundária</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Produto"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProdutoForm;
