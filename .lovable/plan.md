

## Auditoria do Sistema — Resultados Consolidados

Auditoria realizada em DB (linter + security scan), código (órfãos, duplicações, qualidade) e arquitetura. Total de **22 problemas reais** detectados, agrupados por severidade.

---

### 🔴 CRÍTICOS — Segurança (corrigir já)

| # | Problema | Tabela/Local | Risco |
|---|---|---|---|
| 1 | RLS `USING (true)` para **anônimos** em `organizacoes` | expõe CNPJ, email, telefone, endereço | Vazamento dados PJ |
| 2 | RLS `USING (true)` anon em `nucleos` | expõe GPS, endereço completo das fazendas | Geolocalização exposta |
| 3 | RLS `USING (true)` anon em `lotes` e `galpoes` | quantidades, custos, infraestrutura | Espionagem competitiva |
| 4 | RLS `USING (ativo=true)` anon em `estoque_ovos` | inventário, custos, lotes | Exposição de estoque |
| 5 | Policy `Allow profile creation` em `profiles` com `WITH CHECK true` para **public** | qualquer anônimo pode criar profile com `id` arbitrário | Privilege escalation |
| 6 | Bucket `mortalidade-fotos` SELECT aberto a `public` sem ownership | fotos de todas organizações | Vazamento de dados sensíveis |
| 7 | Bucket `veterinario-midias` sem checagem de organização em SELECT/UPDATE/DELETE | qualquer auth lê/altera/apaga arquivos | Multi-tenant quebrado |
| 8 | Sem RLS em `realtime.messages` para tabelas publicadas (`solicitacoes_racao`, `leituras_sensores`, `alertas_temperatura`) | qualquer auth assina topics de outras orgs | Cross-tenant leak via Realtime |

### 🟡 MÉDIOS — Configuração & Boas práticas

| # | Problema | Detalhe |
|---|---|---|
| 9 | Função `update_updated_at_column` sem `SET search_path` | warning linter, único caso restante (28 funções já corrigidas) |
| 10 | `Service role full access` com `USING true` em `nfe_racao_recebidas` e `timers_seguranca_iot` | Service role já bypassa RLS — policy redundante e confunde linter |
| 11 | `silos_modelo`, `modulos`, `role_modulos` com `USING true` para authenticated | aceitável (catálogo público), mas merece revisão |

### 🟠 Código órfão (remover)

**11 componentes nunca importados:**
- `src/components/TutorialOverlay.tsx`
- `src/components/cadastro/FormulacaoDialog.tsx`
- `src/components/cockpit/{CompassIndicator,GaugeChart,SparklineChart}.tsx`
- `src/components/comercial/{NovoPedidoDialog,RomaneioEntregaDialog}.tsx`
- `src/components/fabrica/ContasPagarTable.tsx` (818 linhas — substituído pela versão em `financeiro/`)
- `src/components/lotes/{MortalidadeFotoUpload,NivelSiloSelector}.tsx`
- `src/components/ovos/TransferirEstoqueOvosDialog.tsx`

**3 hooks órfãos:** `useOnlineStatus`, `useTipoProducao`, `useWebhooksFornecedor`

**1 página órfã:** `src/pages/backoffice/BackofficeSidebar.tsx` (deveria estar em `components/`)

**4 edge functions sem invocação no código:**
- `auto-sync-sensors`, `esp32-bridge`, `sensor-webhook`, `create-demo-user` 
- *(podem ser chamadas externamente — confirmar antes de remover. `auto-sync-sensors` roda via cron e está ativa nos logs ✅)*

### 🟣 Inconsistências

| # | Problema | Impacto |
|---|---|---|
| 12 | Rota duplicada: `/configuracoes/silos` **e** `/configuracoes/silo` | Confusão de navegação |
| 13 | `NovoPedidoDialog` (1083 linhas) órfão **e** `NovoPedidoStepper` ativo | Código morto |
| 14 | 408 ocorrências de `: any` / `as any` | Type safety degradada |
| 15 | 359 `console.log/error/warn` no código de produção | Performance + leak de info |
| 16 | 7 arquivos > 1000 linhas (`MetasPesoLote` 1546, `DispositivosIoT` 1333, `PesagemDialog` 1271…) | Manutenibilidade |
| 17 | TODO em `useFornecedorData.tsx:221` (consumo médio hardcoded = 10) e `LoteDetalhe.tsx:236` (mortalidade não subtraída) | Cálculos imprecisos |

---

### 📋 Plano de Correção (ordem sugerida)

**Fase 1 — Segurança crítica (migration única):**
1. DROP das 4 policies anônimas (`organizacoes`, `nucleos`, `lotes`, `galpoes`, `estoque_ovos`) — substituir por filtro `integrado_id` autenticado. Manter acesso público via rota `/rastreio/:lote` por edge function dedicada com filtro pontual (não por RLS aberta).
2. DROP `Allow profile creation` em `profiles` (a policy `Users can insert own profile` já cobre).
3. Reescrever policies dos buckets `mortalidade-fotos` e `veterinario-midias` exigindo path `{integrado_id}/...`.
4. Adicionar policies em `realtime.messages` por `integrado_id`.

**Fase 2 — Limpeza:**
5. Remover 11 componentes + 3 hooks + 1 página órfãos.
6. Remover rota duplicada `/configuracoes/silo` (manter `/silos`).
7. `SET search_path = public` em `update_updated_at_column`.
8. Remover policies redundantes de `service_role` (2 tabelas).

**Fase 3 — Qualidade (incremental):**
9. Resolver os 2 TODOs (cálculo correto de consumo e mortalidade).
10. Substituir `console.log` por logger condicional (DEV only) — script automatizado.

**Fase 4 — Refatoração (opcional):**
11. Quebrar arquivos > 1000 linhas em subcomponentes.

---

### Arquivos da Fase 1 (escopo da próxima execução)

- 1 nova migration SQL (correções RLS + buckets + realtime)
- 1 nova edge function `rastreio-publico` (substituir RLS aberta de `lotes`/`organizacoes` para a página pública `/rastreio/:lote`)
- Atualizar `src/pages/RastreioOvos.tsx` para chamar edge function em vez de query direta
- Deletar 15 arquivos órfãos
- `src/App.tsx`: remover rota `/configuracoes/silo`

Aprovar para eu executar a **Fase 1 + Fase 2** numa única passada (mais impactante e segura), deixando Fases 3-4 para depois.

