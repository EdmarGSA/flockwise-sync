## Diagnóstico

As sugestões aprovadas (modo Sombra) **estão sendo despachadas**, mas todas falham com `erro: "Canal não encontrado para função"` — apesar do canal existir e estar correto.

Causa raiz encontrada em `supabase/functions/brain-dispatcher/index.ts`:

```ts
.select("..., dispositivos_iot!inner(driver, online, galpao_id)")
```

A coluna `online` **não existe** na tabela `dispositivos_iot`. As colunas reais são: `ativo`, `ultimo_sync`, `driver`, `galpao_id`, etc. O PostgREST devolve erro/`null`, o código entra no ramo `if (!canal)` e marca o comando como `falhou` com a mensagem enganosa "Canal não encontrado para função".

Confirmado em produção:
- Comando `cc0c55b9…` aprovado às 01:50 — `falhou`, sem `enviado_em`
- Canal `55a21437…` existe, `automacao_ativa=true`, `ativo=true`, driver `ewelink`, `ultimo_sync` recente

Status online real do dispositivo deve ser derivado de `ultimo_sync` (heartbeat), padrão usado no resto do projeto (memória `iot-latency-monitoring-and-alerts` define 10 min de offline).

## Correção

Editar `supabase/functions/brain-dispatcher/index.ts`:

1. Remover `online` dos dois `.select(...)` em `canais_dispositivo` (ambos os ramos: `canalId` informado e busca por função).
2. Substituir a checagem `if (!dev?.online)` por uma verificação derivada:
   - `online = ultimo_sync && (Date.now() - new Date(ultimo_sync).getTime()) < 10 * 60_000`
   - Para `driver === 'esp32_http'`, também tratar `ultima_inicializacao` como heartbeat válido.
3. Manter o fluxo de fallback redundante e o alerta `brain_atuador_offline` quando o cálculo resultar em offline.
4. Adicionar log explícito quando o canal realmente não for encontrado vs. quando o dispositivo estiver offline, para evitar futuras confusões.

Nada mais muda — modos `shadow`/`auto`/`off`, cooldown, timeout de 60s e fluxo de aprovação continuam iguais.

## Validação

1. Reaprovar (ou criar nova) sugestão do Brain pelo card "Sugestões do Brain".
2. `curl` no `brain-dispatcher` e confirmar `status=enviado` em `comando_brain`.
3. Verificar que `sync-sensors` recebeu `action=command` para o canal correto.
4. Conferir nos logs do edge function que não há mais "Canal não encontrado" para canais válidos.
