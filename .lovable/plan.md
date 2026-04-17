
# Análise: Expansão IoT para Múltiplos Equipamentos (ESP32-S3 + Sonoff)

## Análise do Hardware Proposto

O **ESP32-S3-Relé-6CH** é uma excelente opção complementar ao Sonoff atual. Comparativo:

| Característica | Sonoff (atual) | ESP32-S3 6CH | Medidor Custom |
|----------------|----------------|--------------|----------------|
| Canais de relé | 1-4 | **6 isolados** | 0 (só sensor) |
| Sensores | TH integrado | DS18B20/SHT40 via RS485 | DS18B20/SHT40 |
| Corrente máx | 10A | **10A 250VAC isolado** | N/A |
| Conexão | Cloud eWeLink | **Wi-Fi direto MQTT/HTTP** | Wi-Fi MQTT/HTTP |
| Multi-equipamento | ❌ 1 carga/device | ✅ **6 cargas/device** | ❌ |
| Custo por carga | Alto (1 device por equipamento) | **Baixo (6 cargas em 1 device)** | N/A |

## Vantagens Estratégicas do ESP32-S3

1. **Consolidação física**: 1 device controla ventilador + nebulizador + iluminação + aquecedor + cortina + alarme — sem precisar de 6 Sonoffs por galpão
2. **Independência da nuvem eWeLink**: comunica direto com nosso backend via MQTT/HTTP — elimina dependência da Coolkit
3. **RS485 industrial**: permite expansão para sensores avançados (CO₂, NH₃, pressão diferencial — cruciais para postura)
4. **Isolamento óptico**: muito mais seguro para ambiente de granja (umidade, picos elétricos)
5. **Sem limite de App ID**: o eWeLink limita 100 dispositivos por App ID (memória existente). ESP32 não tem esse teto.

## Arquitetura Proposta — Multi-Driver IoT

```text
┌──────────────────────────────────────────────────┐
│  PAINEL IoT — Lovable (atual)                    │
└──────────────────────────────────────────────────┘
              ↓                    ↓
    ┌──────────────────┐  ┌──────────────────┐
    │  Driver eWeLink  │  │  Driver MQTT/HTTP│
    │  (Sonoff atual)  │  │  (ESP32 novo)    │
    └──────────────────┘  └──────────────────┘
              ↓                    ↓
       Cloud eWeLink         Broker MQTT
              ↓                    ↓
         Sonoff TH           ESP32-S3 6CH
                                   ↓
                         ┌─────────┼─────────┐
                       Vent.  Nebuliz.  Iluminação
                      Aqueced. Cortina   Alarme
```

## O Que Precisa Ser Construído

### Fase 1 — Fundação Multi-Driver (DB + UI)

| Item | Descrição |
|------|-----------|
| **Tabela `dispositivos_iot`** | Adicionar coluna `driver` (`ewelink` \| `esp32_mqtt` \| `esp32_http`) e `endpoint_local` (IP/MQTT topic) |
| **Tabela `canais_dispositivo`** | Nova — 1 device pode ter N canais. Campos: `dispositivo_id`, `canal_numero` (1-6), `nome` (ex: "Ventilador Lateral"), `tipo_equipamento` (`ventilador`/`nebulizador`/`iluminacao`/`aquecimento`/`cortina`/`alarme`), `funcao_automacao` |
| **Tabela `regras_automacao_avancada`** | Estende `regras_temperatura_lote` para suportar regras por **umidade, CO₂, horário, idade** acionando equipamentos específicos |

### Fase 2 — Driver MQTT/HTTP para ESP32

| Item | Descrição |
|------|-----------|
| **Edge Function `esp32-bridge`** | Recebe webhook de telemetria do ESP32 (POST /telemetry) e envia comandos (POST /command) |
| **Firmware ESP32 (template)** | Documentação Arduino/PlatformIO com payload padrão JSON: `{deviceId, channels[], temp, humidity, online}` |
| **Configuração MQTT broker** | Recomendar HiveMQ Cloud ou Mosquitto para receber telemetria local (alternativa ao webhook) |

### Fase 3 — UI Multi-Equipamento

| Item | Descrição |
|------|-----------|
| **DispositivosIoT.tsx** | Nova aba "Equipamentos" — lista canais com tipo (ícones distintos: ventilador, nebulizador, etc.) |
| **TemperaturaUmidadeCard.tsx** | Mostrar todos os canais ativos com toggle individual e badge do tipo de equipamento |
| **Regras Automação** | Suportar múltiplos triggers: "Se temp > 30°C **E** umidade < 60% → ligar nebulizador canal 3" |

### Fase 4 — Automação Cruzada

| Equipamento | Trigger Automático |
|-------------|-------------------|
| **Aquecedor** | Temp < faixa ideal (já existe) |
| **Ventilador** | Temp > faixa ideal (já existe) |
| **Nebulizador** | Temp alta **+ umidade baixa** (novo) |
| **Iluminação** | Programa de luz por idade (postura — crítico para Lohmann) |
| **Cortina** | Temp + horário (manhã/tarde) |
| **Alarme** | Falha em qualquer regra crítica > 10min (offline ou desvio) |

## Impacto na Memória Existente

- ✅ Mantém compatibilidade com Sonoff atual (driver eWeLink continua funcionando)
- ✅ Aproveita lógica `pg_cron` 5min de automação por idade
- ✅ Aproveita timers offline já implementados (precisa adaptar firmware ESP32)
- ✅ Aproveita sistema de alertas de temperatura existente
- 🆕 Adiciona suporte a **programa de luz para postura** (gap atual!)
- 🆕 Adiciona suporte a sensores avançados via RS485 (CO₂, NH₃)

## Recomendação Final

**SIM, implementar — em fases.** O ESP32-S3 6CH é estrategicamente superior ao Sonoff para granjas industriais:

1. **Início (Fase 1+2)**: Adicionar suporte multi-driver no DB e criar bridge para ESP32
2. **Meio (Fase 3)**: UI para gerenciar canais por equipamento
3. **Fim (Fase 4)**: Regras de automação cruzadas (temp+umidade, programa de luz)

O **medidor de temperatura/energia** mencionado é **complementar** mas não essencial — ele é mais útil para controle de custo energético (kWh por lote) do que para automação. Pode ser uma **Fase 5 opcional**.

## Pergunta Antes de Implementar

Para dimensionar o trabalho, preciso saber por onde começar.
