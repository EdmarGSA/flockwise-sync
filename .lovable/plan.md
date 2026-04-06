

## Histórico Completo de Temperatura e Umidade com Análise de Divergências

### O que será feito

Evoluir o componente `HistoricoTemperaturaLote` para incluir:

1. **Umidade no histórico** — hoje só mostra temperatura; adicionar min/max de umidade por dia
2. **Painel de divergências** — card resumo com KPIs: dias fora da faixa, maior desvio, período mais crítico, tempo total em alerta
3. **Gráfico de umidade** — segundo gráfico (ou eixo duplo) mostrando umidade ao longo dos dias
4. **Análise inteligente com sugestões** — bloco de insights automáticos baseados nos dados:
   - "Temperatura noturna consistentemente abaixo da faixa nos dias 3-7 — verificar aquecimento"
   - "Pico de calor no dia 15 às 14h — avaliar ventilação"
   - "Umidade acima de 75% nos últimos 3 dias — risco de cama úmida"
5. **Tabela expandida** — adicionar colunas de umidade min/max e desvio (diferença entre lido e ideal)

### Alterações

**`src/components/lotes/HistoricoTemperaturaLote.tsx`** — Refatorar significativamente:

- Buscar `umidade_pct` junto com `temperatura_c` nas leituras
- Expandir `DiaTemperatura` com campos: `umidadeMin`, `umidadeMax`, `desvioTemp` (max desvio da faixa em °C), `umidadeDentroFaixa`
- Adicionar card de KPIs de divergência no topo (dias fora, maior desvio, streaks)
- Adicionar gráfico de umidade (AreaChart) abaixo do de temperatura
- Criar função `gerarInsights()` que analisa padrões:
  - Detecta tendências (temperatura caindo/subindo ao longo de dias consecutivos)
  - Identifica horários críticos recorrentes (manhã vs tarde vs noite)
  - Correlação temperatura × umidade (alta umidade + alta temp = estresse térmico)
  - Gera recomendações acionáveis em português
- Renderizar insights como cards com ícones e severidade (info/atenção/crítico)
- Expandir tabela com umidade e coluna de desvio

### Detalhes técnicos

- Dados já disponíveis: `leituras_sensores` contém `temperatura_c` e `umidade_pct`
- Regras de umidade: usar faixa padrão 50-70% (não há tabela de regras de umidade hoje)
- Insights gerados localmente no frontend via análise dos dados agregados (sem IA externa)
- Sem alterações no banco de dados — tudo baseado em dados existentes

