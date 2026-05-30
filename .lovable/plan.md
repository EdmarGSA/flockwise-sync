## Objetivo

Tela única **por lote** que mostre, em tempo real, todo o ecossistema de ambiência + iluminação do galpão:
- **Alertas operacionais** (NOC) no topo: sensor mudo, dispositivo offline, sem ACK, Brain parado.
- **Parâmetros configurados**: setpoints, faixa de temperatura do dia, histerese, fotoperíodo.
- **Programação ativa**: curva climática + blocos de iluminação + override do Brain.
- **Próxima ação prevista** (clima e iluminação) — interpretabilidade.
- **Dados reais** dos sensores (T, UR, ITH, tendência 1 h).
- **Status real-time dos dispositivos/canais** (ONLINE / OFFLINE / SEM ACK) em **cards no mobile** e tabela no desktop.

Centraliza o que hoje está espalhado em `AmbienciaDashboard`, `LoteIluminacaoCard`, `TemperaturaUmidadeCard`, `DispositivoIluminacaoCard`, `SaudeIoTPanel`, `ClimateBrain`.

## Rota e navegação

- Nova rota: `/lote/:loteId/ambiencia` — protegida por `ProtectedRoute` + `ModuleProtectedRoute` (módulo `iot`/`campo`).
- Acesso a partir de `LoteDetalhe`, `LoteCard`, e clique no card do galpão no `AmbienciaDashboard` (com lote ativo).

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: Lote · Galpão · Idade · Linhagem · Pílula modo Brain │
├──────────────────────────────────────────────────────────────┤
│ ⚠ BARRA DE ALERTAS OPERACIONAIS (NOC)                        │
│   • Sensor sem dados há 18 min                               │
│   • Cortina sem ACK há 4 min                                 │
│   • Brain sem decisão há 22 min                              │
├──────────────────────────────────────────────────────────────┤
│ KPIs: T · Alvo · Δ · UR · ITH · Tendência 1h                 │
├──────────────────────────────────────────────────────────────┤
│ PRÓXIMA AÇÃO                                                 │
│  Clima: Ventilação estágio 3 quando T > 29.5°C               │
│  Iluminação: 60% às 21:30 (em 12 min)                        │
├──────────────────────────────────────────────────────────────┤
│ Atuadores live (cards):                                      │
│ [Vent 2/5] [Cortina 40%→60%] [Nebul on] [Aquec off]          │
│ [Iluminação 80% · ramp-down 12min]                           │
├──────────────────────────┬───────────────────────────────────┤
│ Parâmetros ativos        │ Programação do dia                │
├──────────────────────────┴───────────────────────────────────┤
│ Dispositivos & canais (live)                                 │
│  Desktop: tabela · Mobile: lista de cards                    │
│  Badges: ONLINE / OFFLINE / SEM ACK                          │
├──────────────────────────────────────────────────────────────┤
│ Timeline de decisões do Brain (últimas 30)                   │
└──────────────────────────────────────────────────────────────┘
```

## Bloco "Próxima ação"

- **Iluminação**: deriva de `selecionarFaixa` + `calcularEstadoIluminacao` (já retorna `proximo_evento_min` e `proximo_evento_tipo`). Exibe `acender/apagar HH:MM · em N min · → X%`.
- **Clima**: lê última decisão `log_decisao_clima` + histerese da config para descrever a próxima transição prevista (ex.: `Ventilação estágio 3 quando T > 29.5 °C` ou `Cortina abrir 20% quando T > setpoint+1 °C`). Se sem dados → "Brain aguardando leituras".

## Dispositivos & canais — badges de status

Estado derivado client-side:
- `ONLINE` — `dispositivos_iot.online = true` e `ultimo_sync < 10 min`.
- `OFFLINE` — `online = false` **ou** `ultimo_sync > 10 min`.
- `SEM ACK` — comando enviado (`canais_dispositivo.ultimo_comando_em` recente) e `estado_atual` ainda não bateu com o alvo após > 90 s; **ou** `historico_estado_canal` sem entrada após o comando.

Cores via tokens semânticos (`bg-success`, `bg-warning`, `bg-destructive`).

## Barra de alertas operacionais (NOC)

`<BarraAlertasOperacionais>` no topo (acima dos KPIs), regras puras client-side:
- Sensor mudo: nenhuma leitura há > 10 min.
- Dispositivo offline: pelo menos 1 dispositivo do galpão offline.
- Sem ACK: ≥ 1 canal com comando pendente.
- Brain parado: última decisão `climate_brain` > 15 min.
- Override Brain ativo hoje (informativo, não crítico).

Cada alerta clicável → faz scroll/abre seção correspondente.

## Mobile (≥ `md` = tabela; < `md` = cards)

Card de canal no mobile:
```
┌──────────────────────────────┐
│ ESP32 Cortina      [ONLINE]  │
│ Canal A · Cortina            │
│ Aberto 60% → 80%             │
│ ACK há 14 s                  │
└──────────────────────────────┘
```
Padrão de cards já usado no projeto (memória mobile UX).

## Realtime + debounce + cache

- **Cache local com `@tanstack/react-query`** (já presente):
  - `useQuery(['ambiencia-lote', loteId])` com `staleTime: 30_000`, `refetchOnWindowFocus: false`.
  - Realtime dispara apenas `queryClient.invalidateQueries(...)` (não busca direto).
- **Debounce de 250 ms** no `useAmbienciaLote` agrupando eventos das 4 subscriptions (`log_decisao_clima`, `canais_dispositivo`, `dispositivos_iot`, `override_iluminacao_canal`/`brain`) antes de invalidar — evita render-storm quando o coordinator escreve várias linhas em sequência.
- Fallback de polling 30 s (interval) só dispara se realtime ficar mudo > 60 s (heartbeat).
- Indicador "ao vivo" (ponto verde piscando) + timestamp do último update.

## Fontes de dados (sem schema novo)

- Decisão clima → `log_decisao_clima` (filtro `funcao_automacao = climate_brain`).
- Atuadores → `estagio_ventilacao_estado`, `cortina_estado_atual`, `programa_nebulizacao_galpao`, `comando_brain`.
- Telemetria sensores → leituras IoT do galpão (mesma fonte do `TemperaturaUmidadeCard` / `useTemperaturaLote`).
- Programa iluminação → `programa_iluminacao_lote` + `programa_iluminacao_faixa` + `override_iluminacao_brain` + `override_iluminacao_canal`.
- Curva climática / histerese → mesmas tabelas de `ConfiguracaoCurvaClimatica` / `ConfiguracaoHistereseClima`.
- Dispositivos / canais / ACK → `dispositivos_iot`, `canais_dispositivo`, `historico_estado_canal`.

## Componentes a criar

- `src/pages/LoteAmbienciaControle.tsx`
- `src/components/ambiencia/HeaderLoteAmbiencia.tsx`
- `src/components/ambiencia/BarraAlertasOperacionais.tsx` (NOC)
- `src/components/ambiencia/KpiClimaLote.tsx` (com sparkline 1 h)
- `src/components/ambiencia/ProximaAcaoPanel.tsx` (clima + iluminação)
- `src/components/ambiencia/AtuadoresLiveRow.tsx`
- `src/components/ambiencia/ParametrosAtivosPanel.tsx`
- `src/components/ambiencia/ProgramacaoDoDiaPanel.tsx` (reusa `CurvaFotoperiodoChart`)
- `src/components/ambiencia/DispositivosCanaisTable.tsx` (responsivo: tabela ≥`md`, cards <`md`) com `StatusCanalBadge` (ONLINE/OFFLINE/SEM ACK).
- `src/components/ambiencia/TimelineDecisoesBrain.tsx`
- `src/hooks/useAmbienciaLote.ts` — react-query + 4 subscriptions com debounce 250 ms.

## Reuso obrigatório (não duplicar)

- `selecionarFaixa`, `calcularEstadoIluminacao`, `idadeLoteDias` (`src/lib/utils/calcularEstadoIluminacao.ts`).
- `calcularITH`, `classificarITH`.
- `useDeviceControl` para ação "Forçar".
- `OverridesIluminacaoDialog`.
- Extrair função pura de saúde IoT do `SaudeIoTPanel` (10 min) e função pura "SEM ACK" (compartilhada entre barra de alertas e badge do canal).

## Permissões / multi-tenant

- `useIntegradoId` em todas as queries.
- `criador` / `veterinario` → somente leitura (sem botão "Forçar").
- `admin` / `superadmin` ou `iot` com nível `edit+` → habilita overrides.

## Detalhes técnicos

- Sem mudanças de schema.
- Nenhuma nova edge function.
- Tipagem em `src/types/ambienciaLote.ts`.
- Migration mínima só para adicionar ao `supabase_realtime` as tabelas que ainda não estão (`log_decisao_clima`, `canais_dispositivo`, `dispositivos_iot`, `override_iluminacao_canal`, `override_iluminacao_brain`); verificar antes — se já estiverem, pula.
- Estados de borda: "Sensor sem dados", "Brain pausado", "Sem programa de iluminação vinculado".

## Entregáveis

1. Rota + página `LoteAmbienciaControle`.
2. Hook `useAmbienciaLote` (react-query + realtime debounced 250 ms + heartbeat).
3. 10 componentes listados.
4. Botão de acesso no `LoteDetalhe`, `LoteCard` e `AmbienciaDashboard`.
5. Migration de realtime só se necessária.

## Fora do escopo (sugerido para depois)

- Edição inline dos parâmetros (continua em Configurações).
- Histórico longo (> 24 h) — usar `HistoricoTemperaturaLote`.
- Novos tipos de alerta push — reusar tipos existentes.
