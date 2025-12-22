import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Factory, RefreshCw, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DemandaProducaoCard from './DemandaProducaoCard';
import RacoesCriticasCard from './RacoesCriticasCard';
import OrdensProducaoTable from './OrdensProducaoTable';
import GerarOPDialog from './GerarOPDialog';
import NovaOrdemProducaoDialog from './NovaOrdemProducaoDialog';

interface RacaoCritica {
  id: string;
  nome: string;
  demandaTotal: number;
  estoqueAtual: number;
  deficit: number;
  sugestaoProducao: number;
  unidade_medida: string;
}

interface GestaoProducaoTabProps {
  integradoId: string;
}

const MARGEM_SEGURANCA = 500; // kg - safety stock margin

export default function GestaoProducaoTab({ integradoId }: GestaoProducaoTabProps) {
  const [loading, setLoading] = useState(true);
  const [totalSolicitado, setTotalSolicitado] = useState(0);
  const [previsaoConsumo3d, setPrevisaoConsumo3d] = useState(0);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState(0);
  const [racoesCriticas, setRacoesCriticas] = useState<RacaoCritica[]>([]);
  const [selectedRacao, setSelectedRacao] = useState<RacaoCritica | null>(null);
  const [showGerarOP, setShowGerarOP] = useState(false);
  const [showNovaOP, setShowNovaOP] = useState(false);

  useEffect(() => {
    if (integradoId) {
      fetchDemandaData();
    }
  }, [integradoId]);

  const fetchDemandaData = async () => {
    setLoading(true);

    try {
      // 1. Fetch manufactured feed products (fabricação própria + grupo ração)
      const { data: racoesData, error: racoesError } = await supabase
        .from('produtos')
        .select(`
          id, nome, estoque_atual, unidade_medida, grupo_animal_id,
          categoria:categorias!inner(tipo_origem),
          grupo:grupos_produto!inner(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'fabricacao_propria')
        .ilike('grupos_produto.nome', '%ração%');

      if (racoesError) throw racoesError;

      const racoes = racoesData || [];

      // 2. Calculate total stock of manufactured feeds
      const totalEstoque = racoes.reduce((sum, r) => sum + Number(r.estoque_atual), 0);
      setEstoqueDisponivel(totalEstoque);

      // 3. Fetch open feed requests (solicitações de ração)
      const { data: solicitacoesData, error: solError } = await supabase
        .from('solicitacoes_racao')
        .select('quantidade_solicitada_kg, tipo_racao')
        .eq('integrado_id', integradoId)
        .in('status', ['solicitado', 'confirmado']);

      if (solError) throw solError;

      const totalSolic = (solicitacoesData || []).reduce(
        (sum, s) => sum + Number(s.quantidade_solicitada_kg), 0
      );
      setTotalSolicitado(totalSolic);

      // 4. Calculate 3-day consumption forecast based on active batches
      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select(`
          id, quantidade_aves, linhagem, sexo, data_alojamento,
          nucleo:nucleos!inner(tipo_producao)
        `)
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');

      if (lotesError) throw lotesError;

      let previsaoTotal = 0;
      const today = new Date();

      for (const lote of lotesData || []) {
        if (!lote.data_alojamento) continue;

        const dataAlojamento = new Date(lote.data_alojamento);
        const idadeDias = Math.floor((today.getTime() - dataAlojamento.getTime()) / (1000 * 60 * 60 * 24));

        // Fetch consumption reference for the next 3 days
        for (let d = 0; d < 3; d++) {
          const diaRef = idadeDias + d;

          const { data: desempenho } = await supabase
            .from('desempenho_aves')
            .select('consumo_diario_racao_g')
            .eq('linhagem', lote.linhagem)
            .eq('sexo', lote.sexo)
            .eq('dia', diaRef)
            .maybeSingle();

          if (desempenho) {
            // consumo_diario_racao_g is per bird in grams
            const consumoDiarioKg = (Number(desempenho.consumo_diario_racao_g) / 1000) * lote.quantidade_aves;
            previsaoTotal += consumoDiarioKg;
          }
        }
      }

      setPrevisaoConsumo3d(previsaoTotal);

      // 5. Calculate critical feeds
      const demandaTotal = totalSolic + previsaoTotal;
      
      // For now, distribute demand proportionally among feeds
      // In a real scenario, you'd match feed type to batch requirements
      const criticas: RacaoCritica[] = [];

      for (const racao of racoes) {
        // Simple proportional allocation based on stock
        const proporcao = totalEstoque > 0 ? Number(racao.estoque_atual) / totalEstoque : 1 / racoes.length;
        const demandaRacao = demandaTotal * proporcao;
        const estoqueRacao = Number(racao.estoque_atual);
        const deficit = estoqueRacao - demandaRacao;

        if (deficit < 0) {
          criticas.push({
            id: racao.id,
            nome: racao.nome,
            demandaTotal: demandaRacao,
            estoqueAtual: estoqueRacao,
            deficit,
            sugestaoProducao: Math.abs(deficit) + MARGEM_SEGURANCA,
            unidade_medida: racao.unidade_medida
          });
        }
      }

      setRacoesCriticas(criticas.sort((a, b) => a.deficit - b.deficit));
    } catch (error) {
      console.error('Erro ao calcular demanda:', error);
      toast.error('Erro ao carregar dados de demanda');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarOP = (racao: RacaoCritica) => {
    setSelectedRacao(racao);
    setShowGerarOP(true);
  };

  const demandaTotal = totalSolicitado + previsaoConsumo3d;

  return (
    <div className="space-y-6">
      {/* Header with Refresh and New OP Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            Gestão de Produção
          </h2>
          <p className="text-sm text-muted-foreground">
            Análise de demanda e planejamento de produção de ração
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDemandaData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowNovaOP(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova OP
          </Button>
        </div>
      </div>

      {/* Demand Panel */}
      <DemandaProducaoCard
        totalSolicitado={totalSolicitado}
        previsaoConsumo3d={previsaoConsumo3d}
        estoqueDisponivel={estoqueDisponivel}
        demandaTotal={demandaTotal}
        loading={loading}
      />

      {/* Critical Feeds */}
      <RacoesCriticasCard
        racoesCriticas={racoesCriticas}
        loading={loading}
        onGerarOP={handleGerarOP}
      />

      {/* Production Orders Table */}
      <OrdensProducaoTable
        integradoId={integradoId}
        onRefresh={fetchDemandaData}
      />

      {/* Generate OP Dialog (from critical) */}
      <GerarOPDialog
        open={showGerarOP}
        onOpenChange={setShowGerarOP}
        racao={selectedRacao}
        integradoId={integradoId}
        onSuccess={() => {
          setShowGerarOP(false);
          fetchDemandaData();
        }}
      />

      {/* Nova OP Dialog (manual) */}
      <NovaOrdemProducaoDialog
        open={showNovaOP}
        onOpenChange={setShowNovaOP}
        integradoId={integradoId}
        onSuccess={() => {
          setShowNovaOP(false);
          fetchDemandaData();
        }}
      />
    </div>
  );
}
