-- Campo para controlar se fornecedor já alterou a senha padrão
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS senha_alterada BOOLEAN DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.senha_alterada IS 'Indica se o usuário (especialmente fornecedor) já alterou a senha padrão. False = precisa trocar a senha.';