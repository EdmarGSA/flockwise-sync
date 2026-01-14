import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DemoContextType {
  isDemo: boolean;
  isDemoLoading: boolean;
  enterDemoMode: () => Promise<boolean>;
  exitDemoMode: () => Promise<void>;
  showDemoToast: (action: string) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [isDemo, setIsDemo] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { toast } = useToast();

  // Check if current user is a demo user
  useEffect(() => {
    const checkDemoStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_demo')
          .eq('id', session.user.id)
          .single();
        
        setIsDemo(profile?.is_demo ?? false);
      } else {
        setIsDemo(false);
      }
    };

    checkDemoStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to defer Supabase call
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_demo')
            .eq('id', session.user.id)
            .single();
          
          setIsDemo(profile?.is_demo ?? false);
        }, 0);
      } else {
        setIsDemo(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const enterDemoMode = async (): Promise<boolean> => {
    setIsDemoLoading(true);
    
    try {
      // Login com usuário demo compartilhado
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'demo@gsatibiri.com.br',
        password: 'demo123456'
      });
      
      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('Falha ao criar sessão demo');
      }

      const userId = authData.user.id;

      // Verificar se dados demo já existem
      const { data: existingData } = await supabase
        .from('nucleos')
        .select('id')
        .eq('integrado_id', userId)
        .limit(1);

      // Só inicializa se não houver dados
      if (!existingData || existingData.length === 0) {
        // Initialize demo data
        await supabase.rpc('initialize_demo_data', {
          p_user_id: userId,
          p_integrado_id: userId
        });

        // Initialize demo lots (needs areas to be created first)
        await supabase.rpc('initialize_demo_lotes', {
          p_integrado_id: userId
        });
      }

      setIsDemo(true);
      
      toast({
        title: "Bem-vindo ao modo demonstração!",
        description: "Explore todas as funcionalidades do sistema com dados acumulados.",
      });

      return true;
    } catch (error: any) {
      console.error('Error entering demo mode:', error);
      toast({
        title: "Erro ao entrar no modo demo",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDemoLoading(false);
    }
  };

  const exitDemoMode = async () => {
    try {
      await supabase.auth.signOut();
      setIsDemo(false);
      
      toast({
        title: "Você saiu do modo demonstração",
        description: "Crie sua conta para começar a usar o sistema.",
      });
    } catch (error: any) {
      console.error('Error exiting demo mode:', error);
    }
  };

  const showDemoToast = (action: string) => {
    toast({
      title: "Modo Demonstração",
      description: `Para ${action}, crie sua conta gratuita.`,
    });
  };

  return (
    <DemoContext.Provider value={{ isDemo, isDemoLoading, enterDemoMode, exitDemoMode, showDemoToast }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
