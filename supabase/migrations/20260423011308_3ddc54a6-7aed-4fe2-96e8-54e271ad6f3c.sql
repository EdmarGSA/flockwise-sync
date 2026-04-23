
-- 1. Catálogo de tipos de evento
CREATE TABLE public.tipos_evento_notificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  severidade_padrao text NOT NULL DEFAULT 'info' CHECK (severidade_padrao IN ('info','warning','critical')),
  roles_padrao app_role[] NOT NULL DEFAULT ARRAY['admin','integrado']::app_role[],
  canais_padrao text[] NOT NULL DEFAULT ARRAY['push']::text[],
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_evento_notificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados leem tipos de evento"
  ON public.tipos_evento_notificacao FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Superadmin gerencia tipos de evento"
  ON public.tipos_evento_notificacao FOR ALL
  TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

-- 2. Preferências por usuário
CREATE TABLE public.preferencias_notificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento_codigo text NOT NULL REFERENCES public.tipos_evento_notificacao(codigo) ON DELETE CASCADE,
  push_ativo boolean NOT NULL DEFAULT true,
  email_ativo boolean NOT NULL DEFAULT false,
  whatsapp_ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo_evento_codigo)
);

ALTER TABLE public.preferencias_notificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprias preferências"
  ON public.preferencias_notificacao FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR is_superadmin())
  WITH CHECK (user_id = auth.uid() OR is_superadmin());

CREATE TRIGGER trg_preferencias_notificacao_updated
  BEFORE UPDATE ON public.preferencias_notificacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Caixa de entrada por usuário
CREATE TABLE public.notificacoes_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integrado_id uuid,
  tipo_evento_codigo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  severidade text NOT NULL DEFAULT 'info' CHECK (severidade IN ('info','warning','critical')),
  contexto jsonb,
  link text,
  lida boolean NOT NULL DEFAULT false,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_usuario_user ON public.notificacoes_usuario (user_id, lida, created_at DESC);
CREATE INDEX idx_notif_usuario_tipo ON public.notificacoes_usuario (tipo_evento_codigo, created_at DESC);

ALTER TABLE public.notificacoes_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprias notificações"
  ON public.notificacoes_usuario FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_superadmin());

CREATE POLICY "Usuário atualiza próprias notificações"
  ON public.notificacoes_usuario FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sistema/superadmin insere notificações"
  ON public.notificacoes_usuario FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Realtime
ALTER TABLE public.notificacoes_usuario REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes_usuario;

-- 5. Função genérica de dispatch
CREATE OR REPLACE FUNCTION public.dispatch_notificacao(
  p_codigo text,
  p_integrado_id uuid,
  p_titulo text,
  p_mensagem text DEFAULT NULL,
  p_contexto jsonb DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_severidade text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo RECORD;
  v_user RECORD;
  v_inserted integer := 0;
  v_severidade text;
BEGIN
  SELECT * INTO v_tipo FROM tipos_evento_notificacao WHERE codigo = p_codigo AND ativo = true;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_severidade := COALESCE(p_severidade, v_tipo.severidade_padrao);

  -- Selecionar usuários do integrado com papel default OU com preferência push ativa override
  FOR v_user IN
    SELECT DISTINCT p.id AS user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN preferencias_notificacao pn 
      ON pn.user_id = p.id AND pn.tipo_evento_codigo = p_codigo
    WHERE p.integrado_id = p_integrado_id
      AND ur.role = ANY(v_tipo.roles_padrao)
      AND COALESCE(pn.push_ativo, true) = true
  LOOP
    INSERT INTO notificacoes_usuario (
      user_id, integrado_id, tipo_evento_codigo, titulo, mensagem, severidade, contexto, link
    ) VALUES (
      v_user.user_id, p_integrado_id, p_codigo, p_titulo, p_mensagem, v_severidade, p_contexto, p_link
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- 6. Seed dos eventos iniciais
INSERT INTO public.tipos_evento_notificacao (codigo, nome, descricao, severidade_padrao, roles_padrao, canais_padrao) VALUES
  ('iot_offline', 'Dispositivo IoT offline', 'Dispositivo sem leituras por mais que o limite configurado', 'warning', ARRAY['admin','integrado']::app_role[], ARRAY['push']::text[]),
  ('iot_falha_comando', 'Falha de comando IoT', 'Automação enviou comando mas o relé não confirmou mudança de estado', 'critical', ARRAY['admin','integrado']::app_role[], ARRAY['push']::text[]),
  ('temperatura_fora_faixa', 'Temperatura fora da faixa', 'Lote com temperatura fora do ideal por período prolongado', 'critical', ARRAY['admin','integrado','criador']::app_role[], ARRAY['push']::text[]),
  ('vet_mortalidade_alta', 'Mortalidade acima do limite', 'Lote ultrapassou meta de mortalidade para a idade', 'critical', ARRAY['veterinario','admin','integrado']::app_role[], ARRAY['push']::text[]),
  ('vet_carencia_proxima', 'Carência de medicamento expirando', 'Período de carência se aproxima do fim', 'warning', ARRAY['veterinario','admin','integrado']::app_role[], ARRAY['push']::text[]);
