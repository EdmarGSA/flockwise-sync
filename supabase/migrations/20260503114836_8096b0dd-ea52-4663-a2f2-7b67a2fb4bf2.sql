
-- Trigger-only functions: revoke from everyone (invoked by triggers, not API)
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.registrar_historico_preco()',
    'public.set_mapbox_config_audit()',
    'public.set_user_modulos_created_by()',
    'public.update_user_modulos_audit()',
    'public.validate_unique_active_lote_per_galpao()',
    'public.handle_new_user()',
    'public.update_updated_at_column()',
    'public.set_updated_at()'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Callable helpers/RPCs: revoke anon + public, grant authenticated only
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.can_modify_data()',
    'public.galpao_has_active_lote(uuid)',
    'public.gerar_lote_interno_ovos(uuid)',
    'public.get_criadores()',
    'public.get_my_fornecedor_global_id()',
    'public.get_my_integrado_id()',
    'public.get_my_parceiro_id()',
    'public.get_user_accessible_modules(uuid)',
    'public.get_veterinarios()',
    'public.has_role(uuid, app_role)',
    'public.is_demo_user()',
    'public.is_superadmin()',
    'public.reservar_estoque_ovos_fifo(uuid, tipo_ovo, classificacao_peso_ovo, integer, uuid)',
    'public.same_organization(uuid)',
    'public.seed_programas_iluminacao_default(uuid)',
    'public.user_can_access_module(uuid, text, nivel_acesso)',
    'public.verificar_aceite_termo(uuid, text, uuid)',
    'public.dispatch_notificacao(text, uuid, text, text, jsonb, text, text)',
    'public.initialize_demo_data(uuid, uuid)',
    'public.initialize_demo_lotes(uuid)',
    'public.cleanup_orphan_identities_for_email(text)'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;
