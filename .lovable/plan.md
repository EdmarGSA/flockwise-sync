

## Problema

Os dispositivos aparecem como **"Offline"** mesmo estando online e sincronizando dados (temperatura/umidade). O bug está na leitura do campo `online` da API eWeLink.

## Causa raiz

Na API eWeLink v2, o campo `online` fica em `itemData.online`, **não** em `itemData.params.online`. O código atual lê `d.itemData.params?.online`, que é `undefined` para a maioria dos dispositivos Sonoff, e o `?? false` faz todos ficarem como offline.

Locais afetados:
- **Linha 368** do `sync-sensors/index.ts` (list-devices): `d.itemData.params?.online ?? false`
- **Linha 470** do `sync-sensors/index.ts` (sync): `params.online ?? false`
- **Linha 449-451**: o `deviceMap` só guarda `params`, perdendo o `online` que está um nível acima

## Solução

### 1. Atualizar interface `EwelinkDevice` (sync-sensors/index.ts)
Adicionar `online?: boolean` em `itemData` (fora de `params`).

### 2. Corrigir `list-devices` (linha 368)
```typescript
// De:
online: d.itemData.params?.online ?? false,
// Para:
online: (d.itemData as any).online ?? d.itemData.params?.online ?? false,
```

### 3. Corrigir `sync` (linhas 446-470)
Mudar o `deviceMap` para guardar o `online` do nível `itemData`:
```typescript
const deviceMap = new Map<string, { params: ..., online: boolean }>();
for (const d of ewelinkDevices) {
  deviceMap.set(d.itemData.deviceid, {
    params: d.itemData.params,
    online: (d.itemData as any).online ?? d.itemData.params?.online ?? false,
  });
}
// ...
const online = entry.online;
```

### Arquivos alterados
- `supabase/functions/sync-sensors/index.ts` — corrigir leitura do campo `online` em `list-devices` e `sync`

