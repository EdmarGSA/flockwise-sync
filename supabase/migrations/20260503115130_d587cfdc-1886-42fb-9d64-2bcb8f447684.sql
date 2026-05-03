
-- 1) Audit table
CREATE TABLE IF NOT EXISTS public.security_definer_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  called_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  integrado_id uuid,
  function_name text NOT NULL,
  key_param text,
  extra jsonb
);

CREATE INDEX IF NOT EXISTS idx_secdef_audit_called_at ON public.security_definer_audit_log (called_at DESC);
CREATE INDEX IF NOT EXISTS idx_secdef_audit_user ON public.security_definer_audit_log (user_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_secdef_audit_function ON public.security_definer_audit_log (function_name, called_at DESC);

ALTER TABLE public.security_definer_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can read audit log" ON public.security_definer_audit_log;
CREATE POLICY "Superadmins can read audit log"
ON public.security_definer_audit_log FOR SELECT TO authenticated
USING (is_superadmin());

-- No INSERT/UPDATE/DELETE policies: only SECURITY DEFINER helper can write.
REVOKE ALL ON TABLE public.security_definer_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.security_definer_audit_log TO authenticated;

-- 2) Logging helper
CREATE OR REPLACE FUNCTION public.log_secdef_call(
  p_function_name text,
  p_key_param text DEFAULT NULL,
  p_extra jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_definer_audit_log (user_id, integrado_id, function_name, key_param, extra)
  VALUES (auth.uid(), get_my_integrado_id(), p_function_name, p_key_param, p_extra);
EXCEPTION WHEN OTHERS THEN
  -- never break the caller because of audit logging
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_secdef_call(text, text, jsonb) FROM PUBLIC, anon, authenticated;
-- Only callable by other SECURITY DEFINER functions (postgres role) — no GRANT to authenticated.

-- 3) Instrument sensitive functions
CREATE OR REPLACE FUNCTION public.reservar_estoque_ovos_fifo(p_integrado_id uuid, p_tipo_ovo tipo_ovo, p_classificacao classificacao_peso_ovo, p_quantidade_unidades integer, p_pedido_item_ovo_id uuid)
 RETURNS TABLE(estoque_id uuid, lote_interno text, quantidade_reservada integer, data_producao date, data_validade date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_restante INTEGER := p_quantidade_unidades;
  v_estoque RECORD;
  v_reserva INTEGER;
BEGIN
  IF p_integrado_id != get_my_integrado_id() THEN
    RAISE EXCEPTION 'Access denied: integrado_id mismatch';
  END IF;

  PERFORM public.log_secdef_call(
    'reservar_estoque_ovos_fifo',
    p_pedido_item_ovo_id::text,
    jsonb_build_object('tipo_ovo', p_tipo_ovo, 'classificacao', p_classificacao, 'qtd', p_quantidade_unidades)
  );

  FOR v_estoque IN
    SELECT e.id, e.lote_interno, e.quantidade_atual - e.quantidade_reservada AS disponivel,
           e.data_producao, e.data_validade
    FROM public.estoque_ovos e
    WHERE e.integrado_id = p_integrado_id
      AND e.tipo_ovo = p_tipo_ovo
      AND e.classificacao_peso = p_classificacao
      AND e.ativo = true
      AND e.data_validade > CURRENT_DATE
      AND (e.quantidade_atual - e.quantidade_reservada) > 0
    ORDER BY e.data_producao ASC, e.data_validade ASC
  LOOP
    EXIT WHEN v_restante <= 0;
    v_reserva := LEAST(v_estoque.disponivel, v_restante);
    UPDATE public.estoque_ovos SET quantidade_reservada = quantidade_reservada + v_reserva WHERE id = v_estoque.id;
    INSERT INTO public.reserva_estoque_ovos (
      pedido_item_ovo_id, estoque_ovo_id, quantidade_reservada, lote_interno, data_producao, data_validade
    ) VALUES (
      p_pedido_item_ovo_id, v_estoque.id, v_reserva, v_estoque.lote_interno, v_estoque.data_producao, v_estoque.data_validade
    );
    estoque_id := v_estoque.id;
    lote_interno := v_estoque.lote_interno;
    quantidade_reservada := v_reserva;
    data_producao := v_estoque.data_producao;
    data_validade := v_estoque.data_validade;
    RETURN NEXT;
    v_restante := v_restante - v_reserva;
  END LOOP;

  IF v_restante > 0 THEN
    RAISE WARNING 'Estoque insuficiente. Faltam % unidades', v_restante;
  END IF;

  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_lote_interno_ovos(p_integrado_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
  v_lote TEXT;
BEGIN
  IF p_integrado_id != get_my_integrado_id() THEN
    RAISE EXCEPTION 'Access denied: integrado_id mismatch';
  END IF;

  v_ano := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(lote_interno FROM 'OV-' || v_ano || '-(\d+)') AS INTEGER)), 0) + 1
  INTO v_seq
  FROM public.estoque_ovos
  WHERE integrado_id = p_integrado_id AND lote_interno LIKE 'OV-' || v_ano || '-%';
  v_lote := 'OV-' || v_ano || '-' || LPAD(v_seq::TEXT, 4, '0');

  PERFORM public.log_secdef_call('gerar_lote_interno_ovos', v_lote, NULL);
  RETURN v_lote;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_programas_iluminacao_default(p_integrado_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_corte UUID;
  v_postura UUID;
BEGIN
  PERFORM public.log_secdef_call('seed_programas_iluminacao_default', p_integrado_id::text, NULL);

  IF NOT EXISTS (SELECT 1 FROM programa_iluminacao_lote
                 WHERE integrado_id = p_integrado_id AND tipo_producao = 'frango_corte' AND is_default = true) THEN
    INSERT INTO programa_iluminacao_lote (integrado_id, nome, tipo_producao, descricao, is_default)
    VALUES (p_integrado_id, 'Padrão Corte', 'frango_corte', 'Programa padrão para frango de corte com escotofase progressiva', true)
    RETURNING id INTO v_corte;

    INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct) VALUES
      (v_corte, 1, 7, 23, '[{"acender":"00:00","apagar":"23:00","intensidade_pct":100}]'::jsonb, 5, 5, 100),
      (v_corte, 8, 14, 20, '[{"acender":"04:00","apagar":"00:00","intensidade_pct":80}]'::jsonb, 15, 15, 80),
      (v_corte, 15, 21, 18, '[{"acender":"05:00","apagar":"23:00","intensidade_pct":60}]'::jsonb, 20, 20, 60),
      (v_corte, 22, 60, 18, '[{"acender":"05:00","apagar":"23:00","intensidade_pct":50}]'::jsonb, 20, 20, 50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM programa_iluminacao_lote
                 WHERE integrado_id = p_integrado_id AND tipo_producao = 'postura' AND is_default = true) THEN
    INSERT INTO programa_iluminacao_lote (integrado_id, nome, tipo_producao, descricao, is_default)
    VALUES (p_integrado_id, 'Padrão Postura', 'postura', 'Cria 23→8h, recria 8h fixo, produção 8→16h estímulo', true)
    RETURNING id INTO v_postura;

    INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct) VALUES
      (v_postura, 1, 7, 23, '[{"acender":"00:00","apagar":"23:00","intensidade_pct":100}]'::jsonb, 5, 5, 100),
      (v_postura, 8, 21, 16, '[{"acender":"05:00","apagar":"21:00","intensidade_pct":60}]'::jsonb, 15, 15, 60),
      (v_postura, 22, 42, 12, '[{"acender":"06:00","apagar":"18:00","intensidade_pct":40}]'::jsonb, 20, 20, 40),
      (v_postura, 43, 119, 8, '[{"acender":"06:00","apagar":"14:00","intensidade_pct":40}]'::jsonb, 20, 20, 40),
      (v_postura, 120, 133, 10, '[{"acender":"05:00","apagar":"15:00","intensidade_pct":60}]'::jsonb, 20, 20, 60),
      (v_postura, 134, 147, 12, '[{"acender":"04:00","apagar":"16:00","intensidade_pct":80}]'::jsonb, 20, 20, 80),
      (v_postura, 148, 160, 14, '[{"acender":"04:00","apagar":"18:00","intensidade_pct":100}]'::jsonb, 20, 20, 100),
      (v_postura, 161, 700, 16, '[{"acender":"04:00","apagar":"20:00","intensidade_pct":100}]'::jsonb, 20, 20, 100);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_demo_data(p_user_id uuid, p_integrado_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_secdef_call('initialize_demo_data', p_integrado_id::text, jsonb_build_object('target_user', p_user_id));

  INSERT INTO public.config_silo (integrado_id, dias_ok, dias_atencao, dias_critico, dias_estoque_sugerido)
  VALUES (p_integrado_id, 5, 3, 1, 7) ON CONFLICT (integrado_id) DO NOTHING;
  INSERT INTO public.config_fechamento (integrado_id, constante_ajuste_ca)
  VALUES (p_integrado_id, 0.05) ON CONFLICT DO NOTHING;
  INSERT INTO public.mortalidade_media (
    integrado_id, linhagem, sexo,
    mortalidade_7_dias, mortalidade_14_dias, mortalidade_21_dias,
    mortalidade_28_dias, mortalidade_35_dias, mortalidade_42_dias,
    mortalidade_acima_42_dias
  ) VALUES (p_integrado_id, 'cobb_500', 'misto', 0.5, 0.3, 0.3, 0.3, 0.5, 0.5, 0.8) ON CONFLICT DO NOTHING;
  INSERT INTO public.areas (integrado_id, nome, descricao, cor, ativo) VALUES 
    (p_integrado_id, 'Fazenda Norte', 'Unidade principal de produção', '#22c55e', true),
    (p_integrado_id, 'Fazenda Sul', 'Unidade secundária', '#3b82f6', true),
    (p_integrado_id, 'Fazenda Oeste', 'Unidade de postura', '#f59e0b', true);
  INSERT INTO public.grupos_produto (integrado_id, nome, descricao, ativo) VALUES 
    (p_integrado_id, 'Ração', 'Rações para aves', true),
    (p_integrado_id, 'Medicamentos', 'Medicamentos veterinários', true),
    (p_integrado_id, 'Insumos', 'Insumos para fabricação de ração', true);
  INSERT INTO public.categorias (integrado_id, nome, descricao, ativo) VALUES 
    (p_integrado_id, 'Inicial', 'Ração para fase inicial', true),
    (p_integrado_id, 'Crescimento', 'Ração para fase de crescimento', true),
    (p_integrado_id, 'Final', 'Ração para fase final', true),
    (p_integrado_id, 'Antibióticos', 'Medicamentos antibióticos', true);
  INSERT INTO public.parceiros (integrado_id, razao_social_nome, tipo_cadastro, cpf_cnpj, email, telefone, ativo) VALUES 
    (p_integrado_id, 'Nutrição Animal Ltda', 'fornecedor', '12345678000190', 'contato@nutricaoanimal.com', '(11) 3456-7890', true),
    (p_integrado_id, 'Grãos do Brasil SA', 'fornecedor', '98765432000110', 'vendas@graosbrasil.com', '(11) 9876-5432', true),
    (p_integrado_id, 'Frigorífico Central', 'cliente', '11222333000144', 'compras@frigorifico.com', '(11) 1111-2222', true),
    (p_integrado_id, 'Supermercado Bom Preço', 'cliente', '44555666000177', 'ovos@bompreco.com', '(11) 4444-5555', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_notificacao(p_codigo text, p_integrado_id uuid, p_titulo text, p_mensagem text DEFAULT NULL::text, p_contexto jsonb DEFAULT NULL::jsonb, p_link text DEFAULT NULL::text, p_severidade text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo RECORD;
  v_user RECORD;
  v_inserted integer := 0;
  v_severidade text;
BEGIN
  PERFORM public.log_secdef_call('dispatch_notificacao', p_codigo, jsonb_build_object('integrado_id', p_integrado_id));

  SELECT * INTO v_tipo FROM tipos_evento_notificacao WHERE codigo = p_codigo AND ativo = true;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_severidade := COALESCE(p_severidade, v_tipo.severidade_padrao);

  FOR v_user IN
    SELECT DISTINCT p.id AS user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN preferencias_notificacao pn ON pn.user_id = p.id AND pn.tipo_evento_codigo = p_codigo
    WHERE p.integrado_id = p_integrado_id
      AND ur.role = ANY(v_tipo.roles_padrao)
      AND COALESCE(pn.push_ativo, true) = true
  LOOP
    INSERT INTO notificacoes_usuario (user_id, integrado_id, tipo_evento_codigo, titulo, mensagem, severidade, contexto, link)
    VALUES (v_user.user_id, p_integrado_id, p_codigo, p_titulo, p_mensagem, v_severidade, p_contexto, p_link);
    v_inserted := v_inserted + 1;
  END LOOP;
  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_orphan_identities_for_email(p_email text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_deleted integer := 0;
BEGIN
  PERFORM public.log_secdef_call('cleanup_orphan_identities_for_email', p_email, NULL);

  WITH deleted AS (
    DELETE FROM auth.identities i
    WHERE LOWER(COALESCE(i.identity_data->>'email', '')) = LOWER(p_email)
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$function$;
