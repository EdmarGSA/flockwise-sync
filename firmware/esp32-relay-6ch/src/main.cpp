// ─────────────────────────────────────────────────────────────────────────────
// Waveshare ESP32-S3-Relay-6CH — automação de aviários (GSA Tibiri)
//
// Responsabilidades:
//  1. Provisionamento Wi-Fi por AP de configuração (primeiro boot ou botão BOOT).
//  2. GET  /esp32-bridge/config     — canais, safety_rules, schedule_24h, RTC.
//  3. POST /esp32-bridge/telemetry  — estado dos 6 relés + sensor + boot_reason;
//     a resposta traz `desired_channels`, aplicados imediatamente.
//  4. Operação offline: schedule_24h + safety_rules gravados em NVS continuam
//     controlando luz/aquecimento/ventilação sem internet.
//  5. Leitura Modbus RTU (RS485) do sensor SM-WT como fallback do Wi-Fi.
// ─────────────────────────────────────────────────────────────────────────────

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <ModbusMaster.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <time.h>

// ── Hardware ────────────────────────────────────────────────────────────────
static const uint8_t RELAY_PINS[6] = {1, 2, 41, 42, 45, 46};  // CH1..CH6
static const uint8_t PIN_BOOT      = 0;                        // botão BOOT
static const uint8_t PIN_RS485_RX  = 18;
static const uint8_t PIN_RS485_TX  = 17;

static const uint32_t TELEMETRY_INTERVAL_MS = 60UL * 1000UL;
static const uint32_t CONFIG_INTERVAL_MS    = 5UL * 60UL * 1000UL;
static const uint32_t SCHEDULE_TICK_MS      = 10UL * 1000UL;
static const uint32_t WDT_TIMEOUT_S         = 60;

// ── Estado persistido ───────────────────────────────────────────────────────
Preferences prefs;

struct Config {
  String ssid, pass;
  String bridgeUrl;   // ex: https://<projeto>.supabase.co/functions/v1/esp32-bridge
  String deviceId;    // igual ao "Device ID" cadastrado no app
  String authToken;   // auth_token do dispositivo
  uint8_t modbusSlave = 1;
  uint32_t modbusBaud = 9600;
} cfg;

struct CanalRuntime {
  bool     ligado          = false;
  uint8_t  intensidade     = 0;
  char     tipo[24]        = "";
  bool     automacaoAtiva  = false;
  // schedule 24h (até 4 blocos por canal)
  uint8_t  nSlots          = 0;
  uint16_t slotIni[4]      = {0};
  uint16_t slotFim[4]      = {0};
  uint8_t  slotInt[4]      = {0};
  // safety rule
  bool     temSafety       = false;
  uint16_t safetyIni       = 0;
  uint16_t safetyFim       = 0;
  bool     safetyEstado    = false;
  float    tempLiga        = NAN;
  float    tempDesliga     = NAN;
} canais[6];

String programaVersao;
uint32_t ultimoSyncOkMs = 0;
uint32_t ultimoTelemetriaMs = 0;
uint32_t ultimoConfigMs = 0;
uint32_t ultimoTickMs = 0;
bool   apMode = false;
float  sensorTemp = NAN, sensorUmid = NAN;
bool   sensorErro = false;

ModbusMaster modbus;
HardwareSerial rs485(1);
WebServer portal(80);
DNSServer dns;

// ── Utilidades ──────────────────────────────────────────────────────────────
static uint16_t hhmmToMin(const char *s) {
  if (!s || strlen(s) < 4) return 0;
  return (uint16_t)((s[0] - '0') * 10 + (s[1] - '0')) * 60 +
         (uint16_t)((s[3] - '0') * 10 + (s[4] - '0'));
}

static uint16_t minutosLocais() {
  time_t now = time(nullptr);
  if (now < 1700000000) return 0;  // relógio ainda não sincronizado
  struct tm tmv;
  localtime_r(&now, &tmv);
  return (uint16_t)(tmv.tm_hour * 60 + tmv.tm_min);
}

static bool dentroJanela(uint16_t agora, uint16_t ini, uint16_t fim) {
  if (ini == fim) return false;
  return (ini < fim) ? (agora >= ini && agora < fim) : (agora >= ini || agora < fim);
}

static const char *bootReason() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:  return "power_on";
    case ESP_RST_TASK_WDT:
    case ESP_RST_INT_WDT:
    case ESP_RST_WDT:      return "watchdog";
    case ESP_RST_SW:       return "software";
    case ESP_RST_BROWNOUT: return "brownout";
    case ESP_RST_EXT:      return "manual";
    default:               return "unknown";
  }
}

static void aplicarRele(uint8_t idx, bool ligado) {
  if (idx >= 6) return;
  digitalWrite(RELAY_PINS[idx], ligado ? HIGH : LOW);
  canais[idx].ligado = ligado;
}

// ── NVS ─────────────────────────────────────────────────────────────────────
static void carregarConfig() {
  prefs.begin("gsa", true);
  cfg.ssid        = prefs.getString("ssid", "");
  cfg.pass        = prefs.getString("pass", "");
  cfg.bridgeUrl   = prefs.getString("url", "");
  cfg.deviceId    = prefs.getString("devid", "");
  cfg.authToken   = prefs.getString("token", "");
  cfg.modbusSlave = prefs.getUChar("mbslave", 1);
  cfg.modbusBaud  = prefs.getULong("mbbaud", 9600);
  programaVersao  = prefs.getString("progv", "");
  prefs.end();
}

static void salvarConfig() {
  prefs.begin("gsa", false);
  prefs.putString("ssid", cfg.ssid);
  prefs.putString("pass", cfg.pass);
  prefs.putString("url", cfg.bridgeUrl);
  prefs.putString("devid", cfg.deviceId);
  prefs.putString("token", cfg.authToken);
  prefs.putUChar("mbslave", cfg.modbusSlave);
  prefs.putULong("mbbaud", cfg.modbusBaud);
  prefs.end();
}

// Persiste o schedule para sobreviver a quedas de energia sem internet.
static void salvarSchedule(const String &payload) {
  prefs.begin("gsa", false);
  prefs.putString("sched", payload);
  prefs.putString("progv", programaVersao);
  prefs.end();
}

static String lerScheduleSalvo() {
  prefs.begin("gsa", true);
  String s = prefs.getString("sched", "");
  prefs.end();
  return s;
}

// ── Portal de provisionamento ───────────────────────────────────────────────
static const char PORTAL_HTML[] PROGMEM = R"HTML(
<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>GSA Tibiri - Configurar</title>
<style>body{font-family:system-ui;margin:0;padding:24px;background:#0f172a;color:#e2e8f0}
input{width:100%;padding:10px;margin:6px 0 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0}
button{width:100%;padding:12px;border:0;border-radius:8px;background:#22c55e;color:#062;font-weight:700}
h1{font-size:20px}</style>
<h1>Configurar controlador</h1>
<form method=POST action=/save>
<label>Wi-Fi SSID</label><input name=ssid required>
<label>Wi-Fi senha</label><input name=pass type=password>
<label>URL do bridge</label><input name=url placeholder="https://.../functions/v1/esp32-bridge" required>
<label>Device ID</label><input name=devid required>
<label>Token do dispositivo</label><input name=token required>
<label>Modbus slave (SM-WT)</label><input name=mbslave value=1>
<label>Modbus baud</label><input name=mbbaud value=9600>
<button type=submit>Salvar e reiniciar</button></form>
)HTML";

static void iniciarPortal() {
  apMode = true;
  WiFi.mode(WIFI_AP);
  String ap = "GSA-Aviario-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  WiFi.softAP(ap.c_str(), "gsa12345");
  dns.start(53, "*", WiFi.softAPIP());
  portal.on("/", []() { portal.send_P(200, "text/html", PORTAL_HTML); });
  portal.on("/save", HTTP_POST, []() {
    cfg.ssid        = portal.arg("ssid");
    cfg.pass        = portal.arg("pass");
    cfg.bridgeUrl   = portal.arg("url");
    cfg.deviceId    = portal.arg("devid");
    cfg.authToken   = portal.arg("token");
    cfg.modbusSlave = (uint8_t)portal.arg("mbslave").toInt();
    cfg.modbusBaud  = (uint32_t)portal.arg("mbbaud").toInt();
    salvarConfig();
    portal.send(200, "text/html", "<p>Salvo. Reiniciando...</p>");
    delay(800);
    ESP.restart();
  });
  portal.onNotFound([]() { portal.send_P(200, "text/html", PORTAL_HTML); });
  portal.begin();
  Serial.printf("[portal] AP %s / senha gsa12345 -> http://%s\n",
                ap.c_str(), WiFi.softAPIP().toString().c_str());
}

// ── Wi-Fi ───────────────────────────────────────────────────────────────────
static bool conectarWifi(uint32_t timeoutMs = 20000) {
  if (cfg.ssid.isEmpty()) return false;
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(cfg.ssid.c_str(), cfg.pass.c_str());
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    delay(250);
    esp_task_wdt_reset();
  }
  if (WiFi.status() == WL_CONNECTED) {
    configTime(-3 * 3600, 0, "pool.ntp.org", "time.google.com");
    Serial.printf("[wifi] conectado: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("[wifi] falha ao conectar");
  return false;
}

// ── Parsing de configuração ─────────────────────────────────────────────────
static void aplicarPayloadConfig(const String &body, bool persistir) {
  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    Serial.println("[config] JSON inválido");
    return;
  }

  // RTC vindo do servidor (evita depender só do NTP)
  if (doc["rtc"]["utc_epoch_s"].is<uint32_t>()) {
    struct timeval tv = {.tv_sec = (time_t)doc["rtc"]["utc_epoch_s"].as<uint32_t>(), .tv_usec = 0};
    settimeofday(&tv, nullptr);
    setenv("TZ", "<-03>3", 1);
    tzset();
  }

  for (auto &c : canais) {
    c.nSlots = 0;
    c.temSafety = false;
    c.automacaoAtiva = false;
  }

  for (JsonObject ch : doc["canais"].as<JsonArray>()) {
    int n = (int)ch["canal_numero"] - 1;
    if (n < 0 || n > 5) continue;
    strlcpy(canais[n].tipo, ch["tipo_equipamento"] | "", sizeof(canais[n].tipo));
    canais[n].automacaoAtiva = ch["automacao_ativa"] | false;
    canais[n].intensidade = ch["intensidade_atual"] | 0;
  }

  for (JsonObject r : doc["safety_rules"].as<JsonArray>()) {
    int n = (int)r["canal"] - 1;
    if (n < 0 || n > 5) continue;
    canais[n].temSafety = true;
    canais[n].tempLiga    = r["temp_liga_c"].isNull()    ? NAN : r["temp_liga_c"].as<float>();
    canais[n].tempDesliga = r["temp_desliga_c"].isNull() ? NAN : r["temp_desliga_c"].as<float>();
    JsonObject fb = r["fallback_horario"];
    if (!fb.isNull()) {
      canais[n].safetyIni    = hhmmToMin(fb["hora_inicio"] | "00:00");
      canais[n].safetyFim    = hhmmToMin(fb["hora_fim"] | "00:00");
      canais[n].safetyEstado = String(fb["estado"] | "off") == "on";
    }
  }

  JsonObject sched = doc["schedule_24h"].as<JsonObject>();
  for (JsonPair kv : sched) {
    int n = atoi(kv.key().c_str()) - 1;
    if (n < 0 || n > 5) continue;
    for (JsonObject slot : kv.value().as<JsonArray>()) {
      if (canais[n].nSlots >= 4) break;
      uint8_t i = canais[n].nSlots++;
      canais[n].slotIni[i] = hhmmToMin(slot["hora_inicio"] | "00:00");
      canais[n].slotFim[i] = hhmmToMin(slot["hora_fim"] | "00:00");
      canais[n].slotInt[i] = slot["intensidade_pct"] | 100;
    }
  }

  programaVersao = String((const char *)(doc["programa_versao"] | ""));
  if (persistir) salvarSchedule(body);
  Serial.printf("[config] aplicado, programa_versao=%s\n", programaVersao.c_str());
}

static bool buscarConfig() {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  String url = cfg.bridgeUrl + "/config?deviceId=" + cfg.deviceId;
  http.setTimeout(10000);
  http.begin(url);
  http.addHeader("x-device-token", cfg.authToken);
  http.addHeader("Authorization", "Bearer " + cfg.authToken);
  int code = http.GET();
  bool ok = false;
  if (code == 200) {
    aplicarPayloadConfig(http.getString(), true);
    ultimoSyncOkMs = millis();
    ok = true;
  } else {
    Serial.printf("[config] HTTP %d\n", code);
  }
  http.end();
  return ok;
}

// ── Telemetria ──────────────────────────────────────────────────────────────
static void enviarTelemetria() {
  if (WiFi.status() != WL_CONNECTED) return;

  JsonDocument doc;
  doc["deviceId"] = cfg.deviceId;
  doc["online"] = true;
  doc["uptime_s"] = (uint32_t)(millis() / 1000);
  doc["boot_reason"] = bootReason();
  doc["programa_versao_aplicada"] = programaVersao;

  JsonArray chs = doc["channels"].to<JsonArray>();
  for (uint8_t i = 0; i < 6; i++) {
    JsonObject o = chs.add<JsonObject>();
    o["canal"] = i + 1;
    o["estado"] = canais[i].ligado ? "on" : "off";
    o["intensidade_pct"] = canais[i].ligado ? canais[i].intensidade : 0;
  }

  JsonObject s = doc["sensor"].to<JsonObject>();
  s["modbus_slave_id"] = cfg.modbusSlave;
  if (sensorErro) {
    s["modbus_error"] = true;
  } else {
    if (!isnan(sensorTemp)) s["temperature"] = sensorTemp;
    if (!isnan(sensorUmid)) s["humidity"] = sensorUmid;
  }

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.setTimeout(10000);
  http.begin(cfg.bridgeUrl + "/telemetry");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", cfg.authToken);
  http.addHeader("Authorization", "Bearer " + cfg.authToken);
  int code = http.POST(payload);

  if (code == 200) {
    ultimoSyncOkMs = millis();
    JsonDocument resp;
    if (!deserializeJson(resp, http.getString())) {
      // Aplica o estado desejado que veio na resposta (comandos manuais e do Brain)
      for (JsonObject d : resp["desired_channels"].as<JsonArray>()) {
        int n = (int)d["canal"] - 1;
        if (n < 0 || n > 5) continue;
        bool desejado = String(d["estado"] | "off") == "on";
        canais[n].intensidade = d["intensidade_pct"] | (desejado ? 100 : 0);
        if (canais[n].ligado != desejado) aplicarRele(n, desejado);
      }
      const char *pv = resp["programa_versao"] | "";
      if (strlen(pv) && programaVersao != pv) buscarConfig();  // schedule mudou
    }
  } else {
    Serial.printf("[telemetry] HTTP %d\n", code);
  }
  http.end();
}

// ── Sensor SM-WT via RS485 (fallback do Wi-Fi) ──────────────────────────────
static void lerSensorModbus() {
  sensorErro = false;
  // SM-WT: holding registers 0x0000 = temperatura (0,1 °C), 0x0001 = umidade (0,1 %)
  uint8_t rc = modbus.readHoldingRegisters(0x0000, 2);
  if (rc != modbus.ku8MBSuccess) {
    sensorErro = true;
    sensorTemp = NAN;
    sensorUmid = NAN;
    return;
  }
  int16_t rawT = (int16_t)modbus.getResponseBuffer(0);
  uint16_t rawH = modbus.getResponseBuffer(1);
  sensorTemp = rawT / 10.0f;
  sensorUmid = rawH / 10.0f;
}

// ── Execução local do schedule (funciona offline) ───────────────────────────
static void aplicarScheduleLocal() {
  uint16_t agora = minutosLocais();
  if (agora == 0 && time(nullptr) < 1700000000) return;  // sem relógio confiável

  bool semSync = (millis() - ultimoSyncOkMs) > 15UL * 60UL * 1000UL;

  for (uint8_t i = 0; i < 6; i++) {
    CanalRuntime &c = canais[i];
    if (!c.automacaoAtiva) continue;

    // Online: o estado desejado chega pela telemetria; só assume o controle
    // quando ficamos sem sincronizar (queda de internet / energia).
    if (!semSync) continue;

    bool desejado = c.ligado;

    if (c.nSlots > 0) {
      desejado = false;
      for (uint8_t s = 0; s < c.nSlots; s++) {
        if (dentroJanela(agora, c.slotIni[s], c.slotFim[s])) {
          desejado = true;
          c.intensidade = c.slotInt[s];
          break;
        }
      }
    } else if (c.temSafety) {
      // Prioridade: temperatura > horário (mesma regra do servidor)
      if (!isnan(sensorTemp) && !sensorErro && (!isnan(c.tempLiga) || !isnan(c.tempDesliga))) {
        if (!isnan(c.tempLiga) && sensorTemp <= c.tempLiga) desejado = true;
        else if (!isnan(c.tempDesliga) && sensorTemp >= c.tempDesliga) desejado = false;
      } else {
        desejado = dentroJanela(agora, c.safetyIni, c.safetyFim) ? c.safetyEstado : !c.safetyEstado;
      }
    }

    if (desejado != c.ligado) {
      Serial.printf("[offline] CH%u -> %s\n", i + 1, desejado ? "ON" : "OFF");
      aplicarRele(i, desejado);
    }
  }
}

// ── Setup / loop ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);

  for (uint8_t i = 0; i < 6; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], LOW);
  }
  pinMode(PIN_BOOT, INPUT_PULLUP);

  esp_task_wdt_init(WDT_TIMEOUT_S, true);
  esp_task_wdt_add(nullptr);

  carregarConfig();

  // Botão BOOT segurado no arranque força o portal de configuração
  bool forcarPortal = (digitalRead(PIN_BOOT) == LOW);

  if (cfg.ssid.isEmpty() || cfg.deviceId.isEmpty() || cfg.bridgeUrl.isEmpty() || forcarPortal) {
    iniciarPortal();
    return;
  }

  rs485.begin(cfg.modbusBaud, SERIAL_8N1, PIN_RS485_RX, PIN_RS485_TX);
  modbus.begin(cfg.modbusSlave, rs485);

  // Restaura o último schedule conhecido antes mesmo de ter rede
  String salvo = lerScheduleSalvo();
  if (salvo.length()) aplicarPayloadConfig(salvo, false);

  if (conectarWifi()) buscarConfig();
}

void loop() {
  esp_task_wdt_reset();

  if (apMode) {
    dns.processNextRequest();
    portal.handleClient();
    return;
  }

  uint32_t agora = millis();

  if (WiFi.status() != WL_CONNECTED) {
    static uint32_t ultimaTentativa = 0;
    static uint32_t backoff = 5000;
    if (agora - ultimaTentativa > backoff) {
      ultimaTentativa = agora;
      if (conectarWifi(10000)) backoff = 5000;
      else backoff = min<uint32_t>(backoff * 2, 300000);  // até 5 min
    }
  }

  if (agora - ultimoTickMs >= SCHEDULE_TICK_MS) {
    ultimoTickMs = agora;
    aplicarScheduleLocal();
  }

  if (agora - ultimoTelemetriaMs >= TELEMETRY_INTERVAL_MS) {
    ultimoTelemetriaMs = agora;
    lerSensorModbus();
    enviarTelemetria();
  }

  if (agora - ultimoConfigMs >= CONFIG_INTERVAL_MS) {
    ultimoConfigMs = agora;
    buscarConfig();
  }

  delay(50);
}
