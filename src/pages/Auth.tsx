import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react';
import logoGSA from '@/assets/logo-gsa.png';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
});

const solicitacaoSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome obrigatório'),
  email: z.string().trim().email('Email inválido'),
  telefone: z.string().trim().optional(),
  nome_organizacao: z.string().trim().min(2, 'Nome da organização obrigatório'),
  cidade: z.string().trim().optional(),
  estado: z.string().trim().max(2, 'UF com 2 letras').optional(),
  tipo_producao: z.enum(['corte', 'postura', 'ambos']),
  mensagem: z.string().trim().max(1000).optional(),
});

const Auth = () => {
  const [tab, setTab] = useState<'entrar' | 'solicitar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Solicitação form state
  const [sol, setSol] = useState({
    full_name: '', email: '', telefone: '', nome_organizacao: '',
    cidade: '', estado: '', tipo_producao: 'corte' as 'corte' | 'postura' | 'ambos', mensagem: '',
  });
  const [solSubmitting, setSolSubmitting] = useState(false);
  const [solSent, setSolSent] = useState(false);
  const [solErrors, setSolErrors] = useState<Record<string, string>>({});

  const { signIn, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Email obrigatório'); return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) toast.error('Erro', { description: error.message });
      else {
        toast.success('Email enviado!', { description: 'Verifique sua caixa de entrada.' });
        setIsForgotPassword(false);
        setForgotEmail('');
      }
    } finally { setIsSendingReset(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fe: Record<string, string> = {};
      validation.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('Erro no login', { description: error.message.includes('Invalid login') ? 'Email ou senha incorretos.' : error.message });
        return;
      }
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('fornecedor_global_id, vendedor_fornecedor_id, senha_alterada')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (profile?.vendedor_fornecedor_id || profile?.fornecedor_global_id) {
        toast.success('Bem-vindo!', { description: 'Acesso ao Portal do Fornecedor.' });
        navigate('/portal-fornecedor');
      } else {
        toast.success('Bem-vindo!', { description: 'Login realizado com sucesso.' });
        navigate('/home');
      }
    } finally { setIsLoading(false); }
  };

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSolErrors({});
    const v = solicitacaoSchema.safeParse(sol);
    if (!v.success) {
      const fe: Record<string, string> = {};
      v.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setSolErrors(fe);
      return;
    }
    setSolSubmitting(true);
    try {
      const { error } = await supabase.from('solicitacoes_cadastro' as any).insert({
        full_name: sol.full_name.trim(),
        email: sol.email.trim().toLowerCase(),
        telefone: sol.telefone.trim() || null,
        nome_organizacao: sol.nome_organizacao.trim(),
        cidade: sol.cidade.trim() || null,
        estado: sol.estado.trim().toUpperCase() || null,
        tipo_producao: sol.tipo_producao,
        mensagem: sol.mensagem.trim() || null,
        origem: 'public_signup',
        status: 'pendente',
      });
      if (error) {
        if (error.code === '23505' || error.message?.includes('idx_solicitacoes_email_ativo')) {
          toast.error('Solicitação já existe', { description: 'Já há uma solicitação pendente para este email. Aguarde nossa análise.' });
        } else {
          toast.error('Erro ao enviar solicitação', { description: error.message });
        }
        return;
      }
      setSolSent(true);
    } finally { setSolSubmitting(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src={logoGSA} alt="GSA Tibiri" className="w-12 h-12 rounded-xl" />
              <span className="text-2xl font-bold text-foreground">GSA <span className="text-[#2E7D32]">Tibiri</span></span>
            </div>
            <p className="text-muted-foreground">Recuperar senha</p>
          </div>
          <div className="p-8 rounded-2xl bg-gradient-card border border-border/50 shadow-card">
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="forgotEmail" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" placeholder="seu@email.com" />
                </div>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSendingReset}>
                {isSendingReset ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enviar link <ArrowRight className="w-5 h-5" /></>}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button type="button" onClick={() => setIsForgotPassword(false)} className="text-primary hover:underline font-medium">← Voltar para o login</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12">
      <Helmet>
        <title>Acesso | GSA Tibiri</title>
        <meta name="description" content="Entre na sua conta GSA Tibiri ou solicite acesso à plataforma." />
        <link rel="canonical" href="https://gsatibiri.com/auth" />
      </Helmet>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(145_60%_20%_/_0.15),transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src={logoGSA} alt="GSA Tibiri" className="w-12 h-12 rounded-xl" />
            <span className="text-2xl font-bold text-foreground">GSA <span className="text-[#2E7D32]">Tibiri</span></span>
          </div>
          <p className="text-muted-foreground">Plataforma de gestão avícola</p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-card border border-border/50 shadow-card">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="solicitar">Solicitar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-primary hover:underline">Esqueci minha senha</button>
                  </div>
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Entrar <ArrowRight className="w-5 h-5" /></>}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" /><span className="text-xs text-muted-foreground">ou</span><div className="h-px flex-1 bg-border/60" />
              </div>

              <Button type="button" variant="outline" size="lg" className="w-full" disabled={isLoading}
                onClick={async () => {
                  const { error } = await signInWithGoogle();
                  if (error) toast.error('Erro ao entrar com Google', { description: error.message });
                }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Continuar com Google
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Login com Google só funciona para contas já aprovadas. Novos usuários devem solicitar acesso.
              </p>
            </TabsContent>

            <TabsContent value="solicitar">
              {solSent ? (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                  <h2 className="text-xl font-semibold text-foreground">Solicitação recebida!</h2>
                  <p className="text-muted-foreground text-sm">
                    Nossa equipe analisará seu cadastro em breve. Você receberá um email com o link de acesso assim que for aprovado.
                  </p>
                  <Button variant="outline" onClick={() => { setSolSent(false); setSol({ full_name: '', email: '', telefone: '', nome_organizacao: '', cidade: '', estado: '', tipo_producao: 'corte', mensagem: '' }); setTab('entrar'); }}>
                    Voltar para login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSolicitar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sol_full_name">Nome completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input id="sol_full_name" value={sol.full_name} onChange={e => setSol({ ...sol, full_name: e.target.value })} className="pl-10" />
                    </div>
                    {solErrors.full_name && <p className="text-sm text-destructive">{solErrors.full_name}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sol_email">Email *</Label>
                      <Input id="sol_email" type="email" value={sol.email} onChange={e => setSol({ ...sol, email: e.target.value })} />
                      {solErrors.email && <p className="text-sm text-destructive">{solErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sol_telefone">Telefone</Label>
                      <Input id="sol_telefone" value={sol.telefone} onChange={e => setSol({ ...sol, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sol_org">Nome da organização / granja *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input id="sol_org" value={sol.nome_organizacao} onChange={e => setSol({ ...sol, nome_organizacao: e.target.value })} className="pl-10" />
                    </div>
                    {solErrors.nome_organizacao && <p className="text-sm text-destructive">{solErrors.nome_organizacao}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="sol_cidade">Cidade</Label>
                      <Input id="sol_cidade" value={sol.cidade} onChange={e => setSol({ ...sol, cidade: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sol_estado">UF</Label>
                      <Input id="sol_estado" maxLength={2} value={sol.estado} onChange={e => setSol({ ...sol, estado: e.target.value.toUpperCase() })} placeholder="PR" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de produção *</Label>
                    <Select value={sol.tipo_producao} onValueChange={(v) => setSol({ ...sol, tipo_producao: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corte">Frango de corte</SelectItem>
                        <SelectItem value="postura">Postura</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sol_msg">Mensagem (opcional)</Label>
                    <Textarea id="sol_msg" rows={3} value={sol.mensagem} onChange={e => setSol({ ...sol, mensagem: e.target.value })} placeholder="Conte um pouco sobre sua operação..." />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={solSubmitting}>
                    {solSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enviar solicitação <ArrowRight className="w-5 h-5" /></>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Sua solicitação será analisada pela equipe GSA Tibiri.
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar para a página inicial</a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
