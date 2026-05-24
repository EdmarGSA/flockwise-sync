
-- 1. Enum modo automação brain
DO $$ BEGIN
  CREATE TYPE public.modo_automacao_brain AS ENUM ('off','shadow','auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_comando_brain AS ENUM ('sugerido','aprovado','enviado','confirmado','falhou','ignorado','bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Galpões: toggle por galpão
ALTER TABLE public.galpoes
  ADD COLUMN IF NOT EXISTS automacao_brain public.modo_automacao_brain NOT NULL DEFAULT 'shadow';

-- 3. Canais: cooldown + redundância + ultimo_comando_em já existe
ALTER TABLE public.canais_dispositivo
  ADD COLUMN IF NOT EXISTS cooldown_seg INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS canal_redundante_id UUID REFERENCES public.canais_dispositivo(id) ON DELETE SET NULL;

-- 4. comando_brain
CREATE TABLE IF NOT EXISTS public.comando_brain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  galpao_id UUID NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  canal_id UUID REFERENCES public.canais_dispositivo(id) ON DELETE SET NULL,
  funcao public.funcao_automacao NOT NULL,
  estado_desejado JSONB NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('brain_shadow','brain_auto','manual')),
  motivo TEXT,
  decisao_id UUID,
  status public.status_comando_brain NOT NULL DEFAULT 'sugerido',
  erro TEXT,
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comando_brain_status ON public.comando_brain(status, created_at);
CREATE INDEX IF NOT EXISTS idx_comando_brain_galpao ON public.comando_brain(galpao_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comando_brain_integrado ON public.comando_brain(integrado_id);

ALTER TABLE public.comando_brain ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_comando_brain" ON public.comando_brain
  FOR SELECT USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "tenant_update_comando_brain" ON public.comando_brain
  FOR UPDATE USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "tenant_insert_comando_brain" ON public.comando_brain
  FOR INSERT WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE TRIGGER trg_comando_brain_updated
  BEFORE UPDATE ON public.comando_brain
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. intencao_brain_pendente (um por galpao+funcao)
CREATE TABLE IF NOT EXISTS public.intencao_brain_pendente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  galpao_id UUID NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  funcao public.funcao_automacao NOT NULL,
  estado_desejado JSONB NOT NULL,
  motivo TEXT,
  desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_observacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(galpao_id, funcao)
);
CREATE INDEX IF NOT EXISTS idx_intencao_brain_galpao ON public.intencao_brain_pendente(galpao_id);
ALTER TABLE public.intencao_brain_pendente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_all_intencao_brain" ON public.intencao_brain_pendente
  FOR ALL USING (integrado_id = get_my_integrado_id() OR is_superadmin());

-- 6. brain_fila_reavaliacao
CREATE TABLE IF NOT EXISTS public.brain_fila_reavaliacao (
  galpao_id UUID PRIMARY KEY REFERENCES public.galpoes(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  enfileirado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo TEXT
);
CREATE INDEX IF NOT EXISTS idx_brain_fila_enfileirado ON public.brain_fila_reavaliacao(enfileirado_em);
ALTER TABLE public.brain_fila_reavaliacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select_brain_fila" ON public.brain_fila_reavaliacao
  FOR SELECT USING (integrado_id = get_my_integrado_id() OR is_superadmin());

-- 7. Trigger event-driven em leituras_sensores (debounce 10s)
CREATE OR REPLACE FUNCTION public.trigger_reavaliar_brain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_galpao_id UUID;
  v_integrado UUID;
BEGIN
  SELECT galpao_id, integrado_id INTO v_galpao_id, v_integrado
    FROM public.dispositivos_iot WHERE id = NEW.dispositivo_id;
  IF v_galpao_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.brain_fila_reavaliacao (galpao_id, integrado_id, motivo)
  VALUES (v_galpao_id, v_integrado, 'telemetria')
  ON CONFLICT (galpao_id) DO UPDATE
    SET enfileirado_em = CASE
      WHEN public.brain_fila_reavaliacao.enfileirado_em < now() - INTERVAL '10 seconds'
      THEN now() ELSE public.brain_fila_reavaliacao.enfileirado_em
    END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reavaliar_brain ON public.leituras_sensores;
CREATE TRIGGER trg_reavaliar_brain
  AFTER INSERT ON public.leituras_sensores
  FOR EACH ROW EXECUTE FUNCTION public.trigger_reavaliar_brain();

-- 8. Tipos de evento de notificação
INSERT INTO public.tipos_evento_notificacao (codigo, nome, descricao, severidade_padrao, roles_padrao, ativo)
VALUES
  ('brain_atuador_offline', 'Atuador offline para Brain', 'Brain tentou comandar um canal mas o dispositivo está offline', 'critical', ARRAY['admin','criador']::app_role[], true),
  ('brain_comando_falhou', 'Comando do Brain falhou', 'Comando enviado mas dispositivo não confirmou execução em tempo hábil', 'warning', ARRAY['admin','criador']::app_role[], true)
ON CONFLICT (codigo) DO NOTHING;
