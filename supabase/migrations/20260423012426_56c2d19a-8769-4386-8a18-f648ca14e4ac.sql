DROP POLICY IF EXISTS "Sistema/superadmin insere notificações" ON public.notificacoes_usuario;
DROP POLICY IF EXISTS "Insere notificação para si ou superadmin" ON public.notificacoes_usuario;

CREATE POLICY "Insere notificação para si ou superadmin"
  ON public.notificacoes_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_superadmin());