import { Button } from '@/components/ui/button';
import { Eye, LogIn, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DemoBanner = () => {
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

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

  const handleExitDemo = async () => {
    await supabase.auth.signOut();
    setIsDemo(false);
    navigate('/auth');
  };

  if (!isDemo) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg bg-primary/90 hover:bg-primary"
          size="icon"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            <span className="hidden sm:inline">Você está no </span>
            <span className="font-bold">Modo Demonstração</span>
            <span className="hidden md:inline"> - Explore todas as funcionalidades!</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExitDemo}
            variant="secondary"
            size="sm"
            className="bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-sm"
          >
            <LogIn className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Criar minha conta</span>
            <span className="sm:hidden">Criar conta</span>
          </Button>
          
          <Button
            onClick={() => setIsMinimized(true)}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
