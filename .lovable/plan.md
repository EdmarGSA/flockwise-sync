## Problema

Hoje a aba **Proteção Offline** programa timers só por horário fixo (ex.: ventilação 11:00→15:00). Quando a internet cai, o equipamento liga pelo relógio, ignorando se o galpão está frio ou quente. Para um sistema climático, a prioridade tem que ser a **temperatura medida pelo sensor local**, não a hora.

Além disso, o usuário quer poder **programar manualmente os setpoints** (não apenas herdar da curva), para ajustar à realidade do galpão.

## Objetivo

1. Inverter a hierarquia: **temperatura primeiro, horário como reforço/limite opcional**.
2. Permitir que o produtor **edite os setpoints offline** por canal direto na UI, com sugestão automática vinda da curva climática (e botão "Restaurar da curva").

## Mudanças propostas

### 1. Modelo de dados
Adicionar à tabela que alimenta o card de proteção:

- `modo`: `"temperatura"` | `"horario"` | `"hibrido"`
- `temp_liga_c`, `temp_desliga_c` (histerese)
- `umidade_max_pct` (opcional — para nebulização)
- `janela_horaria_inicio`, `janela_horaria_fim` (opcionais — quando preenchidos, o setpoint só age dentro da janela)
- `origem_setpoint`: `"curva"` | `"manual"` (mostra se foi herdado ou editado)
- `setpoint_editado_em`, `setpoint_editado_por`

Sonoff básico (sem sensor) cai automaticamente em `modo='horario'` e os campos de temperatura ficam desabilitados na UI.

### 2. Lógica de cálculo (`calcularTimersSeguranca.ts`)
Quando `origem_setpoint='curva'`, calcular a partir da curva climática por idade já existente:

- **Ventilação**: `temp_liga = conforto_max + 1°C`, `temp_desliga = conforto_max − 0.5°C`
- **Aquecimento**: `temp_liga = conforto_min − 1°C`, `temp_desliga = conforto_min + 0.5°C`
- **Nebulização**: `temp > X` E `umidade < Y` (híbrido)

Quando `origem_setpoint='manual'`, usar exatamente o que o usuário digitou — não recalcular ao mudar de faixa de idade. Mostrar um banner "Você está com setpoint manual; não acompanha a curva automaticamente".

### 3. UI — aba Proteção Offline em `DispositivosIoT.tsx`

**Substituir a tabela atual** por um card editável por canal:

```
┌──────────────────────────────────────────────────────────┐
│ Galpão Área 02 • 💨 Ventilação      [🌡️ Sensor OK]       │
│ Idade do lote: 15 dias                                   │
│                                                          │
│ Modo:  ( ) Temperatura  ( ) Horário  (•) Híbrido         │
│                                                          │
│ Liga quando ≥ [ 30,5 ] °C                                │
│ Desliga quando ≤ [ 29,0 ] °C    Histerese: 1,5 °C        │
│ Umidade máxima: [ -- ] %    (opcional)                   │
│                                                          │
│ Janela horária (opcional): [ 10:00 ] → [ 18:00 ]         │
│                                                          │
│ Origem: Manual (editado em 11/05 por João)               │
│ [↻ Restaurar da curva]   [💾 Salvar e sincronizar]       │
└──────────────────────────────────────────────────────────┘
```

Comportamento:
- **Sugestão automática**: ao abrir, se `origem='curva'`, os campos vêm pré-preenchidos com o cálculo atual. Se o usuário editar qualquer campo, vira `'manual'`.
- **Validação**: `temp_liga > temp_desliga` para ventilação; `temp_liga < temp_desliga` para aquecimento; histerese mínima de 0,3 °C; alerta se sair de uma faixa segura por idade (ex.: aquecer pintinho a < 28 °C nos primeiros 7 dias).
- **Bloqueio inteligente**: para canal sem sensor, modo Temperatura/Híbrido fica desabilitado com tooltip "Este dispositivo não possui sensor de temperatura local".
- **Resync**: salvar dispara `handleResyncTimers` automaticamente; botão manual também continua disponível no topo.
- **Última ação**: mostrar abaixo do card "Ligou às 13:42 com 31,2 °C" usando os logs já existentes.

Atualizar o card "Como funciona a Proteção Offline?":
- **Prioridade 1 — Sensor local**: o ESP32 lê o sensor e decide na hora.
- **Prioridade 2 — Janela horária**: limita quando o setpoint pode agir (ex.: nebulizar só 10–18h).
- **Prioridade 3 — Cloud**: ao voltar a internet, o Climate Brain assume e ajusta com curva, ITH e aprendizado.
- **Setpoints**: vêm da curva por padrão, mas podem ser editados manualmente por canal.

### 4. Firmware (`esp32-bridge` → `GET /config`)
Devolver `safety_rules` no novo formato:

```json
{
  "canal": 2,
  "modo": "hibrido",
  "temp_liga_c": 30.5,
  "temp_desliga_c": 29.0,
  "umidade_max_pct": null,
  "janela_horaria": { "inicio": "10:00", "fim": "18:00" },
  "fallback_horario": { "ligar": "11:00", "desligar": "15:00" }
}
```

ESP32-S3 compara com leitura do DHT local; usa `fallback_horario` apenas se o sensor falhar por > N minutos. Atualizar `docs/firmware/recuperacao-energia.md`.

### 5. Migração e compatibilidade

- Migration adiciona colunas nullable; registros antigos viram `modo='horario'`, `origem='curva'`.
- `handleResyncTimers` recalcula só os canais com `origem='curva'`; manuais são preservados.
- Sonoff básico continua funcionando como hoje (zero regressão).

### 6. Fora de escopo

- Não mexer na automação cloud (`auto-temperatura`, `climate-brain`) — já é temperatura-first.
- Não alterar iluminação (continua por horário/fotoperíodo).

## Perguntas

1. **Histerese mínima** entre liga/desliga: forçar **0,3 °C** ou deixar livre com aviso?
2. Quando o sensor local falhar, o canal deve **cair no fallback de horário** ou **desligar por segurança** e alertar?
3. Edição manual de setpoint deve ser **liberada para todos** ou **só para admin/veterinário** (criador apenas visualiza)?