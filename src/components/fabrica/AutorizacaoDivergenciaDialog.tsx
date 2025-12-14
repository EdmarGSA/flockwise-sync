import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Shield } from 'lucide-react';

interface Divergencia {
  id: string;
  tipo: 'quantidade' | 'preco' | 'condicao_pagamento' | 'produto_nao_previsto';
  descricao: string;
  produtoNome?: string;
  valorOc: number;
  valorNfe: number;
  valorFisico?: number;
  percentualDiferenca: number;
  critico: boolean;
}

interface AutorizacaoDivergenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divergencias: Divergencia[];
  onSuccess: (userId: string, justificativa: string) => void;
}

export default function AutorizacaoDivergenciaDialog({
  open,
  onOpenChange,
  divergencias,
  onSuccess
}: AutorizacaoDivergenciaDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAutorizar = async () => {
    if (!email || !password) {
      setError('Informe email e senha do administrador');
      return;
    }

    if (!justificativa.trim()) {
      setError('A justificativa é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Try to sign in with admin credentials
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        setError('Credenciais inválidas');
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        setError('Usuário não possui permissão de administrador');
        setLoading(false);
        return;
      }

      // Authorization successful
      toast.success('Autorização concedida!');
      onSuccess(authData.user.id, justificativa);
    } catch (error) {
      console.error('Erro na autorização:', error);
      setError('Erro ao verificar autorização');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            Autorização Gerencial
          </DialogTitle>
          <DialogDescription>
            Existem divergências que requerem aprovação de um administrador para prosseguir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Divergences summary */}
          <Card className="border-yellow-500/50 bg-yellow-50/10">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Divergências a serem autorizadas:
                </p>
                <ul className="space-y-1 text-sm">
                  {divergencias.map(div => (
                    <li key={div.id} className="flex items-center gap-2">
                      <Badge variant={div.critico ? 'destructive' : 'outline'} className="text-xs">
                        {div.tipo}
                      </Badge>
                      <span>{div.produtoNome}: {div.descricao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Admin credentials */}
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Credenciais do Administrador</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa *</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique o motivo da aceitação das divergências..."
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAutorizar} disabled={loading}>
            {loading ? 'Verificando...' : 'Autorizar e Continuar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
