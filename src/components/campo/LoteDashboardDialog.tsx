import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoteEditForm } from '@/components/lotes/LoteEditForm';
import { LoteDashboardTab } from './LoteDashboardTab';
import { Database } from '@/integrations/supabase/types';
import { Pencil, Gauge } from 'lucide-react';

type LoteRow = Database['public']['Tables']['lotes']['Row'];

interface LoteDashboardDialogProps {
  lote: LoteRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LoteDashboardDialog({ lote, onSuccess, onCancel }: LoteDashboardDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('editar');
  
  // Dashboard only available for housed lots (not in 'previsao' status)
  const showDashboard = lote.status !== 'previsao';

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${showDashboard ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <TabsTrigger value="editar" className="flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Editar Lote
        </TabsTrigger>
        {showDashboard && (
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Dashboard
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
    </Tabs>
  );
}
