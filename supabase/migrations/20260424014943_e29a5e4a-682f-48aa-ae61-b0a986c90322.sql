DO $$
DECLARE
  edmar_id uuid := 'd351a123-d5fa-43fe-a6e1-2ead36d96d1f';
BEGIN
  SET session_replication_role = replica;

  -- IoT
  DELETE FROM log_automacao_temperatura;
  DELETE FROM leituras_sensores;
  DELETE FROM historico_estado_canal;
  DELETE FROM alarmes_disparados;
  DELETE FROM alertas_temperatura;
  DELETE FROM timers_seguranca_iot;
  DELETE FROM regras_automacao_avancada;
  DELETE FROM regras_temperatura_lote;
  DELETE FROM programa_cortina_lote;
  DELETE FROM canais_dispositivo;
  DELETE FROM dispositivos_iot;
  DELETE FROM ewelink_tokens;
  DELETE FROM config_alarme_lote;

  -- Notificações
  DELETE FROM notificacoes_usuario;
  DELETE FROM notificacoes_fornecedor;
  DELETE FROM admin_notifications;
  DELETE FROM preferencias_notificacao;

  -- Veterinário
  DELETE FROM autopsias_midias;
  DELETE FROM autopsias;
  DELETE FROM observacoes_lote;
  DELETE FROM tratamentos_lote;

  -- Mortalidade / Pesagem
  DELETE FROM mortalidade_fotos;
  DELETE FROM mortalidade_itens;
  DELETE FROM mortalidade;
  DELETE FROM pesagem_itens;
  DELETE FROM pesagens;

  -- Consumo / Ração
  DELETE FROM solicitacoes_racao;
  DELETE FROM historico_nivel_silo;
  DELETE FROM nfe_racao_recebidas;

  -- Ovos (rastreio_ovos é VIEW - pulado)
  DELETE FROM kardex_ovos;
  DELETE FROM reserva_estoque_ovos;
  DELETE FROM descarte_ovos;
  DELETE FROM estoque_ovos;
  DELETE FROM producao_ovos;

  -- Comercial
  DELETE FROM separacao_pedidos;
  DELETE FROM pedido_itens_ovos;
  DELETE FROM pedido_itens;
  DELETE FROM pedidos;
  DELETE FROM pedidos_catalogo_fornecedor_itens;
  DELETE FROM pedidos_catalogo_fornecedor;
  DELETE FROM pedidos_fornecedor_itens;
  DELETE FROM pedidos_fornecedor;

  -- Financeiro
  DELETE FROM movimentacoes_bancarias;
  DELETE FROM contas_receber;
  DELETE FROM contas_pagar;
  DELETE FROM credito_cliente_formas;
  DELETE FROM credito_cliente;
  DELETE FROM contas_bancarias;
  DELETE FROM taxas_bancarias;

  -- Fábrica / Produção / Compras
  DELETE FROM producao_logs;
  DELETE FROM ordens_producao_itens;
  DELETE FROM ordens_producao;
  DELETE FROM divergencias_recebimento;
  DELETE FROM recebimento_itens;
  DELETE FROM recebimento_lotes;
  DELETE FROM recebimentos_mercadoria;
  DELETE FROM ordens_compra_itens;
  DELETE FROM ordens_compra;
  DELETE FROM equipamentos_producao;

  -- Estoque
  DELETE FROM kardex;

  -- Lotes / Galpões / Núcleos / Silos
  DELETE FROM fechamento_lotes;
  DELETE FROM metas_postura;
  DELETE FROM multiplicadores_meta_peso;
  DELETE FROM metas_peso;
  DELETE FROM lotes;
  DELETE FROM galpoes;
  DELETE FROM nucleos;
  DELETE FROM silos;

  -- Catálogo Fornecedor
  DELETE FROM produto_fornecedor;
  DELETE FROM historico_precos_fornecedor;
  DELETE FROM produtos_catalogo_fornecedor;
  DELETE FROM promocoes_fornecedor;
  DELETE FROM webhooks_log;
  DELETE FROM webhooks_fornecedor;
  DELETE FROM lotes_fornecedor;
  DELETE FROM galpoes_fornecedor;
  DELETE FROM nucleos_fornecedor;
  DELETE FROM clientes_fornecedor;
  DELETE FROM prazos_pagamento_fornecedor;
  DELETE FROM formas_pagamento_fornecedor;

  -- Produtos
  DELETE FROM nutricao_itens;
  DELETE FROM nutricoes;
  DELETE FROM produto_formulacao;
  DELETE FROM tabelas_preco_itens;
  DELETE FROM tabelas_preco;
  DELETE FROM produtos_animais;
  DELETE FROM produtos_ovos;
  DELETE FROM produtos;

  -- ERP
  DELETE FROM sync_erp_log;
  DELETE FROM sync_erp_mapeamento;
  DELETE FROM sync_erp_api_keys;

  -- Termos / Suporte / Onboarding
  DELETE FROM termos_aceites;
  DELETE FROM support_tickets;
  DELETE FROM onboarding_steps;

  -- Usuários (preservar Edmar)
  DELETE FROM vendedores_fornecedor;
  DELETE FROM user_modulos WHERE user_id != edmar_id;
  DELETE FROM user_roles WHERE user_id != edmar_id;
  DELETE FROM fornecedores_globais WHERE user_id IS NULL OR user_id != edmar_id;

  -- Limpar dados de outros integrados (preservar do Edmar)
  DELETE FROM fases_animal WHERE integrado_id != edmar_id;
  DELETE FROM grupos_animal WHERE integrado_id != edmar_id;
  DELETE FROM grupos_produto WHERE integrado_id != edmar_id;
  DELETE FROM categorias WHERE integrado_id != edmar_id;
  DELETE FROM areas WHERE integrado_id != edmar_id;
  DELETE FROM parceiros WHERE integrado_id != edmar_id;
  DELETE FROM mortalidade_media WHERE integrado_id != edmar_id;
  DELETE FROM metas_zootecnicas WHERE integrado_id != edmar_id;
  DELETE FROM config_silo WHERE integrado_id != edmar_id;
  DELETE FROM config_fechamento WHERE integrado_id != edmar_id;
  DELETE FROM config_producao WHERE integrado_id != edmar_id;
  DELETE FROM config_custo_postura WHERE integrado_id != edmar_id;
  DELETE FROM config_validade_ovos WHERE integrado_id != edmar_id;
  DELETE FROM medicamentos_config WHERE integrado_id != edmar_id;
  DELETE FROM organizacoes WHERE integrado_id != edmar_id;
  DELETE FROM plano_contas WHERE integrado_id != edmar_id;
  DELETE FROM centro_custos WHERE integrado_id != edmar_id;
  DELETE FROM formas_pagamento WHERE integrado_id != edmar_id;
  DELETE FROM prazos_pagamento WHERE integrado_id != edmar_id;

  -- Profiles e auth (último)
  DELETE FROM profiles WHERE id != edmar_id;
  UPDATE profiles SET integrado_id = edmar_id WHERE id = edmar_id;
  INSERT INTO user_roles (user_id, role) VALUES (edmar_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM auth.users WHERE id != edmar_id;

  -- Storage
  DELETE FROM storage.objects WHERE bucket_id IN ('mortalidade-fotos', 'veterinario-midias', 'catalogo-fornecedor');

  SET session_replication_role = DEFAULT;
END $$;