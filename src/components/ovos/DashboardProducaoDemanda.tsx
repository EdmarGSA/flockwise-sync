import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Factory, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProducaoDemandaProps {
  integradoId: string;
}

interface DadosAgrupados {
  tipo: string;
  classificacao: string;
  producao: number;
  demanda: number;
  estoque: number;
}

const TIPOS_LABEL: Record<string, string> = {
  branco: 'Branco',
  castanho: 'Castanho',
  vermelho: 'Vermelho',
  caipira: 'Caipira',
};

const CLASSIFICACAO_LABEL: Record<string, string> = {
  medio: 'Médio',
  grande: 'Grande',
  extra: 'Extra',
  jumbo: 'Jumbo',
};

export default function DashboardProducaoDemanda({ integradoId }: DashboardProducaoDemandaProps) {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('7');
  const [dados, setDados] = useState<DadosAgrupados[]>([]);
  const [totais, setTotais] = useState({ producao: 0, demanda: 0, estoque: 0, cobertura: 0 });

  useEffect(() => {
    fetchData();
  }, [integradoId, periodo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dataInicio = format(subDays(new Date(), parseInt(periodo)), 'yyyy-MM-dd');

      // Buscar produção do período
      const { data: producaoData, error: prodError } = await supabase
        .from('producao_ovos')
        .select('ovos_totais, tipo_ovo, classificacao_predominante')
        .eq('integrado_id', integradoId)
        .gte('data_coleta', dataInicio);

      if (prodError) throw prodError;

      // Buscar demanda (pedidos pendentes e em separação)
      const { data: demandaData, error: demandaError } = await supabase
        .from('pedido_itens_ovos')
        .select(`
          quantidade_unidades,
          produto_ovo:produtos_ovos(tipo_ovo, classificacao_peso),
          pedido:pedidos!inner(status)
        `)
        .eq('pedido.integrado_id', integradoId)
        .in('pedido.status', ['pendente_aprovacao', 'aprovado', 'em_separacao']);

      if (demandaError) throw demandaError;

      // Buscar estoque atual
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque_ovos')
        .select('quantidade_atual, quantidade_reservada, tipo_ovo, classificacao_peso')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('bloqueado_carencia', false)
        .gt('quantidade_atual', 0);

      if (estoqueError) throw estoqueError;

      // Agrupar dados por tipo e classificação
      const agrupado: Record<string, DadosAgrupados> = {};

      // Processar produção
      (producaoData || []).forEach((p: any) => {
        const key = `${p.tipo_ovo}-${p.classificacao_predominante || 'grande'}`;
        if (!agrupado[key]) {
          agrupado[key] = { tipo: p.tipo_ovo, classificacao: p.classificacao_predominante || 'grande', producao: 0, demanda: 0, estoque: 0 };
        }
        agrupado[key].producao += p.ovos_totais || 0;
      });

      // Processar demanda
      (demandaData || []).forEach((d: any) => {
        const tipoOvo = d.produto_ovo?.tipo_ovo || 'branco';
        const classificacao = d.produto_ovo?.classificacao_peso || 'grande';
        const key = `${tipoOvo}-${classificacao}`;
        if (!agrupado[key]) {
          agrupado[key] = { tipo: tipoOvo, classificacao, producao: 0, demanda: 0, estoque: 0 };
        }
        agrupado[key].demanda += d.quantidade_unidades || 0;
      });

      // Processar estoque
      (estoqueData || []).forEach((e: any) => {
        const key = `${e.tipo_ovo}-${e.classificacao_peso}`;
        if (!agrupado[key]) {
          agrupado[key] = { tipo: e.tipo_ovo, classificacao: e.classificacao_peso, producao: 0, demanda: 0, estoque: 0 };
        }
        agrupado[key].estoque += (e.quantidade_atual - e.quantidade_reservada) || 0;
      });

      const dadosArray = Object.values(agrupado).filter(d => d.producao > 0 || d.demanda > 0 || d.estoque > 0);
      setDados(dadosArray);

      // Calcular totais
      const totalProducao = dadosArray.reduce((sum, d) => sum + d.producao, 0);
      const totalDemanda = dadosArray.reduce((sum, d) => sum + d.demanda, 0);
      const totalEstoque = dadosArray.reduce((sum, d) => sum + d.estoque, 0);
      const mediaProducaoDiaria = totalProducao / parseInt(periodo);
      const diasCobertura = mediaProducaoDiaria > 0 ? (totalEstoque + totalProducao) / (totalDemanda / parseInt(periodo) || 1) : 0;

      setTotais({
        producao: totalProducao,
        demanda: totalDemanda,
        estoque: totalEstoque,
        cobertura: Math.round(diasCobertura),
      });
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = dados.map(d => ({
    name: `${TIPOS_LABEL[d.tipo] || d.tipo} ${CLASSIFICACAO_LABEL[d.classificacao] || d.classificacao}`,
    Produção: d.producao,
    Demanda: d.demanda,
    Estoque: d.estoque,
  }));

  const saldo = totais.producao + totais.estoque - totais.demanda;

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Produção vs Demanda</h3>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Factory className="w-4 h-4" />
              <span className="text-sm">Produção</span>
            </div>
            <div className="text-2xl font-bold">{totais.producao.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">unidades no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm">Demanda</span>
            </div>
            <div className="text-2xl font-bold">{totais.demanda.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">pedidos em aberto</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm">Estoque Disponível</span>
            </div>
            <div className="text-2xl font-bold">{totais.estoque.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">unidades livres</p>
          </CardContent>
        </Card>

        <Card className={saldo < 0 ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {saldo >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
              <span className="text-sm">Cobertura</span>
            </div>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totais.cobertura} dias
            </div>
            <p className="text-xs text-muted-foreground">
              {saldo >= 0 ? 'Estoque suficiente' : 'Déficit projetado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {saldo < 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Atenção: Demanda superior à disponibilidade</p>
              <p className="text-sm text-muted-foreground">
                Déficit estimado de {Math.abs(saldo).toLocaleString()} unidades. Considere aumentar a produção ou renegociar prazos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível para o período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="Produção" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Demanda" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Estoque" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento por Categoria */}
      {dados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dados.map((d, idx) => {
                const saldoCategoria = d.producao + d.estoque - d.demanda;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <span className="font-medium">
                        {TIPOS_LABEL[d.tipo] || d.tipo} {CLASSIFICACAO_LABEL[d.classificacao] || d.classificacao}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground">Produção</div>
                        <div className="font-medium">{d.producao.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Demanda</div>
                        <div className="font-medium">{d.demanda.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Estoque</div>
                        <div className="font-medium">{d.estoque.toLocaleString()}</div>
                      </div>
                      <Badge variant={saldoCategoria >= 0 ? 'default' : 'destructive'}>
                        {saldoCategoria >= 0 ? '+' : ''}{saldoCategoria.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
