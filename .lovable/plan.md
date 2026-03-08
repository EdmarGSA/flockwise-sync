
## Checklist Geral — Correções Aplicadas

### ✅ Corrigido

1. **HMAC sign invertido** em `sync-sensors` — parâmetros `key` e `data` agora na ordem correta
2. **Login eWeLink sem credenciais** — adicionado `email` e `password` no body (requer secrets `EWELINK_EMAIL` e `EWELINK_PASSWORD`)
3. **Sonner importando `next-themes`** — substituído por `@/hooks/useTheme`
4. **Sistema dual de toast** — migrado 12 arquivos de Radix Toast para Sonner, removido `<Toaster />` do App.tsx
5. **Auth check redundante** — removido do Dashboard.tsx (ProtectedRoute já cobre)
6. **Cálculo de nível de silo unificado** — extraído para `src/lib/utils/calcularNivelSilo.ts`, eliminando 3 cópias independentes
7. **Consumo pós-histórico corrigido** — agora soma consumo dia a dia em vez de multiplicar consumo fixo × dias
8. **Devoluções no cálculo pós-histórico** — filtro unificado incluindo `parcialmente_devolvido` e descontando `quantidade_devolvida_kg`
9. **Thresholds dinâmicos** — `SilosMapSection` e `RiscoEstoqueCard` agora usam `config_silo` em vez de valores hardcoded
10. **Divergência filtrada por lote_id** — `NivelSiloCard` agora filtra histórico por `lote_id` em vez de só `galpao_id`

### Pendente (baixa prioridade)

- Remover auth checks redundantes das demais ~14 páginas
- Otimizar N+1 queries em GestaoProducaoTab
- Limpar arquivo `src/components/ui/use-toast.ts` duplicado
- Limpar `as any` em RPCs
- Corrigir `diasDesdeAlojamento` retroativo no `NivelSiloUpdateForm`
