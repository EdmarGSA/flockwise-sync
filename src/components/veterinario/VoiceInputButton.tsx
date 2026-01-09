import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Clipboard, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscriptChange: (text: string) => void;
  currentText?: string;
  className?: string;
  disabled?: boolean;
}

export default function VoiceInputButton({ 
  onTranscriptChange, 
  currentText = '',
  className,
  disabled = false 
}: VoiceInputButtonProps) {
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  } = useVoiceRecognition();

  // Update parent when transcript changes
  useEffect(() => {
    if (transcript) {
      onTranscriptChange(currentText + transcript);
    }
  }, [transcript]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleClear = () => {
    resetTranscript();
    onTranscriptChange('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onTranscriptChange(currentText + text);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  if (!isSupported) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Voz não suportada neste navegador
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "gap-2 transition-all",
          isListening && "animate-pulse"
        )}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4" />
            <span className="hidden sm:inline">Parar</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Gravar</span>
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handlePaste}
        disabled={disabled}
        title="Colar do clipboard"
      >
        <Clipboard className="w-4 h-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClear}
        disabled={disabled || !currentText}
        title="Limpar"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {isListening && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Gravando...
        </span>
      )}

      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
