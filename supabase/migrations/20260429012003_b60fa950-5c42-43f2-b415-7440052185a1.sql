
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.camera_funcao AS ENUM ('monitoramento', 'seguranca', 'ambiente', 'contagem');
CREATE TYPE public.camera_snapshot_tipo AS ENUM ('agendado', 'manual', 'evento_motion');
CREATE TYPE public.camera_status AS ENUM ('online', 'offline', 'erro', 'nao_testado');
CREATE TYPE public.camera_evento_tipo AS ENUM ('motion', 'alarm', 'video_loss', 'tampering');

-- ============================================================
-- TABLE: cameras_dvr
-- ============================================================
CREATE TABLE public.cameras_dvr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  marca TEXT NOT NULL DEFAULT 'intelbras',
  modelo TEXT,
  host TEXT NOT NULL,
  porta_https INTEGER NOT NULL DEFAULT 443,
  porta_rtsp INTEGER NOT NULL DEFAULT 554,
  usuario TEXT NOT NULL,
  senha_encrypted TEXT NOT NULL,
  num_canais INTEGER NOT NULL DEFAULT 16,
  ativo BOOLEAN NOT NULL DEFAULT true,
  status_conexao public.camera_status NOT NULL DEFAULT 'nao_testado',
  ultimo_sync TIMESTAMPTZ,
  ultimo_erro TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cameras_dvr_integrado ON public.cameras_dvr(integrado_id);
CREATE INDEX idx_cameras_dvr_ativo ON public.cameras_dvr(ativo) WHERE ativo = true;

ALTER TABLE public.cameras_dvr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DVRs visíveis por organização"
ON public.cameras_dvr FOR SELECT
USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "Admins podem inserir DVRs"
ON public.cameras_dvr FOR INSERT
WITH CHECK ((integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado'))) OR is_superadmin());

CREATE POLICY "Admins podem atualizar DVRs"
ON public.cameras_dvr FOR UPDATE
USING ((integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado'))) OR is_superadmin());

CREATE POLICY "Admins podem deletar DVRs"
ON public.cameras_dvr FOR DELETE
USING ((integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado'))) OR is_superadmin());

CREATE TRIGGER trg_cameras_dvr_updated_at
BEFORE UPDATE ON public.cameras_dvr
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE: cameras_canais
-- ============================================================
CREATE TABLE public.cameras_canais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dvr_id UUID NOT NULL REFERENCES public.cameras_dvr(id) ON DELETE CASCADE,
  canal_numero INTEGER NOT NULL CHECK (canal_numero >= 1 AND canal_numero <= 64),
  nome TEXT NOT NULL,
  galpao_id UUID REFERENCES public.galpoes(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  funcao public.camera_funcao NOT NULL DEFAULT 'monitoramento',
  ativo BOOLEAN NOT NULL DEFAULT true,
  snapshot_intervalo_seg INTEGER NOT NULL DEFAULT 300,
  ultimo_snapshot_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dvr_id, canal_numero)
);

CREATE INDEX idx_cameras_canais_dvr ON public.cameras_canais(dvr_id);
CREATE INDEX idx_cameras_canais_galpao ON public.cameras_canais(galpao_id);
CREATE INDEX idx_cameras_canais_lote ON public.cameras_canais(lote_id);

ALTER TABLE public.cameras_canais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canais visíveis por organização"
ON public.cameras_canais FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.cameras_dvr d WHERE d.id = dvr_id AND (d.integrado_id = get_my_integrado_id() OR is_superadmin()))
);

CREATE POLICY "Admins podem inserir canais"
ON public.cameras_canais FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.cameras_dvr d WHERE d.id = dvr_id AND d.integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado')))
  OR is_superadmin()
);

CREATE POLICY "Admins podem atualizar canais"
ON public.cameras_canais FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.cameras_dvr d WHERE d.id = dvr_id AND d.integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado')))
  OR is_superadmin()
);

CREATE POLICY "Admins podem deletar canais"
ON public.cameras_canais FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.cameras_dvr d WHERE d.id = dvr_id AND d.integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado')))
  OR is_superadmin()
);

CREATE TRIGGER trg_cameras_canais_updated_at
BEFORE UPDATE ON public.cameras_canais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE: cameras_snapshots
-- ============================================================
CREATE TABLE public.cameras_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES public.cameras_canais(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  capturado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo public.camera_snapshot_tipo NOT NULL DEFAULT 'agendado',
  tamanho_bytes INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cameras_snapshots_canal_data ON public.cameras_snapshots(canal_id, capturado_em DESC);
CREATE INDEX idx_cameras_snapshots_lote ON public.cameras_snapshots(lote_id);
CREATE INDEX idx_cameras_snapshots_data ON public.cameras_snapshots(capturado_em DESC);

ALTER TABLE public.cameras_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snapshots visíveis por organização"
ON public.cameras_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cameras_canais c
    JOIN public.cameras_dvr d ON d.id = c.dvr_id
    WHERE c.id = canal_id AND (d.integrado_id = get_my_integrado_id() OR is_superadmin())
  )
);

CREATE POLICY "Sistema pode inserir snapshots"
ON public.cameras_snapshots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cameras_canais c
    JOIN public.cameras_dvr d ON d.id = c.dvr_id
    WHERE c.id = canal_id AND (d.integrado_id = get_my_integrado_id() OR is_superadmin())
  )
);

CREATE POLICY "Admins podem deletar snapshots"
ON public.cameras_snapshots FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cameras_canais c
    JOIN public.cameras_dvr d ON d.id = c.dvr_id
    WHERE c.id = canal_id AND d.integrado_id = get_my_integrado_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado'))
  ) OR is_superadmin()
);

-- ============================================================
-- TABLE: cameras_eventos (Fase 1.5 - webhook motion)
-- ============================================================
CREATE TABLE public.cameras_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES public.cameras_canais(id) ON DELETE CASCADE,
  tipo_evento public.camera_evento_tipo NOT NULL,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_id UUID REFERENCES public.cameras_snapshots(id) ON DELETE SET NULL,
  payload JSONB,
  processado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cameras_eventos_canal ON public.cameras_eventos(canal_id, ocorrido_em DESC);
CREATE INDEX idx_cameras_eventos_processado ON public.cameras_eventos(processado) WHERE processado = false;

ALTER TABLE public.cameras_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos visíveis por organização"
ON public.cameras_eventos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cameras_canais c
    JOIN public.cameras_dvr d ON d.id = c.dvr_id
    WHERE c.id = canal_id AND (d.integrado_id = get_my_integrado_id() OR is_superadmin())
  )
);

CREATE POLICY "Sistema pode inserir eventos"
ON public.cameras_eventos FOR INSERT
WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('camera-snapshots', 'camera-snapshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Snapshots da organização - leitura"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'camera-snapshots'
  AND (
    (storage.foldername(name))[1] = get_my_integrado_id()::text
    OR is_superadmin()
  )
);

CREATE POLICY "Snapshots - inserção pelo sistema"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'camera-snapshots'
  AND (
    (storage.foldername(name))[1] = get_my_integrado_id()::text
    OR is_superadmin()
  )
);

CREATE POLICY "Snapshots - admins podem deletar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'camera-snapshots'
  AND (
    ((storage.foldername(name))[1] = get_my_integrado_id()::text AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado')))
    OR is_superadmin()
  )
);

-- ============================================================
-- MÓDULO "Câmeras" + permissões
-- ============================================================
INSERT INTO public.modulos (codigo, nome, rota, icone, ordem, ativo)
VALUES ('cameras', 'Câmeras', '/cameras', 'Camera', 95, true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT r.role::app_role, m.id, true, 'full'::nivel_acesso
FROM public.modulos m
CROSS JOIN (VALUES ('admin'), ('integrado')) AS r(role)
WHERE m.codigo = 'cameras'
ON CONFLICT (role, modulo_id) DO NOTHING;

INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT r.role::app_role, m.id, true, 'view'::nivel_acesso
FROM public.modulos m
CROSS JOIN (VALUES ('criador'), ('veterinario')) AS r(role)
WHERE m.codigo = 'cameras'
ON CONFLICT (role, modulo_id) DO NOTHING;
