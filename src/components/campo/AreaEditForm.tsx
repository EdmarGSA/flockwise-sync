import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { VincularNucleosDialog } from './VincularNucleosDialog';
import { AreaMapDialog } from './AreaMapDialog';
import { Building2, MapPin, X, Map, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const areaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  cor: z.string().min(4, 'Selecione uma cor'),
  ativo: z.boolean(),
});

type AreaFormData = z.infer<typeof areaSchema>;
type AreaRow = Database['public']['Tables']['areas']['Row'];

interface NucleoVinculado {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

interface AreaEditFormProps {
  area: AreaRow;
  integradoId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const colorOptions = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function AreaEditForm({ area, integradoId, onSuccess, onCancel }: AreaEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [nucleosVinculados, setNucleosVinculados] = useState<NucleoVinculado[]>([]);
  const [loadingNucleos, setLoadingNucleos] = useState(true);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  const form = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      nome: area.nome,
      descricao: area.descricao || '',
      cor: area.cor || '#22c55e',
      ativo: area.ativo,
    },
  });

  const fetchNucleosVinculados = async () => {
    setLoadingNucleos(true);
    try {
      const { data, error } = await supabase
        .from('nucleos')
        .select('id, nome, latitude, longitude')
        .eq('area_id', area.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setNucleosVinculados(data || []);
    } catch (error) {
      console.error('Erro ao buscar núcleos vinculados:', error);
    } finally {
      setLoadingNucleos(false);
    }
  };

  useEffect(() => {
    fetchNucleosVinculados();
  }, [area.id]);

  const handleDesvincularNucleo = async (nucleoId: string) => {
    try {
      const { error } = await supabase
        .from('nucleos')
        .update({ area_id: null })
        .eq('id', nucleoId);

      if (error) throw error;
      toast.success('Núcleo desvinculado com sucesso!');
      fetchNucleosVinculados();
    } catch (error) {
      console.error('Erro ao desvincular núcleo:', error);
      toast.error('Erro ao desvincular núcleo');
    }
  };

  const onSubmit = async (data: AreaFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('areas')
        .update({
          nome: data.nome,
          descricao: data.descricao || null,
          cor: data.cor,
          ativo: data.ativo,
        })
        .eq('id', area.id);

      if (error) throw error;

      toast.success('Área atualizada com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar área:', error);
      toast.error('Erro ao atualizar área');
    } finally {
      setLoading(false);
    }
  };

  const nucleosComCoordenadas = nucleosVinculados.filter(
    (n) => n.latitude !== null && n.longitude !== null
  );

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Área</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Região Norte" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descrição da área..."
                    className="resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor no Mapa</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === color 
                            ? 'border-foreground scale-110' 
                            : 'border-transparent hover:border-muted-foreground'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Seção de Núcleos Vinculados */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Núcleos Vinculados ({nucleosVinculados.length})
              </FormLabel>
            </div>

            {loadingNucleos ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : nucleosVinculados.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
                Nenhum núcleo vinculado a esta área.
              </div>
            ) : (
              <ScrollArea className="max-h-[180px] border rounded-md">
                <div className="p-2 space-y-1">
                  {nucleosVinculados.map((nucleo) => (
                    <div
                      key={nucleo.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{nucleo.nome}</span>
                        {nucleo.latitude && nucleo.longitude && (
                          <MapPin className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDesvincularNucleo(nucleo.id)}
                        className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVincularDialogOpen(true)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Núcleos
              </Button>
              {nucleosComCoordenadas.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMapDialogOpen(true)}
                  className="flex-1"
                >
                  <Map className="h-4 w-4 mr-1" />
                  Ver no Mapa
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 inline mr-1 text-green-500" />
              indica núcleo com coordenadas GPS
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Form>

      <VincularNucleosDialog
        open={vincularDialogOpen}
        onOpenChange={setVincularDialogOpen}
        areaId={area.id}
        integradoId={integradoId}
        onSuccess={fetchNucleosVinculados}
      />

      <AreaMapDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        areaNome={form.watch('nome') || area.nome}
        areaCor={form.watch('cor') || area.cor || '#22c55e'}
        nucleos={nucleosVinculados}
      />
    </>
  );
}
