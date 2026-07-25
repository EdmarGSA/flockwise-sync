import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const provider = (session.user.app_metadata as any)?.provider;
          // OAuth (Google): se não tem profile, criar solicitação + cleanup + signOut
          if (provider === 'google') {
            setTimeout(async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', session.user.id)
                  .maybeSingle();

                if (!profile) {
                  // Cria solicitação a partir do email/nome do Google
                  const meta = session.user.user_metadata || {};
                  const email = session.user.email || '';
                  const fullName = (meta.full_name || meta.name || email.split('@')[0]) as string;

                  await supabase.from('solicitacoes_cadastro' as any).insert({
                    full_name: fullName,
                    email: email.toLowerCase(),
                    nome_organizacao: fullName,
                    origem: 'google_oauth',
                    status: 'pendente',
                  });

                  // Limpa o auth.users órfão
                  try { await supabase.functions.invoke('cleanup-unapproved-google-user'); } catch {}

                  await supabase.auth.signOut();
                  toast.info('Solicitação enviada', {
                    description: 'Sua conta Google ainda não foi aprovada. Te avisaremos por email assim que liberarmos.',
                  });
                  return;
                }
              } catch (e) {
                console.warn('Google OAuth check failed:', e);
              }
              // Tem profile → garante role admin se for owner
              try { await supabase.rpc('ensure_my_admin_role' as any); } catch {}
            }, 0);
          } else {
            setTimeout(() => {
              (supabase.rpc('ensure_my_admin_role' as any) as unknown as Promise<unknown>).catch(() => {});
            }, 0);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      // Preserva o destino solicitado (ex.: consentimento OAuth do MCP)
      const raw = new URLSearchParams(window.location.search).get('next');
      const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
      const { lovable } = await import('@/integrations/lovable/index');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: next
          ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
          : window.location.origin,
      });
      if (result.error) return { error: result.error as Error };
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
