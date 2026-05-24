# Auditoria – Cadastro de Nova Organização (integrado_id)

Escopo auditado: `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx`, função `public.handle_new_user`, tabela `public.organizacoes`, `src/pages/CadastroOrganizacao.tsx` e `src/components/cadastro/OrganizacaoForm.tsx`.

Importante: a "organização" tem dois sentidos no projeto:
- **integrado_id** (tenant) — criado automaticamente no signup (vira o próprio `user.id` do primeiro admin).
- **organizacoes** (tabela) — dados cadastrais de empresas dentro de um tenant.
Os dois fluxos foram auditados.

---

## 🔴 Críticos (segurança)

### C1. Spoofing de tenant via metadata do signup
`handle_new_user` confia em `raw_user_meta_data->>'integrado_id'`:
```
target_integrado_id := COALESCE(
  (new.raw_user_meta_data ->> 'integrado_id')::uuid,
  new.id
);
```
Qualquer cliente pode chamar `supabase.auth.signUp({ options: { data: { integrado_id: '<tenant-alvo>' } } })` e entrar como usuário **de outro tenant**. Hoje o front só envia `full_name`, mas a porta está aberta no servidor.

**Correção:** ignorar `integrado_id` vindo do cliente. Aceitar vínculo a tenant existente **apenas** via fluxo controlado (edge function `criar-membro` que já existe). Para signup público, forçar `target_integrado_id := new.id`.

### C2. Auto-confirmação de email não verificada
`signUp` em `useAuth` redireciona para `/` e o `handleSubmit` chama `navigate('/home')` imediatamente após signup. Se a confirmação por email estiver ativa (recomendado), o usuário não tem sessão e é deslogado para `/auth` sem mensagem. Precisa verificar `data.session` e exibir tela "verifique seu email" quando `session === null`.

---

## 🟠 Importantes (consistência / dados)

### I1. Seed de dados de referência incompleto para novos tenants
`handle_new_user` só cria: `profiles`, `user_roles(admin)`, `mortalidade_media` e programas de iluminação padrão. Faltam itens que `initialize_demo_data` cria (`config_silo`, `config_fechamento`, `areas`, `grupos_produto`, `categorias` básicas). Tenant novo nasce sem configurações essenciais → quebra telas de Silos, Fechamento etc.
**Correção:** criar `seed_organizacao_padrao(integrado_id)` chamado por `handle_new_user` quando `target_integrado_id = new.id`, inserindo apenas dados estruturais (sem dados-demo de lotes/parceiros fictícios).

### I2. `CadastroOrganizacao.fetchData` filtra por `profile?.id` em vez de `profile.integrado_id`
```ts
.eq('integrado_id', profile?.id)
```
Funciona para o admin do tenant (id == integrado_id), mas membros (criador/veterinário) não enxergam nada. Deve ser `profile.integrado_id` para alinhar com a RLS.

### I3. `OrganizacaoForm` não valida CNPJ nem unicidade
- Sem validação de DV do CNPJ.
- Sem checagem se o CNPJ já existe no tenant antes do insert.
- `email` é salvo sem `.toLowerCase()/trim()`.
**Correção:** validar 14 dígitos + DV, `unique (integrado_id, cnpj)` no banco (index parcial onde `cnpj is not null`), normalizar email.

### I4. Cadastro sem Google OAuth
Diretriz do projeto pede Google habilitado por padrão. Hoje só há email/senha. Adicionar botão "Continuar com Google" no `Auth.tsx` e configurar provider.

---

## 🟡 Menores (UX / robustez)

- **M1.** `Auth.tsx` toast "Conta criada" sempre aparece mesmo quando o backend rejeita a sessão por confirmação pendente.
- **M2.** `OrganizacaoForm.onSubmit` faz `update(values)` incluindo todo o objeto, sem proteger `integrado_id` — RLS protege, mas convém remover `integrado_id` do payload do update.
- **M3.** Sem coluna `created_by` em `organizacoes` (boa para auditoria).
- **M4.** `fetchProfile` é refeito sem tratar erro; se `profile` for null, `fetchData` nunca roda — mostrar estado vazio explicativo.
- **M5.** Schema do signup permite senhas comuns ("Abcdef12") — habilitar política HIBP/leaked-password no projeto.

---

## Plano de correção (ordem sugerida)

1. **Hardening do `handle_new_user`** (migration):
   - Ignorar `integrado_id` da metadata; sempre `new.id` em signup público.
   - Criar helper `seed_organizacao_padrao(uuid)` para `config_silo`, `config_fechamento`, grupos/categorias mínimas.
2. **Migration `organizacoes`**:
   - Adicionar `created_by uuid default auth.uid()`.
   - Índice único parcial `(integrado_id, cnpj) where cnpj is not null`.
3. **`Auth.tsx` / `useAuth`**:
   - Tratar resposta de `signUp` quando `data.session === null` (tela "verifique seu email").
   - Adicionar login com Google (`signInWithOAuth`).
4. **`CadastroOrganizacao.tsx`**: trocar filtro para `profile.integrado_id`.
5. **`OrganizacaoForm.tsx`**: validar DV do CNPJ, normalizar email, remover `integrado_id` do update, mensagem de erro específica para violação de unique.
6. **Configuração de Auth no Cloud**: habilitar "leaked password protection" e revisar se "auto-confirm" está desligado.

## Itens fora deste plano (sinalizar, não alterar agora)
- Onboarding pós-signup (wizard de organização, área, núcleo) — sugerido como próximo épico.
- Migração de tenants existentes que tenham sido criados via spoofing (verificar `profiles` cuja `integrado_id != id` e não foram inseridos pela edge function de membros).

Confirme e eu implemento na ordem acima (posso quebrar em PRs separadas se preferir).
