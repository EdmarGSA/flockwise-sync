

# Checklist Geral do Sistema — Auditoria de Conflitos, Bugs e Duplicações

## 1. SISTEMA DUAL DE TOAST (CONFLITO)

O sistema usa **duas bibliotecas de toast simultaneamente**:
- **`@/hooks/use-toast`** (Radix UI Toast) — usado em ~14 arquivos (Auth, Dashboard, BackofficeCS, CadastroOrganizacao, etc.)
- **`sonner`** (Sonner Toast) — usado em ~112 arquivos

Ambos os Toasters estão renderizados no `App.tsx` (linha 476-477). Isso causa:
- Toasts aparecendo em posições diferentes na tela
- Experiência visual inconsistente
- Código duplicado (`src/components/ui/use-toast.ts` é só um re-export de `src/hooks/use-toast.ts`)

**Recomendação**: Migrar tudo para `sonner` (já é maioria) e remover o Radix Toast.

---

## 2. AUTENTICAÇÃO REDUNDANTE NAS PÁGINAS (BUG ARQUITETURAL)

Todas as rotas já passam por `<ProtectedRoute>` no `App.tsx`, que redireciona para `/auth` se não autenticado. Porém, **~15 páginas** fazem verificação de auth duplicada internamente:
- `Configuracoes.tsx`: `if (!user) { navigate('/auth'); return null; }`
- `ConfiguracaoFechamento.tsx`, `ConfiguracaoSilo.tsx`, `CadastroMembros.tsx`, `CadastroOrganizacao.tsx`, etc.

Isso é redundante e pode causar **flash de tela** (renderiza brevemente antes do redirect).

Algumas páginas usam `<Navigate>` (correto), outras usam `navigate()` imperativo (pode causar warnings do React).

**Recomendação**: Remover verificações de auth internas — o `ProtectedRoute` já cobre.

---

## 3. BUG NA EDGE FUNCTION `sync-sensors` — HMAC SIGN INCORRETO

```typescript
// Linha 38 — key e dados estão invertidos no crypto.subtle.sign()
const sig = await crypto.subtle.sign("HMAC", encoder.encode(signPayload), key);
```

A assinatura de `crypto.subtle.sign(algorithm, key, data)` recebe **key primeiro, data depois**. O código passa `data` como key e `key` como data. Isso faz com que TODA chamada à eWeLink API falhe com assinatura inválida.

**Correção**: `crypto.subtle.sign("HMAC", key, encoder.encode(signPayload))`

---

## 4. EDGE FUNCTION `sync-sensors` — LOGIN SEM CREDENCIAIS DE USUÁRIO

A função `getEwelinkToken` envia POST para `/v2/user/login` mas **não inclui email/password no body** — só envia `lang`, `countryCode`, `ts`, `nonce`. A API eWeLink v2 requer credenciais do usuário (email + password) ou um refresh token para login.

**Correção**: Adicionar secret `EWELINK_EMAIL` e `EWELINK_PASSWORD`, ou usar fluxo OAuth com token de refresh.

---

## 5. SONNER TOASTER USA `next-themes` (CONFLITO)

`src/components/ui/sonner.tsx` importa `useTheme` de `next-themes`:
```tsx
import { useTheme } from "next-themes";
```

Mas o projeto **não usa Next.js** — usa Vite + React Router. O hook `useTheme` customizado está em `src/hooks/useTheme.tsx`. O Sonner provavelmente pega o theme errado (sempre "system").

**Recomendação**: Substituir o import por `useTheme` do `@/hooks/useTheme`.

---

## 6. SUPABASE RPC CALLS COM `as any` (TYPE SAFETY)

`useModuleAccess.tsx` chama RPCs com `as any`:
```tsx
supabase.rpc('get_user_accessible_modules' as any, {...})
supabase.rpc('user_can_access_module' as any, {...})
```

Isso indica que as funções não estão no types.ts auto-gerado, suprimindo erros de tipo. Não é um bug funcional, mas reduz segurança de tipos.

---

## 7. `useOfflineSync` — TABELAS DINÂMICAS COM `as any` (RISCO)

O hook insere dados em tabelas dinâmicas via `supabase.from(record.table as any)`. Se `record.table` contiver um nome incorreto, o erro só aparece em runtime.

---

## 8. PÁGINA `Configuracoes.tsx` — NÃO USA `useIntegradoId`

A página de Configurações não verifica `integradoId`, diferente de quase todas as outras páginas protegidas. Não é um bug direto, mas é inconsistente.

---

## 9. ARQUIVO `src/components/ui/use-toast.ts` — DUPLICAÇÃO PURA

Este arquivo é apenas:
```tsx
import { useToast, toast } from "@/hooks/use-toast";
export { useToast, toast };
```

Re-exporta o mesmo conteúdo. Alguns arquivos importam de `@/hooks/use-toast`, outros de `@/components/ui/use-toast`. Duplicação desnecessária.

---

## 10. `GestaoProducaoTab` — N+1 QUERY PROBLEM

No `fetchDemandaData()`, para cada lote ativo, faz **3 queries** individuais ao `desempenho_aves` (uma por dia de previsão). Com 50 lotes = 150 queries sequenciais. Deveria fazer uma única query com `WHERE dia IN (...)`.

---

## RESUMO DE PRIORIDADES

| # | Severidade | Problema |
|---|---|---|
| 3 | **CRÍTICO** | HMAC sign com parâmetros invertidos (sync-sensors não funciona) |
| 4 | **CRÍTICO** | Login eWeLink sem credenciais no body |
| 5 | **ALTO** | Sonner importa `next-themes` em vez de hook customizado |
| 1 | **MÉDIO** | Sistema dual de toast (Radix + Sonner) |
| 2 | **MÉDIO** | Auth checks redundantes em ~15 páginas |
| 10 | **MÉDIO** | N+1 queries na previsão de consumo |
| 9 | **BAIXO** | Arquivo use-toast.ts duplicado |
| 6-7 | **BAIXO** | `as any` em RPCs e offline sync |
| 8 | **BAIXO** | Configurações sem integradoId |

Quer que eu corrija os itens críticos e altos primeiro?

