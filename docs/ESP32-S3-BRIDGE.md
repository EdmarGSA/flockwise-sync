# ESP32-S3 Bridge — Integração IoT Multi-Driver

Esta documentação descreve como integrar dispositivos **ESP32-S3 6CH Relay** (com sensores DS18B20/SHT40) ao sistema, mantendo compatibilidade com os Sonoff existentes via eWeLink.

## Arquitetura

```
ESP32-S3 ──HTTPS──► esp32-bridge (Edge Function) ──► Supabase DB ──► UI Lovable
   ▲                                                       │
   └────────────── Polling de comandos (GET /config) ◄─────┘
```

## Endpoints

Base URL: `https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/esp32-bridge`

### `GET /config?deviceId={id}`
ESP32 busca sua configuração ao iniciar e em polling (a cada 60s) para receber comandos de mudança de estado.

**Resposta:**
```json
{
  "device": { "id": "uuid", "nome": "Galpão 1 Painel", "galpao_id": "uuid" },
  "canais": [
    { "canal_numero": 1, "nome": "Ventilador Lateral", "tipo_equipamento": "ventilador", "estado_atual": "on" },
    { "canal_numero": 2, "nome": "Nebulizador", "tipo_equipamento": "nebulizador", "estado_atual": "off" }
  ],
  "intervalo_telemetria_seg": 60
}
```

### `POST /telemetry`
ESP32 envia leituras + estado dos canais.

**Headers:** `x-device-token: <auth_token cadastrado no banco>`

**Payload:**
```json
{
  "deviceId": "esp32-001",
  "temperature": 26.4,
  "humidity": 62.1,
  "online": true,
  "channels": [
    { "canal": 1, "estado": "on" },
    { "canal": 2, "estado": "off" }
  ]
}
```

### `POST /command`
Chamado pela UI Lovable para enfileirar mudança de estado em um canal. ESP32 vê o novo estado no próximo `GET /config`.

**Payload:**
```json
{ "canalId": "uuid-do-canal", "acao": "ligar" }
```

## Cadastro do dispositivo

1. Em **Dispositivos IoT**, cadastrar com `driver = esp32_http`, `device_id_ewelink = <ID único do ESP32>` (ex: MAC ou serial), `auth_token = <token aleatório>`, `num_canais = 6`.
2. Cadastrar 1 linha em `canais_dispositivo` para cada relé usado, definindo `tipo_equipamento` (ventilador, nebulizador, iluminacao, aquecimento, cortina, alarme, exaustor).

## Firmware ESP32 (Arduino — esqueleto)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "GranjaWiFi";
const char* WIFI_PASS = "...";
const char* DEVICE_ID = "esp32-001";
const char* DEVICE_TOKEN = "token-secreto";
const char* BASE_URL = "https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/esp32-bridge";

const int RELAY_PINS[6] = {1, 2, 41, 42, 45, 46}; // adapte conforme placa

void setRelay(int canal, bool on) {
  digitalWrite(RELAY_PINS[canal - 1], on ? HIGH : LOW);
}

void sendTelemetry(float temp, float hum) {
  HTTPClient http;
  http.begin(String(BASE_URL) + "/telemetry");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["online"] = true;
  JsonArray ch = doc.createNestedArray("channels");
  for (int i = 0; i < 6; i++) {
    JsonObject c = ch.createNestedObject();
    c["canal"] = i + 1;
    c["estado"] = digitalRead(RELAY_PINS[i]) ? "on" : "off";
  }
  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}

void pollConfig() {
  HTTPClient http;
  http.begin(String(BASE_URL) + "/config?deviceId=" + DEVICE_ID);
  if (http.GET() == 200) {
    StaticJsonDocument<2048> doc;
    deserializeJson(doc, http.getString());
    for (JsonObject c : doc["canais"].as<JsonArray>()) {
      int canal = c["canal_numero"];
      const char* estado = c["estado_atual"];
      if (estado) setRelay(canal, String(estado) == "on");
    }
  }
  http.end();
}

void setup() {
  for (int p : RELAY_PINS) pinMode(p, OUTPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  // Ler DS18B20/SHT40 aqui
  float temp = 25.0; // substituir pela leitura real
  float hum  = 60.0;
  sendTelemetry(temp, hum);
  pollConfig();
  delay(60000);
}
```

## Compatibilidade

- **Sonoff existentes**: continuam funcionando via `driver = ewelink` (default). Nenhuma migração de dados necessária — backfill já criou 1 canal por dispositivo.
- **Automação por idade**: o `pg_cron` 5min (auto-temperatura) precisa ser estendido na Fase 4 para olhar `canais_dispositivo` em vez de `dispositivos_iot` diretamente.

## Próximas fases

- **Fase 3**: UI para cadastrar canais e selecionar tipo de equipamento por ícone.
- **Fase 4**: Regras de automação cruzadas (temp + umidade + horário) e programa de luz para postura.
