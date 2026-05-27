# Plano: SM-WT (IE Tecnologia) + ESP32-S3-Relay-6CH (Waveshare)

## Arquitetura — redundância dupla

```
                ┌─────────────────────────────┐
                │   SM-WT (IE Tecnologia)     │
                │   Temp + Umidade            │
                └──────┬────────────────┬─────┘
                       │                │
            Wi-Fi/HTTP │                │ RS485 / Modbus RTU
            (primário) │                │ (fallback local)
                       ▼                ▼
              ┌────────────────┐  ┌──────────────────────┐
              │  edge function │  │  ESP32-S3-Relay-6CH  │
              │  sm-wt-ingest  │  │  - lê SM-WT modbus   │
              └────────┬───────┘  │  - controla 6 relés  │
                       │          │  - envia /telemetry  │
                       │          └──────────┬───────────┘
                       │                     │
                       ▼                     ▼
              leituras_sensores  ← merge ←  esp32-bridge
                       │
                       ▼
                 trigger_reavaliar_brain → climate-brain
```

**Regra de fusão:** a leitura Wi-Fi direta do SM-WT é a fonte primária. Se ela ficar > 5 min sem chegar, o backend usa automaticamente a leitura RS485 que vem dentro do `/telemetry` do ESP32. Ambas vão para `leituras_sensores` com campo `fonte` ('wifi_sensor' | 'rs485_bridge').

## O que será feito

### 1. Banco de dados (migration)
- `dispositivos_iot`: adicionar `tipo_dispositivo` ('controlador' | 'sensor'), `sensor_modelo` ('sm_wt'), `modbus_slave_id` (default 1), `modbus_baud` (default 9600), `sensor_serial`, `sensor_wifi_token` (para autenticar POST do SM-WT).
- `leituras_sensores`: adicionar coluna `fonte` text ('wifi_sensor' | 'rs485_bridge' | 'esp32_interno').
- Novo tipo de evento: `sensor_modbus_falha`, `sensor_wifi_offline`, `sensor_fallback_ativado`.
- Função `registrar_leitura_sensor_unificada(p_dispositivo_id, p_temp, p_umid, p_fonte)`: insere em `leituras_sensores`, atualiza `dispositivos_iot.ultimo_sync`, e dispara `trigger_reavaliar_brain` apenas se for fonte primária OU se a primária estiver offline.

### 2. Edge functions
- **`sm-wt-ingest` (NOVA)**: endpoint HTTP que o SM-WT chama via Wi-Fi. Autentica via `sensor_wifi_token`. Aceita JSON `{serial, temperature, humidity, rssi, battery?}`. Grava com `fonte='wifi_sensor'`.
- **`esp32-bridge` (EDITAR)**: aceitar `sensor` no body do `/telemetry` (`{temperature, humidity, modbus_error, modbus_slave_id}`). Gravar com `fonte='rs485_bridge'` somente se a última leitura Wi-Fi tiver > 5 min. Sempre registra evento em caso de `modbus_error`.
- **`sm-wt-health-monitor` (NOVA, cron 5 min)**: detecta sensores Wi-Fi sem leitura há >10 min, marca como offline, dispara `dispatch_notificacao('sensor_wifi_offline')` e marca para o `esp32-bridge` priorizar RS485.

### 3. Firmware ESP32-S3-Relay-6CH (documentação)
Sketch Arduino entregue em `docs/ESP32-S3-BRIDGE.md`:
- **Bibliotecas**: `WiFi`, `HTTPClient`, `ArduinoJson`, `Preferences` (NVS), `ModbusMaster`.
- **Modbus RTU**: HardwareSerial2 nos pinos RS485 da placa (DE/RE pin conforme datasheet Waveshare), 9600 8N1, slave id 1.
- **Loop**: a cada 60 s lê holding registers do SM-WT (T: registrador 0, UR: registrador 1, escala /10), envia `POST /esp32-bridge/telemetry` com `{channels:[...], sensor:{temperature, humidity, modbus_error}}`.
- **NVS**: persiste `schedule_24h`, `boot_count`, `ultima_config` para sobreviver a queda de energia.
- **Watchdog**: se Modbus falhar 3x seguidas, envia `modbus_error:true` e segue mandando estado dos relés.

### 4. Documentação SM-WT Wi-Fi
- `docs/SM-WT-INTEGRATION.md` com:
  - Diagrama de fiação RS485 (A/B do SM-WT ↔ A/B do header RS485 da Waveshare, GND comum, 12 V para SM-WT).
  - Procedimento de pareamento Wi-Fi do SM-WT (SSID/senha + URL do endpoint `sm-wt-ingest` + token).
  - Tabela de registradores Modbus (T, UR, status).
  - Procedimento de cadastro do dispositivo no painel (gera `sensor_wifi_token`, mostra QR de config).

### 5. UI
- `DispositivoIoTForm`: novo campo "Modelo do sensor" (sm_wt), "Slave ID Modbus", "Baud". Botão "Gerar token Wi-Fi do sensor" + cópia da URL/endpoint.
- `CanaisDispositivoList` (card do controlador): badge "SM-WT Wi-Fi OK" / "SM-WT RS485 (fallback)" / "SM-WT offline" baseado em `leituras_sensores.fonte` mais recente.
- `HistoricoTemperaturaLote`: linha indicadora quando `fonte = 'rs485_bridge'` para auditoria.

### 6. Validação
- `curl` em `sm-wt-ingest` simulando POST do sensor → verificar gravação com `fonte='wifi_sensor'`.
- `curl` em `esp32-bridge/telemetry` com `sensor.temperature` → verificar que **NÃO** sobrescreve se Wi-Fi recente (< 5 min) existe.
- Simular ausência Wi-Fi (parar de chamar `sm-wt-ingest`) por 6 min → próxima telemetria do ESP32 deve gravar fallback.
- Confirmar que `climate-brain` continua respondendo às mudanças.

## Premissas confirmadas
- SM-WT escolhido suporta **ambas** as interfaces simultaneamente (Wi-Fi nativo + RS485/Modbus RTU).
- Wi-Fi do SM-WT permite POST HTTP customizado para nosso endpoint (não exige cloud proprietária da IE Tecnologia). **Se o SM-WT só publicar em cloud da IE**, precisaremos de um webhook lá → ajusto `sm-wt-ingest` para receber esse formato.

## Riscos
- Endereçamento de registradores Modbus do SM-WT precisa do manual exato (assumido T=0x0000, UR=0x0001 ×10). Ajustável em firmware.
- Latência: leitura Wi-Fi do SM-WT normalmente é 30–60 s; RS485 é instantânea. Cooldown do brain de 60 s já absorve isso.
