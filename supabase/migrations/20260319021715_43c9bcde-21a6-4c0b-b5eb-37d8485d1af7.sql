
-- Temperature alerts table
CREATE TABLE public.alertas_temperatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE CASCADE NOT NULL,
  galpao_id uuid REFERENCES public.galpoes(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL, -- 'temp_alta', 'temp_baixa'
  temperatura_lida numeric NOT NULL,
  temp_min_regra numeric NOT NULL,
  temp_max_regra numeric NOT NULL,
  primeira_leitura_fora timestamptz NOT NULL DEFAULT now(),
  ultima_leitura_fora timestamptz NOT NULL DEFAULT now(),
  duracao_minutos integer NOT NULL DEFAULT 0,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz,
  notificado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas_temperatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alertas_temperatura" ON public.alertas_temperatura
  FOR SELECT TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update own alertas_temperatura" ON public.alertas_temperatura
  FOR UPDATE TO authenticated
  USING (integrado_id = public.get_my_integrado_id())
  WITH CHECK (integrado_id = public.get_my_integrado_id());

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_temperatura;
