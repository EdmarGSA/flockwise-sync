
-- Tabela de autópsias
CREATE TABLE public.autopsias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  data_autopsia DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_aves INTEGER NOT NULL DEFAULT 1,
  idade_dias INTEGER,
  
  -- Achados por Sistema
  sistema_respiratorio TEXT,
  sistema_digestivo TEXT,
  sistema_locomotor TEXT,
  sistema_tegumentar TEXT,
  sistema_nervoso TEXT,
  sistema_cardiovascular TEXT,
  sistema_reprodutor TEXT,
  
  -- Conclusão
  diagnostico_presuntivo TEXT,
  causa_morte TEXT,
  recomendacoes TEXT,
  
  -- Gravação de voz (transcrita)
  transcricao_voz TEXT,
  audio_url TEXT,
  
  -- Assinatura
  assinatura_url TEXT,
  assinado_em TIMESTAMPTZ,
  
  -- Controle
  status TEXT DEFAULT 'rascunho',
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Offline sync
  sync_status TEXT DEFAULT 'synced',
  local_id TEXT
);

-- Tabela de mídias de autópsias
CREATE TABLE public.autopsias_midias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autopsia_id UUID REFERENCES public.autopsias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  sistema_afetado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.autopsias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopsias_midias ENABLE ROW LEVEL SECURITY;

-- RLS Policies para autopsias
CREATE POLICY "Users can view autopsias from their organization"
ON public.autopsias FOR SELECT
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert autopsias for their organization"
ON public.autopsias FOR INSERT
WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update autopsias from their organization"
ON public.autopsias FOR UPDATE
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can delete autopsias from their organization"
ON public.autopsias FOR DELETE
USING (integrado_id = public.get_my_integrado_id());

-- RLS Policies para autopsias_midias
CREATE POLICY "Users can view autopsias_midias"
ON public.autopsias_midias FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.autopsias a 
  WHERE a.id = autopsia_id 
  AND a.integrado_id = public.get_my_integrado_id()
));

CREATE POLICY "Users can insert autopsias_midias"
ON public.autopsias_midias FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.autopsias a 
  WHERE a.id = autopsia_id 
  AND a.integrado_id = public.get_my_integrado_id()
));

CREATE POLICY "Users can delete autopsias_midias"
ON public.autopsias_midias FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.autopsias a 
  WHERE a.id = autopsia_id 
  AND a.integrado_id = public.get_my_integrado_id()
));

-- Storage bucket para mídias veterinárias
INSERT INTO storage.buckets (id, name, public) 
VALUES ('veterinario-midias', 'veterinario-midias', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload veterinario midias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'veterinario-midias');

CREATE POLICY "Anyone can view veterinario midias"
ON storage.objects FOR SELECT
USING (bucket_id = 'veterinario-midias');

CREATE POLICY "Users can update their veterinario midias"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'veterinario-midias');

CREATE POLICY "Users can delete their veterinario midias"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'veterinario-midias');

-- Trigger para updated_at
CREATE TRIGGER update_autopsias_updated_at
BEFORE UPDATE ON public.autopsias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
