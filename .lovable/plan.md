
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
11. **getLinhagemLabel unificado** — extraído para `src/lib/utils/labels.ts`, eliminando 5 cópias em GestaoCampo, MeusLotes, useLoteAnalytics, DesempenhoTable, FechamentoLoteDialog
12. **getStatusBadge unificado** — mapeamento completo (previsao, agendado, alojado, em_producao, jejum, saiu_para_entrega, abatido, fechado) em `src/lib/utils/labels.ts`, corrigindo 4 versões inconsistentes
13. **MeusLotes N+1 queries eliminado** — refatorado de ~7 queries/lote para batch queries com `WHERE lote_id IN (...)`
14. **calcularAvesVivas unificado** — criado `src/lib/utils/calcularAvesVivas.ts` com fórmula correta: `(quantidade_aves - mortos_recebimento) - mortalidade_acumulada`
15. **LoteDashboardTab corrigido** — removido acesso a `consumo_min/max` inexistentes, substituído `differenceInDays` por `calcularIdadeLote`
16. **useLoteAnalytics devoluções** — propagada correção de devoluções do silo (filtra `parcialmente_devolvido`, desconta `quantidade_devolvida_kg`)

### Pendente (baixa prioridade)

- Remover auth checks redundantes das demais ~14 páginas
- Otimizar N+1 queries em GestaoProducaoTab
- Limpar arquivo `src/components/ui/use-toast.ts` duplicado
- Limpar `as any` em RPCs
- Corrigir `diasDesdeAlojamento` retroativo no `NivelSiloUpdateForm`
- Padronizar fórmula de CA entre dashboard e pesagem (massa total vs massa ganho)
- Propagar `calcularAvesVivas` para LoteDetalhe.tsx (atualmente ignora mortalidade diária)
