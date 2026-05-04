# Resiliência IoT — Queda de energia/internet (ESP32)

Este documento descreve o contrato firmware ↔ backend para que os dispositivos
ESP32 mantenham o programa de iluminação rodando mesmo após queda de energia
ou perda de internet.

## Camadas

1. **Autonomia local (firmware NVS)** — o ESP32 executa o programa offline.
2. **Cache na nuvem (`esp32-bridge /config`)** — backend devolve `schedule_24h`,
   `rtc`, `programa_versao`, `safety_timers` e `politica_recuperacao`.
3. **Reconciliação (`auto-iluminacao`)** — backend detecta boot/offline e força
   reenvio do estado correto assim que o dispositivo volta a comunicar.

## Fluxo recomendado no firmware

### Boot (`setup()`)
1. Lê do NVS:
   - `schedule_24h` por canal (último recebido).
   - `programa_versao`.
   - Último `{estado, intensidade, ts_aplicado}` por canal.
2. Calcula o estado **offline** para o horário atual usando `schedule_24h`
   (RTC interno, ou `ts_aplicado + uptime` como aproximação).
3. **Aplica imediatamente** o estado nos relés/PWM antes de tentar Wi-Fi
   (evita o galpão ficar no escuro).
4. Conecta Wi-Fi e envia telemetria com:
   ```json
   {
     "deviceId": "...",
     "boot_reason": "power_on" | "watchdog" | "manual" | "software" | "brownout",
     "uptime_s": 12,
     "programa_versao_aplicada": "v1ab2c3",
     "channels": [{ "canal": 1, "estado": "on", "intensidade_pct": 60 }]
   }
   ```

### Loop normal
- A cada 60 s: `GET /config?deviceId=...`
  - Se `programa_versao` mudou → regrava `schedule_24h` em NVS.
  - Sincroniza RTC com `rtc.utc_epoch_s`.
  - Aplica estado conforme `schedule_24h` (e respeita `safety_timers` quando
    `schedule_24h` estiver vazio).
- A cada 60 s: `POST /telemetry` confirmando estado real.
- A cada mudança de relé: persiste `{estado, intensidade, ts}` em NVS.

### Watchdog offline
- Sem internet ≥ 10 min: continua aplicando `schedule_24h` da NVS.
- Sem internet ≥ 24 h: aplica `safety_timers` como fallback conservador.
- Nunca desliga preventivamente — manter último estado válido.

## Contrato dos endpoints

### `GET /config?deviceId=XXX`
```json
{
  "device": { "id": "...", "nome": "...", "galpao_id": "..." },
  "canais": [...],
  "intervalo_telemetria_seg": 60,
  "safety_timers": [...],
  "schedule_24h": {
    "1": [{ "hora_inicio": "05:00", "hora_fim": "23:00", "intensidade_pct": 60 }]
  },
  "programa_versao": "v1ab2c3",
  "rtc": { "utc_iso": "...", "utc_epoch_s": 1748880000, "tz": "America/Sao_Paulo", "tz_offset_min": -180 },
  "politica_recuperacao": {
    "restaurar_ultimo_estado": true,
    "aplicar_schedule_offline": true,
    "max_horas_sem_sync_para_safety": 24
  }
}
```

### `POST /telemetry`
Campos opcionais novos:
- `boot_reason`: motivo do último boot.
- `uptime_s`: segundos desde o boot.
- `programa_versao_aplicada`: versão do schedule efetivamente em NVS.
- `channels[].intensidade_pct`: PWM atual aplicada.

Se `boot_reason ≠ unknown` e `uptime_s < 120`, o backend:
- Insere evento `boot` em `eventos_dispositivo_iot`.
- Incrementa `boot_count` e atualiza `ultima_inicializacao`.
- Marca todos os canais ativos do device com `recuperacao_apos_falha = true`,
  fazendo `auto-iluminacao` reenviar o comando correto na próxima rodada.

## Garantias

| Cenário | Comportamento |
|---|---|
| Energia cai e volta em segundos | Relé volta ao estado correto via NVS antes do Wi-Fi reconectar |
| Internet cai por horas | ESP32 segue `schedule_24h` local; ao voltar, backend reconcilia |
| Energia + internet caem juntas | Boot offline + aplica schedule local + reconciliação ao reconectar |
| Programa alterado pelo usuário | `programa_versao` muda → ESP32 regrava NVS no próximo poll |
| Dispositivo nunca volta | Cron `marcar-disp-iot-offline` (5 min) marca offline e gera evento |
