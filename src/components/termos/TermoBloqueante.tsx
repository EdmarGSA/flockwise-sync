import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, FileCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTermoAceite, TipoTermo } from '@/hooks/useTermoAceite';
import { useAuth } from '@/hooks/useAuth';
import logoGSA from '@/assets/logo-gsa.png';

interface TermoBloqueanteProps {
  tipo: TipoTermo;
  onAceite: () => void;
}

export const TermoBloqueante = ({ tipo, onAceite }: TermoBloqueanteProps) => {
  const { signOut } = useAuth();
  const { termoAtivo, registrarAceite, loading } = useTermoAceite({ tipo });
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
    fetchIp();
  }, []);

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

  const handleSair = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!termoAtivo) {
    // Sem termo configurado, liberar acesso
    onAceite();
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={logoGSA} alt="Logo" className="h-12 w-auto" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">{termoAtivo.titulo}</CardTitle>
          <CardDescription>
            Versão {termoAtivo.versao} • Leia com atenção antes de prosseguir
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <ScrollArea className="h-[350px] rounded-lg border p-4">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: termoAtivo.conteudo_html }}
            />
          </ScrollArea>

          <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border">
            <Checkbox
              id="aceite-bloqueante"
              checked={aceitou}
              onCheckedChange={(checked) => setAceitou(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="aceite-bloqueante" 
              className="text-sm leading-relaxed cursor-pointer font-normal"
            >
              {termoAtivo.checkbox_texto}
            </Label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSair}
              disabled={salvando}
              className="flex-1 gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
            <Button
              onClick={handleAceitar}
              disabled={!aceitou || salvando}
              className="flex-1 gap-2"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Aceito e Concordo
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Ao aceitar, você concorda com todos os termos descritos acima.
            Seu aceite será registrado com data, hora e IP para fins de auditoria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
