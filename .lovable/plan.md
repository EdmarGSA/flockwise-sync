

## Problema

A tela OAuth da eWeLink (`c2ccdn.coolkit.cc/oauth/index.html`) carrega corretamente no popup, mas ao clicar "Oauth And Log In" o botão fica girando infinitamente. O callback nunca é chamado (zero logs na edge function). Isso sugere que a página OAuth da eWeLink tem problemas no contexto de popup (`window.open`).

## Solução: Trocar de popup para fluxo de redirect

Em vez de abrir a OAuth em popup (que pode ter restrições de contexto), redirecionar o usuário diretamente para a página OAuth. Após o login, o callback redireciona de volta para o app.

## Mudanças

### 1. `sync-sensors/index.ts` (action `oauth-url`)
- Aceitar `returnUrl` do frontend
- Codificar `state` como JSON: `{ integradoId, returnUrl }`
- Adicionar `showQRCode=false` na URL OAuth

### 2. `ewelink-oauth-callback/index.ts`
- Parsear `state` como JSON para obter `integradoId` e `returnUrl`
- Manter compatibilidade com state simples (string de UUID)
- Após armazenar tokens: **redirecionar via HTTP 302** para `returnUrl?ewelink_connected=true`
- Em caso de erro: redirecionar para `returnUrl?ewelink_error=mensagem`
- Manter fallback postMessage para contexto de popup

### 3. `DispositivosIoT.tsx`
- Trocar `window.open(popup)` por `window.location.href = url` (redirect direto)
- Passar `returnUrl` (baseado em `window.location.origin + '/configuracoes/dispositivos-iot'`) para a edge function
- Manter o handler de URL params que já existe (linhas 61-72) para capturar o retorno

## Fluxo resultante

```text
1. Usuário clica "Conectar eWeLink"
2. Frontend chama sync-sensors?action=oauth-url com returnUrl
3. Página redireciona para c2ccdn.coolkit.cc/oauth/...
4. Usuário faz login na eWeLink (página inteira, não popup)
5. eWeLink redireciona para ewelink-oauth-callback?code=X&region=Y&state=Z
6. Callback troca code por token, armazena no DB
7. Callback redireciona HTTP 302 → returnUrl?ewelink_connected=true
8. App carrega, detecta URL param, mostra toast de sucesso
```

## Detalhes técnicos

**State encoding:**
```typescript
// sync-sensors (oauth-url action)
const statePayload = JSON.stringify({ integradoId, returnUrl });
const state = encodeURIComponent(statePayload);
```

**Callback redirect:**
```typescript
// ewelink-oauth-callback
let integradoId: string;
let returnUrl: string | null = null;
try {
  const parsed = JSON.parse(state);
  integradoId = parsed.integradoId;
  returnUrl = parsed.returnUrl;
} catch {
  integradoId = state; // fallback: raw UUID
}

// After success:
if (returnUrl) {
  return Response.redirect(`${returnUrl}?ewelink_connected=true`, 302);
}
// fallback: postMessage HTML
```

**Frontend:**
```typescript
// DispositivosIoT.tsx handleConnectEwelink
const returnUrl = `${window.location.origin}/configuracoes/dispositivos-iot`;
const { data } = await supabase.functions.invoke('sync-sensors', {
  body: { action: 'oauth-url', integrado_id: integradoId, return_url: returnUrl },
});
window.location.href = data.url; // redirect, não popup
```

