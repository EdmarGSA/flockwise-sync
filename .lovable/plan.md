

## Plano — Fase 3 ESP32-S3 (UI + Roteamento + Correções)

Objetivo: deixar o sistema 100% pronto para receber clientes com Sonoff **ou** ESP32-S3, validável sem hardware via curl.

### 1. UI de cadastro multi-driver (`DispositivosIoT.tsx`)

- Trocar título "Adicionar Dispositivo Sonoff" → "Adicionar Dispositivo IoT"
- Adicionar `<Select>` no dialog "Adicionar Dispositivo" com 2 opções:
  - **Sonoff (eWeLink)** — fluxo atual (busca devices via OAuth)
  - **ESP32-S3 6CH** — novos campos: `device_id` (livre, ex: MAC), `auth_token` (gerado via `crypto.randomUUID()` com botão copiar), `num_canais` (default 6, range 1-8)
- Subtítulo da página: "Monitoramento, controle e automação de dispositivos IoT (Sonoff + ESP32)"
- Badge no card do device mostrando driver (`Sonoff` azul / `ESP32` roxo)

### 2. Visualização de canais por dispositivo

- No card de cada dispositivo ESP32, exibir lista expandível com os canais ativos (nome + ícone do tipo + estado on/off + switch)
- Para Sonoff (1 canal único), manter UI atual sem mudança visual
- Reaproveitar `tipoIcon()` de `CanaisDispositivoDialog.tsx`

### 3. Roteamento driver-aware (`useDeviceControl.tsx`)

- Aceitar novo parâmetro `driver: 'ewelink' | 'esp32_http'` e `canalId?: string`
- Se `driver === 'esp32_http'`: chamar `esp32-bridge/command` com `{ canalId, acao }`
- Se `driver === 'ewelink'`: comportamento atual (`sync-sensors/control-device`)
- `fetchDeviceStatus` retorna `null` para ESP32 (estado vem via telemetria, não via consulta)

### 4. Correção do bug `umidade_percent` em `auto-temperatura/index.ts`

- Linha ~531: trocar `umidade_percent` → `umidade_pct` (matching real column name)
- Sem isso, decisões de nebulização nunca consideram umidade

### 5. Realtime para `canais_dispositivo`

- Habilitar publication realtime
- Subscrever na página IoT e em `TemperaturaUmidadeCard` para refletir instantaneamente quando ESP32 manda telemetry

### 6. Validação E2E sem hardware

- Cadastrar 1 ESP32 fake via UI (`device_id = test-esp32-001`, `num_canais = 6`)
- Configurar 6 canais via `CanaisDispositivoDialog` (ventilador, nebulizador, aquecimento, etc.)
- Curl simulando firmware:
  ```bash
  POST /telemetry com temp=27.5, hum=58, channels[]
  GET  /config?deviceId=test-esp32-001
  ```
- Verificar: leitura aparece em `TemperaturaUmidadeCard`, estados batem, automação cron escolhe estados corretos

### 7. Documentação para o cliente

- Atualizar `docs/ESP32-S3-BRIDGE.md` com: passo-a-passo de cadastro pela UI, exemplo de teste com curl, tabela comparativa "Quando escolher Sonoff vs ESP32"

### Detalhes técnicos

- **Arquivos editados:** `src/pages/DispositivosIoT.tsx`, `src/hooks/useDeviceControl.tsx`, `src/components/lotes/TemperaturaUmidadeCard.tsx`, `supabase/functions/auto-temperatura/index.ts`, `docs/ESP32-S3-BRIDGE.md`
- **Migration SQL:** 1 comando — `ALTER PUBLICATION supabase_realtime ADD TABLE public.canais_dispositivo`
- **Sem breaking changes** — todos os Sonoff atuais continuam funcionando idêntico
- **Firmware** fica de fora deste plano (responsabilidade hardware, paralelo)

### Fora do escopo (Fase 4 futura)

- MQTT broker para comandos sub-segundo
- Programa de luz para postura (timer por horário)
- Hierarquia/exclusão quando galpão tem Sonoff + ESP32 simultâneos

