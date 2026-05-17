import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calcularIdadeLote } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Skull, Scale, PackagePlus, PackageCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { MortalidadeDialog } from '@/components/lotes/MortalidadeDialog';
import { PesagemDialog } from '@/components/lotes/PesagemDialog';
import { RacaoLoteDialog } from '@/components/lotes/RacaoLoteDialog';

interface LoteComDados {
  id: string;
  integrado_id: string;
  nucleo_id: string;
  galpao_id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  status: string;
  linhagem: string | null;
  sexo: string;
  peso_medio_pintinhos_kg: number | null;
  nucleo_nome: string;
  galpao_nome: string;
  mortalidade_total: number;
  aves_vivas: number;
  dias: number;
  semana: number;
  ultima_pesagem_dias: number | null;
  precisa_pesar: boolean;
  solicitacoes_pendentes: number;
  racao_enviada: number;
  tipo_producao: string | null;
}

const statusLabels: Record<string, string> = {
  alojado: 'Alojado',
  saiu_para_entrega: 'Saída',
};

const statusColors: Record<string, string> = {
  alojado: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  saiu_para_entrega: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};

export default function CriadorPainel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LoteComDados[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [mortalidadeOpen, setMortalidadeOpen] = useState(false);
  const [pesagemOpen, setPesagemOpen] = useState(false);
  const [racaoOpen, setRacaoOpen] = useState(false);
  const [racaoTab, setRacaoTab] = useState<'solicitar' | 'recebidas'>('solicitar');
  const [selectedLote, setSelectedLote] = useState<LoteComDados | null>(null);

  const fetchLotes = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch lotes where criador_id = current user
      const { data: lotesData, error: lotesError } = await supabase
        .from('lotes')
        .select(`
          id, integrado_id, nucleo_id, galpao_id, quantidade_aves,
          data_alojamento, status, linhagem, sexo, peso_medio_pintinhos_kg,
          nucleos!inner(nome),
          galpoes!inner(nome)
        `)
        .eq('criador_id', user.id)
        .in('status', ['alojado', 'saiu_para_entrega']);

      if (lotesError) throw lotesError;
      if (!lotesData || lotesData.length === 0) {
        setLotes([]);
        return;
      }

      // For each lote, fetch mortality, last weighing, feed requests
      const lotesEnriquecidos: LoteComDados[] = await Promise.all(
        lotesData.map(async (lote: any) => {
          const dias = calcularIdadeLote(lote.data_alojamento);
          const semana = Math.ceil(dias / 7);

          // Mortality total - get from mortalidade_itens via mortalidade
          const { data: mortData } = await supabase
            .from('mortalidade')
            .select('id, mortalidade_itens(quantidade)')
            .eq('lote_id', lote.id);
          const mortalidadeTotal = (mortData || []).reduce((sum: number, m: any) => {
            const itens = m.mortalidade_itens || [];
            return sum + itens.reduce((s: number, i: any) => s + (i.quantidade || 0), 0);
          }, 0);

          // Last weighing
          const { data: pesData } = await supabase
            .from('pesagens')
            .select('data_pesagem')
            .eq('lote_id', lote.id)
            .order('data_pesagem', { ascending: false })
            .limit(1);

          let ultimaPesagemDias: number | null = null;
          if (pesData && pesData.length > 0) {
            const diffMs = Date.now() - new Date(pesData[0].data_pesagem).getTime();
            ultimaPesagemDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }
          const precisaPesar = ultimaPesagemDias === null || ultimaPesagemDias >= 7;

          // Feed requests
          const { data: solData } = await supabase
            .from('solicitacoes_racao')
            .select('id, status')
            .eq('lote_id', lote.id)
            .in('status', ['pendente', 'aprovada', 'enviada']);

          const solicitacoesPendentes = (solData || []).filter((s: any) => s.status === 'pendente' || s.status === 'aprovada').length;
          const racaoEnviada = (solData || []).filter((s: any) => s.status === 'enviada').length;

          const avesVivas = lote.quantidade_aves - mortalidadeTotal;

          return {
            id: lote.id,
            integrado_id: lote.integrado_id,
            nucleo_id: lote.nucleo_id,
            galpao_id: lote.galpao_id,
            quantidade_aves: lote.quantidade_aves,
            data_alojamento: lote.data_alojamento,
            status: lote.status,
            linhagem: lote.linhagem,
            sexo: lote.sexo,
            peso_medio_pintinhos_kg: lote.peso_medio_pintinhos_kg,
            nucleo_nome: lote.nucleos?.nome || '',
            galpao_nome: lote.galpoes?.nome || '',
            mortalidade_total: mortalidadeTotal,
            aves_vivas: avesVivas,
            dias,
            semana,
            ultima_pesagem_dias: ultimaPesagemDias,
            precisa_pesar: precisaPesar,
            solicitacoes_pendentes: solicitacoesPendentes,
            racao_enviada: racaoEnviada,
            tipo_producao: null,
          };
        })
      );

      setLotes(lotesEnriquecidos);
    } catch (err) {
      console.error('Erro ao buscar lotes do criador:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLotes();
  };

  const openMortalidade = (lote: LoteComDados) => {
    setSelectedLote(lote);
    setMortalidadeOpen(true);
  };

  const openPesagem = (lote: LoteComDados) => {
    setSelectedLote(lote);
    setPesagemOpen(true);
  };

  const openRacao = (lote: LoteComDados, tab: 'solicitar' | 'recebidas') => {
    setSelectedLote(lote);
    setRacaoTab(tab);
    setRacaoOpen(true);
  };

  const handleSuccess = () => {
    fetchLotes();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-7 w-48" />
        </div>
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Meus Lotes</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="h-9 w-9">
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-8">
        {lotes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Nenhum lote vinculado a você.</p>
            <p className="text-muted-foreground text-xs mt-1">Entre em contato com o administrador.</p>
          </div>
        ) : (
          lotes.map(lote => (
            <Card key={lote.id} className="overflow-hidden border">
              <CardContent className="p-0">
                {/* Info section */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={statusColors[lote.status] || ''}>
                      {statusLabels[lote.status] || lote.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {lote.nucleo_nome} / {lote.galpao_nome}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">
                      {lote.aves_vivas.toLocaleString('pt-BR')} aves vivas
                    </span>
                    <span className="text-muted-foreground">
                      Dia {lote.dias} (S{lote.semana})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {lote.racao_enviada > 0 && (
                      <span className="text-amber-600 font-medium">
                        📦 {lote.racao_enviada} ração a receber
                      </span>
                    )}
                    {lote.precisa_pesar && (
                      <span className="text-blue-600 font-medium">
                        ⚖️ Pesar
                      </span>
                    )}
                    {lote.solicitacoes_pendentes > 0 && (
                      <span className="text-orange-600 font-medium">
                        🕐 {lote.solicitacoes_pendentes} solicitação pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons - 2x2 grid */}
                <div className="grid grid-cols-2 border-t">
                  <button
                    onClick={() => openMortalidade(lote)}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 border-r border-b text-foreground hover:bg-muted/50 active:bg-muted transition-colors min-h-[72px]"
                  >
                    <Skull className="h-5 w-5 text-destructive" />
                    <span className="text-xs font-medium">Mortalidade</span>
                  </button>

                  <button
                    onClick={() => openPesagem(lote)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 border-b text-foreground hover:bg-muted/50 active:bg-muted transition-colors min-h-[72px] ${
                      lote.precisa_pesar ? 'ring-2 ring-inset ring-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <Scale className={`h-5 w-5 text-blue-600 ${lote.precisa_pesar ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-medium">Pesagem</span>
                  </button>

                  <button
                    onClick={() => openRacao(lote, 'solicitar')}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 border-r text-foreground hover:bg-muted/50 active:bg-muted transition-colors min-h-[72px]"
                  >
                    <PackagePlus className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium">Solicitar Ração</span>
                  </button>

                  <button
                    onClick={() => openRacao(lote, 'recebidas')}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 text-foreground hover:bg-muted/50 active:bg-muted transition-colors min-h-[72px] ${
                      lote.racao_enviada > 0 ? 'ring-2 ring-inset ring-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <PackageCheck className={`h-5 w-5 text-amber-600 ${lote.racao_enviada > 0 ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-medium">Receber Ração</span>
                    {lote.racao_enviada > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {lote.racao_enviada}
                      </Badge>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      {selectedLote && (
        <>
          <MortalidadeDialog
            open={mortalidadeOpen}
            onOpenChange={setMortalidadeOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            dataAlojamento={selectedLote.data_alojamento}
            quantidadeAves={selectedLote.quantidade_aves}
            onSuccess={handleSuccess}
          />

          <PesagemDialog
            open={pesagemOpen}
            onOpenChange={setPesagemOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            galpaoId={selectedLote.galpao_id}
            avesVivas={selectedLote.aves_vivas}
            pesoInicialPintinhos={selectedLote.peso_medio_pintinhos_kg}
            diasDesdeAlojamento={selectedLote.dias}
            dataAlojamento={selectedLote.data_alojamento}
            linhagem={selectedLote.linhagem as any}
            sexo={selectedLote.sexo as any}
            onSuccess={handleSuccess}
          />

          <RacaoLoteDialog
            open={racaoOpen}
            onOpenChange={setRacaoOpen}
            loteId={selectedLote.id}
            integradoId={selectedLote.integrado_id}
            galpaoId={selectedLote.galpao_id}
            nucleo={selectedLote.nucleo_nome}
            galpao={selectedLote.galpao_nome}
            tipoProducao={selectedLote.tipo_producao}
            linhagem={selectedLote.linhagem as any}
            sexo={selectedLote.sexo as any}
            diasDesdeAlojamento={selectedLote.dias}
            avesVivas={selectedLote.aves_vivas}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </div>
  );
}
