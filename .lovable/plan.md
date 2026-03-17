

## Problema

O comando `control-device` retorna `success: true` (a API eWeLink responde `error: 0`), mas o dispositivo **não muda de estado**. Isso acontece porque:

1. **Auto-controle ativo no dispositivo**: O sensor `1001840c8e` tem `autoControlEnabled: 1` com regras de temperatura que desligam o relé quando temp < 26°C (temp atual: 25.7°C). A automação interna do Sonoff TH reverte o comando manual instantaneamente.
2. **Toast enganoso**: O sistema exibe "Dispositivo ligado" baseado apenas na resposta da API, sem verificar se o estado realmente mudou.
3. **Sem feedback ao usuário sobre auto-controle**: Nenhuma indicação visual de que a automação do dispositivo pode impedir o controle manual.

## Solução

### 1. Verificar estado real após comando (Edge Function)

**`supabase/functions/sync-sensors/index.ts`** - Na ação `control-device`:
- Após enviar o comando, aguardar 1 segundo e buscar `device-status`
- Comparar o estado real com o estado solicitado
- Retornar `confirmed: true/false` na resposta
- Incluir `autoControlEnabled` no retorno para o frontend saber

```typescript
// Após enviar comando com sucesso:
await new Promise(r => setTimeout(r, 1000));
const status = await getDeviceStatus(accessToken, appId, region, deviceId);
const actualState = status.data?.params?.switch;
const autoCtrl = status.data?.params?.autoControlEnabled;
return jsonResponse({
  success: true,
  confirmed: actualState === switchState,
  actualState,
  autoControlEnabled: autoCtrl === 1,
  deviceId, switchState, outlet
});
```

### 2. Atualizar feedback no hook

**`src/hooks/useDeviceControl.tsx`**:
- Verificar `data.confirmed` na resposta
- Se `confirmed: false` e `autoControlEnabled: true`, exibir toast de aviso explicando que o auto-controle está ativo
- Se `confirmed: true`, exibir toast de sucesso

### 3. Mostrar indicador de auto-controle nos cards

**`src/pages/DispositivosIoT.tsx`** e **`src/components/lotes/TemperaturaUmidadeCard.tsx`**:
- Quando `device-status` retornar `autoControlEnabled: 1`, mostrar badge "Auto" junto ao switch
- Tooltip explicando que o dispositivo tem automação ativa por temperatura

### Arquivos alterados
- `supabase/functions/sync-sensors/index.ts`
- `src/hooks/useDeviceControl.tsx`
- `src/pages/DispositivosIoT.tsx`
- `src/components/lotes/TemperaturaUmidadeCard.tsx`

