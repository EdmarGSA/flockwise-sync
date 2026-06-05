
# Auditoria — Ambiência & Iluminação

Escopo: páginas (`LoteAmbienciaControle`, `AmbienciaDashboard`, `ClimateBrain`, `BrainAutomacao`, `ProgramasIluminacao`, `EstimuloPostura`, configurações de clima), hook `useAmbienciaLote`, edge functions `climate-brain`, `auto-iluminacao`, `auto-ventilacao`, `auto-cortina`, `auto-nebulizacao`, `auto-temperatura`, `auto-qualidade-ar`, `brain-iluminacao`, `brain-dispatcher`, `climate-learn`, `detect-sensor-drift`, `auto-sync-sensors`, cron jobs e RLS das 20 tabelas envolvidas.

## 1. Saúde geral (estado atual)

| Item | Estado |
|------|--------|
| RLS em todas as 20 tabelas do domínio | ✅ habilitada |
| Cron jobs ativos (clima, iluminação, sensores) | ✅ 17 jobs rodando |
| Dispositivos do tenant atual | 4 ativos / 4 online |
| Decisões `climate_brain` últimas 6h | 114 (galpão único) — sem skips |
| Comandos `comando_brain` últimas 24h | 2, ambos em `sugerido` (nunca avançam) |
| Edge logs `climate-brain` / `auto-iluminacao` | sem erros nas últimas execuções |

## 2. Achados críticos (P0)

**C1. Comandos do Brain estão presos em `sugerido`.**
`climate-brain` grava sugestões em `comando_brain` (status `sugerido`), mas só viram `aprovado/enviado` se humano aprovar **ou** se `galpoes.automacao_brain = 'auto'`. Nenhum comando das últimas 24h saiu de `sugerido` — efeito prático: o coordenador climático não está atuando, apenas registrando intenções. Precisa fluxo de aprovação na UI **ou** documentar/expor o toggle `automacao_brain` por galpão.

**C2. JWT `anon` colado em texto puro em 17 cron jobs.**
Todos os jobs em `cron.job` embutem o `apikey` anon literalmente no SQL. Quando a chave rotacionar, todos os jobs param silenciosamente. Padronizar com `current_setting('app.settings.anon_key')` (ou Vault) e migração única.

**C3. `auto-iluminacao` cai para o default de corte em granjas de postura.**
Linha 172 do edge: `defaultByOrg` só preenche programas com `tipo_producao = 'frango_corte'`. Para galpões de postura sem `programa_iluminacao_id` no lote, a função não acha faixa e mantém `off` — sem log de motivo no banco.

## 3. Achados de alto impacto (P1)

**A1. `historico_estado_canal` cresce sem TTL/retenção.**
`auto-iluminacao` faz INSERT a cada mudança de estado (potencialmente a cada minuto por canal). Idem `eventos_dispositivo_iot` e `log_decisao_clima` (518 linhas em 24h para um único galpão → ~190k/ano por galpão). Falta job de purge ou particionamento.

**A2. Comandos eWeLink/ESP32 disparados sem `await` agrupado em loop sequencial.**
`auto-iluminacao` aguarda `supabase.functions.invoke` canal-a-canal dentro do `for`. Com N canais o cron de 1 min pode estourar timeout do Edge. Migrar para `Promise.allSettled` em lotes.

**A3. `useAmbienciaLote` faz subscribe global a `canais_dispositivo`, `override_iluminacao_canal` e `leituras_sensores` sem filtro.**
Linhas 212, 217, 218 do hook: realtime escuta TODAS as linhas dessas tabelas (multi-tenant). Provoca tráfego desnecessário em todos os clientes e vazamento parcial de metadados via realtime. Filtrar por `dispositivo_id=in.(...)` ou por `integrado_id` quando suportado, ou desinscrever quando aba não estiver visível.

**A4. `climate-brain` não verifica idade do `leituras_sensores`.**
Janela é 15 min, mas se um galpão tem sensores parados há 14 min ele decide sobre 1 leitura velha. Sem flag `dados_frescos < N min` nem alerta para o operador.

**A5. Página `LoteAmbienciaControle` exibe "Carregando ambiência…" indefinidamente em lotes sem galpão.**
Hook retorna `lote` válido com `galpao_id=null`, mas `isLoading` cobre apenas a primeira fetch. Falta empty-state ("Lote sem galpão vinculado").

## 4. Achados médios (P2)

- **M1.** `AtuadoresLiveRow` mostra nebulização "ON/OFF" baseado em `ultimo_estado` armazenado, não em ACK do firmware → pode mentir após queda. Reaproveitar `statusCanal()` em `lib/ambiencia/statusCanal.ts`.
- **M2.** `console.warn` ignorado no preview: `Function components cannot be given refs` em `SiloBadge` dentro do `LoteDetalhe` (efeito colateral do `Badge` em `TooltipTrigger`). Não é do módulo, mas aparece junto. Envolver `Badge` em `forwardRef` ou usar `asChild`.
- **M3.** `auto-ventilacao` (3 min), `auto-cortina` (2 min), `auto-nebulizacao`, `auto-temperatura` são invocados **duas vezes**: pelo cron próprio **e** novamente pelo `climate-brain` no final via `callFn` (linha 429-431). Risco de "double-fire" e logs duplicados.
- **M4.** Duplicidade de cron `auto-temperatura-5min` (`*/5`) e `auto-temperatura-every-5min` (`2-57/5`) — dois jobs quase sobrepostos.
- **M5.** `override_iluminacao_brain` ativo encontrado com `data_ref=hoje`, mas `online=0` no agregado (nosso filtro de online foi sobre `ultimo_sync`, e o override não tem esse campo — só ruído de relatório). Documentar.
- **M6.** `climate-brain` não respeita `RLS` (usa service role) ao ler `aprendizado_zona_clima`. Confirmar que essa tabela tem RLS adequada para leitura no painel — frontend pode tentar ler e levar 403 silencioso.
- **M7.** `brain-iluminacao` roda só 2x/dia (06:30 e 15:00). Galpões alojados após 15:00 ficam até o dia seguinte sem override AI mesmo precisando.
- **M8.** `useAmbienciaLote` faz `lastEventAt = Date.now()` no heartbeat após invalidar — se realtime cair, vai refetchar a cada 60s indefinidamente, mas nunca alerta o usuário. Trocar por toast/badge "offline-realtime".

## 5. Achados de UX / consistência

- **U1.** `ProximaAcaoPanel.descreverProximaIluminacao` ignora `override_iluminacao_brain` e `override_iluminacao_canal` — pode mostrar próxima ação contradizendo o que o edge vai fazer.
- **U2.** `KpiClimaLote` agrega `serieKpi` de até 200 leituras na última hora sem deduplicar por dispositivo — sparkline pula entre sensores. Agregar por minuto (média) antes de plotar.
- **U3.** `BarraAlertasOperacionais` só mostra alertas operacionais derivados do `data` local, ignora `alertas_climaticos` e `alertas_qualidade_ar` no banco. Operador não vê alerta enquanto a aba não recarrega.
- **U4.** Botão para abrir `OverridesIluminacaoDialog` está em `/ambiencia` mas não em `/meus-lotes/:id/ambiencia` — operador precisa navegar.
- **U5.** Sem indicador visual da diferença `decisao_sombra` × decisão real, apesar do edge gravar `divergente`/`delta_temp_c`. Excelente material desperdiçado.

## 6. Achados de segurança

- **S1.** Linter Supabase: 48 issues totais; ~10 são `Public Can Execute SECURITY DEFINER Function` em funções deste módulo (provavelmente `marcar_dispositivos_offline_iot`, `auto_aplicar_estimulos_postura`, `has_role`, etc.). Revogar `EXECUTE FROM PUBLIC` quando não houver caso público.
- **S2.** Cron jobs com JWT anon em SQL (ver C2) — expõe a chave no histórico de queries / logs de DBA.
- **S3.** `intelbras-bridge/snapshot-all-cron` e `auto-sync-sensors` usam `Authorization: Bearer <anon>`. Internamente esses endpoints devem exigir service-role ou um secret próprio.

## 7. Recomendações priorizadas (próximas iterações)

1. **P0** — Painel para aprovar/recusar `comando_brain` pendentes + toggle `automacao_brain` por galpão na UI de configuração. (resolve C1)
2. **P0** — Migração que centraliza o anon-key dos crons num GUC/Vault. (C2)
3. **P0** — Fallback de `programa_iluminacao_lote` para postura em `auto-iluminacao` + log explícito quando não há programa. (C3)
4. **P1** — Lote/Promise.allSettled em `auto-iluminacao` e `auto-ventilacao`. (A2)
5. **P1** — Filtrar realtime no `useAmbienciaLote` por `dispositivo_id` e desinscrever em `document.hidden`. (A3)
6. **P1** — Job mensal de purge/particionamento em `historico_estado_canal`, `log_decisao_clima`, `eventos_dispositivo_iot`. (A1)
7. **P1** — Empty-state e "dados frescos há X min" no header da página. (A4 + A5)
8. **P2** — Remover `callFn` final no `climate-brain` (deixar cron próprio decidir). (M3)
9. **P2** — Desativar o cron duplicado `auto-temperatura-every-5min`. (M4)
10. **P2** — Mostrar `decisao_sombra.divergente` no `TimelineDecisoesBrain`. (U5)

## Como prosseguir

Posso transformar qualquer um dos itens acima em tarefas de implementação. Sugestão de primeira leva (1 sprint curto): **C1 + C3 + A3 + A5 + M3/M4** — cobre o que está silenciosamente "não atuando" e os bugs visíveis ao usuário, sem mexer em retenção de dados (que pede planejamento).
