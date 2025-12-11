-- Add peso_medio_pintinhos field to lotes table
ALTER TABLE public.lotes 
ADD COLUMN peso_medio_pintinhos numeric DEFAULT NULL;