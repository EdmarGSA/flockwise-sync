# Brain AI — Iluminação Adaptativa

Hoje a iluminação é controlada por `programa_iluminacao_lote` (faixas fixas por idade) + edge function `auto-iluminacao` (1 min). O Brain AI vai virar a **camada de decisão acima** desse programa: em vez de seguir cegamente a faixa cadastrada, ele recalcula diariamente as **horas de luz / escuridão ideais** olhando para o lote real, e injeta o resultado como override no programa vigente — passando ainda pelo fluxo já existente de `comando_brain` (Sombra/Auto).

## O que o Brain vai considerar

1. **Peso real x meta** (semanal): última pesagem média do lote vs curva da linhagem (`metas_peso` / `padroesLinhagem`).
   - Atrasado → mais luz (estimula consumo).
   - Adiantado / sobrepeso → mais escuridão (restringe).
2. **Estrutura do galpão**: `tipo_pressao` (positiva/negativa), `comprimento × largura`, isolamento aprendido (`aprendizado_galpao.fator_isolamento`). Galpão "vazado" → ramp-up/down mais longo e intensidade menor no nascer/pôr-do-sol natural que entra.
3. **Crepúsculo real do dia**: `weather_curva_solar` já guarda `crepusculo_civil_inicio/fim` e `nascer/pôr-do-sol` por núcleo. O Brain usa isso para:
   - Ancorar "apagar luz artificial" no fim do crepúsculo civil (evita gasto desnecessário).
   - Ancorar "acender" no início do crepúsculo da manhã quando precisa de fotofase >12h.
4. **Horas de escuridão mínima** por fase:
   - Corte: respeita escotofase mínima conforme idade (ex.: 4h após dia 7).
   - Postura cria/recria: garante curva descendente até 8h.
   - Postura produção: estímulo crescente até 16h, nunca menos que 8h escuro contínuo.
5. **Nuvens / dia escuro** (já vem do `weather_forecast_horario.condicao_codigo` e `uv_index`): se for dia muito nublado, antecipa acendimento em X min.

## Saída do Brain (o que ele faz)

Para cada galpão com lote ativo, 1×/dia (cron 03:30 local) + reavaliação event-driven quando entra pesagem nova:

1. Calcula `horas_luz_alvo` e janelas `acender_em` / `apagar_em` ajustadas ao crepúsculo do dia.
2. Compara com a faixa cadastrada no `programa_iluminacao_lote` vigente.
3. Se divergência ≥ 15 min ou ≥ 5% intensidade → cria registro em `override_iluminacao_brain` (nova tabela) válido para hoje, com `motivo` textual ("Peso 8% abaixo da meta — +30min luz") e gera `comando_brain` por canal de iluminação afetado.
4. `auto-iluminacao` (já roda 1×/min) passa a **consultar overrides do Brain antes da faixa fixa**, e segue o mesmo dispatch já existente (esp32-bridge / eWeLink) com `cooldown_seg` e fallback.
5. Em modo `sombra` aparece como sugestão no `SugestoesBrainCard` para o usuário aprovar; em `auto` é aplicado direto.

## Banco (migração)

- `override_iluminacao_brain` (galpao_id, lote_id, data_ref, horas_luz, blocos jsonb, intensidade_pct, motivo, score_confianca, criado_em, expira_em, status). Uma linha ativa por galpão+dia. RLS por `integrado_id` + superadmin.
- `aprendizado_iluminacao_lote` (galpao_id, lote_id, divergencia_peso_pct_acum, horas_luz_aplicadas_media, ganho_peso_observado, atualizado_em) — alimenta o ajuste fino EMA α=0.1, ±1h.
- Coluna `peso_medio_recente_kg` materializada em `lotes` (atualizada por trigger em `pesagem_itens`) para o Brain não precisar agregar a cada decisão.

## Edge functions

- **`brain-iluminacao`** (nova, cron 30min + invocada pelo trigger de pesagem): decide e grava overrides + comandos.
- **`auto-iluminacao`** (alteração mínima): antes de resolver a faixa do programa, consulta `override_iluminacao_brain` ativo do dia e sobrescreve `horas_luz`, `blocos` e `intensidade_pct`.
- **`weather-sync`**: sem mudança — já entrega o crepúsculo.

## UI

- Em `ClimateBrain.tsx` (aba já existente) e em `LoteIluminacaoCard.tsx`: badge "Brain ajustou hoje: +30min luz (peso atrasado)" com link para histórico.
- Em `BrainAutomacao.tsx`: incluir KPI "Iluminação ajustada" e função `iluminacao` na lista de comandos recentes.
- Em `EstimuloPosturaDialog.tsx` / `ProgramasIluminacao.tsx`: indicador "Brain pode sobrepor este programa" quando o galpão está em modo `auto`/`shadow`.

## Segurança

- Override do Brain limitado a **±90 min** vs faixa cadastrada e **±20 pp** de intensidade — clamp duro no edge.
- Bloqueio se sensor de luminosidade em drift (quando existir) ou se dispositivo offline >10 min (já tratado em `marcar_dispositivos_offline_iot`).
- Cooldown 90s entre comandos de iluminação por canal (já no `canais_dispositivo`).
- Fallback: se `brain-iluminacao` falhar ou não houver override, `auto-iluminacao` usa a faixa do programa como hoje.

## Ordem de implementação

1. Migração: `override_iluminacao_brain`, `aprendizado_iluminacao_lote`, coluna `lotes.peso_medio_recente_kg` + trigger.
2. Edge `brain-iluminacao` (decisão + clamp + grava override + comando_brain).
3. Patch em `auto-iluminacao` para honrar override.
4. Cron 30min + gatilho event-driven em `pesagens`.
5. UI: badge no card de iluminação, integração com `BrainAutomacao`.
6. Job de aprendizado diário (acopla ao `climate-learn` existente).

Quer que eu siga nessa ordem ou prefere que eu comece direto pelo edge + override sem o aprendizado adaptativo na primeira versão?
