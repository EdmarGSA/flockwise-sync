import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SupplierCheckResult {
  isSupplier: boolean | null;
  loading: boolean;
}

export const useSupplierCheck = (): SupplierCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const [isSupplier, setIsSupplier] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSupplier = async () => {
      if (authLoading) return;
      
      if (!user) {
        setIsSupplier(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('fornecedor_global_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar fornecedor:', error);
          setIsSupplier(false);
        } else {
          setIsSupplier(!!data?.fornecedor_global_id);
        }
      } catch (err) {
        console.error('Erro ao verificar fornecedor:', err);
        setIsSupplier(false);
      } finally {
        setLoading(false);
      }
    };

    checkSupplier();
  }, [user, authLoading]);

  return { isSupplier, loading: loading || authLoading };
};
