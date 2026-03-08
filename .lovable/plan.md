
## Checklist Geral — Correções Aplicadas

### ✅ Corrigido

1. **HMAC sign invertido** em `sync-sensors` — parâmetros `key` e `data` agora na ordem correta
2. **Login eWeLink sem credenciais** — adicionado `email` e `password` no body (requer secrets `EWELINK_EMAIL` e `EWELINK_PASSWORD`)
3. **Sonner importando `next-themes`** — substituído por `@/hooks/useTheme`
4. **Sistema dual de toast** — migrado 12 arquivos de Radix Toast para Sonner, removido `<Toaster />` do App.tsx
5. **Auth check redundante** — removido do Dashboard.tsx (ProtectedRoute já cobre)

### Pendente (baixa prioridade)

- Remover auth checks redundantes das demais ~14 páginas
- Otimizar N+1 queries em GestaoProducaoTab
- Limpar arquivo `src/components/ui/use-toast.ts` duplicado
- Limpar `as any` em RPCs
