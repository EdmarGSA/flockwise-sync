
ALTER TABLE public.cameras_dvr
  ADD COLUMN IF NOT EXISTS protocolo text NOT NULL DEFAULT 'https',
  ADD COLUMN IF NOT EXISTS porta_http integer NOT NULL DEFAULT 80;

ALTER TABLE public.cameras_dvr
  DROP CONSTRAINT IF EXISTS cameras_dvr_protocolo_check;

ALTER TABLE public.cameras_dvr
  ADD CONSTRAINT cameras_dvr_protocolo_check CHECK (protocolo IN ('http','https'));
