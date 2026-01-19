-- Tabela de versões de termos
CREATE TABLE public.termos_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('cliente_autorizacao', 'fornecedor_adesao')),
  versao text NOT NULL,
  titulo text NOT NULL,
  conteudo_html text NOT NULL,
  checkbox_texto text NOT NULL,
  ativo boolean DEFAULT true,
  data_vigencia timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Índice para buscar termo ativo por tipo
CREATE INDEX idx_termos_tipo_ativo ON public.termos_versoes(tipo, ativo);

-- Tabela de log de aceites (auditoria)
CREATE TABLE public.termos_aceites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  termo_versao_id uuid NOT NULL REFERENCES public.termos_versoes(id),
  tipo_termo text NOT NULL,
  aceito_em timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text,
  parceiro_id uuid REFERENCES public.parceiros(id),
  fornecedor_global_id uuid REFERENCES public.fornecedores_globais(id),
  conteudo_hash text,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_aceites_user ON public.termos_aceites(user_id);
CREATE INDEX idx_aceites_tipo ON public.termos_aceites(tipo_termo);
CREATE INDEX idx_aceites_termo_versao ON public.termos_aceites(termo_versao_id);
CREATE INDEX idx_aceites_parceiro ON public.termos_aceites(parceiro_id);

-- RLS para termos_versoes (todos podem ler, só admin pode modificar)
ALTER TABLE public.termos_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver termos ativos"
ON public.termos_versoes FOR SELECT
USING (ativo = true);

-- RLS para termos_aceites
ALTER TABLE public.termos_aceites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário pode ver seus próprios aceites"
ON public.termos_aceites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuário pode registrar seu aceite"
ON public.termos_aceites FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Função para verificar aceite vigente
CREATE OR REPLACE FUNCTION public.verificar_aceite_termo(
  p_user_id uuid,
  p_tipo_termo text,
  p_parceiro_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_versao_atual uuid;
  v_aceite_existe boolean;
BEGIN
  -- Buscar versão ativa do termo
  SELECT id INTO v_versao_atual
  FROM public.termos_versoes
  WHERE tipo = p_tipo_termo AND ativo = true
  ORDER BY data_vigencia DESC
  LIMIT 1;

  IF v_versao_atual IS NULL THEN
    RETURN true; -- Sem termo configurado = liberado
  END IF;

  -- Verificar se usuário aceitou esta versão
  IF p_parceiro_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.termos_aceites
      WHERE user_id = p_user_id
        AND termo_versao_id = v_versao_atual
        AND parceiro_id = p_parceiro_id
    ) INTO v_aceite_existe;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.termos_aceites
      WHERE user_id = p_user_id
        AND termo_versao_id = v_versao_atual
    ) INTO v_aceite_existe;
  END IF;

  RETURN v_aceite_existe;
END;
$$;

-- Inserir termos iniciais

-- Termo 1: Autorização do Cliente (ao vincular fornecedor)
INSERT INTO public.termos_versoes (tipo, versao, titulo, conteudo_html, checkbox_texto, ativo)
VALUES (
  'cliente_autorizacao',
  '1.0.0',
  'TERMO DE AUTORIZAÇÃO E INTEGRAÇÃO DE PARCEIRO',
  '<div class="space-y-4">
    <p class="text-muted-foreground">Ao habilitar o fornecedor indicado como parceiro no Sistema Cockpit, o <strong>CLIENTE</strong> declara estar ciente de que:</p>
    
    <div class="space-y-3">
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">1. Acesso a Dados</p>
        <p class="text-sm text-muted-foreground">Autoriza o compartilhamento de dados de produção, estoque e metas necessários para a integração logística e comercial.</p>
      </div>
      
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">2. Isenção do Sistema</p>
        <p class="text-sm text-muted-foreground">O sistema Cockpit atua apenas como ponte tecnológica. Não nos responsabilizamos por negociações, preços ou acordos comerciais firmados fora ou dentro da plataforma.</p>
      </div>
      
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">3. Segurança da Informação</p>
        <p class="text-sm text-muted-foreground">O CLIENTE é responsável por gerenciar quais usuários do fornecedor terão acesso às suas métricas, devendo revogar o acesso em caso de encerramento da parceria comercial.</p>
      </div>
    </div>
  </div>',
  'Declaro que li e autorizo o compartilhamento de dados de produção e estoque com o fornecedor indicado, ciente de que o Sistema Cockpit atua apenas como ponte tecnológica.',
  true
);

-- Termo 2: Adesão do Fornecedor (primeiro login)
INSERT INTO public.termos_versoes (tipo, versao, titulo, conteudo_html, checkbox_texto, ativo)
VALUES (
  'fornecedor_adesao',
  '1.0.0',
  'TERMO DE ADESÃO E RESPONSABILIDADE DO FORNECEDOR',
  '<div class="space-y-4">
    <p class="text-muted-foreground">Ao acessar o ambiente de parceiro do Sistema Cockpit, o <strong>FORNECEDOR</strong> concorda com as seguintes condições:</p>
    
    <div class="space-y-3">
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">1. Fidedignidade dos Dados</p>
        <p class="text-sm text-muted-foreground">O FORNECEDOR assume total responsabilidade civil e técnica pelas informações inseridas (prazos, notas fiscais, certificados de qualidade e indicadores zootécnicos).</p>
      </div>
      
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">2. Inexistência de Vínculo</p>
        <p class="text-sm text-muted-foreground">O uso desta plataforma não cria vínculo societário ou responsabilidade solidária entre o Cockpit e o FORNECEDOR. O sistema não audita a veracidade das informações prestadas pelo parceiro.</p>
      </div>
      
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">3. Uso de Credenciais</p>
        <p class="text-sm text-muted-foreground">O acesso é pessoal e intransferível. Qualquer ação realizada sob seu login será considerada de sua autoria para fins legais (Lei 12.965/2014 - Marco Civil da Internet).</p>
      </div>
      
      <div class="p-3 bg-muted/50 rounded-lg">
        <p class="font-semibold text-foreground">4. Propriedade Intelectual</p>
        <p class="text-sm text-muted-foreground">Os dados do cliente visualizados no Cockpit são confidenciais e protegidos pela LGPD, sendo proibido o uso para fins diversos da parceria aqui estabelecida.</p>
      </div>
    </div>
  </div>',
  'Declaro que li e concordo que o Sistema Cockpit é isento de responsabilidade sobre a veracidade dos dados inseridos nesta parceria, e que qualquer ação sob meu login será de minha autoria para fins legais.',
  true
);