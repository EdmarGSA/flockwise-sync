-- Tabela de modelos de silos (dados de referência do fabricante)
CREATE TABLE public.silos_modelo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diametro_m NUMERIC(4,2) NOT NULL,
  numero_aneis NUMERIC(3,1) NOT NULL,
  numero_pernas INTEGER NOT NULL,
  volume_m3 NUMERIC(7,2) NOT NULL,
  capacidade_ton NUMERIC(7,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permitir leitura pública (dados de referência)
ALTER TABLE public.silos_modelo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modelos de silos são públicos para leitura"
ON public.silos_modelo
FOR SELECT
USING (true);

-- Inserir dados do fabricante
INSERT INTO public.silos_modelo (diametro_m, numero_aneis, numero_pernas, volume_m3, capacidade_ton) VALUES
-- Diâmetro 1.97m
(1.97, 1, 4, 3.16, 2.02),
(1.97, 1.5, 4, 4.74, 3.04),
(1.97, 2, 4, 6.32, 4.05),
-- Diâmetro 2.44m
(2.44, 1, 4, 5.37, 3.44),
(2.44, 2, 4, 10.74, 6.87),
(2.44, 3, 4, 16.10, 10.31),
(2.44, 4, 4, 21.47, 13.74),
-- Diâmetro 2.96m
(2.96, 1, 6, 9.10, 5.83),
(2.96, 2, 6, 18.20, 11.65),
(2.96, 3, 6, 27.29, 17.47),
-- Diâmetro 3.66m
(3.66, 1, 8, 11.82, 7.56),
(3.66, 2, 8, 23.63, 15.12),
(3.66, 3, 8, 35.45, 22.69),
(3.66, 4, 8, 47.26, 30.25),
(3.66, 5, 8, 59.08, 37.81),
-- Diâmetro 4.57m
(4.57, 1, 8, 18.93, 12.11),
(4.57, 2, 8, 37.85, 24.22),
(4.57, 3, 8, 56.78, 36.34),
(4.57, 4, 8, 75.70, 48.45),
(4.57, 5, 8, 94.63, 60.56),
(4.57, 6, 8, 113.55, 72.67),
-- Diâmetro 5.48m
(5.48, 2, 10, 54.63, 34.96),
(5.48, 3, 10, 81.94, 52.44),
(5.48, 4, 10, 109.25, 69.92),
(5.48, 5, 10, 136.56, 87.40),
(5.48, 6, 10, 163.88, 104.88),
-- Diâmetro 6.39m
(6.39, 2, 12, 74.55, 47.71),
(6.39, 3, 12, 111.82, 71.57),
(6.39, 4, 12, 149.10, 95.42),
(6.39, 5, 12, 186.37, 119.28),
(6.39, 6, 12, 223.65, 143.13),
-- Diâmetro 7.30m
(7.30, 2, 12, 97.37, 62.32),
(7.30, 3, 12, 146.06, 93.48),
(7.30, 4, 12, 194.74, 124.63),
(7.30, 5, 12, 243.43, 155.79),
(7.30, 6, 12, 292.11, 186.95);