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
      const dataUrl = signatureRef.current.toDataURL('image/png');
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();

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
          <div className="bg-white rounded-lg p-3">
            <img 
              src={existingUrl} 
              alt="Assinatura" 
              className="max-h-24 mx-auto"
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
          Assine no espaço abaixo para confirmar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          className={cn(
            "bg-white rounded-xl border-2 border-dashed transition-colors overflow-hidden",
            isSigning ? "border-primary" : "border-gray-300"
          )}
        >
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              className: 'w-full rounded-xl',
              style: { 
                touchAction: 'none',
                height: '200px',
                width: '100%',
              },
            }}
            penColor="black"
            minWidth={2}
            maxWidth={4}
            backgroundColor="white"
            onBegin={() => setIsSigning(true)}
            onEnd={handleEnd}
            clearOnResize={false}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={disabled || uploading}
            className="h-12 gap-2 text-base"
          >
            <Trash2 className="w-5 h-5" />
            Limpar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={disabled || uploading || !hasContent}
            className="h-12 gap-2 text-base"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirmar
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
