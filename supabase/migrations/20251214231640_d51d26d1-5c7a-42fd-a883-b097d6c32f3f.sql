-- Add commercial status column to products
ALTER TABLE public.produtos 
ADD COLUMN status_comercial text NOT NULL DEFAULT 'consumo' 
CHECK (status_comercial IN ('consumo', 'venda', 'ambos'));