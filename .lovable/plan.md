
## Problema atual

Quando falta energia ou internet:

- O ESP32 reinicia e os relés voltam **desligados** (estado padrão de segurança do firmware).
- Hoje só existem `safety_timers` muito genéricos enviados em `GET /config` do `esp32-bridge` (ex.: "luz acesa 06:00–18:00"). Não refletem o **programa real do lote** (faixas por idade, ramp up/down, modo solar, dimming, overrides).
- A função `auto-iluminacao` roda 1×/min, mas só age quando há **mudança de estado** (`mudouEstado || mudouIntensidade`). Se o canal voltou OFF após o boot, mas a fonte da verdade no banco também marca OFF (porque ninguém atualizou), o cron não corrige até o próximo evento de liga/desliga programado — podendo deixar o galpão **horas no escuro**.
- Não há detecção de "boot/reset" do dispositivo, nem reconciliação imediata quando ele volta online.

## Objetivo

Garantir que **mesmo sem internet**, e **mesmo após queda de energia**, o ESP32 retome automaticamente o programa de iluminação correto do lote, e que ao voltar a comunicação o estado seja imediatamente reconciliado.

## Estratégia em 3 camadas

```text
┌──────────────────────────────────────────────────────────┐
│ 1. AUTONOMIA LOCAL (firmware ESP32)                      │
│    Programa diário completo gravado em NVS               │
│    Relé restaura último estado válido + recalcula        │
├──────────────────────────────────────────────────────────┤
│ 2. CACHE NA NUVEM (esp32-bridge /config)                 │
│    Devolve schedule de 24h pré-calculado por canal       │
│    Inclui RTC sync, timezone, programa, overrides        │
├──────────────────────────────────────────────────────────┤
│ 3. RECONCILIAÇÃO (auto-iluminacao + watchdog)            │
│    Detecta boot/offline, força recomputo, envia comando  │
│    Audita "perda de estado" para alertar usuário         │
└──────────────────────────────────────────────────────────┘
```

## O que muda

### 1. Banco de dados (migration)

- `canais_dispositivo`: novas colunas
  - `ultimo_estado_persistido` (text) e `ultimo_estado_persistido_em` (timestamptz) — espelho do que o firmware confirmou ter aplicado.
  - `recuperacao_apos_falha` (boolean default false) — flag setada quando detectamos boot/perda de conexão.
- `dispositivos_iot`: novas colunas
  - `ultima_inicializacao` (timestamptz) — preenchido quando telemetria chega com `boot_reason`.
  - `boot_count` (int) e `ultimo_boot_reason` (text) — para diagnóstico.
- Nova tabela `eventos_dispositivo_iot` (id, dispositivo_id, integrado_id, tipo: 'boot'|'offline'|'online'|'reconciliacao', detalhes jsonb, criado_em) — auditoria de quedas e retomadas.
- Trigger/função `marcar_dispositivo_offline()` chamada por cron a cada 5 min: dispositivos com `ultimo_sync` > 10 min viram `online=false` e geram evento `offline`.

### 2. Edge function `esp32-bridge`

**`GET /config`** passa a devolver, além dos `safety_timers`:

- `schedule_24h`: array por canal com `[{hora_inicio, hora_fim, intensidade_pct}]` calculado a partir do **programa real** do lote (mesma lógica de `auto-iluminacao`, extraída para módulo compartilhado).
- `rtc`: timestamp UTC + offset `America/Sao_Paulo`, para o ESP32 ajustar o relógio interno.
- `programa_versao`: hash do programa+overrides; o firmware só reescreve a NVS quando muda.
- `politica_recuperacao`: `restaurar_ultimo_estado` (default true) — após boot, o relé assume o estado calculado para o horário atual usando o schedule local.

**`POST /telemetry`** aceita novos campos opcionais:

- `boot_reason` (`power_on` | `watchdog` | `manual` | `software`) e `uptime_s`.
- `programa_versao_aplicada` para confirmar sincronia.
- Se `boot_reason === 'power_on'`: registra evento `boot` em `eventos_dispositivo_iot` e marca todos os canais do device com `recuperacao_apos_falha=true`.

**Nova rota `POST /heartbeat`**: ping leve a cada 60s sem payload pesado, mantendo `ultimo_sync` atualizado.

### 3. Edge function `auto-iluminacao`

- Após carregar canais, **detecta canais com `recuperacao_apos_falha=true`** e força reenvio de comando mesmo quando `estado_atual === estadoDesejado` (porque o banco pode estar dessincronizado da realidade física).
- Após enviar com sucesso, limpa a flag e grava evento `reconciliacao` em `eventos_dispositivo_iot`.
- Para drivers `esp32_http`: ao invés de só atualizar `estado_atual`, o `auto-iluminacao` invalida a versão do schedule (incrementando hash) para forçar o ESP32 a buscar `/config` novo no próximo poll.

### 4. Firmware ESP32 (instruções para o usuário/integrador)

Documento em `docs/firmware/recuperacao-energia.md` descrevendo:

- Salvar em **NVS (flash)** a cada mudança de estado: `{canal, estado, intensidade, ts_aplicado, programa_versao}`.
- Salvar o `schedule_24h` recebido em `/config` na NVS — fonte da verdade offline.
- No `setup()` após boot:
  1. Lê RTC interno (mantido por bateria/RTC do módulo) ou usa último `ts_aplicado` salvo.
  2. Calcula estado **offline** a partir do `schedule_24h` em NVS para o horário atual.
  3. Aplica o estado nos relés **antes** de tentar Wi-Fi.
  4. Após conectar, envia telemetria com `boot_reason=power_on` para o backend reconciliar.
- Watchdog: se ficar > 30 min sem internet, continua aplicando schedule local; se passar > 24 h sem novo `/config`, mantém o último válido (não desliga preventivamente).

### 5. UI

- **`DispositivoIluminacaoCard.tsx`** e **`CanaisDispositivoList.tsx`**:
  - Badge "Recuperação após falha" enquanto `recuperacao_apos_falha=true`.
  - Indicador "Última inicialização: há Xh" lendo `dispositivos_iot.ultima_inicializacao`.
  - Tooltip de saúde mostrando `boot_count` e último `boot_reason`.
- **`LoteIluminacaoCard.tsx`**: alerta amarelo se algum canal do galpão está com flag de recuperação não confirmada há > 5 min.
- Nova aba **"Eventos do dispositivo"** dentro de `DispositivosIoT.tsx` listando `eventos_dispositivo_iot` (boots, offlines, reconciliações) — útil para diagnóstico e suporte.

### 6. Cron / scheduler

- `pg_cron` adicional a cada 5 min: roda função SQL `marcar_dispositivos_offline_e_alertar()` que insere eventos e cria notificação para usuários do integrado quando um dispositivo crítico de iluminação fica > 15 min offline.

## Garantias resultantes

| Cenário | Comportamento |
|---|---|
| Falta de energia curta (segundos) | Relé volta ao estado correto via `schedule_24h` em NVS, antes mesmo de conectar Wi-Fi. |
| Falta de internet (horas) | ESP32 segue executando o programa local; ao voltar, `auto-iluminacao` reconcilia e audita. |
| Falta combinada (energia + internet) | Boot offline → aplica schedule local → quando internet volta, envia `boot_reason=power_on` → backend força refresh do programa atual. |
| Programa alterado pelo usuário | `programa_versao` muda → ESP32 detecta no próximo poll e regrava NVS. |
| Dispositivo nunca volta | Cron marca offline, gera evento e alerta o usuário em 15 min. |

## Observações técnicas

- A lógica de cálculo do estado por horário (`avaliarBloco`/`calcular`) precisa ser **portada/serializada** para o firmware OU pré-expandida no backend como `schedule_24h` (recomendado: pré-expandir, mantém firmware burro e atualizável só por OTA quando regras mudam).
- O `schedule_24h` é regerado diariamente à 00:05 (cron novo `regerar-schedules-iot`) para refletir mudança de idade do lote e curvas solares do dia.
- Backward compatible: dispositivos com firmware antigo continuam funcionando com `safety_timers` como fallback.

## Arquivos impactados

- Migration nova (colunas + tabela + cron).
- `supabase/functions/esp32-bridge/index.ts` (novos endpoints/campos).
- `supabase/functions/auto-iluminacao/index.ts` (reconciliação forçada + invalidação de versão).
- Nova `supabase/functions/regerar-schedules-iot/index.ts` (cron diário).
- `src/components/iot/DispositivoIluminacaoCard.tsx`, `CanaisDispositivoList.tsx`, `LoteIluminacaoCard.tsx`.
- `src/pages/DispositivosIoT.tsx` (aba Eventos).
- `docs/firmware/recuperacao-energia.md` (guia para integrador do firmware).
