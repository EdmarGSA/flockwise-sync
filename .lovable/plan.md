## Diagnóstico: a maior parte das otimizações está ativa, mas a limpeza automática está quebrada

O que já está funcionando (verificado agora): flags `smart_logging`, `smart_commands`, `crons_consolidados` e `event_driven_brain` ligadas; Climate Brain em modo watchdog (10 min) + eventos; dispatcher 1 min + evento; crons individuais de ventilação/cortina/temperatura/qualidade do ar desativados; Brain responde 200 OK.

O que **não** está funcionando — três rotinas de manutenção falham em toda execução por referenciarem colunas que não existem:

| Rotina | Erro real registrado | Efeito |
|---|---|---|
| `purge_ambiencia_historico` (diária 03:15) | `column "created_at" does not exist` em `eventos_dispositivo_iot` | Aborta no meio: **nenhuma** retenção é aplicada desde 26/07 |
| `purge_pg_net_responses` (10 em 10 min) | `column "created" does not exist` em `net.http_request_queue` | Falha 144x/dia; fila HTTP nunca limpa |
| `marcar_dispositivos_offline_iot` (5 em 5 min) | `column "online" does not exist` em `dispositivos_iot` | Falha 288x/dia; **dispositivo offline nunca é detectado/alertado** |

Consequência medida agora: 67.194 leituras de sensores e 63.326 registros de decisão climática acima do prazo de retenção continuam no banco, e `cron.job_run_details` está com **465 MB** (444 MB só de tabela) — é hoje o maior objeto do banco de 709 MB.

## Plano

### 1. Consertar as três rotinas quebradas
- Reescrever `purge_ambiencia_historico` usando os nomes de coluna reais de cada tabela (conferir `eventos_dispositivo_iot` e demais antes de gerar o SQL) e envolver cada DELETE em bloco próprio com tratamento de erro, para que a falha em uma tabela não cancele a limpeza das outras.
- Corrigir `purge_pg_net_responses`: `net.http_request_queue` não tem coluna de data — limpar apenas `net._http_response` por `created` e, para a fila, usar o critério suportado pela versão do pg_net.
- Corrigir `marcar_dispositivos_offline_iot` para usar `ultimo_sync` (única coluna existente) como base do estado offline, gravando o evento de offline como hoje.

### 2. Recuperar o espaço já ocupado
- `TRUNCATE cron.job_run_details` (histórico de execuções, sem valor de negócio): libera ~465 MB de imediato.
- Aplicar a retenção pendente em `leituras_sensores`, `log_decisao_clima`, `comando_brain` e `eventos_dispositivo_iot` já na mesma migração.
- Acrescentar limpeza automática de `cron.job_run_details` (manter 2 dias) dentro da rotina diária, agora que ela vai rodar até o fim.
- Observação honesta: após os DELETEs o espaço fica reservado para reuso do próprio banco; o tamanho em disco só encolhe de fato com `VACUUM FULL`, que não pode rodar dentro de migração. O `TRUNCATE` do histórico de cron, que é o item dominante, devolve o espaço na hora.

### 3. Monitorar as rotinas de manutenção
- Registrar cada execução das purgas em `brain_metrics` (origem `purge`), com quantidade de linhas apagadas por tabela e erro quando houver — assim uma futura quebra aparece em vez de falhar em silêncio por semanas.

### 4. Reduzir mais execuções (ganho adicional após as correções)
- `auto-iluminacao` roda 1.440x/dia (1 em 1 min) mesmo sem lote alojado. Passar para 5 em 5 min e adicionar saída antecipada quando não há lote ativo com galpão. Programas de luz mudam por faixa de dia, não por minuto — não há perda de precisão relevante.
- `intelbras-snapshot-all-5min` e `sm-wt-health-monitor-5min`: saída antecipada quando não existe câmera/dispositivo ativo, evitando trabalho e escrita inútil.
- `marcar-disp-iot-offline`: 5 → 10 min (o próprio alerta de offline usa janela de 10 min).

Estimativa somada: de ~7 mil chamadas internas/dia para ~1,2 mil, com as tabelas de log finalmente estabilizando de tamanho.

### 5. Verificação
Após aplicar: conferir em `cron.job_run_details` que as três rotinas passam a terminar com sucesso, que as contagens acima do prazo de retenção vão a zero e reportar o novo tamanho do banco.

## Detalhes técnicos
Tudo em uma migração (funções `SECURITY DEFINER` já existentes, recriadas com `CREATE OR REPLACE`) mais ajustes de agendamento via `cron.alter_job`, e edição pontual das edge functions `auto-iluminacao`, `intelbras-snapshot-all` e `sm-wt-health-monitor` para a saída antecipada. Nenhuma mudança de comportamento visível na interface.

## Fora do escopo (só sinalizando)
`comando_brain` tem 17.599 registros com status `falhou`, sendo 8.528 "Canal não encontrado para função" e 7.283 "Sem confirmação de telemetria em 60s", todos anteriores a 03/07. É um problema de configuração de canais/ACK, não de custo de banco — posso investigar depois, se quiser.
