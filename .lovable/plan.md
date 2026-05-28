# Garantir que o criador da org (signup público) sempre vire admin

## Diagnóstico

Investiguei o banco e o código:

- **No banco está tudo certo** para os 3 usuários que fizeram signup público (`id = integrado_id`): todos têm role `admin` corretamente, e a role `admin` tem `full` nos 12 módulos. A RPC `get_user_accessible_modules` devolve os 12 módulos para o usuário "Granja Carolina" criado em 27/05.
- **Mas o sintoma "só vê Meus Lotes + Gestão de Campo"** bate exatamente com a role `tecnico` em `role_modulos`. Nenhuma role atualmente devolve só esses 2 módulos a não ser `tecnico`.

Isso indica que existe pelo menos uma das três falhas abaixo, todas silenciosas hoje:

1. O trigger `handle_new_user` falhou parcialmente (ex.: `seed_organizacao_padrao` deu exceção) e a `INSERT INTO user_roles ... 'admin'` foi pulada para algum usuário não listado (talvez já deletado/limpo).
2. O front carrega `useModuleAccess` **antes** do trigger terminar de commitar a role e fica com lista parcial em cache (mas isso normalmente daria 0 módulos, não 2).
3. Algum cadastro foi feito por outro fluxo (`MembroForm`) com role default `tecnico` e o usuário acha que veio do signup público.

A correção precisa ser **defensiva**: independentemente da causa, qualquer usuário cujo `profile.id = profile.integrado_id` deve ter role `admin` garantida — e o front precisa reagir quando isso for corrigido.

## Plano

### 1. Migration — defesa em camadas no banco

- **Backfill imediato**: para todo `profile` onde `id = integrado_id` e que não tem role `admin` em `user_roles`, inserir `('user_id', 'admin')`.
- **Trigger defensivo** `ensure_owner_is_admin` em `AFTER INSERT OR UPDATE OF integrado_id ON public.profiles`: se `NEW.id = NEW.integrado_id` e não existe linha admin em `user_roles` para esse user, insere. Idempotente.
- **Robustecer `handle_new_user`**: envolver `seed_programas_iluminacao_default(...)` e `seed_organizacao_padrao(...)` em `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` para não derrubar a inserção de role caso um seed falhe.
- **RPC `ensure_my_admin_role()`** (`SECURITY DEFINER`): se o `auth.uid()` chamador é dono da própria org (`profile.id = profile.integrado_id`) e não tem role admin, insere. Retorna `boolean` indicando se foi corrigido. Será chamada pelo front no primeiro mount.

### 2. Front — auto-recuperação no `useModuleAccess`

Em `src/hooks/useModuleAccess.tsx`:

- No `fetchAccessibleModules`, **se** `data.length === 0` ou retornar apenas módulos que não incluem `lotes` + `gestao-campo` simultaneamente em uma conta onde o usuário é dono da própria org, chamar `supabase.rpc('ensure_my_admin_role')`. Se retornar `true`, refazer a chamada de `get_user_accessible_modules`.
- Adicionar **retry com backoff curto** (até 2 tentativas espaçadas em ~800ms) na primeira chamada após login, para cobrir o caso do trigger ainda não ter commitado.

### 3. Sanidade após signup

Em `useAuth.signUp` (e no callback de `signInWithGoogle`), depois de detectar sessão nova, chamar uma vez `supabase.rpc('ensure_my_admin_role')` antes de redirecionar para `/home`. Isso fecha a janela de corrida entre o trigger e o primeiro fetch do front.

### 4. Verificação

Após aplicar:

- Rodar `SELECT id, integrado_id, (SELECT array_agg(role::text) FROM user_roles WHERE user_id=p.id) FROM profiles p WHERE id = integrado_id` e confirmar que **todos** têm `{admin}`.
- Criar uma conta nova via `/auth`, login, verificar que `/home` mostra os 12 cards como `available`.
- Verificar logs de `security_definer_audit_log` para garantir que `ensure_my_admin_role` é chamada e (idealmente) retorna `false` (nada para corrigir) em signups limpos.

## Detalhes técnicos

```text
profiles                       user_roles
  id = integrado_id  ──────▶  (user_id, 'admin')   ← invariante a garantir
                              ▲
                      trigger ensure_owner_is_admin (defesa)
                      RPC ensure_my_admin_role     (auto-heal do front)
                      handle_new_user              (caminho feliz)
```

Arquivos tocados:

- **Migration nova** (`supabase/migrations/…`): backfill, função+trigger `ensure_owner_is_admin`, RPC `ensure_my_admin_role`, reforço em `handle_new_user`.
- **`src/hooks/useModuleAccess.tsx`**: chamada `ensure_my_admin_role` + retry após login.
- **`src/hooks/useAuth.tsx`**: chamada `ensure_my_admin_role` logo após `signUp` bem-sucedido com sessão e após login Google.

Não vou mexer em `role_modulos` (já está correto para `admin`) nem alterar a definição de roles existentes.
