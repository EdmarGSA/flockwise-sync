

## Correção: Listagem de dispositivos eWeLink

### Problema identificado
Na action `list-devices` (linha 309 do `sync-sensors/index.ts`), há um filtro restritivo:
```typescript
.filter((d) => d.itemType === 1 || d.itemType === 2)
```
Dispositivos Sonoff TH podem ter `itemType` diferente (ex: 3 para dispositivos compartilhados). Isso pode fazer com que nenhum dispositivo apareça na busca.

### Solução
1. **Remover filtro de itemType** — aceitar todos os dispositivos retornados pela API e mostrar ao integrado
2. **Melhorar a action `list-devices`** — adicionar log do total de dispositivos antes/depois do filtro para debug
3. **No sync também** — garantir que o sync busca dados de qualquer tipo de dispositivo

### Alterações

**`supabase/functions/sync-sensors/index.ts`**
- Action `list-devices`: remover filtro `itemType`, mapear todos os dispositivos que tenham `currentTemperature` ou `currentHumidity` nos params (indica sensor TH)
- Fallback: se não tiver esses params, ainda listar o dispositivo para que o integrado possa vinculá-lo

**`src/pages/DispositivosIoT.tsx`**  
- Sem alterações necessárias — a UI já suporta a lista

