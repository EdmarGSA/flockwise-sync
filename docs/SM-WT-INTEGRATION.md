# Integração SM-WT (IE Tecnologia) — Wi-Fi + RS485

Sensor industrial de temperatura e umidade da IE Tecnologia integrado em
**redundância dupla** com o ESP32-S3-Relay-6CH (Waveshare):

```
                ┌──────────────────────────────┐
                │   SM-WT (Wi-Fi + RS485)      │
                └──────┬──────────────┬────────┘
                       │              │
            Wi-Fi (primário)    RS485 / Modbus RTU
            POST → cloud       (fallback local)
                       │              │
                       ▼              ▼
           sm-wt-ingest        ESP32-S3-Relay-6CH
                       │              │
                       ▼              ▼
                  leituras_sensores (fonte = wifi_sensor | rs485_bridge)
```

A leitura Wi-Fi direta é **primária**. Se ficar > 5 min sem chegar, a
leitura RS485 enviada dentro do `/telemetry` do ESP32 é aceita como
fallback (validação na função `registrar_leitura_sensor_unificada`).

## 1. Cadastro do dispositivo

Em **Configurações → Dispositivos IoT → Novo dispositivo**, escolha:

- `tipo_dispositivo`: `sensor` (sensor isolado) **ou** `controlador`
  (ESP32-S3-Relay-6CH com SM-WT acoplado via RS485).
- `sensor_modelo`: `sm_wt`
- `modbus_slave_id`: 1 (padrão)
- `modbus_baud`: 9600 (padrão)
- `sensor_serial`: serial impresso na etiqueta do SM-WT
- O sistema gera automaticamente o `sensor_wifi_token`. Use-o no
  pareamento Wi-Fi do sensor.

## 2. Pareamento Wi-Fi do SM-WT

Pelo app da IE Tecnologia (ou via web do próprio sensor):

- SSID / senha Wi-Fi
- URL de POST: `https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sm-wt-ingest`
- Header: `x-sensor-token: <sensor_wifi_token>`
- Body JSON:
  ```json
  {
    "serial": "SMWT-XXXXXXX",
    "temperature": 25.4,
    "humidity": 62.1,
    "rssi": -65,
    "battery": 100
  }
  ```
- Intervalo de envio recomendado: 30–60 s.

## 3. Fiação RS485 (fallback local)

| SM-WT | ESP32-S3-Relay-6CH |
|-------|--------------------|
| A     | A (header RS485)   |
| B     | B (header RS485)   |
| GND   | GND comum          |
| 12V   | Fonte externa      |

## 4. Tabela de registradores Modbus (SM-WT)

Função 03 (Holding) ou 04 (Input) — confirmar no manual:

| Registrador | Conteúdo        | Escala |
|-------------|-----------------|--------|
| 0x0000      | Temperatura     | × 10   |
| 0x0001      | Umidade         | × 10   |
| 0x0002      | Status / falha  | bits   |

## 5. Firmware ESP32-S3-Relay-6CH (trecho Modbus)

Bibliotecas: `ModbusMaster`, `HTTPClient`, `ArduinoJson`, `Preferences`.

```cpp
#include <ModbusMaster.h>
ModbusMaster sensor;

#define MAX485_DE 4
#define MAX485_RE 4
HardwareSerial Modbus(2);   // UART2: RX=16, TX=17 (ajustar à placa)

void preTx() { digitalWrite(MAX485_DE, HIGH); }
void postTx(){ digitalWrite(MAX485_DE, LOW);  }

void setup() {
  pinMode(MAX485_DE, OUTPUT); digitalWrite(MAX485_DE, LOW);
  Modbus.begin(9600, SERIAL_8N1, 16, 17);
  sensor.begin(1, Modbus);            // slave id = 1
  sensor.preTransmission(preTx);
  sensor.postTransmission(postTx);
}

bool lerSMWT(float &t, float &ur) {
  uint8_t res = sensor.readHoldingRegisters(0x0000, 2);
  if (res != sensor.ku8MBSuccess) return false;
  t  = sensor.getResponseBuffer(0) / 10.0f;
  ur = sensor.getResponseBuffer(1) / 10.0f;
  return true;
}
```

A cada 60 s o ESP32 envia POST em `/esp32-bridge/telemetry` com:

```json
{
  "deviceId": "<device_id_ewelink>",
  "channels": [{"canal":1,"estado":"on"}, ...],
  "sensor": {
    "temperature": 25.6,
    "humidity": 62.0,
    "modbus_error": false,
    "modbus_slave_id": 1
  }
}
```

Se 3 leituras Modbus consecutivas falharem, mande `modbus_error: true`
sem `temperature/humidity`. O backend registra evento
`sensor_modbus_falha` e notifica os usuários.

## 6. Sinais e notificações

| Evento                       | Disparado quando                                |
|------------------------------|-------------------------------------------------|
| `sensor_wifi_offline`        | > 10 min sem POST Wi-Fi (cron a cada 5 min)     |
| `sensor_fallback_ativado`    | RS485 começa a ser usado por falta de Wi-Fi     |
| `sensor_modbus_falha`        | ESP32 reporta erro Modbus                       |

## 7. Validação rápida

```bash
# Simular SM-WT Wi-Fi:
curl -X POST https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sm-wt-ingest \
  -H "Content-Type: application/json" \
  -H "x-sensor-token: SEU_TOKEN" \
  -d '{"serial":"SMWT-001","temperature":24.8,"humidity":63}'
```
