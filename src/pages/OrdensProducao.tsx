import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Factory } from 'lucide-react';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import OrdensProducaoTable from '@/components/fabrica/producao/OrdensProducaoTable';
import NovaOrdemProducaoDialog from '@/components/fabrica/producao/NovaOrdemProducaoDialog';

export default function OrdensProducao() {
  const navigate = useNavigate();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const [showNovaOP, setShowNovaOP] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loadingIntegrado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/fabrica-racao')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Factory className="w-5 h-5 text-primary" />
                  Ordens de Produção
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie as ordens de produção de ração
                </p>
              </div>
            </div>
            <Button onClick={() => setShowNovaOP(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova OP
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <OrdensProducaoTable
          key={refreshKey}
          integradoId={integradoId || ''}
          onRefresh={handleRefresh}
        />
      </main>

      {/* Nova OP Dialog */}
      <NovaOrdemProducaoDialog
        open={showNovaOP}
        onOpenChange={setShowNovaOP}
        integradoId={integradoId || ''}
        onSuccess={() => {
          setShowNovaOP(false);
          handleRefresh();
        }}
      />
    </div>
  );
}
