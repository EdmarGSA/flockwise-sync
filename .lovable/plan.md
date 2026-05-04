## Diagnóstico

O card mostra `NaN°` em Temperatura e `NaN%` em UR porque está lendo campos errados:

- Código: `observacao.temp_c` e `observacao.ur_pct`
- Banco (`weather_observacoes`): `temperatura_c` e `umidade_pct`

O mesmo erro está no cálculo de min/max das próximas 12h (`f.temp_c` em vez de `f.temperatura_c`), causando o `99° → -99°` que aparece quando os valores não são lidos.

A condição do tempo (sol/chuva/nublado) já é gravada em `condicao_codigo` (padrão WMO do Open-Meteo), mas o card nunca exibe essa informação.

## Correções

**`src/components/campo/ClimaNucleoCard.tsx`**

1. **Renomear leituras dos campos** para os nomes reais do banco:
   - `observacao.temp_c` → `observacao.temperatura_c`
   - `observacao.ur_pct` → `observacao.umidade_pct`
   - `f.temp_c` → `f.temperatura_c` no reduce de min/max

2. **Adicionar bloco de condição atual** (chuva/sol/nublado) no topo do card, ao lado do nome do núcleo:
   - Mapear `condicao_codigo` (WMO) para ícone + texto: 0 = Céu limpo, 1-2 = Parcialmente nublado, 3 = Nublado, 45-48 = Neblina, 51-57 = Garoa, 61-67 = Chuva, 71-77 = Neve, 80-82 = Pancadas de chuva, 95+ = Tempestade.

3. **Adicionar probabilidade de chuva nas próximas horas**: usar `forecast[0..12].prob_chuva_pct` (já existe na tabela `weather_forecast_horario`) — exibir o valor máximo das próximas 12h junto da faixa de temperatura.

## Resultado esperado

```text
☁ Clima Marcia Fernandes Alvare        22:58 ↻
   Nublado · 23°C
   23°  93%   10    0
   Temp  UR  km/h  UV
   ─────────────────────
   Nascer: 05:44   Pôr: 17:22
   Próximas 12h: 19° → 24° · 30% chuva
   ─────────────────────
   ✓ Sync: 03/05, 22:58 (manual)
```

Sem alteração de schema ou edge function — apenas correção de nomes de campos no componente React.