import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (nome: string) => Promise<{ apiKey: string; error: string | null }>;
}

export const ApiKeyDialog = ({ open, onClose, onGenerate }: ApiKeyDialogProps) => {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!nome.trim()) {
      toast.error('Informe um nome para a API Key');
      return;
    }

    setLoading(true);
    const { apiKey, error } = await onGenerate(nome.trim());
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      setGeneratedKey(apiKey);
      toast.success('API Key gerada com sucesso!');
    }
  };

  const handleCopy = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast.success('Chave copiada!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setNome('');
    setGeneratedKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {generatedKey ? 'API Key Gerada' : 'Nova API Key'}
          </DialogTitle>
          <DialogDescription>
            {generatedKey 
              ? 'Copie a chave abaixo. Ela só será exibida uma vez!'
              : 'Gere uma chave de API para integração com seu ERP local.'}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Esta chave só será exibida uma vez. Copie e guarde em local seguro.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Sua API Key</Label>
              <div className="flex gap-2">
                <Input 
                  value={generatedKey} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button onClick={handleCopy} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-2">Como usar:</p>
              <code className="block text-xs bg-background p-2 rounded">
                Header: X-API-Key: {generatedKey.substring(0, 16)}...
              </code>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da API Key</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Bridge Principal, Backup, etc."
              />
              <p className="text-xs text-muted-foreground">
                Um nome para identificar onde esta chave será usada.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {generatedKey ? (
            <Button onClick={handleClose}>
              Entendi, já copiei
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando...' : 'Gerar API Key'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
