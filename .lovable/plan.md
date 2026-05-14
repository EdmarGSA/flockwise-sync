# Tela de Temperatura do Lote — Módulo Veterinário

Nova tela em tela cheia em `/veterinario/:loteId/temperatura` para o veterinário acompanhar a ambiência térmica do lote, com histórico por sensor, mín/máx do dia e sugestão automática baseada na curva climática.

## Onde encaixa

- Em `VeterinarioLote.tsx`, adicionar um botão **"Temperatura"** (ícone `Thermometer`, vermelho) no grid 2x2 de ações.
- Rota nova `/veterinario/:loteId/temperatura` dentro do `ProtectedRoute` em `App.tsx`.
- Tela cheia (não dialog) por causa dos gráficos e múltiplos sensores.

## Estrutura da tela `VeterinarioTemperatura.tsx`

4 blocos verticais, do mais resumido ao mais detalhado:

### 1. Cabeçalho de status
- Temperatura média atual do galpão (média da última leitura `online=true` de cada sensor, janela 10 min).
- Setpoint da curva para a idade do lote (cruzando `lotes.curva_climatica_id` + `idade_dias` em `curva_climatica_ponto`). Se lote sem curva, fallback para curva default da linhagem.
- Faixa de alarme (mín/máx) da curva.
- Badge de status: **OK** (dentro da faixa), **Atenção** (>±1 °C do alvo), **Crítico** (fora dos limites de alarme).

### 2. Mín/Máx do dia
2 queries agregadas em `leituras_sensores` (`MIN`, `MAX`, `AVG`, `COUNT` filtrando `dispositivo_id IN (...)` e `lido_em >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')`).
Mostra Mín / Máx / Média / Amplitude. Amplitude > 4 °C → alerta amarelo "oscilação alta".

### 3. Sugestão automática (cartão destacado)
Texto determinístico (sem IA), seguindo o padrão `mortality-registration-analysis-briefing`:

| Situação | Sugestão |
|---|---|
| Média ≥ `temp_max_alarme_c` | "Acionar nebulização, abrir cortinas e aumentar ventilação." |
| Média ≤ `temp_min_alarme_c` | "Verificar aquecimento, fechar cortinas e revisar isolamento." |
| Média entre alvo±1 e alarme | "Próximo ao limite — monitorar nas próximas 2h." |
| Amplitude > 4 °C | "Oscilação alta no dia: possível falha de automação." |
| Sensor offline > 30 min | "Sensor X sem comunicação — verificar energia/Wi-Fi." |
| Tudo OK | "Ambiência dentro da curva. Nenhuma ação requerida." |

### 4. Histórico por dispositivo
Lista de cards `Collapsible` — um por sensor do galpão (`dispositivos_iot.galpao_id = lote.galpao_id` e `ativo=true`).

Cada card:
- Nome + badge online/offline (`ultimo_sync < 10 min`)
- Última leitura (temp + UR)
- Mín/Máx do dia do sensor isolado
- Sparkline 24h (reaproveitar `SensorSparkline` de `MonitoramentoClimaticoVet.tsx`)
- Ao expandir: `LineChart` Recharts com seletor **24h / 7d / 14d**, eixos temp + UR sobrepostos, linhas tracejadas da faixa de alarme.

## Detalhes técnicos

- **Hook único** `useTemperaturaLote(loteId)` retorna `{ sensores, leiturasPorSensor, minMaxDia, setpointCurva, statusGeral, sugestao }`. Centraliza queries para evitar N+1 (batch via `.in()`).
- **Realtime**: canal `leituras_sensores` filtrado por `dispositivo_id IN (...)` com buffer de 5s para evitar re-render excessivo.
- **Multi-tenant**: queries via `useIntegradoId`. RLS de `leituras_sensores` já filtra por org via `dispositivos_iot.integrado_id`.
- **Curva fallback**: se `lotes.curva_climatica_id IS NULL`, usar curva default da linhagem (mesma lógica do edge `auto-temperatura`).
- **Empty state**: se galpão sem dispositivos, exibir CTA "Cadastrar dispositivos" → `/dispositivos-iot`.

## Arquivos

**Novos**
- `src/pages/VeterinarioTemperatura.tsx` — tela principal
- `src/hooks/useTemperaturaLote.ts` — hook de dados
- `src/lib/clima/sugestaoTemperatura.ts` — regras determinísticas

**Editar**
- `src/pages/VeterinarioLote.tsx` — adicionar botão "Temperatura" no grid 2x2
- `src/App.tsx` — registrar rota `/veterinario/:loteId/temperatura`

## Fora do escopo
- Sem nova tabela (`leituras_sensores` já tem tudo).
- Sem IA — sugestão determinística.
- Sem duplicar `MonitoramentoClimaticoVet` (foco em lote único).
- Sem controle de atuadores (continua em `/configuracoes/ambiencia`).
