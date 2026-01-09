import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X, Image, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  url: string;
  tipo: 'foto' | 'video';
  descricao?: string;
  sistemaAfetado?: string;
  isNew?: boolean;
  file?: File;
}

interface MediaUploadProps {
  autopsiaId?: string;
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  disabled?: boolean;
}

const SISTEMAS = [
  { value: 'respiratorio', label: 'Respiratório' },
  { value: 'digestivo', label: 'Digestivo' },
  { value: 'locomotor', label: 'Locomotor' },
  { value: 'tegumentar', label: 'Tegumentar' },
  { value: 'nervoso', label: 'Nervoso' },
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'reprodutor', label: 'Reprodutor' },
  { value: 'outro', label: 'Outro' },
];

export default function MediaUpload({ 
  autopsiaId, 
  items, 
  onChange, 
  disabled = false 
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newItems: MediaItem[] = [];

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const tipo = isVideo ? 'video' : 'foto';

      // Create local preview URL
      const previewUrl = URL.createObjectURL(file);
      
      newItems.push({
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: previewUrl,
        tipo: tipo as 'foto' | 'video',
        isNew: true,
        file,
      });
    }

    onChange([...items, ...newItems]);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const uploadMedia = async (item: MediaItem): Promise<string | null> => {
    if (!item.file) return null;

    const fileExt = item.file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `autopsias/${autopsiaId || 'temp'}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('veterinario-midias')
      .upload(filePath, item.file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('veterinario-midias')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleRemove = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.isNew && item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
    }
    onChange(items.filter(i => i.id !== id));
  };

  const handleDescricaoChange = (id: string, descricao: string) => {
    onChange(items.map(i => i.id === id ? { ...i, descricao } : i));
  };

  const handleSistemaChange = (id: string, sistemaAfetado: string) => {
    onChange(items.map(i => i.id === id ? { ...i, sistemaAfetado } : i));
  };

  // Function to upload all pending items
  const uploadAllPending = async (): Promise<MediaItem[]> => {
    setUploading(true);
    const uploaded: MediaItem[] = [];

    try {
      for (const item of items) {
        if (item.isNew && item.file) {
          const url = await uploadMedia(item);
          if (url) {
            uploaded.push({
              ...item,
              url,
              isNew: false,
              file: undefined,
            });
          } else {
            toast.error(`Erro ao enviar ${item.tipo}`);
          }
        } else {
          uploaded.push(item);
        }
      }
    } finally {
      setUploading(false);
    }

    return uploaded;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Câmera
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Galeria
        </Button>

        {uploading && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </span>
        )}
      </div>

      {/* Media Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="relative overflow-hidden">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 w-6 h-6"
                onClick={() => handleRemove(item.id)}
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </Button>

              <div className="aspect-square relative bg-muted">
                {item.tipo === 'foto' ? (
                  <img
                    src={item.url}
                    alt="Lesão"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
                <div className="absolute bottom-2 left-2">
                  {item.tipo === 'foto' ? (
                    <Image className="w-4 h-4 text-white drop-shadow-lg" />
                  ) : (
                    <Video className="w-4 h-4 text-white drop-shadow-lg" />
                  )}
                </div>
                {item.isNew && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded">
                    Pendente
                  </div>
                )}
              </div>

              <CardContent className="p-2 space-y-2">
                <Select
                  value={item.sistemaAfetado || ''}
                  onValueChange={(value) => handleSistemaChange(item.id, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sistema afetado" />
                  </SelectTrigger>
                  <SelectContent>
                    {SISTEMAS.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Descrição..."
                  value={item.descricao || ''}
                  onChange={(e) => handleDescricaoChange(item.id, e.target.value)}
                  className="h-8 text-xs"
                  disabled={disabled}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma mídia adicionada</p>
          <p className="text-xs">Toque nos botões acima para capturar</p>
        </div>
      )}
    </div>
  );
}

// Export function to upload all pending
export async function uploadPendingMedia(
  items: MediaItem[], 
  autopsiaId: string
): Promise<MediaItem[]> {
  const uploaded: MediaItem[] = [];

  for (const item of items) {
    if (item.isNew && item.file) {
      const fileExt = item.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `autopsias/${autopsiaId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('veterinario-midias')
        .upload(filePath, item.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('veterinario-midias')
        .getPublicUrl(filePath);

      uploaded.push({
        ...item,
        url: publicUrl,
        isNew: false,
        file: undefined,
      });
    } else {
      uploaded.push(item);
    }
  }

  return uploaded;
}
