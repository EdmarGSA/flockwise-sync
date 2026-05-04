# Monitoramento Climático Veterinário

Adicionar uma nova aba "Clima" no módulo Veterinário (`/veterinario`) com cards por núcleo. Cada card mostra clima externo (observação + previsão + alertas) **e** a temperatura real medida pelos sensores IoT de cada galpão do núcleo, comparada à zona de conforto da idade do lote. Inclui um plano de prevenção automatizado.

## 1. Nova aba "Clima" em `Veterinario.tsx`

- Adicionar `TabsTrigger value="clima"` (ícone `CloudSun`) ao lado de "Visão Geral" e "Lotes".
- Conteúdo: novo componente `<MonitoramentoClimaticoVet />`.

## 2. Componente `MonitoramentoClimaticoVet`

Novo arquivo `src/components/veterinario/MonitoramentoClimaticoVet.tsx`. Para o `integradoId` atual:

1. Carrega núcleos ativos com lotes alojados (`lotes` join `nucleos`/`galpoes`).
2. Para cada núcleo, em paralelo:
   - `useClimaNucleo` (já existe): observação atual, previsão 24h, alertas abertos, solar.
   - `nucleo_alertas_config` (override) + `conforto_termico_ave` por idade do lote.
   - Para cada galpão do núcleo: última leitura de `leituras_sensores` (temperatura/umidade) batch via `.in('dispositivo_id', ...)`.
3. Renderiza um grid de **`NucleoClimaCardVet`** (1 col mobile, 2 col desktop).

## 3. `NucleoClimaCardVet` (card avançado)

Estrutura visual:

```text
+------------------------------------------------------------+
| Núcleo A1                       [Severidade global: ALTO]  |
| Externo: 31°C / 68% UR / ITH 79  ☀ Ensolarado              |
| Próx. 24h: 23–34°C  •  chuva 40%  •  vento 22 km/h         |
|------------------------------------------------------------|
| Galpões (real-time IoT):                                   |
|  • Galpão 1 — 28.4°C / 62% UR ✅ dentro do conforto        |
|  • Galpão 2 — 33.1°C / 70% UR ⚠ acima da meta (idade 25d)  |
|  • Galpão 3 — sem leitura há 1h ⛔                          |
|------------------------------------------------------------|
| Alertas previstos:                                         |
|  ▣ Pico calor 35°C às 14h — agir 12h30 (inércia 90 min)    |
|  ▣ ITH 82 às 15h — aumentar ventilação                     |
|------------------------------------------------------------|
| Plano de prevenção (gerado):                               |
|  1. T-3h: ligar nebulizadores em ciclo 30s on/2min off     |
|  2. T-2h: 100% ventilação, fechar cortinas a sotavento     |
|  3. T-1h: reduzir oferta de ração, água gelada disponível  |
|  4. Pico: monitorar ofegação; se >70% lote, soltar todas   |
|     cortinas e acionar resgate (vet de plantão)            |
| [Reconhecer alertas]   [Abrir lote]   [Sincronizar clima]  |
+------------------------------------------------------------+
```

### Severidade global do núcleo
Calculada a partir de:
- ITH externo previsto vs `ith_max_critico` do conforto/override.
- Maior `delta = (temp_real_galpão − temp_max_conforto)` entre galpões.
- Presença de alerta crítico aberto (`alertas_climaticos.severidade='critical'`).
- Sensores offline (>15 min sem leitura).

Mapeamento: `OK` (verde), `ATENÇÃO` (âmbar) se delta ≥ 1°C ou ITH≥conforto.ith_max_ok, `ALTO` (vermelho) se delta ≥ 3°C, alerta crítico aberto ou >50% galpões fora do conforto.

### Galpões — temperatura real
- Para cada galpão buscar todos `dispositivos_iot` (sensor temperatura) ativos e usar a **última** leitura (`leituras_sensores`).
- Comparar com faixa de conforto pela idade do lote ativo do galpão.
- Mostrar status: ✅ dentro, ⚠ alerta (entre `ok` e `crítico`), 🔴 crítico, ⛔ offline (>15 min).
- Tooltip: hora da última leitura, idade do lote, faixa esperada.

## 4. Plano de prevenção (regras determinísticas)

Função pura `gerarPlanoPrevencao(contexto)` em `src/lib/clima/planoPrevencao.ts`. Entradas: idade do lote, conforto por idade, observação, previsão 24h, leituras IoT, recursos do galpão (já existem em `galpoes`: `ventilador_quantidade`, `bebedouro_tipo`, `tipo_pressao`, `inercia_termica_min`).

Regras (ordenadas por gatilho):

| Gatilho | Janela | Ação sugerida |
|---|---|---|
| Pico calor previsto ≥ conforto.temp_max_critico | T - inércia | Pré-resfriar (nebulização + 100% exaustão) |
| ITH previsto ≥ 78 | T - 2h | Aumentar ventilação progressiva |
| ITH previsto ≥ 82 | T - 1h | Liberar água gelada, reduzir manejo |
| UR > 80% e calor | contínuo | Priorizar ventilação sobre nebulização |
| Vento previsto ≥ 50 km/h | T - 3h | Verificar cortinas, fixar estruturas |
| Chuva ≥ 70% e idade<14d | T - 2h | Aumentar aquecimento, fechar cortinas |
| Frio ≤ conforto.temp_min_critico | T - inércia | Aquecedores ON, reduzir ventilação mínima |
| Sensor offline >15 min | imediato | Inspeção física do galpão X |
| Galpão atual já fora do conforto | imediato | Ação corretiva por delta (calor/frio) |
| Lote em última semana + ITH alto | + 6h | Antecipar abate para período frio se possível |

Plano renderizado como timeline com hora absoluta calculada a partir de `horario_evento - inércia`.

## 5. Reconhecimento e ações

- Botão **Reconhecer alertas** chama `update alertas_climaticos set reconhecido_em=now(), reconhecido_por=auth.uid() where nucleo_id=...`.
- Botão **Sincronizar clima** invoca edge `weather-sync` com `{ nucleo_id }` (já existe).
- Botão **Abrir lote** navega para `/veterinario/{loteId}` do lote mais crítico.

## 6. Realtime

Subscrever canal Supabase `postgres_changes` em `leituras_sensores` filtrado por `integrado_id` para refletir temperatura dos galpões em tempo real (debounce 5s para evitar re-renders excessivos). Polling de fallback a cada 60s em `useClimaNucleo`.

## 7. Detalhes técnicos

- Reutilizar `useClimaNucleo` e helper `condicaoWMO` já existentes.
- Batch fetch de leituras por `dispositivo_id IN (...)` para evitar N+1.
- Sem migrações de schema — todas as tabelas necessárias já existem (`weather_observacoes`, `weather_forecast_horario`, `alertas_climaticos`, `nucleo_alertas_config`, `conforto_termico_ave`, `dispositivos_iot`, `leituras_sensores`, `solar_diario`).
- Arquivos novos:
  - `src/components/veterinario/MonitoramentoClimaticoVet.tsx`
  - `src/components/veterinario/NucleoClimaCardVet.tsx`
  - `src/lib/clima/planoPrevencao.ts`
- Arquivos editados:
  - `src/pages/Veterinario.tsx` (nova aba).

## 8. Fora do escopo

- Push notifications adicionais (já são geradas pelo `weather-alertas`).
- Acionamento automático de equipamentos (apenas sugere ações; controle real fica nos módulos IoT existentes).
