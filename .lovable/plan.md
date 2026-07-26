## Avaliação das 10 sugestões (com o que foi verificado no banco)

| # | Sugestão | Veredito | Observação técnica |
|---|---|---|---|
| 1 | Evitar `VACUUM FULL` | **Aceito** | Correto. Vou usar `TRUNCATE` (que já devolve o espaço, sem bloqueio longo) em `net._http_response`/`net.http_request_queue`, `DELETE`+`VACUUM ANALYZE` em `cron.job_run_details`. `VACUUM FULL` fica opcional, fora do plano. |
| 2 | Não gravar as respostas HTTP | **Aceito parcialmente** | Verificado: `pg_net.ttl = 6 hours`. Reduzir isso exige `ALTER SYSTEM`/`ALTER DATABASE`, que o Cloud não permite. Solução viável: expurgo a cada 10 min (`net._http_response` com >5 min) — efeito equivalente a TTL curto. |
| 3 | Brain event-driven | **Aceito, em duas etapas** | Maior ganho, mas maior risco. Etapa A: watchdog a cada 10 min + gatilho na chegada de leitura. Etapa B: gatilhos manuais/UI. |
| 4 | Heartbeat inteligente | **Aceito integralmente** | Exatamente a regra que vou implementar (mudou → grava; senão heartbeat 15 min). |
| 5 | `comando_brain`: não gravar se estado igual | **Aceito** | Confirmado: 29.857 updates para 17.599 linhas; índice `idx_comando_brain_status` com **1,3 milhão de scans** (dispatcher roda a cada 15 s). |
| 6 | Consolidar em um orquestrador | **Aceito** | 21 crons hoje. Vira: 1 orquestrador (Brain) + iluminação (fotoperíodo precisa de precisão) + dispatcher + jobs diários. |
| 7 | Tabela `brain_metrics` | **Aceito, com ressalva** | Ótimo para medir, mas não pode virar o novo `log_decisao_clima`. 1 linha por execução do Brain, retenção de 7 dias. |
| 8 | Particionamento por mês | **Adiado (não recomendado agora)** | Com 101 mil e 82 mil linhas, `DELETE` é barato; a complexidade não se paga. Reavaliar acima de ~5 milhões de linhas/tabela. Registro isso como decisão. |
| 9 | Revisar índices | **Aceito — já achei um** | `idx_log_decisao_lote_data`: **0 scans, 5,9 MB**, penalizando toda inserção. Será removido. Os demais estão em uso. |
| 10 | Feature flags | **Aceito** | Via tabela de configuração lida pelas funções, não variável de build — permite reverter sem novo deploy. |

## Plano revisado

### Etapa 0 — Medição (antes de otimizar)
- Criar `brain_metrics` (execução, duração, sensores lidos, comandos enviados, comandos ignorados, decisões alteradas, erro) com retenção de 7 dias.
- Criar `feature_flags_sistema` com `smart_logging`, `smart_commands`, `event_driven_brain`, `crons_consolidados` — todas iniciando **desligadas**.
- Registrar a linha de base atual (1.440 decisões/dia, ~30 mil chamadas HTTP/dia, 1,9 GB).

### Etapa 1 — Recuperação de espaço (sem bloqueio)
- `TRUNCATE net._http_response`, `TRUNCATE net.http_request_queue`.
- `DELETE` em `cron.job_run_details` mantendo 2 dias + `VACUUM ANALYZE`.
- `DROP INDEX idx_log_decisao_lote_data` (0 scans, 5,9 MB).
- Sem `VACUUM FULL`.

### Etapa 2 — Retenção contínua
- Nova cron a cada 10 min: expurga `net._http_response`/`http_request_queue` com mais de 5 min (substitui o TTL de 6 h que não podemos alterar).
- Estender `purge_ambiencia_historico`: `cron.job_run_details` 2 dias, `log_decisao_clima` 14 dias, `comando_brain` 30 dias, `leituras_sensores` 30 dias, `brain_metrics` 7 dias.
- Autovacuum agressivo (`scale_factor 0.02`) em `comando_brain`, `log_decisao_clima`, `leituras_sensores`.

### Etapa 3 — Smart logging e smart commands (flags `smart_logging`, `smart_commands`)
- `climate-brain`: comparar a decisão com a última do galpão; grava só se mudou ou se passaram 15 min desde o último registro.
- `climate-brain`/`brain-dispatcher`: antes de criar/atualizar comando, comparar com `ultimo_estado_persistido` do canal; se igual, retorna sem escrever e contabiliza em `brain_metrics.comandos_ignorados`.
- Dispatcher: a cada 15 s só quando houver comando pendente — usar contagem barata antes do processamento.

### Etapa 4 — Consolidação dos crons (flag `crons_consolidados`)
- Alvo: Brain a cada 2 min chamando internamente ventilação, cortina, nebulização, aquecimento e qualidade do ar; `auto-iluminacao` mantém 1 min; dispatcher 15 s; jobs diários (clima, solar, estímulo de postura, expurgo) inalterados.
- As crons individuais são desativadas, não apagadas — reativáveis se a flag voltar atrás.

### Etapa 5 — Brain event-driven (flag `event_driven_brain`)
- Gatilho em `leituras_sensores`: ao entrar leitura com variação relevante (≥0,5 °C ou ≥5 pp de UR frente à anterior), enfileira reavaliação em `brain_fila_reavaliacao` (tabela que já existe).
- Alteração manual pela UI também enfileira.
- Cron do Brain passa de 2 min para **10 min (watchdog)**; a fila responde ao resto.
- Só ligar essa flag após 48 h de métricas estáveis da Etapa 4.

## Detalhes técnicos
- Etapas 0–2 e 4 são migrações SQL; 3 e 5 alteram `supabase/functions/climate-brain/index.ts` e `brain-dispatcher/index.ts`.
- Flags lidas no início de cada execução da função (uma consulta leve, com cache em memória por execução).
- Particionamento e `VACUUM FULL` ficam documentados como manutenção futura, sem execução agora.

## Ganho esperado (revisado)
| Item | Efeito |
|---|---|
| Limpeza pg_net + cron | ~1,6 GB liberados |
| Índice não usado removido | menos escrita em toda inserção de decisão |
| Smart logging | 1.440 → ~100 linhas/dia (−93%) |
| Smart commands | −40 a 70% de UPDATEs e WAL |
| Consolidação de crons | ~30 mil → ~7 mil chamadas/dia |
| Event-driven (Etapa 5) | ~7 mil → ~1,5 mil chamadas/dia |

Banco final estimado: **200–300 MB**, com crescimento diário 80–90% menor e estável conforme novos galpões entrarem.
