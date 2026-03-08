import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShieldCheck, Play } from 'lucide-react';

export default function BackofficeFerramentas() {
  const [userId, setUserId] = useState('');
  const [promoting, setPromoting] = useState(false);

  const handlePromote = async () => {
    if (!userId.trim()) return;
    setPromoting(true);
    try {
      // Check if already superadmin
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId.trim())
        .eq('role', 'superadmin' as any)
        .maybeSingle();

      if (existing) {
        toast.info('Já é superadmin', { description: 'Este usuário já possui a role superadmin.' });
        setPromoting(false);
        return;
      }

      // Verify user exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId.trim())
        .maybeSingle();

      if (!profile) {
        toast.error('Usuário não encontrado', { description: 'Verifique o ID informado.' });
        setPromoting(false);
        return;
      }

      const { error } = await supabase.from('user_roles').insert({ user_id: profile.id, role: 'superadmin' } as any);
      if (error) throw error;

      toast({ title: `${profile.full_name || 'Usuário'} promovido a superadmin!` });
      setUserId('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Ferramentas</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Promover a Superadmin
            </CardTitle>
            <CardDescription>Conceder acesso de superadmin pelo ID do usuário (copie da aba Usuários)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="ID do usuário (UUID)" value={userId} onChange={e => setUserId(e.target.value)} />
            <Button onClick={handlePromote} disabled={promoting || !userId.trim()}>
              {promoting ? 'Promovendo...' : 'Promover'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Demo Setup
            </CardTitle>
            <CardDescription>Criar dados demo para uma granja de teste</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Use a funcionalidade de demo existente no sistema para criar dados de demonstração.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
