
## Diagnóstico do que existe hoje

**Banco**
- `dispositivos_iot` + `canais_dispositivo` (com `tipo_equipamento='iluminacao'` e `funcao_automacao='iluminacao'`) — pronto para receber canais de luz.
- `regras_temperatura_lote` e `programa_cortina_lote` existem como referência de padrão "regra por faixa de idade".
- **Não existe** tabela de programa de luz — falta `programa_iluminacao_lote`.

**Edge function `auto-temperatura`** (roda a cada 5 min via pg_cron)
- Já tem `case "iluminacao"` com programa **hardcoded para frango de corte** (1–7d: 23h luz; 8–14d: 20h; 15–21d: 18h; 22+: 16h).
- Usa apenas `new Date().getHours()` (timezone do servidor, sem ramp-up, sem dimer, sem suporte a postura).
- Nenhuma UI para o usuário configurar.

**ESP32-S3 bridge**
- `GET /config` devolve `estado_atual` por canal, mas só on/off — sem dimer e sem programação local de fallback.

**Sonoff conectado**
- Driver `ewelink`, on/off via `sync-sensors` `control-device`. Suporta timers nativos (até 8) — já temos util `calcularTimersSeguranca` que pode ser reaproveitado.

**Lacunas**
1. Sem programa de luz parametrizável por lote / linhagem / fase (corte vs postura).
2. Sem suporte a fotoperíodo de postura (crucial: cria 23→8h, recria 8h fixo, produção 8→16h estímulo de postura).
3. Sem ramp-up/ramp-down (amanhecer/anoitecer simulado).
4. Sem dimerização (% intensidade) — Sonoff básico não suporta, mas ESP32 com PWM sim.
5. Sem override manual ("forçar aceso por 2h" ou "forçar apagado").
6. Sem fallback offline (timers no firmware) específico de luz.
7. Sem visualização da curva de fotoperíodo no dashboard do lote.

---

## Plano

### Fase 1 — Modelo de dados

Nova tabela **`programa_iluminacao_lote`** (template por organização, igual a `programa_cortina_lote`):
```
id, integrado_id, nome, tipo_producao ('frango_corte'|'postura'|'matriz'),
dia_inicio, dia_fim,             -- faixa de idade
horas_luz numeric,                -- total de horas de luz no dia
hora_acender time, hora_apagar time, -- ou múltiplos blocos via JSONB
blocos jsonb,                     -- [{acender:'05:00', apagar:'19:00', intensidade_pct:80}]
ramp_up_min int default 0,        -- amanhecer simulado (minutos)
ramp_down_min int default 0,
intensidade_pct int default 100,  -- 0-100 (só efetivo se canal for PWM)
ativo boolean
```

Nova tabela **`override_iluminacao_canal`** (override manual temporário):
```
id, canal_id, integrado_id, estado_forcado ('on'|'off'|'auto'),
intensidade_pct, ate_quando timestamptz, motivo, created_by
```

Vínculo **lote → programa**: coluna `programa_iluminacao_id uuid` em `lotes` (nullable; se null, usa default por `tipo_producao` da organização).

Seeds: 2 programas padrão pré-cadastrados via `handle_new_user`/`initialize_demo_data`:
- "Padrão Corte" (1–7d 23h, 8–14d 20h, 15–21d 18h, 22+ 18h, ramp 15min)
- "Padrão Postura Lohmann" (cria 23→8h gradual, recria 8h fixo, produção 8→16h estímulo a partir de 17 sem)

### Fase 2 — Edge function `auto-iluminacao` (nova)

Separar de `auto-temperatura` porque a lógica é diferente (não depende de leitura de sensor, depende de hora + idade + programa).

- Cron pg_cron a cada **1 minuto** (ramp-up precisa de granularidade fina).
- Para cada canal com `tipo_equipamento='iluminacao'` e `automacao_ativa=true`:
  1. Resolve programa do lote ativo no galpão.
  2. Calcula faixa de idade → seleciona linha do programa.
  3. Calcula estado desejado considerando blocos + ramp.
  4. Aplica override se existir.
  5. Envia comando: `sync-sensors` (eWeLink) ou enfileira em `comandos_canal` (ESP32).
  6. Loga em `historico_estado_canal`.
- Timezone: usar `America/Sao_Paulo` (configurável por organização futuramente).
- Para canais com PWM (driver ESP32 + `suporta_dimer=true`): envia `intensidade_pct`. ESP32 firmware traduz em duty-cycle.

Atualizar `esp32-bridge`:
- `GET /config` passa a incluir `intensidade_atual` (0–100) e `programa_local` (próximas 24h de eventos) para fallback offline.
- `POST /command` aceita `{ acao:'dimer', valor: 0-100 }`.

Remover o `case "iluminacao"` de `auto-temperatura/index.ts`.

### Fase 3 — UI

**Nova página `/iluminacao`** (ou aba dentro de DispositivosIoT):
- Lista de programas de iluminação (CRUD).
- Editor de programa em formato de **tabela por faixa de idade**:
  | Idade | Horas luz | Acender | Apagar | Ramp ↑ | Ramp ↓ | Intensidade |
  |-------|-----------|---------|--------|--------|--------|-------------|
  | 1–7   | 23h       | 04:00   | 03:00  | 5min   | 5min   | 100%        |
  | 8–14  | 20h       | 05:00   | 01:00  | 15min  | 15min  | 80%         |
  | …     |           |         |        |        |        |             |
- Suporte a múltiplos blocos por dia (postura intermitente).
- Preview em **gráfico de curva de fotoperíodo** (Recharts area chart 24h × dias).
- Botão "Aplicar ao lote X".

**No `LoteDashboardDialog`:**
- Card "Programa de luz" mostrando: programa atual, fase atual, horas restantes de luz hoje, próximo evento (acender/apagar).
- Botão "Override" → dialog: forçar on/off por X horas, com motivo.

**No `CanaisDispositivoDialog`:**
- Quando `tipo_equipamento='iluminacao'` e driver ESP32: campo "Suporta dimerização (PWM)?".

### Fase 4 — Fallback offline (Sonoff timers + ESP32 NVS)

- Reaproveitar `calcularTimersSeguranca` → criar `calcularTimersIluminacao(programa, idade)` que gera até 8 timers eWeLink (acender/apagar dos próximos 7 dias, ressincronizando ao mudar faixa).
- Para ESP32: `GET /config` devolve `eventos_24h: [{hora:'04:00', acao:'on'}, …]` que o firmware salva em NVS e executa via RTC mesmo offline.

### Fase 5 — Pacote postura (diferencial)

- Estímulo de luz: incremento automático de fotoperíodo a partir do dia X (configurável, default 17 sem) em passos de 30min/sem até atingir 16h.
- Programa intermitente: blocos como `[{04:00–08:00}, {14:00–18:00}, {22:00–02:00}]`.
- Alerta no dashboard se programa real divergir do alvo > 10min/dia (lido via `historico_estado_canal`).

---

## Detalhes técnicos

**Migrations**
- `20260503_xxx_programa_iluminacao.sql`: cria `programa_iluminacao_lote`, `override_iluminacao_canal`, `lotes.programa_iluminacao_id`, RLS (`integrado_id = get_my_integrado_id()`), seeds, índices.
- `20260503_xxy_canal_pwm.sql`: adiciona `suporta_dimer boolean`, `intensidade_atual int` em `canais_dispositivo`.

**pg_cron** (via insert tool, não migration — contém URL/anon key):
```sql
select cron.schedule('auto-iluminacao-1min','* * * * *',
  $$ select net.http_post(
       url:='https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/auto-iluminacao',
       headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body:='{}'::jsonb) $$);
```

**Edge function nova:** `supabase/functions/auto-iluminacao/index.ts` (Deno, `verify_jwt=false` em config.toml).

**Frontend novos arquivos:**
- `src/pages/ProgramasIluminacao.tsx`
- `src/components/iot/ProgramaIluminacaoForm.tsx`
- `src/components/iot/ProgramaIluminacaoCurva.tsx` (gráfico Recharts)
- `src/components/iot/OverrideIluminacaoDialog.tsx`
- `src/lib/utils/calcularEstadoIluminacao.ts` (compartilhado entre edge function e UI para preview)

**Compatibilidade**
- Sonoff existente continua sendo controlado on/off; dimer simplesmente fica `null`.
- Lotes sem programa associado continuam usando lógica padrão de corte (até serem migrados).
- Remover lógica hardcoded de `auto-temperatura` apenas após `auto-iluminacao` deployada.

---

## Entregáveis por fase

1. **Fase 1+2 (MVP)** — schema + `auto-iluminacao` + cron + remoção do hardcoded. Sistema controla luz via banco em vez de código.
2. **Fase 3** — UI de programas + override + curva visual.
3. **Fase 4** — timers offline Sonoff + eventos 24h ESP32.
4. **Fase 5** — pacote postura completo + alertas de divergência.

Posso começar pela **Fase 1+2** se aprovar, e seguimos iterando.
