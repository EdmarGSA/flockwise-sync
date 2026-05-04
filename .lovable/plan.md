## Problema

Em `/meus-lotes/:id`, o card "Iluminação Granja" mostra **Desligado** mesmo com o dispositivo realmente ligado (e a página `/dispositivos-iot` mostra **Ligado** corretamente).

**Causa raiz:** em `TemperaturaUmidadeCard.tsx`, o estado on/off vem de `fetchDeviceStatus()` (poll eWeLink → campo `switch`). Para o dispositivo `Iluminação Granja` (Sonoff multi-canal, driver `ewelink`), esse polling não retorna um campo `switch` único — o estado real fica em `switches[]` por canal. Resultado: `switchState = null` ou `'off'`, exibindo "Desligado".

Já a tela de IoT lê o estado correto de `canais_dispositivo.estado_atual` (atualizado por telemetria/comando), por isso aparece "Ligado".

## Solução

Em `src/components/lotes/TemperaturaUmidadeCard.tsx`, para dispositivos de iluminação, **priorizar `canais_dispositivo.estado_atual`** sobre o `switch` retornado pelo poll eWeLink:

1. Incluir `estado_atual` no `select` do batch de `canais_dispositivo`.
2. Guardar `estadoAtual` no `canaisMap`.
3. Ao montar o objeto do dispositivo:
   - Se `isIluminacao`: `switchState = canal.estadoAtual ?? statusResult.switch`.
   - Caso contrário: comportamento atual (do polling).

Sem mudanças em banco, hooks ou em outros componentes. Apenas ajuste de fonte de verdade do estado para iluminação.

## Arquivos afetados

- `src/components/lotes/TemperaturaUmidadeCard.tsx`
