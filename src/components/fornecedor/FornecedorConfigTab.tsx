import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, CheckCircle2, XCircle, Shield } from 'lucide-react';

export const FornecedorConfigTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validações de senha
  const hasMinLength = novaSenha.length >= 8;
  const hasLowerCase = /[a-z]/.test(novaSenha);
  const hasUpperCase = /[A-Z]/.test(novaSenha);
  const hasNumber = /[0-9]/.test(novaSenha);
  const passwordsMatch = novaSenha === confirmarSenha && confirmarSenha.length > 0;
  const isValidPassword = hasMinLength && hasLowerCase && hasUpperCase && hasNumber;

  const handleTrocarSenha = async () => {
    if (!senhaAtual) {
      toast({
        title: "Erro",
        description: "Informe a senha atual.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidPassword) {
      toast({
        title: "Erro",
        description: "A nova senha não atende aos requisitos de segurança.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Primeiro, verificar a senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: senhaAtual,
      });

      if (signInError) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar senha: " + updateError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Marcar senha_alterada como true no perfil
      await supabase
        .from('profiles')
        .update({ senha_alterada: true })
        .eq('id', user?.id);

      toast({
        title: "Sucesso!",
        description: "Sua senha foi alterada com sucesso.",
      });

      // Limpar formulário
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={met ? 'text-green-600' : 'text-muted-foreground'}>{text}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Mantenha sua conta segura atualizando sua senha regularmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Senha Atual */}
          <div className="space-y-2">
            <Label htmlFor="senha-atual">Senha Atual</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="senha-atual"
                type={showSenhaAtual ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="pl-10 pr-10"
                placeholder="Digite sua senha atual"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSenhaAtual(!showSenhaAtual)}
              >
                {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="nova-senha"
                type={showNovaSenha ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="pl-10 pr-10"
                placeholder="Digite a nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
              >
                {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Requisitos de senha */}
          {novaSenha.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium mb-2">Requisitos da senha:</p>
              <PasswordRequirement met={hasMinLength} text="Mínimo 8 caracteres" />
              <PasswordRequirement met={hasLowerCase} text="Uma letra minúscula" />
              <PasswordRequirement met={hasUpperCase} text="Uma letra maiúscula" />
              <PasswordRequirement met={hasNumber} text="Um número" />
            </div>
          )}

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmar-senha"
                type={showConfirmarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="pl-10 pr-10"
                placeholder="Confirme a nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
              >
                {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmarSenha.length > 0 && !passwordsMatch && (
              <p className="text-sm text-destructive">As senhas não coincidem</p>
            )}
            {passwordsMatch && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Senhas coincidem
              </p>
            )}
          </div>

          <Button 
            onClick={handleTrocarSenha}
            disabled={isLoading || !isValidPassword || !passwordsMatch || !senhaAtual}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </CardContent>
      </Card>

      {/* Informações da conta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
