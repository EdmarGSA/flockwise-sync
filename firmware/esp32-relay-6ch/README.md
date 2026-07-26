# Firmware ESP32-S3-Relay-6CH — GSA Tibiri

Controlador de 6 canais para aviários, com sensor SM-WT (RS485/Modbus RTU) e
operação offline resiliente a quedas de energia e internet.

## Gravação

```bash
cd firmware/esp32-relay-6ch
pio run -t upload
pio device monitor -b 115200
```

## Primeiro boot (provisionamento)

1. Ao ligar sem configuração — ou segurando o botão **BOOT** — a placa cria a
   rede `GSA-Aviario-XXXX` (senha `gsa12345`).
2. Conecte pelo celular e abra `http://192.168.4.1`.
3. Preencha: Wi-Fi, URL do bridge, **Device ID** e **Token** gerados no app em
   *Dispositivos IoT → Novo dispositivo → ESP32-S3 6CH*.
4. Salvar reinicia a placa; em ~15 s ela aparece **online** no app.

URL do bridge: `https://<projeto>.supabase.co/functions/v1/esp32-bridge`

## Ligações

| Sinal | Pino ESP32-S3 |
|---|---|
| Relés CH1..CH6 | 1, 2, 41, 42, 45, 46 |
| RS485 RX / TX | 18 / 17 |
| Botão BOOT (portal) | 0 |

O SM-WT em RS485 usa Modbus RTU (padrão: slave 1, 9600 8N1, holding registers
`0x0000` temperatura ×10 e `0x0001` umidade ×10).

## Ciclo de operação

| Período | Ação |
|---|---|
| 10 s | Avalia schedule/safety local (só assume o controle após 15 min sem sync) |
| 60 s | Lê o sensor e envia `POST /telemetry`; aplica `desired_channels` da resposta |
| 5 min | `GET /config` — canais, `safety_rules`, `schedule_24h`, RTC |

- `estado_atual` (desejado, definido pelo Brain/UI) nunca é sobrescrito pela
  telemetria; o firmware confirma o que aplicou em `ultimo_estado_persistido`,
  que é o que alimenta o selo de ACK na tela de Ambiência.
- `schedule_24h` e o último payload de config ficam na NVS: após queda de
  energia a iluminação e a proteção térmica voltam sozinhas, mesmo sem internet.
- Watchdog de 60 s reinicia a placa em caso de travamento; reconexão Wi-Fi usa
  backoff exponencial até 5 min.
- `boot_reason` é enviado na telemetria (`power_on`, `brownout`, `watchdog`…),
  permitindo ao backend detectar quedas de energia.
