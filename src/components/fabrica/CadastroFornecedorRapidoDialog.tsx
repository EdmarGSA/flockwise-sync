import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, AlertCircle, CheckCircle } from 'lucide-react';

interface CadastroFornecedorRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cnpj: string;
  razaoSocial: string;
  integradoId: string;
  onSuccess: (parceiroId: string, razaoSocial: string) => void;
  onCancel: () => void;
}

export default function CadastroFornecedorRapidoDialog({
  open,
  onOpenChange,
  cnpj,
  razaoSocial,
  integradoId,
  onSuccess,
  onCancel
}: CadastroFornecedorRapidoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const handleCadastrar = async () => {
    setLoading(true);
    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');

      const { data, error } = await supabase
        .from('parceiros')
        .insert([{
          integrado_id: integradoId,
          tipo_pessoa: 'pj',
          tipo_cadastro: 'fornecedor',
          razao_social_nome: razaoSocial,
          nome_fantasia: nomeFantasia || null,
          cpf_cnpj: cnpjLimpo,
          telefone: telefone || null,
          email: email || null,
          ativo: true
        }])
        .select('id, razao_social_nome')
        .single();

      if (error) throw error;

      toast.success('Fornecedor cadastrado com sucesso!');
      onSuccess(data.id, data.razao_social_nome);
    } catch (error: any) {
      console.error('Erro ao cadastrar fornecedor:', error);
      if (error.code === '23505') {
        toast.error('CNPJ já cadastrado');
      } else {
        toast.error('Erro ao cadastrar fornecedor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Cadastrar Fornecedor
          </DialogTitle>
          <DialogDescription>
            Este fornecedor não está cadastrado. Complete as informações para continuar.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700">
            CNPJ não encontrado na base de fornecedores
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">CNPJ (extraído do XML)</Label>
            <Input
              value={formatCnpj(cnpj)}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Razão Social (extraída do XML)</Label>
            <Input
              value={razaoSocial}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Nome Fantasia (opcional)</Label>
            <Input
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Nome fantasia da empresa"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone (opcional)</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail (opcional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancelar}>
            Cancelar Recebimento
          </Button>
          <Button onClick={handleCadastrar} disabled={loading}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Cadastrando...' : 'Cadastrar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
