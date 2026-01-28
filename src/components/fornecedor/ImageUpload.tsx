import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  fornecedorGlobalId: string;
  produtoId?: string;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUpload({
  currentImageUrl,
  fornecedorGlobalId,
  produtoId,
  onImageChange,
  disabled = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP');
      return;
    }

    // Mostrar preview local
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Se não tem produtoId ainda (produto novo), guardar apenas o arquivo para upload posterior
    if (!produtoId) {
      // Converter para base64 para armazenar temporariamente
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Fazer upload
    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${fornecedorGlobalId}/${produtoId}.${fileExt}`;

      // Remover imagem anterior se existir
      await supabase.storage
        .from('catalogo-fornecedor')
        .remove([path]);

      // Upload novo arquivo
      const { error } = await supabase.storage
        .from('catalogo-fornecedor')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('catalogo-fornecedor')
        .getPublicUrl(path);

      // Adicionar timestamp para invalidar cache
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      setPreviewUrl(urlWithCache);
      onImageChange(urlWithCache);
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!produtoId || !currentImageUrl) {
      setPreviewUrl(null);
      onImageChange(null);
      return;
    }

    setUploading(true);
    try {
      // Tentar remover diferentes extensões
      const extensions = ['jpg', 'png', 'webp'];
      for (const ext of extensions) {
        const path = `${fornecedorGlobalId}/${produtoId}.${ext}`;
        await supabase.storage.from('catalogo-fornecedor').remove([path]);
      }

      setPreviewUrl(null);
      onImageChange(null);
      toast.success('Imagem removida');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Erro ao remover imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Foto do Produto</label>
      
      <div className="border-2 border-dashed rounded-lg overflow-hidden bg-muted/30">
        <AspectRatio ratio={1} className="relative">
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="object-cover w-full h-full"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Trocar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : (
                <ImageIcon className="h-10 w-10" />
              )}
              <span className="text-sm">
                {uploading ? 'Enviando...' : 'Clique para adicionar foto'}
              </span>
              <span className="text-xs">JPG, PNG ou WebP (máx. 2MB)</span>
            </button>
          )}
        </AspectRatio>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
}
