## Status

Migration da Fase 3 **já foi aplicada** (estou em plan mode, então o resto precisa de build mode):
- `galpoes.usar_percentis_automacao` (bool nullable)
- `log_decisao_clima.decisao_sombra` (jsonb)
- nova tabela `aprendizado_zona_clima` (galpao_id, zona, hora_dia, offset_c, amostras)

Para seguir com o código, **mude para build mode**. O que será feito:

---

## 1. `climate-brain/index.ts` — modo sombra + override

- Refatorar agregação em helpers `agregar(percentis: bool)` e `decidir(...)`.
- **Sempre computar as duas decisões** (percentis ON e OFF) por galpão.
- Decisão **real** = a que corresponde ao flag efetivo (galpão > org > false).
- Decisão **sombra** = a outra, gravada em `log_decisao_clima.decisao_sombra` com:
  - `modo`, `acao_neb`, `temp_c`, `ur_pct`, `ith`, `sensores`, `motivo`
  - `divergente` (bool) e `delta_temp_c` (diferença vs real)
- Precedência da flag adicionada via consulta a `galpoes.usar_percentis_automacao`.
- `reason_chain` ganha `fonte=galpao|org|default` para auditoria.

## 2. `auto-temperatura`, `auto-ventilacao`, `auto-cortina` — precedência por galpão

Em cada uma:
- Buscar `galpoes.usar_percentis_automacao` por galpão.
- `usarPercentis = galpao ?? org ?? false`.
- Mantém o filtro de zona/IQR já implementado na Fase 2; só muda a fonte do flag.

## 3. UI — `OverridePercentisGalpaoCard`

Nova seção em `ConfiguracaoAlertasClima.tsx` abaixo do `ZonasMetricasCard`:
- Lista todos os galpões da organização (via nucleos do integrado).
- Por galpão: badge mostrando modo efetivo + select 3-opções: **Herdar (org)**, **Forçar ON**, **Forçar OFF**.
- Salva em `galpoes.usar_percentis_automacao` (null/true/false).
- Tooltip explicando piloto por galpão antes de ativar geral.

## 4. UI — `ValidacaoSombraCard`

Novo card na mesma página (e/ou em `ClimateBrain.tsx`):
- Consulta `log_decisao_clima` últimos 7 dias do integrado.
- Agrega por galpão: total decisões, total divergentes, % divergência, maior `delta_temp_c`, distribuição de pares (modo_real → modo_sombra).
- Badge "Pronto p/ ativar" quando divergência crítica < 5%.
- Botão "Detalhes" → modal com timeline das últimas 50 divergências (timestamp, real, sombra, delta).

## 5. Hook `useValidacaoSombra(integradoId, dias=7)`

Centraliza a query e o cálculo de métricas para reuso entre os cards.

---

## Fora de escopo (Fase 3 — próximo loop)

- `climate-learn` v2 com offset por zona (precisa de mais ciclo de dados).
- `detect-sensor-drift` (Passo 4 do plano original).
- `RelatorioClimaticoLote` (Passo 5 — relatório pós-fechamento).

Esses entram em uma próxima iteração depois que a validação sombra rodar 1 ciclo real.

---

## Arquivos

**Editar:**
- `supabase/functions/climate-brain/index.ts` (refator + sombra)
- `supabase/functions/auto-temperatura/index.ts` (override por galpão)
- `supabase/functions/auto-ventilacao/index.ts`
- `supabase/functions/auto-cortina/index.ts`
- `src/pages/ConfiguracaoAlertasClima.tsx` (montar novos cards)

**Criar:**
- `src/components/lotes/historico-temp/OverridePercentisGalpaoCard.tsx`
- `src/components/lotes/historico-temp/ValidacaoSombraCard.tsx`
- `src/hooks/useValidacaoSombra.ts`

Aprova para eu implementar?
