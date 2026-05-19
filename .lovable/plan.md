## Contexto

Fase 1 (visualização robusta com zonas + mediana/P5–P95/sustentado) já está no ar. Falta:

1. Dar ao usuário **controle** sobre os parâmetros novos.
2. Permitir **override por lote** dos dias de pinteiro.
3. Deixar a **Fase 2 (automação)** plugada atrás da flag `usar_percentis_automacao`, desligada por padrão, para ativar depois de 1 ciclo de validação.

---

## Passo 1 — UI de Configuração da Organização

Nova seção em `src/pages/ConfiguracaoAlertasClima.tsx` (ou card dedicado em `Configuracoes.tsx`) chamada **"Zonas e métricas robustas"**:

- **Dias de pinteiro** (input numérico, 1–60, default 14) — grava em `config_zonas_galpao.dias_fim_pinteiro`.
- **Minutos para min/máx sustentado** (slider 5–60, default 20) — grava em `config_zonas_galpao.min_minutos_sustentado`. Tooltip: "Picos mais curtos que isso aparecem só como tooltip 'picos do dia', não disparam alerta."
- **Usar percentis na automação** (switch, default OFF) — grava em `config_zonas_galpao.usar_percentis_automacao`. Badge "Beta — valide 1 ciclo antes de ativar".
- Upsert por `integrado_id`. Usa `useConfigZonas` (já existe) + nova mutation no mesmo hook.

## Passo 2 — Override por lote

Em `src/components/lotes/LoteEditForm.tsx` (e no form de criação se for separado): novo campo opcional **"Dias de pinteiro deste lote"**:

- Input numérico, nullable, placeholder dinâmico `"Padrão da organização (Xd)"` onde X vem de `useConfigZonas`.
- Quando preenchido, grava em `lotes.dias_fim_pinteiro`; quando vazio, NULL (usa default da org).
- Tooltip explicando que isso afeta quais sensores entram no cálculo nos primeiros dias.

## Passo 3 — Indicador de modo ativo na tela do lote

Em `TemperaturaUmidadeCard.tsx` / no header do gráfico de histórico: badge mostrando `"Modo pinteiro — usando 2 de 5 sensores"` ou `"Modo engorda — 4 de 5 sensores"`, vindo de `sensoresUsados`/`sensoresTotal`/`zonaAtiva` já calculados em `useHistoricoData`. Só renderiza se houver mais de uma zona configurada.

## Passo 4 — Preparação Fase 2 (sem ativar)

Em `supabase/functions/climate-brain/index.ts` e nos `auto-*` (`auto-temperatura`, `auto-ventilacao`, `auto-cortina`, `auto-nebulizacao`):

- Carregar `config_zonas_galpao` + `lote.dias_fim_pinteiro` + zonas dos dispositivos.
- Se `usar_percentis_automacao = false` (default): comportamento atual intacto — média simples de tudo.
- Se `true`:
  - Filtrar leituras pelas zonas ativas (`zonasAtivasPara` portado para Deno em `_shared/agregarLeituras.ts`).
  - Aplicar `peso_amostragem` na média ponderada.
  - Janela 15 min + IQR para descartar outliers.
  - Logar em `log_decisao_clima.reason_chain`: `"zona_ativa=pinteiro, sensores=2/5, percentis=on"`.
- **Não ativar** automaticamente. Só plugar a infra.

## Passo 5 — Documentação curta

Adicionar nota em `docs/` (ou seção em `PoliticaRecuperacaoIoT.tsx`) explicando o modelo de zonas, min/máx sustentado e o roteiro de ativação da Fase 2.

---

## Arquivos afetados

**Edita:**
- `src/pages/ConfiguracaoAlertasClima.tsx` (nova seção) ou novo card em `Configuracoes.tsx`
- `src/hooks/useConfigZonas.tsx` (adicionar mutation `salvar`)
- `src/components/lotes/LoteEditForm.tsx` (+ form de criação, se existir separado)
- `src/components/lotes/historico-temp/TemperaturaChart.tsx` (badge de modo ativo) ou novo `ModoAtivoBadge.tsx`
- `supabase/functions/climate-brain/index.ts`
- `supabase/functions/auto-temperatura/index.ts`
- `supabase/functions/auto-ventilacao/index.ts`
- `supabase/functions/auto-cortina/index.ts`
- `supabase/functions/auto-nebulizacao/index.ts`

**Cria:**
- `supabase/functions/_shared/agregarLeituras.ts` (port Deno do utilitário JS)
- (opcional) `src/components/lotes/historico-temp/ModoAtivoBadge.tsx`

**Sem migration** — schema da Fase 1 já cobre tudo.

---

## Rollout

1. Passos 1–3 entram juntos (UI completa de Fase 1).
2. Passo 4 entra desligado por flag — zero impacto operacional.
3. Após você validar 1 ciclo com a visualização, basta ligar o switch "Usar percentis na automação" para a Fase 2 entrar em produção.

Confirma para implementar?
