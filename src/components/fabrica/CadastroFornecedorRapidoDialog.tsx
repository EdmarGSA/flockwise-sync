import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Building2, AlertCircle, CheckCircle, Search, Loader2, Copy, Key } from 'lucide-react';

interface CadastroFornecedorRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cnpj: string;
  razaoSocial: string;
  integradoId: string;
  onSuccess: (parceiroId: string, razaoSocial: string) => void;
  onCancel: () => void;
}

// Zod schema for BrasilAPI response validation
const brasilApiSchema = z.object({
  razao_social: z.string().max(255).optional().nullable(),
  nome_fantasia: z.string().max(255).optional().nullable(),
  email: z.string().max(255).optional().nullable(),
  ddd_telefone_1: z.string().max(20).optional().nullable(),
  cep: z.string().max(10).optional().nullable(),
  logradouro: z.string().max(255).optional().nullable(),
  numero: z.string().max(20).optional().nullable(),
  complemento: z.string().max(100).optional().nullable(),
  bairro: z.string().max(100).optional().nullable(),
  municipio: z.string().max(100).optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  codigo_municipio_ibge: z.union([z.string(), z.number()]).optional().nullable()
});

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
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  
  // Form fields
  const [razaoSocialEdit, setRazaoSocialEdit] = useState(razaoSocial);
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [codigoIbge, setCodigoIbge] = useState('');

  // Credentials dialog
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCep = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const searchCnpj = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }

    setSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!response.ok) {
        toast.error("CNPJ não encontrado na Receita Federal");
        return;
      }

      const rawData = await response.json();

      // Validate response structure with Zod
      const result = brasilApiSchema.safeParse(rawData);
      if (!result.success) {
        console.error('CNPJ validation error:', result.error);
        toast.error("Resposta inválida da API de CNPJ");
        return;
      }

      const data = result.data;

      // Auto-fill form fields
      if (data.razao_social) setRazaoSocialEdit(data.razao_social);
      if (data.nome_fantasia) setNomeFantasia(data.nome_fantasia);
      if (data.ddd_telefone_1) {
        const tel = data.ddd_telefone_1.replace(/\D/g, '');
        setTelefone(formatPhone(tel));
      }
      if (data.email) setEmail(data.email.toLowerCase());
      if (data.cep) setCep(formatCep(data.cep));
      if (data.logradouro) setLogradouro(data.logradouro);
      if (data.numero) setNumero(data.numero);
      if (data.bairro) setBairro(data.bairro);
      if (data.municipio) setCidade(data.municipio);
      if (data.uf) setEstado(data.uf);
      if (data.codigo_municipio_ibge) setCodigoIbge(String(data.codigo_municipio_ibge));

      toast.success("Dados do CNPJ encontrados!");
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error("Erro ao buscar CNPJ na Receita Federal");
    } finally {
      setSearchingCnpj(false);
    }
  };

  const handleCadastrar = async () => {
    if (!razaoSocialEdit.trim()) {
      toast.error('Razão Social é obrigatória');
      return;
    }

    if (!email.trim()) {
      toast.error('Email é obrigatório para criar acesso do fornecedor ao portal');
      return;
    }

    setLoading(true);
    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');

      // Call edge function to create/find global supplier and user
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-supplier-user', {
        body: {
          cpf_cnpj: cnpjLimpo,
          razao_social_nome: razaoSocialEdit.trim(),
          nome_fantasia: nomeFantasia.trim() || null,
          email: email.trim().toLowerCase(),
          telefone: telefone.replace(/\D/g, '') || null,
        },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error('Erro ao criar acesso do fornecedor');
      }

      if (!fnData?.success) {
        throw new Error(fnData?.message || 'Erro ao criar acesso do fornecedor');
      }

      const fornecedorGlobalId = fnData.fornecedor_global_id;

      // If new user was created, save credentials to show
      if (fnData.is_new_user && fnData.credentials) {
        setCredentials(fnData.credentials);
      }

      // Insert into parceiros WITH fornecedor_global_id
      const { data, error } = await supabase
        .from('parceiros')
        .insert([{
          integrado_id: integradoId,
          tipo_pessoa: 'pj',
          tipo_cadastro: 'fornecedor',
          razao_social_nome: razaoSocialEdit.trim(),
          nome_fantasia: nomeFantasia.trim() || null,
          cpf_cnpj: cnpjLimpo,
          telefone: telefone.replace(/\D/g, '') || null,
          email: email.trim().toLowerCase() || null,
          cep: cep.replace(/\D/g, '') || null,
          logradouro: logradouro.trim() || null,
          numero: numero.trim() || null,
          bairro: bairro.trim() || null,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
          codigo_ibge: codigoIbge || null,
          fornecedor_global_id: fornecedorGlobalId,
          ativo: true
        }])
        .select('id, razao_social_nome')
        .single();

      if (error) throw error;

      // Show credentials dialog if new user was created
      if (fnData.is_new_user && fnData.credentials) {
        setShowCredentialsDialog(true);
      } else {
        toast.success('Fornecedor cadastrado com sucesso!');
        onSuccess(data.id, data.razao_social_nome);
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar fornecedor:', error);
      if (error.code === '23505') {
        toast.error('CNPJ já cadastrado nesta organização');
      } else {
        toast.error(error.message || 'Erro ao cadastrar fornecedor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleCredentialsClose = () => {
    setShowCredentialsDialog(false);
    setCredentials(null);
    toast.success('Fornecedor cadastrado com sucesso!');
    // Need to call onSuccess after closing credentials dialog
    // We'll refetch the parceiro to get the id
    supabase
      .from('parceiros')
      .select('id, razao_social_nome')
      .eq('integrado_id', integradoId)
      .eq('cpf_cnpj', cnpj.replace(/\D/g, ''))
      .single()
      .then(({ data }) => {
        if (data) {
          onSuccess(data.id, data.razao_social_nome);
        }
      });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Credentials Dialog
  if (showCredentialsDialog && credentials) {
    return (
      <Dialog open={true} onOpenChange={() => handleCredentialsClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Key className="w-5 h-5" />
              Acesso do Fornecedor Criado
            </DialogTitle>
            <DialogDescription>
              Anote ou copie as credenciais abaixo para informar ao fornecedor. 
              A senha deverá ser alterada no primeiro acesso.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Fornecedor cadastrado com acesso ao Portal!
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email de acesso</Label>
              <div className="flex gap-2">
                <Input value={credentials.email} readOnly className="bg-muted" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentials.email, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Senha provisória</Label>
              <div className="flex gap-2">
                <Input value={credentials.password} readOnly className="bg-muted font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentials.password, 'Senha')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCredentialsClose} className="w-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              Entendi, Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* CNPJ with search button */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">CNPJ (extraído do XML)</Label>
            <div className="flex gap-2">
              <Input
                value={formatCnpj(cnpj)}
                readOnly
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={searchCnpj}
                disabled={searchingCnpj}
                className="shrink-0"
              >
                {searchingCnpj ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar CNPJ
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Razão Social (editable) */}
          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input
              value={razaoSocialEdit}
              onChange={(e) => setRazaoSocialEdit(e.target.value)}
              placeholder="Razão social da empresa"
            />
          </div>

          {/* Nome Fantasia */}
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Nome fantasia da empresa"
            />
          </div>

          {/* Contact fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                required
              />
            </div>
          </div>

          {/* Address fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-1">
              <Label>CEP</Label>
              <Input
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Cidade / UF</Label>
              <div className="flex gap-2">
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="flex-1"
                />
                <Input
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                  className="w-16"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2 col-span-3">
              <Label>Logradouro</Label>
              <Input
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Rua, Avenida..."
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>Número</Label>
              <Input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Nº"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Bairro"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancelar}>
            Cancelar Recebimento
          </Button>
          <Button onClick={handleCadastrar} disabled={loading || !razaoSocialEdit.trim() || !email.trim()}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Cadastrando...' : 'Cadastrar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
