
Diagnóstico (com base no código + docs eWeLink que você enviou)

1) O fluxo atual monta a URL OAuth sem dois parâmetros obrigatórios da eWeLink:
- `seq` (timestamp em ms)
- `authorization` (assinatura HMAC-SHA256 de `clientId_seq` com `APP_SECRET`)

2) No `src/pages/DispositivosIoT.tsx`, hoje a URL é:
- `clientId`, `redirectUrl`, `grantType`, `state`, `nonce`
- faltam `seq` e `authorization`

3) Isso explica exatamente o sintoma de “fica rodando e não loga” na tela `c2ccdn.coolkit.cc/oauth/index.html`: a página abre, mas a autorização não conclui por falta de assinatura válida.

Plano de correção

1. Gerar URL OAuth assinada no backend (não no frontend)
- Arquivo: `supabase/functions/sync-sensors/index.ts`
- Adicionar um novo action, por exemplo `action=oauth-url`, que:
  - lê `EWELINK_APP_ID` e `EWELINK_APP_SECRET`
  - gera `seq = Date.now().toString()`
  - calcula `authorization = base64(HMAC_SHA256(appSecret, appId + "_" + seq))`
  - gera `nonce` alfanumérico de 8 chars
  - monta e retorna a URL completa:
    - `clientId`
    - `seq`
    - `authorization`
    - `redirectUrl`
    - `grantType=authorization_code`
    - `state` (integrado_id)
    - `nonce`
    - `showQRCode=false` (força login por usuário/senha, evitando variações de UI)
- Manter `action=config` compatível, mas o frontend passará a usar `oauth-url`.

2. Ajustar frontend para usar a URL assinada
- Arquivo: `src/pages/DispositivosIoT.tsx`
- Em `handleConnectEwelink`:
  - substituir fetch manual de `action=config` + montagem local da URL
  - chamar `supabase.functions.invoke('sync-sensors', { body: { action: 'oauth-url', integrado_id } })`
  - abrir popup com a URL retornada
- Manter listener `postMessage` já existente para concluir conexão.
- Melhorar UX:
  - se popup for bloqueado, mensagem clara
  - se popup fechar sem sucesso, exibir aviso de cancelamento/falha

3. Pequeno hardening de robustez
- Em `sync-sensors`, atualizar mensagem de erro de action inválida para incluir `oauth-url`.
- Opcional: incluir `callback_url` fixo vindo do backend (fonte única da verdade), para evitar qualquer divergência futura de redirect.

Validação após implementação (fim a fim)

1) Na tela `/configuracoes/dispositivos-iot`, clicar “Conectar eWeLink”.
2) Confirmar que o popup abre com URL contendo `seq` e `authorization`.
3) Fazer login no popup.
4) Confirmar redirecionamento ao callback + fechamento automático da janela.
5) Confirmar toast de sucesso e card “Conta eWeLink conectada”.
6) Validar que existe registro em `ewelink_tokens` para o `integrado_id`.
7) Clicar “Sincronizar” e verificar leituras.

Detalhes técnicos (resumo)

- Fórmula exigida pela doc eWeLink para a página OAuth:
  - `authorization = Base64(HMAC_SHA256(APP_SECRET, APP_ID + "_" + seq))`
- Parâmetros obrigatórios na URL OAuth:
  - `clientId`, `seq`, `authorization`, `redirectUrl`, `grantType`, `state`, `nonce`
- Motivo para assinar no backend:
  - não expor `APP_SECRET` no navegador.
