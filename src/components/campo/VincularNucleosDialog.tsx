import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Building2 } from 'lucide-react';

interface Nucleo {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface VincularNucleosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: string;
  integradoId: string;
  onSuccess?: () => void;
}

export function VincularNucleosDialog({
  open,
  onOpenChange,
  areaId,
  integradoId,
  onSuccess,
}: VincularNucleosDialogProps) {
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNucleosDisponiveis();
      setSelectedIds([]);
    }
  }, [open, areaId, integradoId]);

  const fetchNucleosDisponiveis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nucleos')
        .select('id, nome, cidade, estado, latitude, longitude')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .is('area_id', null)
        .order('nome');

      if (error) throw error;
      setNucleos(data || []);
    } catch (error) {
      console.error('Erro ao buscar núcleos:', error);
      toast.error('Erro ao carregar núcleos disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (nucleoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(nucleoId)
        ? prev.filter((id) => id !== nucleoId)
        : [...prev, nucleoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === nucleos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(nucleos.map((n) => n.id));
    }
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um núcleo');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('nucleos')
        .update({ area_id: areaId })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} núcleo(s) vinculado(s) com sucesso!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao vincular núcleos:', error);
      toast.error('Erro ao vincular núcleos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vincular Núcleos à Área
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : nucleos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum núcleo disponível para vincular.</p>
            <p className="text-sm">Todos os núcleos já estão vinculados a áreas.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {nucleos.length} núcleo(s) disponível(is)
              </span>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedIds.length === nucleos.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-2">
              <div className="space-y-2">
                {nucleos.map((nucleo) => (
                  <div
                    key={nucleo.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.includes(nucleo.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleToggle(nucleo.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(nucleo.id)}
                      onCheckedChange={() => handleToggle(nucleo.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{nucleo.nome}</p>
                      {(nucleo.cidade || nucleo.estado) && (
                        <p className="text-sm text-muted-foreground truncate">
                          {[nucleo.cidade, nucleo.estado].filter(Boolean).join(' - ')}
                        </p>
                      )}
                    </div>
                    {nucleo.latitude && nucleo.longitude && (
                      <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 inline mr-1 text-green-500" />
              indica núcleo com coordenadas GPS
            </p>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedIds.length === 0}
          >
            {saving ? 'Vinculando...' : `Vincular (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
