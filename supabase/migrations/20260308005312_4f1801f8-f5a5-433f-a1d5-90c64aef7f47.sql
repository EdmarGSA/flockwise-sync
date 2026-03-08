
-- Add columns to mortalidade table
ALTER TABLE public.mortalidade 
  ADD COLUMN IF NOT EXISTS temperatura_c numeric NULL,
  ADD COLUMN IF NOT EXISTS umidade_pct numeric NULL,
  ADD COLUMN IF NOT EXISTS analise_ia jsonb NULL;

-- Create mortalidade_fotos table
CREATE TABLE public.mortalidade_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mortalidade_id uuid REFERENCES public.mortalidade(id) ON DELETE CASCADE NOT NULL,
  motivo text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mortalidade_fotos ENABLE ROW LEVEL SECURITY;

-- RLS: select via join on mortalidade.integrado_id
CREATE POLICY "Users can view own mortalidade fotos"
ON public.mortalidade_fotos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mortalidade m 
    WHERE m.id = mortalidade_fotos.mortalidade_id 
      AND m.integrado_id = public.get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert own mortalidade fotos"
ON public.mortalidade_fotos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mortalidade m 
    WHERE m.id = mortalidade_fotos.mortalidade_id 
      AND m.integrado_id = public.get_my_integrado_id()
  )
);

-- Storage bucket for mortalidade photos
INSERT INTO storage.buckets (id, name, public) VALUES ('mortalidade-fotos', 'mortalidade-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users can upload mortalidade photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mortalidade-fotos');

CREATE POLICY "Anyone can view mortalidade photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'mortalidade-fotos');
