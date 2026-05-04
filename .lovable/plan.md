# Automação Climática Padrão-Ouro — Aquecimento, Ventilação, Pressão e Bem-Estar

Análise do que existe, lacunas críticas e plano para transformar o módulo num **sistema de bem-estar animal de classe mundial**, alinhado às recomendações Cobb/Ross/Aviagen, NRC, EU 2007/43/CE e Korea MAFRA.

---

## 1. Diagnóstico — o que já existe

### Pontos fortes
- **`auto-temperatura`** (cron a cada 5 min) com decisão por canal (`decideChannelState`) cobrindo: aquecimento, ventilação, nebulização, cortina (via horário), alarme.
- **`regras_temperatura_lote`** por faixa de idade (`dia_inicio`/`dia_fim`, `temp_min_c`, `temp_max_c`, `umidade_max_pct`), com parâmetros de **nebulizador** (cooldown, duração mínima, off por umidade).
- **`programa_cortina_lote`** (abrir/fechar por horário fixo).
- **`canais_dispositivo`** com `tipo_equipamento`, `funcao_automacao`, `suporta_dimer`, `intensidade_atual` (0–100).
- **`regras_automacao_avancada`** (regra livre por galpão + faixa idade + horário + ação ligar/desligar).
- **`galpoes`** já guarda `tipo_pressao` (positiva/negativa), `ventilador_quantidade`, `comprimento × largura × altura`, `inercia_termica_min`.
- **Timers de segurança offline** (`timers_seguranca_iot`) replicados no firmware Sonoff por faixa de idade.
- **Alertas** com agregação 10 min (`alertas_temperatura`), notificação offline 6h dedup, ITH calculado (`calcularITH`).
- **Recuperação de energia/internet** (`schedule_24h` em NVS, boot detection).

### Lacunas críticas (impedem ser "padrão-ouro")
1. **Não há diferenciação real entre pressão positiva × negativa** — a decisão liga/desliga ventilador igualmente, ignorando que negativa exige cálculo de **vazão (CFM/m³h)**, **velocidade do vento sobre a ave** e **estágios escalonados (mínima/transição/túnel)**.
2. **Cortina** usa só horário fixo — não responde a temperatura/idade/vento real. Sem `% abertura` (é binário).
3. **Sem ITH/THI no motor de decisão** — só temperatura crua. Aves morrem por estresse calórico com 28°C + 90% UR (THI > 78) mesmo dentro da "faixa".
4. **Sem zona de conforto progressiva** (target_temp por dia, não por faixa) — fazendas top-tier usam curva diária Cobb/Ross com declínio de 0,2-0,3°C/dia.
5. **Sem cálculo de NH₃, CO₂** (sensores não existem) — exigência Coreia/EU.
6. **Sem **velocidade de ar** alvo por idade** (m/s sobre a ave). Pressão negativa precisa disso.
7. **Sem **estágios de ventilação**** (mínima por timer de O₂ → transição por temp → túnel + nebulização). Hoje é 1 ventilador on/off.
8. **Sem inércia térmica respeitada** — liga/desliga a cada 5 min causa **ciclagem** (queima motor, estressa ave). Falta histerese (deadband) e tempo mínimo on/off.
9. **Sem rampa de aquecimento por dia** (pintinho dia 1 = 33°C; dia 7 = 30°C; dia 21 = 24°C). Hoje é faixa 1-7 com `temp_min` único.
10. **Sem *fail-safe* multi-nível** — se sensor falhar, sistema deveria entrar em **modo conservador** (ventilação mínima + cortinas neutras), não congelar comandos.
11. **Sem **cálculo de pressão estática**** (pol. H₂O / Pa) para galpão negativo dimensionar inlets.
12. **Sem **modo emergência calor** (heat stress) com nebulização + ventilação máxima + alerta SMS automático.
13. **Sem auditoria de cada comando** com hash (importante para Coreia).
14. **Sem programa parametrizado por linhagem** (Cobb 500 ≠ Ross 308 ≠ Hubbard ≠ poedeira).

---

## 2. Visão padrão-ouro — Arquitetura proposta

```text
                    ┌────────────────────────────────────┐
                    │  PROGRAMA CLIMÁTICO POR LOTE       │
                    │  (curva diária por linhagem+sexo)  │
                    └──────────────┬─────────────────────┘
                                   │
   sensores ─► AGREGADOR ─► MOTOR DE DECISÃO ─► ESTÁGIOS ─► AÇÕES POR CANAL
   (T, UR,      (mediana,    1. ITH (NRC)        Min vent     • Aquecedor
    NH₃,        descarta     2. Temp setpoint    Transição    • Inlet (% abertura)
    CO₂,        outliers,    3. Velocidade ar    Túnel        • Exaustor (estágios)
    vel.ar,     fallback)    4. NH₃/CO₂          Heat stress  • Nebulizador (ciclos)
    pressão)                 5. Pressão est.     Emergência   • Cortina (% lateral)
                             + histerese +                    • Alarme + SMS
                             tempo mín on/off                 • Modo seguro
                                   │
                             ┌─────┴─────┐
                             ▼           ▼
                       AUDITORIA    FALLBACK FIRMWARE
                       (hash)       (timers NVS, watchdog)
```

---

## 3. Plano em ondas

### **Onda 1 — Curva climática diária por linhagem (fundação)** (1–2 sprints)

Substitui faixas grossas por **curva contínua dia-a-dia** parametrizada.

**DB**:
```sql
CREATE TABLE curva_climatica_referencia (
  id uuid PK,
  integrado_id uuid,            -- null = template global
  linhagem text,                -- cobb_500, ross_308, hubbard, lohmann_brown...
  sexo text,                    -- macho, femea, misto
  tipo_producao text,           -- frango_corte, postura, matriz
  publica boolean default false
);

CREATE TABLE curva_climatica_ponto (
  id uuid PK,
  curva_id uuid,
  dia_idade int,                -- 1, 2, 3 ... 70
  temp_alvo_c numeric,          -- 33, 32.5, 32, 31.5...
  temp_min_alarme_c numeric,    -- alvo - 2
  temp_max_alarme_c numeric,    -- alvo + 2
  ur_min_pct numeric,           -- 50
  ur_max_pct numeric,           -- 70
  velocidade_ar_min_ms numeric, -- 0.1 (dia 1) → 2.5 (adulto)
  velocidade_ar_max_ms numeric,
  nh3_max_ppm numeric default 20,
  co2_max_ppm numeric default 3000,
  vazao_min_m3h_por_kg numeric, -- ventilação mínima por kg de PV
  ith_alarme_amarelo numeric default 74,
  ith_alarme_vermelho numeric default 78
);
```

Seeds com tabelas Cobb 500, Ross 308, Hubbard Flex, Lohmann Brown, Hy-Line W36 (postura).

**UI**: `/configuracao/curva-climatica` — editor visual com gráfico (Recharts), botão "aplicar template Cobb 500". Lote vincula curva via `lotes.curva_climatica_id`.

---

### **Onda 2 — Motor de decisão multi-variável (ITH + estágios + histerese)** (2 sprints)

Reescrever `decideChannelState` para retornar **estado + intensidade + reason chain**:

```ts
interface DecisaoCanal {
  state: 'on' | 'off';
  intensidade_pct?: number;     // p/ dimmer/inverter
  estagio: 'min' | 'transicao' | 'tunel' | 'heat_stress' | 'emergencia' | 'noturno';
  reason: string[];
  bloqueado_por?: 'tempo_minimo_on' | 'tempo_minimo_off' | 'sensor_falho';
}
```

Regras-chave a implementar:
- **Histerese**: ligar a `setpoint + 0.5°C`, desligar a `setpoint - 0.3°C` (configurável por organização).
- **Tempo mínimo on/off** por tipo de equipamento (aquecedor: 5 min off mínimo; ventilador: 2 min on mínimo) → evita ciclagem.
- **ITH override**: se ITH ≥ vermelho → força `heat_stress` (todos exaustores 100% + nebulização contínua + abrir cortinas + SMS).
- **Velocidade de ar alvo** (estimada por número de exaustores ligados × CFM nominal / área transversal do galpão).
- **Sensor fail-safe**: se leitura ausente >15 min OU `online=false` em todos sensores → entrar em **modo seguro** (ventilação mínima por timer de relógio + alerta crítico + não desligar aquecedor noturno em pintinho ≤7d).

Tabela nova:
```sql
CREATE TABLE config_histerese_organizacao (
  integrado_id uuid PK,
  deadband_temp_c numeric default 0.5,
  tempo_min_on_aquecedor_seg int default 60,
  tempo_min_off_aquecedor_seg int default 300,
  tempo_min_on_ventilador_seg int default 120,
  tempo_min_off_ventilador_seg int default 60,
  ith_amarelo numeric default 74,
  ith_vermelho numeric default 78,
  modo_seguro_vent_min_pct numeric default 30
);

ALTER TABLE canais_dispositivo
  ADD COLUMN ultimo_on_em timestamptz,
  ADD COLUMN ultimo_off_em timestamptz,
  ADD COLUMN cfm_nominal numeric,           -- p/ ventiladores
  ADD COLUMN watts_nominal numeric;         -- p/ medir consumo
```

---

### **Onda 3 — Pressão Negativa (túnel) e Pressão Positiva — programas distintos** (2 sprints)

**Pressão Positiva** (galpão simples, ventiladores empurrando ar):
- Estágios: **Mínima** (1 ventilador, ciclo on 30s/off 60s para CO₂) → **Diurna** (proporcional a temperatura) → **Máxima** (todos + cortinas abertas).
- Sem inlet calculado; cortina lateral controla.

**Pressão Negativa** (túnel, exaustores no fundo + inlets/cortina frontal):
- Estágios: **Mínima** (1 exaustor + inlets parciais para troca de ar de O₂) → **Transição** (proporcional, mais exaustores conforme temp) → **Túnel** (100% exaustores + cortinas túnel + cooling pad/nebulização → meta velocidade 2,5–3,0 m/s adulto).
- Cálculo de **pressão estática alvo** (0,10–0,15 pol. H₂O = 25–37 Pa), abre/fecha inlets em % para manter.
- **Velocidade de ar estimada**:
  ```
  vel_ms = (Σ CFM exaustores ligados × 0.000472) / (largura × altura)
  ```

**DB**:
```sql
CREATE TABLE programa_ventilacao_galpao (
  id uuid PK,
  galpao_id uuid,
  modo text,                          -- 'positiva_simples', 'negativa_tunel', 'minima_apenas'
  estagios jsonb,                     -- [{estagio:'min', temp_max:24, ventiladores_n:1, ciclo_on_s:30, ciclo_off_s:60}, ...]
  pressao_estatica_alvo_pa numeric,   -- só negativa
  velocidade_alvo_ms_min numeric,
  velocidade_alvo_ms_max numeric,
  area_transversal_m2 numeric         -- largura × altura
);

CREATE TABLE estagio_ventilacao_estado (
  galpao_id uuid PK,
  estagio_atual text,
  velocidade_estimada_ms numeric,
  cfm_total_ativo numeric,
  pressao_estatica_pa numeric,        -- se sensor disponível
  ultima_transicao_em timestamptz,
  permanencia_minima_seg int default 180  -- evita ping-pong entre estágios
);
```

UI: `/configuracao/ventilacao/:galpao_id` — wizard que pergunta tipo (positiva/negativa), mede galpão, calcula CFM total, sugere estágios, mostra simulador de velocidade de ar.

---

### **Onda 4 — Cortina inteligente (% abertura) e cooling/inlet** (1–2 sprints)

Cortina deixa de ser binária:
- Canal `cortina` ganha `suporta_posicionamento` (motor com encoder/feedback) → controlado em % (0–100).
- Decisão: combina temperatura, vento externo (via `weather-aggregator`), idade do lote, programa noturno e estágio de ventilação.
- Para galpão negativo: cortina lateral **fecha**, cortina túnel **abre** parcialmente conforme estágio.

```sql
ALTER TABLE canais_dispositivo
  ADD COLUMN suporta_posicionamento boolean default false,
  ADD COLUMN posicao_atual_pct int CHECK (posicao_atual_pct BETWEEN 0 AND 100);
```

Edge function nova `auto-cortina` (cron 2 min) ou consolidação no `auto-temperatura`.

---

### **Onda 5 — Sensores avançados: NH₃, CO₂, velocidade de ar, pressão estática** (1 sprint + hardware)

Estender schema das leituras:
```sql
ALTER TABLE leituras_sensores
  ADD COLUMN nh3_ppm numeric,
  ADD COLUMN co2_ppm numeric,
  ADD COLUMN velocidade_ar_ms numeric,
  ADD COLUMN pressao_estatica_pa numeric,
  ADD COLUMN lux numeric;
```

Suporte ESP32-S3 + sensores MQ-137 (NH₃), MH-Z19 (CO₂), anemômetro, manômetro diferencial.
UI Monitoramento Vet já mostra novas variáveis com sparkline (já tem framework).
Alertas dedicados se NH₃ > 20 ppm (limite Coreia/EU/Cobb) ou CO₂ > 3000 ppm.

---

### **Onda 6 — Modo Emergência Calor + Notificações críticas** (1 sprint)

Quando ITH ≥ vermelho **OU** temp > setpoint + 4°C **OU** mortalidade súbita > limiar:
- Aciona **todos** exaustores 100%, nebulização contínua, abre todas cortinas túnel, liga alarme físico.
- Envia **SMS/WhatsApp** ao gestor e veterinário (via Twilio connector — já listado).
- Notifica painel `/veterinario` em tempo real (Realtime Supabase).
- Registra evento `emergencia_calor` em `eventos_dispositivo_iot` para auditoria.

```sql
CREATE TABLE eventos_emergencia_climatica (
  id uuid PK,
  integrado_id uuid,
  galpao_id uuid,
  lote_id uuid,
  tipo text,                  -- 'heat_stress', 'cold_stress', 'sensor_total_falho', 'pressao_critica'
  ith_no_evento numeric,
  temp_no_evento numeric,
  acoes_executadas jsonb,
  resolvido_em timestamptz,
  created_at timestamptz default now()
);
```

---

### **Onda 7 — Auditoria de comandos + chain-of-custody (KR/EU exigem)** (1 sprint)

Cada comando emitido grava hash encadeado em `eventos_rastreabilidade` (tabela já planejada na onda anterior do roadmap geral). Inspetor pode auditar **todo histórico de decisões** que afetaram o lote → "por que ventilador X ligou às 14h32?".

---

## 4. Detalhes técnicos críticos

### Cálculo de ventilação mínima (NRC/Cobb)
```
vazao_min_m3h = peso_vivo_total_kg × vazao_min_m3h_por_kg(idade)
                ↓
Onde:
  dia 1-7:  0.5  m³/h/kg   (só CO₂/O₂)
  dia 8-21: 0.8  m³/h/kg
  dia 22+:  1.5  m³/h/kg (peso pesado)
  adulto verão: 5-7 m³/h/kg (heat stress)
```

### Cálculo de velocidade de ar (túnel)
```
v_ar (m/s) = (CFM_total × 0.000472) / (largura_m × altura_m × 0.85)
             # 0.85 = fator área útil descontando obstruções
```

### ITH (já implementado, integrar ao motor)
```
THI = T - (0.55 - 0.0055 × UR) × (T - 14.5)
```

### Histerese exemplo
```
setpoint = 28°C, deadband = 0.5
  ligar exaustor:    T ≥ 28.5
  desligar exaustor: T ≤ 27.5
  + tempo_min_on = 120s antes de poder desligar
```

---

## 5. UI a criar

| Tela | Função |
|---|---|
| `/configuracao/curva-climatica` | Editor visual de curva por linhagem (gráfico) |
| `/configuracao/ventilacao/:galpao_id` | Wizard pressão positiva/negativa + estágios + simulador |
| `/configuracao/histerese-seguranca` | Deadbands, tempos mínimos, ITH thresholds |
| `/iot/painel-galpao/:galpao_id` | Dashboard tempo real: temp/UR/ITH/NH₃/vel.ar/pressão + estágio atual + canais com estado/intensidade |
| `/iot/eventos-emergencia` | Histórico de heat stress, ações tomadas, tempo de resolução |
| `/auditoria/decisoes-clima/:lote_id` | "Por que o sistema fez X às Y horas" — chain de razões + hash |

---

## 6. Edge functions a criar/modificar

| Função | Ação |
|---|---|
| `auto-temperatura` | Reescrever motor de decisão (ITH + estágios + histerese + curva diária + fail-safe) |
| `auto-ventilacao` (NOVA) | Decide estágio (min/transição/túnel) e quantos canais ligar |
| `auto-cortina` (NOVA) | Posicionamento % (cortina lateral + túnel) |
| `auto-emergencia-clima` (NOVA, cron 1 min) | Detecta heat stress + dispara protocolo |
| `seed-curvas-climaticas` (NOVA, one-shot) | Popula templates Cobb/Ross/Hubbard/Lohmann |

---

## 7. KPIs de sucesso

- Variação T diária dentro do galpão ≤ ±1°C do setpoint em 95% das leituras.
- Zero ciclagens de aquecedor < 3 min entre on/off.
- ITH médio < 74 em 99% do tempo durante alojamento.
- Mortalidade por estresse térmico = 0 em verões com pico documentado.
- 100% dos comandos com hash auditável.
- Tempo de detecção de heat stress < 60s; tempo de resposta < 30s.
- Inspetor coreano consegue rastrear "decisão climática X" em < 5 cliques.

---

## 8. Sequência recomendada

Sugiro começar pela **Onda 1 (curva climática diária)** + **Onda 2 (motor multi-variável com histerese e ITH)** em conjunto, porque:
- Resolve o problema imediato de **ciclagem e ITH ignorado**.
- É 100% software, não depende de hardware novo.
- Já entrega valor enorme em bem-estar e mortalidade.
- Cria as fundações que as Ondas 3–7 consomem.

**Confirma seguir com Onda 1 + 2 (curva diária + motor histerese/ITH/estágios) como primeira entrega?** Ou prefere começar pela Onda 3 (pressão positiva/negativa explícita)?
