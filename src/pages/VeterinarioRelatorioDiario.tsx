import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useRelatorioDiarioLote } from '@/hooks/useRelatorioDiarioLote';
import TabelaDiaria from '@/components/veterinario/relatorio/TabelaDiaria';
import AnaliseIATecnica from '@/components/veterinario/relatorio/AnaliseIATecnica';
import ExportarRelatorio from '@/components/veterinario/relatorio/ExportarRelatorio';
import BannerGatilhosCriticos from '@/components/veterinario/relatorio/BannerGatilhosCriticos';

export default function VeterinarioRelatorioDiario() {
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const { data, loading, error, recarregar } = useRelatorioDiarioLote(loteId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10 print:hidden">
        <div className="container mx-auto p-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/veterinario/${loteId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="font-semibold text-sm md:text-base">Relatório Diário</h1>
          <Button variant="ghost" size="sm" onClick={recarregar} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-3 space-y-4 max-w-6xl">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {error && <Card><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}

        {data && (
          <>
            <Card>
              <CardContent className="p-4 space-y-1">
                <h2 className="font-semibold">{data.lote.nucleo} · {data.lote.galpao}</h2>
                <p className="text-xs text-muted-foreground">
                  {data.lote.linhagem} · {data.lote.sexo} · {data.lote.quantidade_aves.toLocaleString('pt-BR')} aves alojadas em{' '}
                  {new Date(data.lote.data_alojamento + 'T12:00').toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <BannerGatilhosCriticos gatilhos={data.gatilhos} />

            <Tabs defaultValue="diario">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="diario">Diário</TabsTrigger>
                <TabsTrigger value="ia">Análise IA</TabsTrigger>
                <TabsTrigger value="export">Exportar</TabsTrigger>
              </TabsList>

              <TabsContent value="diario" className="mt-3">
                <Card><CardContent className="p-3"><TabelaDiaria dias={data.dias} /></CardContent></Card>
              </TabsContent>

              <TabsContent value="ia" className="mt-3">
                <AnaliseIATecnica loteId={data.lote.id} />
              </TabsContent>

              <TabsContent value="export" className="mt-3">
                <ExportarRelatorio data={data} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
