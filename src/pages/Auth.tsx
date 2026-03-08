import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import logoGSA from "@/assets/logo-gsa.png";
import { z } from 'zod';

// Tradutor de erros do Supabase Auth
const translateAuthError = (message: string): string => {
  const errorMap: Record<string, string> = {
    "Password should contain at least one character of each": "A senha deve conter letras minúsculas, maiúsculas e números",
    "Password is known to be weak and easy to guess": "Esta senha é muito fraca e fácil de adivinhar",
    "password should be at least 6 characters": "Senha deve ter no mínimo 6 caracteres",
    "already registered": "Este email já está cadastrado",
    "user already registered": "Usuário já cadastrado",
    "invalid email": "Email inválido",
    "email rate limit exceeded": "Limite de tentativas excedido. Aguarde alguns minutos",
    "signup requires a valid password": "É necessário informar uma senha válida",
    "unable to validate email address": "Não foi possível validar o email",
    "email not confirmed": "Email não confirmado",
    "Invalid login credentials": "Email ou senha incorretos",
  };
  
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }
  return message;
};

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string()
    .min(8, { message: "Senha deve ter no mínimo 8 caracteres" })
    .regex(/[a-z]/, { message: "Senha deve conter pelo menos uma letra minúscula" })
    .regex(/[A-Z]/, { message: "Senha deve conter pelo menos uma letra maiúscula" })
    .regex(/[0-9]/, { message: "Senha deve conter pelo menos um número" }),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Password strength checker with requirements
const getPasswordStrength = (password: string): { 
  score: number; 
  label: string; 
  color: string;
  requirements: { met: boolean; text: string }[];
} => {
  const requirements = [
    { met: password.length >= 8, text: 'Mínimo 8 caracteres' },
    { met: /[a-z]/.test(password), text: 'Letra minúscula (a-z)' },
    { met: /[A-Z]/.test(password), text: 'Letra maiúscula (A-Z)' },
    { met: /[0-9]/.test(password), text: 'Número (0-9)' },
  ];
  
  const metCount = requirements.filter(r => r.met).length;
  
  if (metCount < 4) return { score: metCount, label: 'Incompleta', color: 'bg-destructive', requirements };
  return { score: 5, label: 'Forte', color: 'bg-green-500', requirements };
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  

  const passwordStrength = getPasswordStrength(password);

  // Redirecionamento é feito após login bem-sucedido em handleSubmit

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail.trim()) {
      toast.error("Email obrigatório", { description: "Informe o email para recuperar a senha." });
      return;
    }

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        toast.error("Erro", { description: error.message });
      } else {
        toast.success("Email enviado!", { description: "Verifique sua caixa de entrada para redefinir a senha." });
        setIsForgotPassword(false);
        setForgotEmail('');
      }
    } catch {
      toast.error("Erro", { description: "Ocorreu um erro ao enviar o email." });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error("Erro no login", { description: "Email ou senha incorretos." });
          } else {
            toast.error("Erro no login", { description: error.message });
          }
        } else {
          // Login bem-sucedido - verificar se é fornecedor
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('fornecedor_global_id, vendedor_fornecedor_id, senha_alterada')
              .eq('id', currentUser.id)
              .single();
            
            // Verificar se é vendedor do fornecedor
            if (profile?.vendedor_fornecedor_id) {
              // Buscar o fornecedor_global_id do vendedor
              const { data: vendedor } = await supabase
                .from('vendedores_fornecedor')
                .select('fornecedor_global_id')
                .eq('id', profile.vendedor_fornecedor_id)
                .single();
              
              if (vendedor?.fornecedor_global_id) {
                // Verificar se tem pelo menos um cliente ativo
                const { data: clientesAtivos } = await supabase
                  .from('parceiros')
                  .select('id')
                  .eq('fornecedor_global_id', vendedor.fornecedor_global_id)
                  .eq('ativo', true)
                  .limit(1);
                
                if (!clientesAtivos?.length) {
                  toast.error("Acesso bloqueado", { description: "Seu acesso ao portal foi suspenso. Entre em contato com seu fornecedor." });
                  await supabase.auth.signOut();
                  setIsLoading(false);
                  return;
                }
                
                // Aviso para trocar senha se necessário
                if (profile.senha_alterada === false) {
                  toast.info("Atenção", { description: "Recomendamos alterar sua senha padrão nas configurações." });
                }
                
                toast.success("Bem-vindo!", { description: "Acesso ao Portal do Fornecedor." });
                navigate('/portal-fornecedor');
                return;
              }
            }
            
            // Verificar se é fornecedor
            if (profile?.fornecedor_global_id) {
              // É fornecedor - verificar se tem pelo menos um cliente ativo
              const { data: clientesAtivos } = await supabase
                .from('parceiros')
                .select('id')
                .eq('fornecedor_global_id', profile.fornecedor_global_id)
                .eq('ativo', true)
                .limit(1);
              
              if (!clientesAtivos?.length) {
                toast.error("Acesso bloqueado", { description: "Seu acesso ao portal foi suspenso. Entre em contato com seu cliente." });
                await supabase.auth.signOut();
                setIsLoading(false);
                return;
              }
              
              // Redirecionar para portal do fornecedor
              if (profile.senha_alterada === false) {
                toast.info("Atenção", { description: "Recomendamos alterar sua senha padrão nas configurações." });
              }
              
              toast.success("Bem-vindo!", { description: "Acesso ao Portal do Fornecedor." });
              navigate('/portal-fornecedor');
            } else {
              // Usuário normal - redirecionar para home
              toast.success("Bem-vindo!", { description: "Login realizado com sucesso." });
              navigate('/home');
            }
          }
        }
      } else {
        const validation = signUpSchema.safeParse({ email, password, confirmPassword, fullName });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error("Erro no cadastro", { description: translateAuthError(error.message) });
        } else {
          toast.success("Conta criada!", { description: "Cadastro realizado com sucesso." });
          navigate('/home');
        }
      }
    } catch (error) {
      toast.error("Erro", { description: "Ocorreu um erro inesperado." });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forgot password view
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(145_60%_20%_/_0.15),transparent_70%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-md px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src={logoGSA} alt="GSA Tibiri" className="w-12 h-12 rounded-xl" />
              <span className="text-2xl font-bold text-foreground">
                GSA <span className="text-[#2E7D32]">Tibiri</span>
              </span>
            </div>
            <p className="text-muted-foreground">Recuperar senha</p>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-card border border-border/50 shadow-card">
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enviaremos um link para redefinir sua senha.
                </p>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSendingReset}
              >
                {isSendingReset ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Enviar link
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-primary hover:underline font-medium"
              >
                ← Voltar para o login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(145_60%_20%_/_0.15),transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src={logoGSA} alt="GSA Tibiri" className="w-12 h-12 rounded-xl" />
            <span className="text-2xl font-bold text-foreground">
              GSA <span className="text-[#2E7D32]">Tibiri</span>
            </span>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Form Card */}
        <div className="p-8 rounded-2xl bg-gradient-card border border-border/50 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              
              {/* Password requirements indicator - only on signup */}
              {!isLogin && password && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Requisitos da senha:</p>
                  <ul className="text-xs space-y-1">
                    {passwordStrength.requirements.map((req, i) => (
                      <li key={i} className={`flex items-center gap-1.5 ${req.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                        <span>{req.met ? '✓' : '○'}</span>
                        <span>{req.text}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-1 pt-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.score < 4 ? 'text-destructive' : 'text-green-500'
                  }`}>
                    Força: {passwordStrength.label}
                  </p>
                </div>
              )}
              
              {/* Forgot password link - only on login */}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </div>

            {/* Confirm password field - only on signup */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                  setConfirmPassword('');
                }}
                className="ml-2 text-primary hover:underline font-medium"
              >
                {isLogin ? 'Cadastre-se' : 'Faça login'}
              </button>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
