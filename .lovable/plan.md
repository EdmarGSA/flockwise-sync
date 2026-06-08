# Por que aparece "SEM ACK" em Ambiência → Dispositivos & canais

## Diagnóstico

O badge do canal é calculado em `src/lib/ambiencia/statusCanal.ts`:

- Se `ultimo_comando_em` é antigo (> 90 s) **e** `ultimo_estado_persistido_em` é nulo ou anterior ao comando → status vira `sem_ack`.

Consultando o banco para os 3 canais da tela:

```
Ventilador Área 01 / Área 02 / Iluminação Granja
driver = ewelink
ultimo_comando_em       = ontem / há 2h
ultimo_estado_persistido_em = NULL
ultimo_estado_persistido    = NULL
ultimo_sync (device)    = recente → "4/4 online" ok
```

Procurando quem escreve esses campos no projeto:

- `supabase/functions/esp32-bridge/index.ts` (linhas 439-441 e 482) — **única** rotina que grava `ultimo_estado_persistido` + `ultimo_estado_persistido_em`. Faz sentido: o ESP32 manda telemetria de volta com o estado real do canal.
- `brain-dispatcher`, `auto-iluminacao`, `auto-temperatura` — quando comandam via eWeLink, atualizam **apenas** `ultimo_comando_em` e `estado_atual`. Nunca gravam o `_persistido_*`.

Resultado: todo canal eWeLink fica "SEM ACK" 90 s após o primeiro comando, mesmo funcionando perfeitamente. O dispositivo continua "ONLINE" (depende de `ultimo_sync`, que o `auto-sync-sensors` atualiza), mas o canal não.

A iluminação cai no mesmo bug; ela só "parece" diferente porque o último comando foi há ~2 h (mudança de programa) e a ventilação ficou há ~15 h, mas o motivo do badge é idêntico.

## Correção proposta

A API cloud eWeLink confirma o comando de forma **síncrona** (não há telemetria push como no ESP32). Logo, sucesso na chamada eWeLink **é** o ACK e deve ser persistido.

Ajustar os 3 pontos que comandam canais eWeLink para, na mesma transação onde já atualizam `estado_atual` + `ultimo_comando_em`, também gravar:

```ts
ultimo_estado_persistido: estadoFinal,        // mesmo valor enviado
ultimo_estado_persistido_em: nowIso,          // = ultimo_comando_em
```

Arquivos:

1. `supabase/functions/brain-dispatcher/index.ts` (~linha 190) — após `eweLinkSetSwitch` retornar ok.
2. `supabase/functions/auto-iluminacao/index.ts` (~linha 341) — branch eWeLink.
3. `supabase/functions/auto-temperatura/index.ts` (~linha 790) — branch eWeLink.

Para ESP32 nada muda: o bridge continua sendo a fonte da verdade do ACK (estado real do firmware, não só o comando enviado).

## Validação

- Recarregar `/meus-lotes/.../ambiencia` após próximo ciclo do `auto-iluminacao` (1 min) e `auto-ventilacao` — os 3 badges devem ficar verde `ONLINE`.
- Forçar um comando manual via `useDeviceControl` para confirmar que o badge não volta para SEM ACK.
- Confirmar via SQL que `ultimo_estado_persistido_em` passa a ser preenchido para `driver='ewelink'`.

## Observação

Não mexer em `src/lib/ambiencia/statusCanal.ts` — a regra de 90 s sem ACK é correta e útil para ESP32, onde a divergência entre comando e estado real indica falha física. Corrigir na origem (escrita do ACK) preserva o comportamento para os dois drivers.
