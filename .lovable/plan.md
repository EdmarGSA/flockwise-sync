
# Plano — Brain AI administrando dispositivos (Fase Sombra → Auto)

## Objetivo
Fechar o loop **decisão → atuação → verificação** do Climate Brain sobre **ventilação, nebulização, aquecimento e iluminação**, começando em **modo sombra** (só sugere, não aciona) e com travas de segurança fortes.

## Como funciona hoje (baseline)
- `climate-brain` roda a cada 1 min, calcula modo (CONFORTO/AQUECIMENTO/ALERTA/EMERGÊNCIA), grava em `log_decisao_clima` e dispara `auto-ventilacao`, `auto-cortina`, `auto-nebulizacao`.
- Essas funções é que falam com eWeLink / `esp32-bridge`. O Brain hoje **não decide o estado físico** de cada relé — ele só sinaliza intenção.
- Iluminação roda independente em `auto-iluminacao` (programa por idade).

## O que muda

### 1. Camada de "Comando do Brain" (nova)
Tabela `comando_brain` (uma linha por intenção):
- `galpao_id`, `funcao` (ventilacao/nebulizacao/aquecimento/iluminacao), `canal_id`
- `estado_desejado` (on/off, pwm 0-100, estágio N)
- `origem` = `brain_shadow` | `brain_auto` | `manual`
- `motivo` (texto), `decisao_id` (FK `log_decisao_clima`)
- `status`: `sugerido` | `aprovado` | `enviado` | `confirmado` | `falhou` | `ignorado`
- `executado_em`, `confirmado_em`, `erro`

Em **modo sombra** o Brain só insere com `status=sugerido`. O dispatcher real só atua quando `status=aprovado` (humano clica) ou quando o galpão estiver com `automacao_brain_ativa=true`.

### 2. Toggle por galpão
Coluna `galpoes.automacao_brain` enum (`off` | `shadow` | `auto`), default `shadow`. Card no Climate Brain mostra o estado e botão de "Pânico" que volta para `off` e desliga todos canais via `esp32-bridge`/eWeLink.

### 3. Dispatcher único (`brain-dispatcher`, nova edge function)
- Lê `comando_brain` pendentes elegíveis e executa via o driver certo (`esp32-bridge` ou eWeLink).
- Após enviar, marca `enviado` e aguarda telemetria de retorno (estado do canal) — quando bater, vira `confirmado`. Se em 60s não confirmar, marca `falhou` e dispara alerta.

### 4. Travas de segurança (todas obrigatórias antes de gerar `comando_brain`)
- **Drift**: se algum sensor relevante do galpão está em `sensor_drift_status.excluido_agregacao=true` E sobraram <2 sensores válidos → não comanda, loga `bloqueado_drift`.
- **Sustentação**: nova tabela `intencao_brain_pendente` guarda a intenção atual + `desde`; só vira `comando_brain` quando persistir por `min_minutos_sustentado` (já existe em `config_zonas_galpao`). Emergência (ITH vermelho/temp máx) pula essa janela.
- **Cooldown**: coluna `canais_dispositivo.ultimo_comando_em` + `cooldown_seg` (default 90s ventilação, 30s nebulização, 300s aquecimento). Dispatcher rejeita se ainda no cooldown.
- **Fallback offline**: se `dispositivos_iot.online=false`, marca comando como `falhou` imediatamente, dispara `dispatch_notificacao('brain_atuador_offline')` e tenta canal redundante se existir (`canais_dispositivo.canal_redundante_id`).

### 5. Event-driven
- Hoje o cron roda a cada 1 min. Vamos **manter** o cron como heartbeat de segurança, mas adicionar trigger:
- Após `INSERT` em `leituras_sensores` (ou `eventos_dispositivo_iot` tipo telemetria), uma função `trigger_reavaliar_brain` enfileira o `galpao_id` numa tabela `brain_fila_reavaliacao` (com debounce de 10s por galpão).
- Worker `brain-worker` (cron a cada 15s) consome a fila e roda `climate-brain` só para os galpões enfileirados — barato e responsivo.

### 6. Iluminação no Brain
Hoje `auto-iluminacao` decide sozinho. Vamos **manter ele como executor** mas o Brain passa a poder sobrescrever via `override_brain` em emergência (ex.: apagar luz se estresse térmico extremo durante o dia). Override expira automaticamente quando emergência sai.

### 7. UI no Climate Brain
- Cada card de galpão ganha:
  - Badge do modo (`off`/`shadow`/`auto`)
  - Tabela "Últimas sugestões" (origem `brain_shadow`) com botão **Aprovar** (cria `comando_brain` com `status=aprovado`)
  - KPI: % sugestões aprovadas vs ignoradas nos últimos 7 dias (semáforo de confiança)
- Nova página `/configuracoes/brain-automacao` para ligar `auto` por galpão depois que a confiança subir.

## Entregáveis técnicos

| Item | Tipo |
|---|---|
| Migration: `galpoes.automacao_brain`, `canais_dispositivo.cooldown_seg / ultimo_comando_em / canal_redundante_id`, tabelas `comando_brain`, `intencao_brain_pendente`, `brain_fila_reavaliacao` + RLS por `integrado_id` | SQL |
| Refactor `climate-brain` para gerar `intencao_brain_pendente` + checar drift/sustentação | Edge fn |
| Nova `brain-dispatcher` (cron 15s, lê `comando_brain` aprovados/auto) | Edge fn |
| Nova `brain-worker` (consome `brain_fila_reavaliacao`) + trigger SQL em `leituras_sensores` | Edge fn + SQL |
| Tipo evento `brain_atuador_offline` + `brain_comando_falhou` em `tipos_evento_notificacao` | SQL |
| `SensorDriftStatusCard` reaproveitado + novo `SugestoesBrainCard` no `ClimateBrain.tsx` | React |
| Nova página `BrainAutomacao.tsx` (toggle por galpão + botão pânico) | React |

## Ordem de execução
1. Migration + tipos de notificação.
2. `brain-dispatcher` + UI de sugestão/aprovação (modo sombra já útil sem riscos).
3. Trigger event-driven + `brain-worker`.
4. Liberar toggle `auto` por galpão após 7 dias de sombra estável.

## Fora deste plano
- Cortinas (você não marcou — segue como está).
- Aprendizado de cooldowns ótimos por galpão (versão futura usando `climate-learn`).
- Atuação preditiva (antecipar pico de calor pela previsão) — fica para fase 2.
