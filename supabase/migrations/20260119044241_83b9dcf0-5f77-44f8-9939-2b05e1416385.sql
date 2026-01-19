-- Adicionar campos para fluxo do fornecedor na tabela ordens_compra
ALTER TABLE ordens_compra 
  ADD COLUMN IF NOT EXISTS fornecedor_confirmado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fornecedor_enviado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fornecedor_nf_numero TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_observacoes TEXT;

-- Criar índice para melhorar performance de consultas do fornecedor
CREATE INDEX IF NOT EXISTS idx_ordens_compra_parceiro_status 
  ON ordens_compra(parceiro_id, status);

-- Adicionar política RLS para fornecedores visualizarem suas ordens de compra
CREATE POLICY "Fornecedores podem ver suas próprias ordens de compra"
  ON ordens_compra
  FOR SELECT
  USING (
    parceiro_id = get_my_parceiro_id()
    AND status IN ('aprovada', 'parcial_recebida', 'recebida')
  );

-- Adicionar política RLS para fornecedores atualizarem campos específicos
CREATE POLICY "Fornecedores podem atualizar status de confirmação/envio"
  ON ordens_compra
  FOR UPDATE
  USING (parceiro_id = get_my_parceiro_id())
  WITH CHECK (parceiro_id = get_my_parceiro_id());

-- Permitir fornecedores lerem itens das suas ordens
CREATE POLICY "Fornecedores podem ver itens das suas ordens"
  ON ordens_compra_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ordens_compra oc
      WHERE oc.id = ordens_compra_itens.ordem_compra_id
        AND oc.parceiro_id = get_my_parceiro_id()
    )
  );