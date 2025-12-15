-- Add fields for batch exit (Saída de Lote)
ALTER TABLE public.lotes ADD COLUMN data_prevista_saida TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lotes ADD COLUMN horario_inicio_jejum TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lotes ADD COLUMN saida_venda_local INTEGER DEFAULT 0;
ALTER TABLE public.lotes ADD COLUMN saida_venda_externa INTEGER DEFAULT 0;
ALTER TABLE public.lotes ADD COLUMN saida_abate INTEGER DEFAULT 0;
ALTER TABLE public.lotes ADD COLUMN jejum_confirmado BOOLEAN DEFAULT false;
ALTER TABLE public.lotes ADD COLUMN jejum_confirmado_por UUID;
ALTER TABLE public.lotes ADD COLUMN jejum_confirmado_em TIMESTAMP WITH TIME ZONE;