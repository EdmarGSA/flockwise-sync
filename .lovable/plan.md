## Problema

Núcleo do veterinário mostra **uma única temperatura/umidade por galpão**, mas o galpão tem **3 sensores IoT** (Aquecedor Pinteiro, Área 02, Ventilador Área 01) com leituras bem diferentes (29.4°C / 0%, 24.7°C / 100%, 23.8°C / 100%). O card escolhe arbitrariamente a leitura "mais recente" de qualquer um dos dispositivos, escondendo a realidade térmica do galpão (zonas distintas + sensor de umidade defeituoso).

## Solução

Agregar todos os sensores do galpão e expor cada um individualmente, sinalizando divergências e sensores suspeitos.

### 1. Agregação por galpão (`MonitoramentoClimaticoVet.tsx`)

Trocar a lógica que pega 1 leitura por galpão por uma agregação multi-sensor:

- Buscar a **última leitura válida de cada dispositivo** (não só a mais recente do galpão).
- Calcular por galpão:
  - `temp_media` = média das temperaturas válidas
  - `temp_min` / `temp_max` = extremos entre sensores (zonas frias/quentes)
  - `ur_media` = média das umidades, **descartando sensores presos em 0% ou 100%** quando os demais discordam (>20pp). Esses sensores entram numa lista `sensores_suspeitos`.
  - `divergencia_c` = `temp_max - temp_min`
- O status do galpão (Conforto/Atenção/Crítico) passa a usar `temp_max` (o pior caso) contra a faixa de conforto, em vez de uma única leitura.

### 2. Exibição expandida do galpão

Cada linha de galpão vira expansível e mostra:

```text
Galpão 01       24.7–29.4°C (média 26.0)  Δ5.6°C  ⚠ Atenção
  ├─ Aquecedor Pinteiro      29.4°C  /  0%   ⚠ umidade suspeita
  ├─ Área 02                 24.7°C  / 100%
  └─ Ventilador Área 01      23.8°C  / 100%
```

- Badge de **divergência** (Δ > 3°C) indica que zonas do galpão estão fora de equilíbrio (ex.: pinteiro quente vs. resto frio) — informação clínica importante para o veterinário.
- Sensores com leitura **estagnada** (mesmo valor há > 1h) ou **umidade fixa em 0/100%** ganham ícone de alerta e tooltip "verificar sensor".
- Botão "Abrir lote" continua na lateral; nova ação **"Ver sensores"** abre o detalhamento completo.

### 3. Plano de prevenção considera o pior caso

`gerarPlanoPrevencao` passa a receber `temperatura_c = temp_max` e um campo extra `temp_min` para detectar:

- **Estresse de calor localizado** quando `temp_max ≥ critico` mesmo com média OK (ação focada no setor quente).
- **Frio em pinteiro** quando lote tem ≤ 14 dias e `temp_min` cai abaixo do conforto, mesmo com média OK.
- **Divergência > 5°C** gera ação "Equalizar ambiente — checar cortinas/exaustão na zona divergente".

### 4. Severidade global do card

O selo `OK / ATENÇÃO / ALTO` no topo do card considera também:

- Divergência > 5°C → ATENÇÃO
- Sensor offline ou suspeito → ATENÇÃO
- Qualquer galpão com `temp_max` em faixa crítica → ALTO

## Arquivos

- `src/components/veterinario/MonitoramentoClimaticoVet.tsx` — nova agregação, exibição multi-sensor, status por pior caso.
- `src/lib/clima/planoPrevencao.ts` — estender `LeituraGalpao` com `temp_min`, `temp_max`, `divergencia_c`, `sensores_suspeitos` e adicionar regras de calor localizado, frio em pinteiro e divergência.

Sem mudanças de banco — toda a informação já existe em `dispositivos_iot` e `leituras_sensores`.