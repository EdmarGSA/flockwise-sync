# Integrar ESP32-S3-Relay-6CH + SM-WT na automação dos aviários

## Situação verificada

O software já tem quase tudo pronto, mas **nenhum dos dois equipamentos está em uso hoje**:

- Os 4 dispositivos cadastrados no banco são todos `driver = ewelink`, 1 canal cada. Zero dispositivos `esp32_http`, zero sensores SM-WT (nenhum registro com serial/token).
- Já existem: função `esp32-bridge` (endpoints `/config`, `/telemetry`, `/command`), função `sm-wt-ingest` (POST com `x-sensor-token`), monitor de saúde `sm-wt-health-monitor`, tela de cadastro em Dispositivos IoT com seleção de driver, geração de token Wi-Fi, campos Modbus (slave id, baud) e canais por dispositivo.

**Bug bloqueador encontrado:** a tabela `dispositivos_iot` **não possui a coluna `online`**, mas o `esp32-bridge` faz `select(... , online)` e `update({ online: true })` tanto no `/config` quanto no `/telemetry`. Como o erro não é checado, o dispositivo sempre vem nulo e o ESP32 recebe **404 "Dispositivo não registrado"** — ou seja, a integração ESP32 hoje não funciona nem com hardware conectado. O mesmo campo é usado no painel de saúde IoT.

## Etapas

### 1. Destravar o bridge (pré-requisito)
- Migração: adicionar `dispositivos_iot.online boolean not null default false` (+ índice parcial) e alinhar a rotina `marcar_dispositivos_offline_iot` para escrever nessa coluna além dos eventos.
- No `esp32-bridge`: tratar o `error` das consultas (hoje ignorado) e devolver 500 com mensagem clara em vez de "não registrado", para evitar novo diagnóstico cego.
- Exigir `x-device-token` sempre que o dispositivo tiver `auth_token` também no `/config` (hoje só o `/telemetry` valida).

### 2. Firmware do ESP32-S3-Relay-6CH
Criar `firmware/esp32-relay-6ch/` (PlatformIO/Arduino) versionado no projeto, com:
- Wi-Fi + provisionamento por AP de configuração (SSID, senha, `deviceId`, `authToken`, URL do bridge).
- Loop: `GET /config` no boot e a cada 5 min; `POST /telemetry` a cada 60 s com estado dos 6 relés, `boot_reason`, `uptime_s` e `programa_versao_aplicada`.
- Execução local do `schedule_24h` e das `safety_rules` gravadas em NVS — mantém luz, aquecimento e ventilação corretos mesmo sem internet (já é o contrato que o bridge devolve).
- Leitura Modbus RTU do SM-WT pela porta RS485 da placa (slave id/baud vindos do `/config`), enviada em `sensor{}` no telemetry como fallback.
- Watchdog, reconexão exponencial e reconciliação de estado após queda de energia.

### 3. Sensor SM-WT (Wi-Fi + RS485)
- Documentar e validar as duas fontes: **primária** Wi-Fi (o sensor faz POST direto em `sm-wt-ingest` com `x-sensor-token`) e **fallback** RS485 via ESP32 (só grava se o Wi-Fi ficar >5 min sem enviar — regra já existente na RPC).
- Se o firmware do SM-WT não permitir URL de destino customizada, o caminho oficial passa a ser o RS485 pelo ESP32; nesse caso ajustar a tela para deixar isso explícito no cadastro.

### 4. Comissionamento na interface
- Novo passo-a-passo "Instalar dispositivo" na tela de Dispositivos IoT: gerar `deviceId` + `authToken`, mostrar a URL do bridge e um QR/JSON para colar no provisionamento do ESP32.
- Mapeamento de canais guiado: CH1..CH6 → tipo de equipamento (iluminação, ventilação, aquecimento, cortina, nebulização) com aviso quando um canal fica sem função.
- Tela de diagnóstico por dispositivo: último boot, motivo, versão de programa aplicada, ACK por canal, última leitura do sensor e erro Modbus.

### 5. Validação em campo
- Teste ponta a ponta: cadastro → `/config` 200 → telemetry chegando → comando manual liga/desliga com ACK → Climate Brain acionando o canal → simulação de queda de internet mantendo o schedule local.
- Checklist elétrico documentado (relés secos, contatores, alimentação 7–36 V, aterramento do RS485).

## Detalhes técnicos

- Migração nova apenas para `online`; nenhuma tabela nova é necessária (`canais_dispositivo`, `timers_seguranca_iot`, `leituras_sensores` já cobrem o modelo).
- `leituras_sensores` já tem `fonte` (`wifi_sensor`, `esp32_interno`, RS485) e coluna `online`, então a dedupe de fontes continua igual.
- Nenhuma mudança no Climate Brain: ele já despacha por `canais_dispositivo`, independente de driver.
- Firmware fica no repositório apenas como código-fonte para compilar/flashar; não afeta o build da aplicação web.
