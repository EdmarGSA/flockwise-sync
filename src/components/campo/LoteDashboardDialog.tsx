import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoteEditForm } from '@/components/lotes/LoteEditForm';
import { LoteDashboardTab } from './LoteDashboardTab';
import { LoteClimaHistoricoTab } from './LoteClimaHistoricoTab';
import { Database } from '@/integrations/supabase/types';
import { Pencil, Gauge, Cloud } from 'lucide-react';

type LoteRow = Database['public']['Tables']['lotes']['Row'];

interface LoteDashboardDialogProps {
  lote: LoteRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LoteDashboardDialog({ lote, onSuccess, onCancel }: LoteDashboardDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('editar');

  const showDashboard = lote.status !== 'previsao';
  const showClima = showDashboard && !!(lote as any).nucleo_id;
  const cols = 1 + (showDashboard ? 1 : 0) + (showClima ? 1 : 0);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full grid-cols-${cols}`}>
        <TabsTrigger value="editar" className="flex items-center gap-2">
          <Pencil className="w-4 h-4" /> Editar Lote
        </TabsTrigger>
        {showDashboard && (
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Dashboard
          </TabsTrigger>
        )}
        {showClima && (
          <TabsTrigger value="clima" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" /> Clima
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="editar" className="mt-4">
        <LoteEditForm lote={lote} onSuccess={onSuccess} onCancel={onCancel} />
      </TabsContent>

      {showDashboard && (
        <TabsContent value="dashboard" className="mt-4">
          <LoteDashboardTab loteId={lote.id} lote={lote} />
        </TabsContent>
      )}

      {showClima && (
        <TabsContent value="clima" className="mt-4">
          <LoteClimaHistoricoTab
            loteId={lote.id}
            nucleoId={(lote as any).nucleo_id}
            dataAlojamento={lote.data_alojamento}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
