

## Recomendação: Controle Direto via eWeLink Cloud API (conta do integrado)

### Análise das opções

**Opção A — Conectar dispositivos do integrado na conta dev (gsatibiri)**
- Exige que cada integrado "compartilhe" dispositivos com a conta dev
- Processo manual complicado para o integrado
- Todos os dispositivos ficam numa conta só — risco de segurança
- Limitação: App ID dev pode ter restrições de endpoint (como já vimos)

**Opção B — OAuth por integrado (conta própria) ✅ RECOMENDADA**
- Cada integrado já tem seus dispositivos pareados no app eWeLink
- O sistema faz OAuth com a conta do integrado (não a dev)
- O App ID dev serve apenas como "ponte" para acessar a API
- O integrado autoriza o sistema a controlar seus dispositivos
- Controle total: ligar/desligar, automação por temperatura, agendamento

### Por que OAuth por integrado é melhor

1. **Já funciona**: O integrado já tem o Sonoff pareado no app eWeLink dele
2. **Sem pareamento extra**: Não precisa re-parear nada, só autorizar
3. **Segurança**: Cada um controla seus próprios dispositivos
4. **API completa**: A eWeLink Cloud API v2 suporta:
   - Ler temperatura/umidade (já implementado)
   - Ligar/desligar dispositivo (`POST /v2/device/thing/status`)
   - Automação por faixa de temperatura
   - Agendamento (scenes/timers)

### Funcionalidades possíveis com esta arquitetura

```text
┌─────────────────────────────────────────────────┐
│              Painel IoT do Integrado             │
├─────────────────────────────────────────────────┤
│ 1. Monitoramento (já existe)                    │
│    - Temperatura e umidade em tempo real         │
│    - Histórico com gráficos                      │
│                                                  │
│ 2. Controle (novo)                              │
│    - Ligar/desligar ventiladores, aquecedores    │
│    - Controle manual pelo sistema                │
│                                                  │
│ 3. Automação (novo)                             │
│    - Faixa de temperatura: liga/desliga auto     │
│    - Faixa de umidade: liga/desliga auto         │
│    - Programação por idade do lote               │
│      (ex: semana 1 = 32°C, semana 2 = 30°C)    │
│                                                  │
│ 4. Agendamento (novo)                           │
│    - Loop por tempo (ligar X min, desligar Y)    │
│    - Agenda diária/semanal                       │
│                                                  │
│ 5. Alarmes (novo)                               │
│    - Alerta se temp > limite ou < limite         │
│    - Alerta se umidade fora da faixa             │
│    - Alerta se dispositivo offline               │
│    - Notificação push/toast                      │
└─────────────────────────────────────────────────┘
```

### Implementação — Fase 1 (OAuth + Monitoramento)

#### 1. Corrigir fluxo OAuth no `sync-sensors`

O App ID (`dREioQCs1wPnVX4bMeIp0BZ4SE9GMm0t`) **suporta OAuth** (já comprovado pelo callback existente). O erro anterior foi tentar usar `/v2/user/login` que não é permitido para apps de terceiros.

- Restaurar action `oauth-url` que gera URL de autorização eWeLink
- Cada integrado clica "Conectar eWeLink" → redireciona para login eWeLink → autoriza → callback salva token
- O `ewelink-oauth-callback` já existe e funciona

#### 2. `sync-sensors/index.ts` — Ajustes

- Remover action `login` (email/senha não funciona com este App ID)
- Restaurar/manter action `oauth-url`: gera URL `https://{region}-apia.coolkit.cc/v2/user/oauth/authorize?...` com `state = { integradoId, returnUrl }`
- Manter actions `sync`, `list-devices`, `check-connection` buscando token por `integrado_id`

#### 3. `DispositivosIoT.tsx` — UI OAuth

- Substituir formulário email/senha por botão "Conectar conta eWeLink"
- Ao clicar: chama `sync-sensors?action=oauth-url` → abre URL retornada
- Após callback: página detecta `?ewelink_connected=true` na URL e atualiza status
- Manter funcionalidade de buscar e selecionar dispositivos

#### 4. Callback OAuth (já existe)

- `ewelink-oauth-callback/index.ts` já troca code por token e salva na tabela
- Apenas garantir que o redirect volta para a página de dispositivos

### Fases futuras (após OAuth funcionando)

- **Fase 2**: Controle on/off de dispositivos via API
- **Fase 3**: Automação por faixa de temperatura/umidade (regras no DB)
- **Fase 4**: Programação por idade do lote (curva de temperatura)
- **Fase 5**: Alarmes e notificações

