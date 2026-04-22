

## Auditoria Completa do Sistema — Relatório

**Escopo:** 377 arquivos TS/TSX, 18 edge functions, 142 migrations, 116 tabelas Postgres.

---

### 🔴 BUGS CRÍTICOS (impacto operacional imediato)

**B1. Automação ESP32 não aciona dispositivos**
`auto-temperatura/index.ts` decide o estado correto para canais ESP32 (já refatorado) mas **só envia comando via API eWeLink**. Não chama `esp32-bridge/command` nem grava em `canais_dispositivo.estado_atual` para o firmware fazer pull. Resultado: cron decide ligar ventilador ESP32 → grava log → **nada acontece no relé**.

**B2. `auto-sync-sensors` roda sem token**
Logs mostram `auto-sync: no token for integrado d351a123…, skipping` a cada 60s. A tabela `ewelink_tokens` está **vazia (0 registros)** mas existem 3 dispositivos eWeLink ativos. A integração eWeLink atual está quebrada — nenhuma leitura recebida em 24h (`leituras_24h = 0`).

**B3. Offline alerts spam**
`auto-temperatura` dispara alertas como `device 1001841ee9 offline for 4260 min` (3 dias) repetidamente sem deduplicação por janela. Cada ciclo de 5 min gera novo alerta.

**B4. Realtime parcial em IoT**
Migration aplicada apenas para `canais_dispositivo` e `leituras_sensores`. `dispositivos_iot` (online/status) e `log_automacao_temperatura` ficaram **fora do publication realtime** — UI não reflete mudanças sem refresh.

---

### 🟡 DUPLICIDADES E AMBIGUIDADES

**D1. Sistema de toast duplicado (parcialmente removido)**
- `src/hooks/use-toast.ts` (Radix, 3.9KB) ainda existe
- `src/components/ui/use-toast.ts` (re-export, 82B) ainda existe
- 0 imports do legado, 121 imports de Sonner
- **Memória do projeto** já marcou Sonner como padrão. Arquivos podem ser deletados.

**D2. Tabelas paralelas Cliente/Fornecedor sem documentação clara**
- `pedidos` (6) vs `pedidos_fornecedor` (0) vs `pedidos_catalogo_fornecedor` (0)
- `produtos` (26) vs `produto_fornecedor` (10) vs `produtos_catalogo_fornecedor` (3)
- `formas_pagamento` (3) vs `formas_pagamento_fornecedor` (0)
- `prazos_pagamento` (5) vs `prazos_pagamento_fornecedor` (0)

A separação é intencional (Mini-ERP do Fornecedor isolado), mas **não há comentário SQL** nem doc explicando o split — risco de novo dev gravar no lugar errado.

**D3. Hooks de check redundantes**
`useCriadorCheck`, `useVeterinarioCheck`, `useIntegradoCheck`, `useSuperAdminCheck`, `useSupplierCheck` — 5 hooks com lógica idêntica (só muda o role string). Deveria ser 1 hook genérico `useRoleCheck(role)`.

---

### 🟠 FUNÇÕES/CÓDIGO ÓRFÃO E INCOMPLETO

**O1. Edge functions sem chamada do frontend**
- `auto-sync-sensors` ✅ (chamada via cron — ok)
- `auto-temperatura` ✅ (cron)
- `esp32-bridge` ⚠️ (zero chamadas externas — nem cron, nem firmware, nem UI)
- `ewelink-oauth-callback` ⚠️ (zero chamadas — fluxo OAuth quebrado, justifica B2)
- `sensor-webhook` ⚠️ (sem hardware enviando)
- `create-demo-user` ⚠️ (não chamada — modo demo manual)

**O2. Tabelas vazias com componente UI completo (features 50% implementadas)**
| Tabela | Componente existe | Status |
|---|---|---|
| `fechamento_lotes` | `FechamentoLoteDialog.tsx` (466 linhas) | Nunca exercitado |
| `metas_postura` | `MetasPosturaDialog.tsx` | Nunca exercitado |
| `producao_ovos` | `ProducaoOvosDialog.tsx` | Nunca exercitado |
| `programa_cortina_lote` | (sem UI) | Backend órfão |
| `regras_automacao_avancada` | (sem UI) | Backend órfão |
| `equipamentos_producao` | (sem UI) | Backend órfão |
| `historico_estado_canal` | Tabela criada mas nada grava | Schema dead-code |
| `support_tickets` | (sem UI) | Roadmap não iniciado |
| `onboarding_steps` | (sem UI) | Roadmap não iniciado |
| `medicamentos_config` | UI lê mas nunca cadastra | Vazio = bloqueio silencioso |

**O3. `TemperaturaUmidadeCard` ignora canais**
Já listado na auditoria anterior — continua sem visualizar canais por dispositivo no detalhe do lote.

**O4. Código órfão em historico-temp**
`useHistoricoData.ts` busca `regras_temperatura_lote` por `integrado_id` mas não filtra por `lote_id` — todas as regras do integrado se sobrepõem aos cálculos de "dentro da faixa".

---

### 🔵 INCONSISTÊNCIAS DE DADOS E CÓDIGO

**I1. 258 ocorrências de `: any`** — alta dívida de tipos. Concentradas em `useDeviceControl`, formulários longos, edge functions copiadas.

**I2. Mortalidade média padrão sempre `cobb_500`**
`handle_new_user` cria registro hardcoded `cobb_500/misto`. Granjas Ross/Hubbard começam com referência errada.

**I3. `same_organization` SECURITY DEFINER duplicado**
Existe a função no DB mas RLS de várias tabelas usa diretamente subqueries equivalentes em vez da função — risco de policies inconsistentes.

**I4. `is_demo_user()` + `can_modify_data()` aplicado parcialmente**
Apenas algumas RLS chamam `can_modify_data()`. Demo user pode escrever em tabelas onde a checagem foi esquecida.

**I5. `solicitacoes_racao` (26 colunas) — modelo gigante**
Status, devolução, recebimento, divergência tudo numa tabela só. Falta normalização ou enum estrito.

**I6. Bucket público `catalogo-fornecedor` permite listing** (linter)
Qualquer cliente lista todos arquivos do bucket. Risco de enumeração.

**I7. `metas_zootecnicas` 41 colunas em wide-format**
mortalidade_7_dias_ok, mortalidade_7_dias_alerta, mortalidade_14_dias_ok… (×7 idades × 2 níveis × 2 métricas). Adicionar nova faixa exige migration. Deveria ser long-format `(idade, metrica, nivel, valor)`.

**I8. `auto-temperatura` ainda chama eWeLink mesmo para integrados sem token**
Linha 261 — fetch contra `v2/device/thing/status` sem checar se há token primeiro, gera erros silenciosos.

---

### 🟢 RISCOS DE SEGURANÇA

**S1. RLS coverage** — não há tabela sem RLS (linter limpo nesse aspecto).
**S2. Bucket público** — ver I6.
**S3. `esp32-bridge` valida `x-device-token`** ✅, mas sem rate limiting nem revogação de token comprometido.
**S4. Edge functions `verify_jwt = false`** em massa (18 functions). Algumas como `verify-admin-credentials`, `create-user`, `dispatch-webhook` validam internamente, mas não foi auditado caso a caso.

---

### 📋 PLANO DE CORREÇÃO PROPOSTO (ordem de impacto)

**Sprint A — Bugs operacionais (4 alterações, alta prioridade)**
1. Reconectar token eWeLink (campanha do usuário) ou ocultar botões eWeLink quando `ewelink_tokens` vazio
2. `auto-temperatura` — adicionar branch `if (driver === 'esp32_http')` que apenas grava `canais_dispositivo.estado_atual` (firmware faz pull) e pula chamada eWeLink
3. `auto-temperatura` — deduplicar offline-alert (1 alerta por device a cada 6h)
4. Adicionar `dispositivos_iot` e `log_automacao_temperatura` ao publication realtime

**Sprint B — Cleanup (sem risco)**
5. Deletar `src/hooks/use-toast.ts` e `src/components/ui/use-toast.ts`
6. Unificar 5 hooks de check em `useRoleCheck(role)` genérico
7. Adicionar `COMMENT ON TABLE` nas tabelas paralelas Cliente/Fornecedor
8. Filtrar `regras_temperatura_lote` por `lote_id` em `useHistoricoData`

**Sprint C — Features incompletas (decidir manter ou remover)**
9. Remover ou completar: `programa_cortina_lote`, `regras_automacao_avancada`, `equipamentos_producao`, `historico_estado_canal`, `support_tickets`, `onboarding_steps`
10. `TemperaturaUmidadeCard` — exibir canais por dispositivo
11. Validação: `auto-temperatura` pular fetch eWeLink se integrado sem token

**Sprint D — Segurança e dívida técnica (longo prazo)**
12. Restringir SELECT do bucket `catalogo-fornecedor` a paths conhecidos
13. Refatorar `metas_zootecnicas` para long-format
14. Auditar uma a uma as 18 edge functions com `verify_jwt = false`
15. Reduzir uso de `: any` (258 → meta <50)

### Detalhes técnicos

- Sprint A produz a única migration: `ALTER PUBLICATION supabase_realtime ADD TABLE …`
- Sprint A item 2 elimina o "fix superficial" anterior — garante que ESP32 funcione end-to-end
- Sprints B/C não afetam dados em produção
- Sprint D requer decisão de produto antes de migration

**Quer que eu execute Sprint A imediatamente, ou prefere selecionar itens específicos das 4 sprints?**

