import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Loader2, FileCheck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useTermoAceite, TipoTermo } from '@/hooks/useTermoAceite';

interface TermoAceiteDialogProps {
  tipo: TipoTermo;
  parceiroId?: string | null;
  parceiroNome?: string;
  open: boolean;
  onAceite: () => void;
  onRecusar?: () => void;
  bloqueante?: boolean; // Se true, não pode fechar sem aceitar
}

export const TermoAceiteDialog = ({
  tipo,
  parceiroId,
  parceiroNome,
  open,
  onAceite,
  onRecusar,
  bloqueante = false,
}: TermoAceiteDialogProps) => {
  const { termoAtivo, registrarAceite, loading } = useTermoAceite({ tipo, parceiroId });
  const [aceitou, setAceitou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ipAddress, setIpAddress] = useState<string | undefined>();

  // Buscar IP do usuário
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIpAddress(data.ip);
      } catch (err) {
        console.warn('Não foi possível obter IP:', err);
      }
    };
    
    if (open) {
      fetchIp();
    }
  }, [open]);

  const handleAceitar = async () => {
    if (!aceitou) {
      toast.error('Você precisa marcar a declaração para continuar');
      return;
    }

    setSalvando(true);
    try {
      const success = await registrarAceite(ipAddress);
      if (success) {
        toast.success('Termo aceito com sucesso!');
        onAceite();
      } else {
        toast.error('Erro ao registrar aceite. Tente novamente.');
      }
    } catch (err) {
      toast.error('Erro ao registrar aceite');
    } finally {
      setSalvando(false);
    }
  };

  const handleRecusar = () => {
    if (bloqueante) {
      toast.warning('Você precisa aceitar os termos para continuar');
      return;
    }
    onRecusar?.();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && bloqueante) {
      toast.warning('Você precisa aceitar os termos para continuar');
      return;
    }
    if (!isOpen) {
      onRecusar?.();
    }
  };

  if (loading || !termoAtivo) {
    return null;
  }

  // Substituir placeholder do nome do fornecedor no conteúdo
  let conteudoFormatado = termoAtivo.conteudo_html;
  if (parceiroNome) {
    conteudoFormatado = conteudoFormatado.replace(
      /o fornecedor indicado/gi,
      `o fornecedor <strong>${parceiroNome}</strong>`
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{termoAtivo.titulo}</DialogTitle>
              <DialogDescription>
                Versão {termoAtivo.versao} • Leia com atenção antes de prosseguir
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 my-4 max-h-[400px]">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: conteudoFormatado }}
          />
        </ScrollArea>

        <div className="flex-shrink-0 space-y-4 border-t pt-4">
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border">
            <Checkbox
              id="aceite"
              checked={aceitou}
              onCheckedChange={(checked) => setAceitou(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="aceite" 
              className="text-sm leading-relaxed cursor-pointer font-normal"
            >
              {termoAtivo.checkbox_texto}
            </Label>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!bloqueante && (
              <Button
                variant="outline"
                onClick={handleRecusar}
                disabled={salvando}
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleAceitar}
              disabled={!aceitou || salvando}
              className="gap-2"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Aceito e Autorizo
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
