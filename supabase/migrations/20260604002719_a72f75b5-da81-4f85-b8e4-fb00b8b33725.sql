
CREATE OR REPLACE FUNCTION public.seed_assinatura_trial(p_integrado_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano_id uuid;
  v_assinatura_id uuid;
BEGIN
  SELECT id INTO v_assinatura_id FROM public.assinaturas WHERE integrado_id = p_integrado_id;
  IF v_assinatura_id IS NOT NULL THEN
    RETURN v_assinatura_id;
  END IF;

  SELECT id INTO v_plano_id FROM public.planos WHERE codigo = 'starter' AND ativo = true LIMIT 1;
  IF v_plano_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.assinaturas (
    integrado_id, plano_id, ciclo, status,
    galpoes_contratados, iniciada_em, trial_termina_em
  ) VALUES (
    p_integrado_id, v_plano_id, 'mensal'::ciclo_cobranca, 'trial'::assinatura_status,
    0, now(), now() + INTERVAL '14 days'
  )
  RETURNING id INTO v_assinatura_id;

  PERFORM public.log_secdef_call('seed_assinatura_trial', p_integrado_id::text, NULL);
  RETURN v_assinatura_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_assinatura_on_new_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id = NEW.integrado_id THEN
    PERFORM public.seed_assinatura_trial(NEW.integrado_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_assinatura_trial ON public.profiles;
CREATE TRIGGER trg_seed_assinatura_trial
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_seed_assinatura_on_new_owner();

INSERT INTO public.assinaturas (
  integrado_id, plano_id, ciclo, status, galpoes_contratados,
  iniciada_em, trial_termina_em
)
SELECT DISTINCT
  p.integrado_id,
  (SELECT id FROM public.planos WHERE codigo = 'starter' LIMIT 1),
  'mensal'::ciclo_cobranca,
  'trial'::assinatura_status,
  0,
  now() - INTERVAL '15 days',
  now() - INTERVAL '1 day'
FROM public.profiles p
WHERE p.id = p.integrado_id
  AND NOT EXISTS (SELECT 1 FROM public.assinaturas a WHERE a.integrado_id = p.integrado_id)
ON CONFLICT (integrado_id) DO NOTHING;
