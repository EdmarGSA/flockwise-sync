import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bird, Scale, Plus, Calendar, Package } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

interface LoteDisponivel {
  id: string;
  quantidade_aves: number;
  data_alojamento: string;
  linhagem: string;
  sexo: string;
  saida_venda_local: number;
  saida_venda_externa: number;
  nucleo: { nome: string };
  galpao: { nome: string };
  totalMortalidade: number;
  ultimoPesoMedio: number | null;
  quantidadeVendida: number;
}

interface LoteVendaItem {
  lote_id: string;
  lote_info: string;
  tipo_venda: 'unidade' | 'peso';
  quantidade: number;
  preco_unitario: number;
  peso_medio: number;
  valor_total: number;
}

interface LotesVendaSectionProps {
  integradoId: string;
  onAddItem: (item: LoteVendaItem) => void;
}

export default function LotesVendaSection({ integradoId, onAddItem }: LotesVendaSectionProps) {
  const [lotes, setLotes] = useState<LoteDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLote, setSelectedLote] = useState<LoteDisponivel | null>(null);
  const [quantidadeAves, setQuantidadeAves] = useState(0);
  const [pesoTotal, setPesoTotal] = useState(0);
  const [precoPorKg, setPrecoPorKg] = useState(0);

  useEffect(() => {
    fetchLotesDisponiveis();
  }, [integradoId]);

  const fetchLotesDisponiveis = async () => {
    setLoading(true);
    try {
      // Fetch lots with saida_venda_local or saida_venda_externa > 0 and status alojado
      const { data: lotesData, error } = await supabase
        .from('lotes')
        .select(`
          id,
          quantidade_aves,
          data_alojamento,
          linhagem,
          sexo,
          saida_venda_local,
          saida_venda_externa,
          nucleo:nucleos(nome),
          galpao:galpoes(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado')
        .or('saida_venda_local.gt.0,saida_venda_externa.gt.0');

      if (error) throw error;

      // For each lot, fetch mortality, last weight, and already sold quantity
      const lotesComDados = await Promise.all((lotesData || []).map(async (lote) => {
        // Fetch total mortality
        const { data: mortalidadeData } = await supabase
          .from('mortalidade')
          .select('id')
          .eq('lote_id', lote.id);

        let totalMortalidade = 0;
        if (mortalidadeData && mortalidadeData.length > 0) {
          const mortalidadeIds = mortalidadeData.map(m => m.id);
          const { data: itensData } = await supabase
            .from('mortalidade_itens')
            .select('quantidade')
            .in('mortalidade_id', mortalidadeIds);
          
          totalMortalidade = (itensData || []).reduce((acc, item) => acc + (item.quantidade || 0), 0);
        }

        // Fetch last average weight
        const { data: pesagemData } = await supabase
          .from('pesagens')
          .select('id')
          .eq('lote_id', lote.id)
          .order('data_pesagem', { ascending: false })
          .limit(1)
          .maybeSingle();

        let ultimoPesoMedio: number | null = null;
        if (pesagemData) {
          const { data: itensData } = await supabase
            .from('pesagem_itens')
            .select('quantidade_aves, peso_bruto_g, peso_tara_g')
            .eq('pesagem_id', pesagemData.id);

          if (itensData && itensData.length > 0) {
            const totalAves = itensData.reduce((acc, item) => acc + item.quantidade_aves, 0);
            const totalPesoLiquido = itensData.reduce((acc, item) => acc + (item.peso_bruto_g - item.peso_tara_g), 0);
            ultimoPesoMedio = totalAves > 0 ? totalPesoLiquido / totalAves / 1000 : null; // Convert to kg
          }
        }

        // Fetch already sold quantity from approved/faturado orders
        const { data: vendasData } = await supabase
          .from('pedido_itens')
          .select(`
            quantidade,
            pedido:pedidos!inner(status)
          `)
          .eq('lote_producao_id', lote.id)
          .in('pedido.status', ['aprovado', 'em_separacao', 'faturado']);

        const quantidadeVendida = (vendasData || []).reduce((acc, v) => acc + v.quantidade, 0);

        return {
          ...lote,
          nucleo: lote.nucleo as { nome: string },
          galpao: lote.galpao as { nome: string },
          totalMortalidade,
          ultimoPesoMedio,
          quantidadeVendida
        };
      }));

      setLotes(lotesComDados);
    } catch (error) {
      console.error('Error fetching lotes:', error);
      toast.error('Erro ao carregar lotes disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const calcularIdade = (dataAlojamento: string) => {
    return differenceInDays(new Date(), new Date(dataAlojamento));
  };

  const calcularQuantidadeReal = (lote: LoteDisponivel) => {
    return lote.quantidade_aves - lote.totalMortalidade;
  };

  const calcularDisponivelVenda = (lote: LoteDisponivel) => {
    const quantidadeLiberada = (lote.saida_venda_local || 0) + (lote.saida_venda_externa || 0);
    const quantidadeReal = calcularQuantidadeReal(lote);
    const maxVenda = Math.min(quantidadeLiberada, quantidadeReal);
    return Math.max(0, maxVenda - lote.quantidadeVendida);
  };

  const handleSelectLote = (lote: LoteDisponivel) => {
    setSelectedLote(lote);
    setQuantidadeAves(0);
    setPesoTotal(0);
    setPrecoPorKg(0);
  };

  const handleQuantidadeChange = (qtd: number) => {
    setQuantidadeAves(qtd);
    if (selectedLote?.ultimoPesoMedio && qtd > 0) {
      setPesoTotal(parseFloat((qtd * selectedLote.ultimoPesoMedio).toFixed(2)));
    }
  };

  const handlePesoChange = (peso: number) => {
    setPesoTotal(peso);
    if (selectedLote?.ultimoPesoMedio && peso > 0) {
      setQuantidadeAves(Math.ceil(peso / selectedLote.ultimoPesoMedio));
    }
  };

  const handleAddToOrder = () => {
    if (!selectedLote) return;

    if (quantidadeAves <= 0) {
      toast.error('Informe a quantidade de aves');
      return;
    }

    if (pesoTotal <= 0) {
      toast.error('Informe o peso total');
      return;
    }

    const disponivel = calcularDisponivelVenda(selectedLote);
    
    if (quantidadeAves > disponivel) {
      toast.error(`Quantidade máxima disponível: ${disponivel} aves`);
      return;
    }

    if (precoPorKg <= 0) {
      toast.error('Informe o preço por kg');
      return;
    }

    const pesoMedio = pesoTotal / quantidadeAves;
    const valorTotal = pesoTotal * precoPorKg;

    const item: LoteVendaItem = {
      lote_id: selectedLote.id,
      lote_info: `${selectedLote.galpao.nome} - ${selectedLote.nucleo.nome}`,
      tipo_venda: 'peso',
      quantidade: quantidadeAves,
      preco_unitario: precoPorKg,
      peso_medio: pesoMedio,
      valor_total: valorTotal
    };

    onAddItem(item);
    toast.success('Aves adicionadas ao pedido');
    setSelectedLote(null);
    setQuantidadeAves(0);
    setPesoTotal(0);
    setPrecoPorKg(0);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando lotes disponíveis...
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Bird className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum lote com aves liberadas para venda</p>
          <p className="text-sm mt-2">Configure a saída do lote em "Gestão de Campo" para liberar aves para venda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lotes Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lotes.map(lote => {
          const idade = calcularIdade(lote.data_alojamento);
          const quantidadeReal = calcularQuantidadeReal(lote);
          const disponivel = calcularDisponivelVenda(lote);
          const isSelected = selectedLote?.id === lote.id;

          return (
            <Card 
              key={lote.id}
              className={`cursor-pointer transition-all hover:border-primary ${isSelected ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => handleSelectLote(lote)}
            >
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">{lote.galpao.nome}</p>
                    <p className="text-sm text-muted-foreground">{lote.nucleo.nome}</p>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {idade} dias
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Qtd Real</p>
                    <p className="font-medium flex items-center gap-1">
                      <Bird className="w-4 h-4" />
                      {quantidadeReal.toLocaleString()} aves
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponível Venda</p>
                    <p className="font-medium text-primary">{disponivel.toLocaleString()} aves</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último Peso Médio</p>
                    <p className="font-medium flex items-center gap-1">
                      <Scale className="w-4 h-4" />
                      {lote.ultimoPesoMedio ? `${lote.ultimoPesoMedio.toFixed(3)} kg` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso Total Est.</p>
                    <p className="font-medium">
                      {lote.ultimoPesoMedio 
                        ? `${((disponivel * lote.ultimoPesoMedio) / 1000).toFixed(2)} ton`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Badge variant="outline">{lote.linhagem}</Badge>
                  <Badge variant="outline">{lote.sexo}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Formulário de Venda */}
      {selectedLote && (
        <Card className="border-primary">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Vender de: {selectedLote.galpao.nome} - {selectedLote.nucleo.nome}
              </h4>
              <div className="flex gap-2">
                <Badge variant="outline">
                  Peso médio: {selectedLote.ultimoPesoMedio ? `${selectedLote.ultimoPesoMedio.toFixed(3)} kg` : 'N/A'}
                </Badge>
                <Badge>
                  Disponível: {calcularDisponivelVenda(selectedLote).toLocaleString()} aves
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Quantidade (aves)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidadeAves || ''}
                  onChange={(e) => handleQuantidadeChange(parseInt(e.target.value) || 0)}
                  placeholder="Qtd aves"
                />
              </div>

              <div className="space-y-2">
                <Label>Peso Total (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pesoTotal || ''}
                  onChange={(e) => handlePesoChange(parseFloat(e.target.value) || 0)}
                  placeholder="Peso em kg"
                />
              </div>

              <div className="space-y-2">
                <Label>Preço por Kg (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoPorKg || ''}
                  onChange={(e) => setPrecoPorKg(parseFloat(e.target.value) || 0)}
                  placeholder="R$/kg"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Total</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted font-medium flex items-center">
                  R$ {(pesoTotal * precoPorKg).toFixed(2)}
                </div>
              </div>
            </div>

            {quantidadeAves > 0 && pesoTotal > 0 && (
              <p className="text-sm text-muted-foreground">
                Peso médio calculado: {(pesoTotal / quantidadeAves).toFixed(3)} kg/ave
              </p>
            )}

            <Button onClick={handleAddToOrder} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Aves Corte Viva ao Pedido
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
