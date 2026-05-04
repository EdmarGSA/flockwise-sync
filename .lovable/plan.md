
# Meteorologia, Curva Solar e Alertas Climáticos Inteligentes

Sistema avançado de previsão climática por GPS do núcleo, integrado com idade do lote, inércia térmica do galpão, programação solar de iluminação e histórico para correlação com performance.

## Arquitetura Geral

```text
GPS do núcleo (lat/lng)
        │
        ├──► Open-Meteo API (forecast 72h + atual, sem API key)
        │         │
        │         ├──► weather_observacoes (snapshot atual)
        │         └──► weather_forecast_horario (72h por hora)
        │
        ├──► Cálculo solar local (NOAA, sem API)
        │         └──► solar_diario (nascer, pôr, crepúsculos, dia 0..+7)
        │
        └──► Cron weather-sync (a cada 30 min)
                  │
                  ├──► weather-alertas (cruza com lotes, idade, conforto, inércia)
                  │         └──► alertas_climaticos + dispatch_notificacao
                  │
                  ├──► weather-aggregator (a cada 3h e diário)
                  │         ├──► weather_historico_3h
                  │         └──► weather_lote_diario (ITH, horas estresse)
                  │
                  └──► auto-iluminacao (já existe, ganha modo solar)
```

## 1. Schema de Banco de Dados

### Tabelas novas
- **weather_observacoes** — snapshot atual por núcleo (temp, UR, vento, UV, condição, atualizado_em). 1 linha viva por núcleo.
- **weather_forecast_horario** — `(nucleo_id, hora_prevista, temp_c, ur_pct, vento_kmh, prob_chuva, uv_index, condicao)`. Janela rolante 72h. Substituído a cada sync.
- **solar_diario** — `(nucleo_id, data, nascer_sol, por_sol, crepusculo_civil_inicio, crepusculo_civil_fim, fotoperiodo_min)`. Pré-calcula 7 dias.
- **conforto_termico_ave** — referência por `tipo_producao` + faixa etária: `temp_min_ok, temp_max_ok, temp_min_critico, temp_max_critico, ith_max_ok, ith_max_critico`. Seed com Cobb/Lohmann.
- **alertas_climaticos** — `(nucleo_id, lote_id, tipo, severidade, titulo, mensagem, horario_evento, horario_acao, contexto jsonb, reconhecido_em, reconhecido_por)`.
- **weather_historico_3h** — agregação a cada 3h: `(nucleo_id, ts_3h, temp_med, temp_min, temp_max, ur_med, ith_med, ith_max, vento_max)`. Retenção 2 anos.
- **weather_lote_diario** — agregação por lote/dia: `(lote_id, data, idade_dias, temp_min, temp_med, temp_max, ur_med, ith_med, ith_max, horas_calor, horas_frio, horas_ith_alto, dentro_conforto_pct)`. Vive até encerramento + 1 ano.

### Alterações
- **nucleos**: já tem `latitude`/`longitude`. Adicionar `weather_ativo boolean default true`, `timezone text default 'America/Sao_Paulo'`.
- **galpoes**: já tem `tipo_pressao`. Adicionar `inercia_termica_min int` (default por trigger: negativa=60, positiva=120; usuário pode ajustar).
- **programa_iluminacao_faixa**: novas colunas
  - `modo_horario text default 'fixo'` (`fixo` | `solar`)
  - `acender_offset_min int default 0` (offset em relação ao nascer do sol)
  - `apagar_offset_min int default 0` (offset em relação ao pôr)
  - Quando `modo_horario='solar'`, blocos são derivados em runtime do `solar_diario`.
- **lotes**: nada novo (idade já é derivável).

### RLS
Todas as novas tabelas com `integrado_id` ou JOIN via `nucleo_id`/`lote_id` para isolamento. Padrão: select via mesma org, write via service role (edge functions).

## 2. Edge Functions

### `weather-sync` (cron a cada 30 min)
1. Lista núcleos com `weather_ativo=true` e GPS preenchido.
2. Para cada núcleo:
   - Chama `https://api.open-meteo.com/v1/forecast` com `current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index,weather_code` e `hourly=` mesmas variáveis + `precipitation_probability` por 72h.
   - Upsert em `weather_observacoes`.
   - Replace `weather_forecast_horario` para o núcleo.
3. Calcula curva solar local (algoritmo NOAA, puro JS — sem API) para hoje + 7 dias e upsert em `solar_diario`.
4. Dispara `weather-alertas` ao final.

### `weather-alertas` (chamada por `weather-sync`)
Lógica por lote ativo:
1. Carrega previsão 24h, conforto da faixa etária (idade vs `conforto_termico_ave`), `tipo_pressao` e `inercia_termica_min` do galpão.
2. **ITH** = `T - (0.55 - 0.0055*UR) * (T - 14.5)`.
3. Detecta picos:
   - Onda de calor: temp prevista ≥ `temp_max_critico` por ≥2h.
   - Onda de frio: temp prevista ≤ `temp_min_critico` por ≥2h (peso extra para pintinhos <14d).
   - ITH alto: ≥ `ith_max_critico` por ≥1h.
   - Vento forte: vento ≥ 50 km/h.
4. Calcula `horario_acao = pico - inercia_termica_min`. Para pintinhos <14d adiciona +30 min de buffer.
5. Insere em `alertas_climaticos` (deduplicado por `nucleo_id+tipo+horario_evento` em janela de 6h) e chama `dispatch_notificacao` com mensagem: *"Pico de 32°C às 13:00 no Galpão 2. Inicie resfriamento às 11:30 (90 min antes)."*

### `weather-aggregator` (cron a cada 3h + diário 00:30)
- A cada 3h: insere linha em `weather_historico_3h` consolidando observações do bloco.
- Diário: para cada lote ativo, agrega últimas 24h em `weather_lote_diario` (médias, min/max, horas em estresse, % do dia em conforto).
- Limpa `weather_forecast_horario` com `hora_prevista < now() - 6h`.

### `auto-iluminacao` (existente — extensão)
- Quando `faixa.modo_horario='solar'`: substituir blocos calculando `acender = nascer_sol + acender_offset_min` e `apagar = por_sol + apagar_offset_min` daquele dia (lookup em `solar_diario`). Ramp-up/down e intensidade preservados.

### Cron
Inserir via SQL `cron.schedule` (não migration — usa anon key):
- `weather-sync` a cada 30 min
- `weather-aggregator` a cada 3h e diário

## 3. UI

### Card "Clima do Núcleo" (`GestaoCampo` e `LoteDashboardTab`)
- Condição atual + ícone, temp/UR/vento, UV badge.
- Mini-gráfico 24h: linha de temperatura prevista vs banda verde de conforto da idade atual do lote.
- Próximos 3 alertas pendentes (cards com botão "Reconhecer").

### Painel de Alertas Climáticos (novo, módulo `alertas-climaticos`)
- Lista por núcleo/lote, severidade, horário do evento e horário de ação recomendado.
- Botão "Reconhecer" grava `reconhecido_em/por`.
- Filtro por status (ativo/expirado/reconhecido).

### Editor de Programa de Iluminação (`ProgramasIluminacao`)
- Por faixa etária: toggle "Ancorar ao sol".
- Quando ativo: campos de offset em minutos (ex: acender 30 min antes do nascer = `-30`).
- Preview: linha do tempo do dia mostrando nascer/pôr e janelas calculadas.

### Relatório "Clima do Ciclo" (`LoteDashboardTab`, nova aba)
- Heatmap dia × hora colorido por ITH.
- Gráfico de barras: horas em estresse térmico por dia do ciclo.
- Linha sobreposta: peso médio nas pesagens e mortalidade diária para correlação visual.
- Cartões de insight: *"Lote sofreu 14h de ITH > 78 entre os dias 18-21. Conversão piorou 6% no período."*

### Configuração de Inércia (Galpão)
- Em `cadastro/GalpaoForm` (provável caminho), campo "Tempo de inércia térmica (min)" com tooltip explicando default por pressão.

## 4. Comunicação e Notificações

- Novos códigos em `tipos_evento_notificacao`:
  - `clima_calor_critico` — roles: criador, veterinario, admin
  - `clima_frio_critico` — roles: criador, veterinario, admin
  - `clima_ith_alto` — roles: criador, veterinario
  - `clima_vento_forte` — roles: criador, admin
- Severidade alta para crítico, média para atenção.
- Mensagem inclui horário de ação calculado pela inércia.

## 5. Detalhes Técnicos

- **Open-Meteo**: gratuito, sem API key, rate limit generoso. Endpoint `forecast` aceita `latitude,longitude,timezone=auto`.
- **Cálculo solar**: algoritmo NOAA Solar Position (Julian date + equation of time). Implementação em ~80 linhas de TS. Sem dependências externas.
- **Granularidade histórico**: 3h conforme decisão (~2920 linhas/núcleo/ano). Suficiente para detectar ondas de calor e correlação com performance.
- **Volume estimado**: 100 núcleos = ~292k linhas/ano em `weather_historico_3h`. Tranquilo no Postgres com índice em `(nucleo_id, ts_3h)`.
- **Dedupe de alertas**: índice único parcial em `alertas_climaticos(nucleo_id, tipo, date_trunc('hour', horario_evento))` filtrando 6h.
- **Backwards-compatible**: faixas existentes ficam com `modo_horario='fixo'`. Nada quebra.

## 6. Ordem de Entrega

1. Migration: tabelas + colunas + RLS + seed `conforto_termico_ave`.
2. Edge function `weather-sync` + cron 30 min.
3. Edge function `weather-alertas` + tipos de notificação.
4. Card "Clima do Núcleo" em `GestaoCampo`.
5. Painel de Alertas Climáticos.
6. Edge function `weather-aggregator` + crons.
7. Aba "Clima do Ciclo" em `LoteDashboardTab` com heatmap.
8. Extensão `auto-iluminacao` modo solar + UI no editor de programas.
9. Campo de inércia térmica em galpão.

## Arquivos previstos
- `supabase/functions/weather-sync/index.ts`
- `supabase/functions/weather-alertas/index.ts`
- `supabase/functions/weather-aggregator/index.ts`
- `supabase/functions/auto-iluminacao/index.ts` (editar)
- `src/components/campo/ClimaNucleoCard.tsx`
- `src/components/campo/AlertasClimaticosPanel.tsx`
- `src/components/campo/ClimaCicloHeatmap.tsx`
- `src/components/iot/FaixaIluminacaoSolarFields.tsx`
- `src/hooks/useClimaNucleo.ts`, `useAlertasClimaticos.ts`, `useClimaLoteHistorico.ts`
- `src/lib/utils/calcularITH.ts`, `calcularSolar.ts` (NOAA)
- Migration única com tabelas, colunas, RLS, seed conforto, índices.
