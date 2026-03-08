import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, FolderOpen, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export interface FotoMortalidade {
  id: string;
  motivo: string;
  url: string;
  file?: File;
  isNew?: boolean;
}

interface MortalidadeFotoUploadProps {
  items: { motivo: string; quantidade: number }[];
  fotos: FotoMortalidade[];
  onChange: (fotos: FotoMortalidade[]) => void;
  disabled?: boolean;
}

function calcFotosNecessarias(quantidade: number): number {
  return Math.max(1, Math.ceil(quantidade * 0.1));
}

export default function MortalidadeFotoUpload({
  items,
  fotos,
  onChange,
  disabled = false,
}: MortalidadeFotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activeMotivo, setActiveMotivo] = useState<string | null>(null);

  // Aggregate quantities by motivo
  const motivoTotals = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.motivo] = (acc[item.motivo] || 0) + item.quantidade;
    return acc;
  }, {});

  const handleCapture = (motivo: string, capture: boolean) => {
    setActiveMotivo(motivo);
    if (capture) {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !activeMotivo) return;

    const newFotos: FotoMortalidade[] = Array.from(files).map((file) => ({
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      motivo: activeMotivo,
      url: URL.createObjectURL(file),
      file,
      isNew: true,
    }));

    onChange([...fotos, ...newFotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setActiveMotivo(null);
  };

  const handleRemove = (id: string) => {
    const foto = fotos.find((f) => f.id === id);
    if (foto?.isNew && foto.url.startsWith('blob:')) {
      URL.revokeObjectURL(foto.url);
    }
    onChange(fotos.filter((f) => f.id !== id));
  };

  const motivoLabels: Record<string, string> = {
    natural: 'Natural',
    eliminado: 'Eliminado',
  };

  if (Object.keys(motivoTotals).length === 0) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-950/10">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Fotos Obrigatórias (10% por motivo)</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        {Object.entries(motivoTotals).map(([motivo, qty]) => {
          const needed = calcFotosNecessarias(qty);
          const current = fotos.filter((f) => f.motivo === motivo).length;
          const complete = current >= needed;

          return (
            <div key={motivo} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={complete ? 'default' : 'destructive'} className="gap-1">
                    {complete ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {motivoLabels[motivo] || motivo}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {current}/{needed} fotos ({qty} aves)
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCapture(motivo, true)}
                    disabled={disabled}
                    className="h-8 gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Câmera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCapture(motivo, false)}
                    disabled={disabled}
                    className="h-8 gap-1"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Galeria
                  </Button>
                </div>
              </div>

              {fotos.filter((f) => f.motivo === motivo).length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {fotos
                    .filter((f) => f.motivo === motivo)
                    .map((foto) => (
                      <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img src={foto.url} alt="Mortalidade" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 w-6 h-6"
                          onClick={() => handleRemove(foto.id)}
                          disabled={disabled}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export async function uploadMortalidadeFotos(
  fotos: FotoMortalidade[],
  mortalidadeId: string
): Promise<{ motivo: string; url: string }[]> {
  const results: { motivo: string; url: string }[] = [];

  for (const foto of fotos) {
    if (!foto.file) {
      results.push({ motivo: foto.motivo, url: foto.url });
      continue;
    }

    const fileExt = foto.file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `mortalidade/${mortalidadeId}/${fileName}`;

    const { error } = await supabase.storage
      .from('mortalidade-fotos')
      .upload(filePath, foto.file);

    if (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar foto');
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('mortalidade-fotos').getPublicUrl(filePath);

    results.push({ motivo: foto.motivo, url: publicUrl });
  }

  return results;
}
