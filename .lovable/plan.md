

## Plano: Automação Local Resiliente via Timers no Dispositivo Sonoff

### Problema Atual

A automação de temperatura opera 100% na nuvem: o `pg_cron` dispara a Edge Function `auto-temperatura` a cada 5 minutos, que lê sensores do banco, avalia regras e envia comandos via API eWeLink Cloud. Se a granja perder internet, nenhum comando é enviado e os equipamentos ficam no último estado indefinidamente.

### Solução Proposta

Usar os **timers embarcados nos dispositivos Sonoff** como camada de proteção. Os dispositivos Sonoff armazenam timers no firmware — eles executam localmente mesmo sem internet. O sistema vai:

1. **Calcular e programar timers de segurança** nos dispositivos baseados nas regras de temperatura atuais
2. **Atualizar os timers automaticamente** quando as regras mudarem ou o lote avançar de idade
3. **Manter a automação cloud como primária** — os timers locais servem como fallback de emergência

```text
Arquitetura Atual vs Proposta:

ATUAL (cloud-only):
  pg_cron → auto-temperatura → eWeLink Cloud API → Dispositivo
  (sem internet = sem controle)

PROPOSTA (cloud + fallback local):
  pg_cron → auto-temperatura → eWeLink Cloud API → Dispositivo  [primário]
                    │
                    └→ Sincroniza timers de segurança no firmware  [fallback]
                       (dispositivo executa sozinho se perder internet)
```

### Estratégia de Timers de Segurança

Como sensores de temperatura não funcionam sem internet (dados não chegam ao banco), os timers locais seguem uma **programação horária fixa baseada no comportamento térmico típico**:

- **Aquecimento**: liga automaticamente à noite (18h–06h) quando a idade do lote exige temperatura alta (primeiros dias)
- **Ventilação**: liga automaticamente nas horas quentes (10h–16h) quando o lote já é mais velho
- **Ciclos intermitentes**: para idades intermediárias, programa ciclos de liga/desliga (ex: 30min on / 30min off)

A automação cloud continua sendo a inteligente (lê temperatura real). Os timers são o "piloto automático de emergência".

### Etapas de Implementação

**1. Nova tabela: `timers_seguranca_iot`**
- Registra os timers programados em cada dispositivo: `dispositivo_id`, `tipo_timer` (aquecimento_noturno, ventilacao_diurno, ciclo_intermitente), `hora_inicio`, `hora_fim`, `estado_desejado`, `intervalo_minutos`, `sincronizado_em`, `idade_lote_dias`
- Permite auditar e comparar o que está programado vs o que deveria estar

**2. Lógica de cálculo de timers (`calcularTimersSeguranca`)**
- Recebe a idade do lote e as regras de temperatura ativas
- Retorna os timers adequados:
  - Idade 1-7 dias (temp alta): aquecimento noturno ON 18h-06h
  - Idade 8-21 dias (transição): aquecimento noturno ON 20h-04h  
  - Idade 22+ dias (temp baixa ok): ventilação diurna ON 10h-16h
  - Configurável por `funcao_automacao` do dispositivo

**3. Endpoint na Edge Function `sync-sensors` (nova action: `set-device-timers`)**
- Recebe dispositivo + lista de timers
- Envia para API eWeLink: `POST /v2/device/thing/status` com `params.timers`
- Os timers ficam gravados no firmware do Sonoff e executam localmente

**4. Atualização automática na `auto-temperatura`**
- Após processar cada lote, verifica se a idade mudou desde a última sincronização de timers
- Se mudou, recalcula e re-sincroniza os timers no dispositivo
- Registra em `timers_seguranca_iot` para auditoria

**5. UI: Seção "Proteção Offline" na página IoT**
- Mostra status dos timers de segurança por dispositivo
- Indica se os timers estão sincronizados e para qual idade
- Botão "Ressincronizar Timers" manual
- Badge visual: "🛡️ Protegido" (timers atualizados) ou "⚠️ Desatualizado"

**6. Alerta de offline prolongado**
- Se um dispositivo ficar offline por mais de 15 minutos, criar notificação administrativa
- Informar que os timers de segurança estão ativos como fallback

### Arquivos Afetados

| Tipo | Arquivo | Ação |
|------|---------|------|
| DB | Migration | Criar `timers_seguranca_iot` |
| Edge Function | `auto-temperatura/index.ts` | Adicionar sincronização de timers |
| Edge Function | `sync-sensors/index.ts` | Nova action `set-device-timers` |
| UI | `DispositivosIoT.tsx` | Seção "Proteção Offline" |
| Lib | `src/lib/utils/calcularTimersSeguranca.ts` | Lógica de cálculo (compartilhada) |

### Limitações e Considerações

- **Timers são "burros"**: não leem temperatura, só seguem horário. São emergência, não substituem a automação inteligente
- **Dispositivos Sonoff suportam até 8 timers simultâneos** — suficiente para ciclos básicos
- **A cada mudança de idade relevante** (novo range de regra), os timers são atualizados automaticamente
- **Se a internet voltar**, a automação cloud retoma o controle imediatamente (tem prioridade sobre timers)

### Segurança

- Timers são programados via `service_role` (sem sessão de usuário)
- Log de todas as sincronizações para auditoria
- RLS na tabela `timers_seguranca_iot` por `integrado_id`

