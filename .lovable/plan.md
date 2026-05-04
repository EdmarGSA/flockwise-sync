## Diagnóstico

Hoje, na página **Meus Lotes**, temos:

1. **`AlertasClimaticosBar`** (já renderizado no topo da lista, linha 579) — mostra alertas climáticos ativos por núcleo, com filtros de severidade e botão de "reconhecer". Atualiza em tempo real via canal Realtime na tabela `alertas_climaticos`. **Os alertas já aparecem aqui automaticamente quando a edge function `weather-alertas` os gera** (a partir do `weather_forecast_horario`). Se você não está vendo alertas, é porque ainda não há previsão ruim no horizonte de 72h dos núcleos OU o `weather-sync` ainda não rodou.
2. **`HistoricoClimaticoDialog`** (botão "Histórico Climático") — atualmente só mostra **passado** (tabela `weather_historico_3h`) e a lista de alertas históricos. **Não exibe a previsão.**

O que falta: a **previsão das próximas 24-72h** (chuva, temperatura, UR, ITH, vento) na visão do criador, e mais clareza sobre como os alertas surgem.

## O que vou fazer

### 1. Adicionar aba "Previsão" no `HistoricoClimaticoDialog`

Renomeio o título do diálogo para **"Clima por Núcleo"** e estruturo em 3 abas:

- **Previsão** (nova) — gráficos das próximas 72h vindo de `weather_forecast_horario`:
  - Linha de **temperatura** com bandas de conforto da `nucleo_conforto_termico` (zona crítica em vermelho).
  - **ITH** com referência 78.
  - Barras de **probabilidade de chuva (%)** + linha de precipitação (mm).
  - Linha de **vento (km/h)**.
  - Resumo no topo: temp mín/máx 24h, máx prob. chuva, máx ITH, alertas previstos no horizonte.
- **Histórico** — o conteúdo atual (séries 3h + comparação com período anterior).
- **Alertas** — a lista atual de eventos no período.

### 2. Cartão "Próximas 24h" direto na página `MeusLotes`

Acima da tabela (logo após o `AlertasClimaticosBar`), um **mini-cartão por núcleo ativo** com:

- Ícone da condição predominante + temp mín/máx das próximas 24h.
- Pico de chuva (%) e horário esperado.
- Pico de ITH e horário.
- Badge "Sem alertas previstos" (verde) ou "N alertas previstos" (laranja) baseado em `alertas_climaticos` com `horario_evento > now()`.
- Clique abre o diálogo já na aba **Previsão** daquele núcleo.

Componente novo: `src/components/lotes/PrevisaoNucleosBar.tsx` (colapsável, igual ao `AlertasClimaticosBar`, escondido se não houver lotes ativos).

### 3. Texto explicativo dos alertas

Na `AlertasClimaticosBar`, quando a lista estiver **vazia**, em vez de não renderizar nada, mostrar um cartão discreto:

> "Sem alertas climáticos ativos. Avaliamos a previsão dos próximos 3 dias a cada sincronização e geramos alertas para picos de calor (≥ crítico do núcleo), frio, ITH alto e vento forte (≥ 50 km/h)."

Assim o criador entende **de onde** os alertas vêm e por que pode não estar vendo nenhum.

### 4. Garantir que a sincronização rodou

Adicionar um pequeno indicador no cartão da `PrevisaoNucleosBar` mostrando "Atualizado há X min" (lendo `weather_sync_log`). Se nunca sincronizou ou está com erro, botão **"Sincronizar agora"** que dispara `weather-sync` para todos os núcleos do integrado (mesma chamada já usada em Gestão de Campo).

## Detalhes técnicos

- **Fonte da previsão**: `weather_forecast_horario` (já populada pelo `weather-sync` para 72h, com `temperatura_c, umidade_pct, prob_chuva_pct, precipitacao_mm, vento_kmh, ith, condicao_codigo`).
- **Alertas previstos**: query em `alertas_climaticos` com `horario_evento > now()` e `reconhecido_em IS NULL`, agrupados por `nucleo_id`.
- **Conforto térmico**: usar `nucleo_conforto_termico` para as bandas (mesmo padrão do `LoteClimaHistoricoTab`).
- **Performance**: batch fetch para todos os núcleos de uma vez (`.in('nucleo_id', ids)`) seguindo o padrão do projeto. Estabilizar dependências do `useEffect` com `JSON.stringify` dos arrays de IDs.
- **Realtime**: o diálogo continua sem realtime (refetch ao abrir/trocar filtro); a barra de previsão na MeusLotes refaz fetch a cada 5 min e quando `alertas_climaticos` muda (canal Realtime já existe).
- **Sem alterações de schema** — todas as tabelas necessárias já existem.

## Arquivos a alterar

- `src/components/lotes/HistoricoClimaticoDialog.tsx` — renomear, adicionar aba "Previsão" + queries de forecast e conforto, prop opcional `nucleoIdInicial` e `tabInicial`.
- `src/components/lotes/PrevisaoNucleosBar.tsx` — **novo** componente (mini-cartões por núcleo + botão sincronizar).
- `src/components/lotes/AlertasClimaticosBar.tsx` — exibir mensagem explicativa quando vazio.
- `src/pages/MeusLotes.tsx` — montar `PrevisaoNucleosBar` logo após `AlertasClimaticosBar`; abrir o diálogo na aba certa quando o usuário clicar num cartão.

Sem mudanças em edge functions ou banco.