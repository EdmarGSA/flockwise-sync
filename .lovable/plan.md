# Cadastro via BackOffice — v2 (com blindagens)

## Decisões finais

- Email de aprovação: `inviteUserByEmail` (template padrão).
- Google OAuth de novo usuário: **bloqueado**, com **cleanup do auth.users**.
- Whitelist por domínio: v2.
- Anti-signup direto: bloqueio no trigger via `signup_source`.
- Turnstile: opcional via env (`TURNSTILE_SECRET_KEY`).
- Lock otimista na aprovação para evitar dupla ação.

## Fluxo

```text
[/auth aba "Solicitar acesso"]
   └─ INSERT solicitacoes_cadastro (pendente)  [+ Turnstile opcional]

[Superadmin /backoffice/solicitacoes]
   ├─ Reprovar  → reject-signup-request (lock otimista)
   └─ Aprovar   → approve-signup-request
                    ├─ lock otimista: UPDATE ... WHERE status='pendente' → 'processando'
                    ├─ checa duplicidade auth.users
                    ├─ inviteUserByEmail(email, { data: { full_name, signup_source:'approved_request' } })
                    ├─ trigger handle_new_user (valida signup_source) → profile + admin
                    └─ UPDATE → aprovada, user_id_criado, integrado_id_criado

[Google OAuth com email sem profile]
   ├─ INSERT solicitacao (origem='google_oauth')
   ├─ invoke cleanup-unapproved-google-user (service-role apaga auth.users)
   ├─ signOut
   └─ toast "Solicitação enviada"
```

## 1. Banco — migrations

### 1a. Tabela `public.solicitacoes_cadastro`
Colunas: `id`, `full_name`, `email`, `telefone`, `nome_organizacao`, `cidade`, `estado`, `tipo_producao`, `mensagem`, `origem` (`public_signup|google_oauth`), `status` (`pendente|processando|aprovada|reprovada|cancelada`), `motivo_reprovacao`, `revisado_por`, `revisado_em`, `user_id_criado`, `integrado_id_criado`, `created_at`, `updated_at`.

Índices:
- `UNIQUE (lower(email)) WHERE status IN ('pendente','processando')` — permite reenviar após reprovação.
- `(status, created_at desc)`.

GRANTs: `INSERT` anon+authenticated; `SELECT/UPDATE` authenticated; `ALL` service_role. Sem DELETE.

RLS:
- INSERT público (campos não vazios, `status='pendente'`, `origem='public_signup'` quando anon).
- INSERT service_role livre (para `google_oauth`).
- SELECT/UPDATE só `is_superadmin()`.

Trigger `set_updated_at`.

### 1b. Reforço em `handle_new_user`
Mantém branch `created_by_admin=true` intacto.
Para o branch "owner da própria org" exige `raw_user_meta_data->>'signup_source' = 'approved_request'`. Caso contrário: `RAISE EXCEPTION 'signup_nao_autorizado'` → impede signup direto pela anon key.

## 2. Edge Functions

### `approve-signup-request` (`verify_jwt=true`)
1. Resolve `auth.uid()`; valida superadmin via service-role.
2. Lock otimista: `UPDATE solicitacoes_cadastro SET status='processando', revisado_por=uid, revisado_em=now() WHERE id=? AND status='pendente' RETURNING *`. Se 0 linhas → 409.
3. Checa duplicidade em `auth.users` por email → se existir, reverte para `pendente` e retorna 409.
4. `auth.admin.inviteUserByEmail(email, { data: { full_name, signup_source: 'approved_request' } })`.
5. UPDATE para `aprovada` com `user_id_criado`, `integrado_id_criado=user.id`.
6. Log em `security_definer_audit_log`.

Em qualquer erro pós-passo 2, reverte status para `pendente`.

### `reject-signup-request` (`verify_jwt=true`)
Valida superadmin. `UPDATE ... WHERE id=? AND status='pendente'` → `reprovada` com motivo. 0 linhas → 409.

### `cleanup-unapproved-google-user` (`verify_jwt=true`)
1. Resolve `auth.uid()` do JWT (o próprio usuário recém-logado).
2. Confirma que **não existe profile** para esse uid.
3. `auth.admin.deleteUser(uid)`.
4. Log de auditoria.

Defesa em camadas: só apaga o próprio uid, e só se sem profile (evita uso indevido).

### Turnstile (opcional)
Função `verify-turnstile` ou validação inline na rota de submit. Se `TURNSTILE_SECRET_KEY` não estiver setada, pula a validação. Frontend só renderiza o widget se `VITE_TURNSTILE_SITE_KEY` existir. Sem dependência dura no MVP.

## 3. Frontend

### `src/pages/Auth.tsx`
- Duas CTAs: **Entrar** e **Solicitar acesso**. Remove qualquer texto "Cadastrar/Criar conta".
- Aba "Entrar": email/senha + Google (igual hoje).
- Aba "Solicitar acesso": form Zod (full_name, email, telefone, nome_organizacao, cidade, estado, tipo_producao, mensagem) + Turnstile condicional. Submit → `supabase.from('solicitacoes_cadastro').insert(...)`. Sucesso → tela "Solicitação recebida".

### `src/hooks/useAuth.tsx`
- **Remove** `signUp` do contexto (nada mais usa).
- No `onAuthStateChange` `SIGNED_IN`: se provider = `google`, verifica profile do uid. Se não existir:
  1. INSERT `solicitacoes_cadastro` (`origem='google_oauth'`, full_name e email do `user_metadata`).
  2. `supabase.functions.invoke('cleanup-unapproved-google-user')`.
  3. `signOut` + toast + redirect `/auth`.
- Mantém `ensure_my_admin_role()` para sessões válidas (não regredir fix anterior).

### `src/pages/backoffice/BackofficeSolicitacoes.tsx` (novo)
Tabs Pendentes / Aprovadas / Reprovadas / Todas, tabela, drawer com Aprovar/Reprovar. Estado `processando` mostra spinner. Refresh manual + on-success.

### `src/pages/backoffice/BackofficeSidebar.tsx`
Novo item "Solicitações" com badge de pendentes.

### `src/App.tsx`
Rota `/backoffice/solicitacoes` dentro de `SuperAdminRoute`.

## 4. Verificação

1. `supabase.auth.signUp()` direto pela anon key → trigger barra com `signup_nao_autorizado`. ✅ blindagem.
2. Formulário público → solicitação criada (pendente).
3. Aprovação → invite enviado, profile + role admin criados, status `aprovada`.
4. Dois superadmins clicam Aprovar quase juntos → segundo recebe 409. ✅ lock.
5. Google login com email novo → solicitação `google_oauth` criada, auth.users limpo, deslogado. ✅ sem órfão.
6. Reprovar → status `reprovada`, mesmo email pode reenviar solicitação depois. ✅ índice parcial.

## Arquivos

**Criar**
- `supabase/migrations/<ts>_solicitacoes_cadastro_e_blindagem_signup.sql` (tabela + reforço `handle_new_user`)
- `supabase/functions/approve-signup-request/index.ts`
- `supabase/functions/reject-signup-request/index.ts`
- `supabase/functions/cleanup-unapproved-google-user/index.ts`
- `src/pages/backoffice/BackofficeSolicitacoes.tsx`
- `src/components/backoffice/SolicitacaoDetalheDialog.tsx`
- `src/components/auth/SolicitarAcessoForm.tsx`

**Editar**
- `src/pages/Auth.tsx`
- `src/hooks/useAuth.tsx`
- `src/pages/backoffice/BackofficeSidebar.tsx`
- `src/App.tsx`
- `supabase/config.toml` (registrar as 3 funções com `verify_jwt=true`)

## Fora do MVP (v2)

- Email de rejeição com motivo.
- Whitelist por domínio para auto-aprovação.
- Realtime na lista de solicitações.
- Turnstile obrigatório (hoje opcional via env).