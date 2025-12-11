-- Add sexo column to lotes table
ALTER TABLE public.lotes 
ADD COLUMN sexo sexo_ave NOT NULL DEFAULT 'misto';