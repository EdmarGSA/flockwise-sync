

## Limpeza completa do banco — execução confirmada

Confirmações recebidas:
- **Storage**: limpar `mortalidade-fotos`, `veterinario-midias` e `catalogo-fornecedor` (todos os objetos)
- **Dados padrão do Edmar**: **manter** áreas, categorias, grupos de produto, mortalidade média, configs de silo/fechamento e organização

### O que será PRESERVADO

**Usuário principal:**
- `edmarguimaraes05@gmail.com` em `auth.users`
- `profiles` do Edmar (com `integrado_id` apontando para si mesmo)
- `user_roles` do Edmar (admin)

**Dados padrão da organização do Edmar (mantidos):**
- `areas`, `categorias`, `grupos_produto`, `grupos_animal`, `fases_animal` do `integrado_id` do Edmar
- `mortalidade_media`, `config_silo`, `config_fechamento`, `metas_zootecnicas` do Edmar
- `parceiros` cadastrados pelo Edmar (clientes/fornecedores que ele já tem)

**Dados de referência globais (catálogos científicos):**
- `desempenho_aves`, `desempenho_postura`, `silos_modelo`
- `tipos_evento_notificacao`, `modulos`, `role_modulos`
- `termos_versoes`, plano de contas, centro de custos, formas de pagamento padrão

**Estrutura:** todas as tabelas, RLS, funções, triggers, enums, migrations.

### O que será REMOVIDO

**Operacional do Edmar (para começar campo do zero):**
- `lotes`, `galpoes`, `nucleos`, `silos` (instâncias)
- `pesagens` + `pesagem_itens`, `mortalidade` + `mortalidade_itens`
- `consumo_racao`, `solicitacoes_racao`, `nivel_silos`, `historico_temperatura`
- `producao_ovos`, `estoque_ovos`, `descarte_ovos`, `reserva_estoque_ovos`, `kardex_ovos`
- `tratamentos`, `autopsias`, `observacoes_veterinarias`, `midias_autopsia`
- `pedidos` + itens, `faturamento`, `contas_receber`, `contas_pagar`, `credito_cliente`
- `ordens_producao` + itens, `ordens_compra` + itens, `recebimentos` + itens
- `kardex`, `produtos` (instâncias do Edmar — só os 3 demo se houver), `produto_fornecedor`, `produtos_animais`, `produtos_ovos`
- `tabelas_preco` + itens, `historico_precos_fornecedor`
- `dispositivos_iot`, `canais_dispositivo`, `leituras_sensores`, `comandos_iot`, `log_automacao_temperatura`
- `ewelink_tokens`, `esp32_devices`, `webhook_dispatches`
- `notificacoes_usuario`, `preferencias_notificacao`
- `termos_aceites` (será solicitado novamente no próximo login)
- `sync_erp_logs`, `nfe_imports`

**Outros usuários (todos exceto Edmar):**
- `auth.users`, `profiles`, `user_roles`, `user_modulos`
- `vendedores_fornecedor`, `fornecedores_globais` (não vinculados ao Edmar)
- Membros, criadores, veterinários adicionais

**Storage (todos os objetos):**
- `mortalidade-fotos/*`
- `veterinario-midias/*`
- `catalogo-fornecedor/*`

### Como será executado

**Passo 1 — Migration SQL** (via ferramenta de migração) com `DELETE` em ordem segura respeitando FKs, dentro de uma transação:

```text
BEGIN;
  -- 1. Capturar UUID do Edmar
  edmar_id := (SELECT id FROM auth.users WHERE email = 'edmarguimaraes05@gmail.com')

  -- 2. DELETE em tabelas filhas → pais (operacionais, sem filtro)
  DELETE FROM pesagem_itens; DELETE FROM pesagens;
  DELETE FROM mortalidade_itens; DELETE FROM mortalidade;
  DELETE FROM consumo_racao; DELETE FROM solicitacoes_racao;
  DELETE FROM lotes; DELETE FROM galpoes; DELETE FROM nucleos; DELETE FROM silos;
  DELETE FROM ... (todas operacionais listadas acima)

  -- 3. DELETE seletivo (preservar Edmar)
  DELETE FROM user_modulos WHERE user_id != edmar_id;
  DELETE FROM user_roles WHERE user_id != edmar_id;
  DELETE FROM termos_aceites; -- reseta todos, inclusive Edmar
  DELETE FROM profiles WHERE id != edmar_id;

  -- 4. Garantir integridade do Edmar
  UPDATE profiles SET integrado_id = edmar_id WHERE id = edmar_id;
  INSERT INTO user_roles (user_id, role) VALUES (edmar_id, 'admin')
    ON CONFLICT DO NOTHING;

  -- 5. Auth (último, pois profiles tem FK para auth.users)
  DELETE FROM auth.users WHERE id != edmar_id;
COMMIT;
```

**Passo 2 — Limpeza de Storage** via SQL no schema `storage`:

```sql
DELETE FROM storage.objects 
WHERE bucket_id IN ('mortalidade-fotos', 'veterinario-midias', 'catalogo-fornecedor');
```

### Riscos

- **Irreversível.** Se quiser backup, faça antes via Backoffice/Supabase.
- Tokens eWeLink serão removidos — precisará refazer OAuth IoT depois.
- Termo de aceite vigente será solicitado no próximo login do Edmar.
- Se houver outros logins ativos, eles deixarão de funcionar imediatamente.

Aprovando, executo as duas migrations em sequência (banco + storage).

