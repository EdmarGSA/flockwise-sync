

## Diagnóstico

### Problema 1: Sync retorna 0 leituras
Testei a API diretamente. A eWeLink retorna `devices: []` (lista vazia de dispositivos). Isso acontece porque a requisição GET para `/v2/device/thing` precisa, segundo a documentação, de **assinatura HMAC-SHA256 dos parâmetros da query** (não Bearer token) para certas configurações de APPID. A documentação diz:

> **GET Request:** Order all parameters alphabetically and concatenate them with `&`, then sign with HMAC-SHA256 using app secret.

Porém o código atual usa `Authorization: Bearer {accessToken}`, que pode não funcionar para APPIDs OAuth (terceiros). A API retorna `error: 0` com lista vazia em vez de erro de autenticação.

Além disso, o código não envia o parâmetro `num=0` (que significa "buscar todos os dispositivos") nem adiciona logging para debugar a resposta da API.

### Problema 2: Tela de monitoramento dentro do lote
Não existe nenhum componente de monitoramento de temperatura/umidade na página do lote (`LoteDetalhe.tsx`). Apenas o `MortalidadeDialog` busca dados de sensores para auto-preencher campos.

## Plano

### 1. Corrigir `getEwelinkDevices` em `sync-sensors/index.ts`
- Trocar de `Bearer {accessToken}` para `Sign {hmac}` na requisição GET
- Para GET, a assinatura é calculada sobre os parâmetros da query ordenados alfabeticamente: `num=0` concatenados com `&`
- Adicionar `console.log` com a resposta da eWeLink para debug
- Passar `num=0` para buscar todos dispositivos

```text
GET /v2/device/thing?num=0
Headers:
  X-CK-Appid: {appId}
  X-CK-Nonce: {nonce}
  Authorization: Sign {hmac_sha256(appSecret, "num=0")}
```

### 2. Criar componente `TemperaturaUmidadeCard` em `src/components/lotes/TemperaturaUmidadeCard.tsx`
- Recebe `galpaoId` como prop
- Busca o dispositivo IoT vinculado ao galpão via `dispositivos_iot`
- Busca a última leitura de `leituras_sensores`
- Mostra temperatura e umidade com indicadores visuais de cor (verde/amarelo/vermelho)
- Mostra "há X minutos" e ícone de online/offline
- Se não houver dispositivo vinculado, mostra mensagem informativa

### 3. Adicionar o card no `LoteDetalhe.tsx`
- Inserir o `TemperaturaUmidadeCard` logo após o card de resumo do lote
- Mostrar apenas quando `lote.status === 'alojado'`
- Passar `galpaoId={lote.galpao_id}`

### Detalhes técnicos da assinatura GET

Segundo a documentação eWeLink:
```typescript
// Para GET: ordenar params alfabeticamente e concatenar com &
const params = "num=0";
const sign = hmac_sha256(appSecret, params); // base64
// Header: Authorization: Sign {sign}
```

