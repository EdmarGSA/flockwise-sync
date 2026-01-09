import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DigitalSignatureProps {
  onSignatureComplete: (url: string) => void;
  existingUrl?: string;
  disabled?: boolean;
  className?: string;
}

export default function DigitalSignature({
  onSignatureComplete,
  existingUrl,
  disabled = false,
  className,
}: DigitalSignatureProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setHasContent(false);
    }
  };

  const handleEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setHasContent(true);
    }
  };

  const handleConfirm = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      return;
    }

    setUploading(true);

    try {
      // Get signature as data URL
      const dataUrl = signatureRef.current.toDataURL('image/png');
      
      // Convert to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Upload to storage
      const fileName = `assinatura-${Date.now()}.png`;
      const filePath = `assinaturas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('veterinario-midias')
        .upload(filePath, blob, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('veterinario-midias')
        .getPublicUrl(filePath);

      onSignatureComplete(publicUrl);
    } catch (error) {
      console.error('Error uploading signature:', error);
    } finally {
      setUploading(false);
    }
  };

  if (existingUrl) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            Documento Assinado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-2">
            <img 
              src={existingUrl} 
              alt="Assinatura" 
              className="max-h-20 mx-auto"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Assinatura Digital</CardTitle>
        <CardDescription className="text-xs">
          Assine no espaço abaixo para confirmar a autenticidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          className={cn(
            "bg-white rounded-lg border-2 border-dashed transition-colors",
            isSigning ? "border-primary" : "border-gray-200"
          )}
        >
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              className: 'w-full h-32 rounded-lg',
              style: { touchAction: 'none' },
            }}
            penColor="black"
            backgroundColor="white"
            onBegin={() => setIsSigning(true)}
            onEnd={handleEnd}
            clearOnResize={false}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={disabled || uploading}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={disabled || uploading || !hasContent}
            className="gap-2 flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar Assinatura
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Ao assinar, você confirma a autenticidade deste documento.
        </p>
      </CardContent>
    </Card>
  );
}
