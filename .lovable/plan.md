
## 1. Como o sistema gerencia a ambiência (visão geral)

```
                    ┌─────────────────────────────────────────┐
                    │  SENSORES (Sonoff TH / ESP32 / NH3 etc) │
                    └─────────────────┬───────────────────────┘
                                      │ telemetria 1-5 min
                  ┌───────────────────▼───────────────────┐
                  │  sync-sensors  /  esp32-bridge        │
                  │  → grava em leituras_sensores         │
                  └───────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────▼────────────────────────────┐
        │  CLIMATE-BRAIN  (cron 1/min)  — coordenador integrado    │
        │  Lê: curva_climatica_ponto + aprendizado_galpao +        │
        │      config_histerese + leituras_sensores + idade lote   │
        │  Decide MODO DOMINANTE por galpão:                       │
        │     AQUECIMENTO · CONFORTO · ALERTA_CALOR · EMERGENCIA   │
        │  Loga em log_decisao_clima                               │
        └────────┬───────────┬──────────┬──────────┬───────────────┘
                 │           │          │          │
       ┌─────────▼──┐ ┌──────▼─────┐ ┌──▼───────┐ ┌▼──────────────┐
       │auto-       │ │auto-       │ │auto-     │ │auto-          │
       │ventilacao  │ │cortina     │ │nebuliz.  │ │temperatura    │
       │(estágio +  │ │(% abertura)│ │(UR/ciclo)│ │(aquecedores + │
       │ duty bro.) │ │            │ │          │ │ proteção off) │
       └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └──────┬────────┘
             └──────────────┴─────────────┴──────────────┘
                                 │
                ┌────────────────▼────────────────┐
                │  DRIVERS DE COMANDO             │
                │  • sync-sensors  → eWeLink Cloud → Sonoff  │
                │  • esp32-bridge  → fila HTTP    → ESP32    │
                └────────────────┬────────────────┘
                                 │
                ┌────────────────▼────────────────┐
                │  CANAIS / DISPOSITIVOS no galpão│
                │  Fallback offline: safety_rules │
                │  gravadas em timers_seguranca   │
                └─────────────────────────────────┘
```

Camadas:
- **Coleta**: `leituras_sensores` (T, UR, NH3, CO2, lux, vento, pressão).
- **Coordenação**: `climate-brain` resolve um modo por galpão e chama os executores. `climate-learn` ajusta offsets aprendidos a cada hora (±2 °C).
- **Execução**: cada `auto-*` aplica a regra do seu domínio respeitando histerese/cooldown.
- **Comando físico**: `sync-sensors` (eWeLink) ou `esp32-bridge` (HTTP local).
- **Proteção offline**: `timers_seguranca_iot` com `modo` (temperatura/horário/híbrido) gravados no firmware via `safety_rules`.

## 2. Por que o Brain não está coletando dados do "Marcia Tibiri GP 01"

Diagnóstico executado agora no banco e nas edges:

| Verificação | Resultado |
|---|---|
| Lote ativo no galpão | OK — `d8262634...` alojado em 25/04/2026 |
| Sensores enviando | OK — 1.152 leituras nas últimas 24 h |
| `auto-temperatura` rodando | OK — 471 decisões no dia |
| Cron `climate-brain-1min` | Disparando 1×/min, status `succeeded` |
| Logs da função `climate-brain` | **Vazios** |
| Linhas em `log_decisao_clima` com `funcao_automacao='climate_brain'` | **0 (nunca rodou)** |
| Chamada direta `POST /functions/v1/climate-brain` | **404 NOT_FOUND** |

**Causa raiz #1 — Função não está implantada.**
O código existe em `supabase/functions/climate-brain/index.ts` mas nunca foi deployada. O cron chama a URL e recebe 404 (o `pg_net` engole silenciosamente). Provavelmente as outras funções de coordenação (`auto-ventilacao`, `auto-cortina`, `auto-nebulizacao`, `climate-learn`) também estão sem deploy.

**Causa raiz #2 — Bugs de coluna no `climate-brain`.**
Mesmo após deploy, a função NÃO entregaria dados, porque consulta `leituras_sensores` com colunas inexistentes:

```ts
.from("leituras_sensores")
  .eq("integrado_id", lote.integrado_id)   // ❌ coluna não existe
  .gte("criado_em", since)                 // ❌ correto é lido_em
```

A tabela só tem: `dispositivo_id, temperatura_c, umidade_pct, lido_em, ...`. Filtro deve ser por `dispositivo_id ∈ dispositivos do galpão` e `lido_em` (não `integrado_id`/`criado_em`). Hoje a query falharia/retornaria vazio → "skip: sem_leituras" para todos os galpões.

**Causa raiz #3 — Curva sem filtro por organização.**
`curva_climatica_ponto` é buscada só por `dia_idade`, sem `integrado_id`/`curva_id`. Em multi-tenant pega o ponto de qualquer org.

## 3. Como o Brain conecta nos dispositivos

O Brain **não fala direto com o hardware**. Ele:
1. Resolve o modo dominante e grava em `log_decisao_clima`.
2. Para nebulização, monta o array `decisoes` (galpão, ação, T, UR, vent%) e chama `auto-nebulizacao` via `fetch` interno com `SUPABASE_SERVICE_ROLE_KEY`.
3. Dispara `auto-ventilacao` e `auto-cortina` (sem payload — eles releem o estado).

Cada `auto-*`:
- Lê `dispositivos_iot` filtrando por `funcao_automacao` e `galpao_id`.
- Por canal/dispositivo, chama:
  - **eWeLink** (Marcia GP 01 — todos os 4 dispositivos `driver=ewelink`):
    `supabase.functions.invoke('sync-sensors', { action: 'control-device', device_id, switch })` → API eWeLink Cloud → Sonoff.
  - **ESP32 local**:
    `supabase.functions.invoke('esp32-bridge/command', { canalId, acao })` → fila lida pelo firmware via long-polling.

Em queda de internet, o firmware aplica as `safety_rules` que já foram sincronizadas (modo temperatura > horário, conforme programado).

## 4. Plano de correção (a executar quando aprovado)

1. **Deploy das funções de coordenação** que estão presentes em `supabase/functions/` mas ausentes no runtime: `climate-brain`, `climate-learn`, `auto-ventilacao`, `auto-cortina`, `auto-nebulizacao` (e validar `auto-qualidade-ar`).
2. **Corrigir queries do `climate-brain`**:
   - Buscar `dispositivos_iot.id` do galpão e usar `.in("dispositivo_id", ids)` em `leituras_sensores`.
   - Trocar `criado_em` por `lido_em` no `.gte()` e no `order`.
   - Filtrar `curva_climatica_ponto` por `integrado_id` (e por `curva_id` ativa do galpão, se existir).
3. **Hardening**:
   - Try/catch por galpão para não derrubar o loop inteiro.
   - Logar `skip` em `log_decisao_clima` (com `estado_decidido='skip'`) para dar visibilidade no dashboard quando faltam leituras/curva.
   - Marcar `dispositivos_iot.ultimo_sync` quando o Brain processar.
4. **Painel de saúde**: no `/configuracoes/climate-brain`, mostrar por galpão "última execução do Brain", "modo atual" e motivo do último skip — para que o usuário enxergue rapidamente quando algo trava.
5. **Validação**: após o fix, chamar `POST /climate-brain` manualmente, conferir log do GP 01, e validar que `auto-nebulizacao` recebe a decisão.

### Fora de escopo desta correção
- Não mexer em curvas, programas ou regras de proteção offline (já entregues).
- Não alterar `auto-temperatura` (que está OK e gerando 471 logs/dia).

Posso seguir com este plano?
