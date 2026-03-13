

## Login Direto eWeLink (email + senha por integrado)

### Conceito

Cada integrado informa o **email e senha** da conta eWeLink onde seus dispositivos estão pareados. O sistema faz login via API (`POST /v2/user/login`) e armazena o token por integrado. Na sincronização, o sistema usa o token de cada integrado para buscar seus dispositivos.

### Mudanças

#### 1. `sync-sensors/index.ts` — Nova action `login`

Adicionar action `login` que recebe `email`, `password`, `countryCode` e `integrado_id`:

```text
POST /v2/user/login
Body: { email, password, countryCode }
Headers: X-CK-Appid, Authorization: Sign HMAC(body)
```

- Salva o token na tabela `ewelink_tokens` vinculado ao `integrado_id`
- Retorna sucesso/erro

#### 2. `sync-sensors/index.ts` — Sync por integrado

Alterar action `sync`:
- Buscar token do `integrado_id` específico (não mais "mestre global")
- Usar esse token para buscar dispositivos da conta do integrado
- Cruzar com `dispositivos_iot` daquele integrado

#### 3. `DispositivosIoT.tsx` — UI de login eWeLink

Substituir o fluxo OAuth por formulário simples:
- Campo **Email eWeLink**
- Campo **Senha eWeLink**
- Campo **Código do País** (default: +55)
- Botão "Conectar"

Ao conectar, chama `sync-sensors` com `action: login`. Se sucesso, marca como conectado.

#### 4. Remover fluxo OAuth

- Remover action `oauth-url` e código relacionado ao OAuth
- Manter `check-connection` buscando token por `integrado_id`
- Botão "Conectar eWeLink" disponível para qualquer usuário (não só admin)

### Fluxo final

```text
1. Integrado pareia Sonoff TH no app eWeLink (conta dele)
2. No sistema, integrado informa email + senha da conta eWeLink
3. Sistema faz login na API, obtém token e salva
4. Integrado clica "Buscar dispositivos" → lista sensores da conta dele
5. Seleciona dispositivo → cadastra com device_id
6. Clica "Sincronizar" → lê temperatura/umidade
```

### Detalhes técnicos

**Login via API eWeLink v2:**
```typescript
const body = { email, password, countryCode };
const sign = HMAC_SHA256(appSecret, JSON.stringify(body));

POST ${regionUrl}/v2/user/login
Headers: {
  "X-CK-Appid": appId,
  "Authorization": "Sign " + base64(sign),
  "Content-Type": "application/json"
}
// Response: { data: { at, rt, user: { region, apikey } } }
```

**Token storage:**
- Upsert em `ewelink_tokens` com `integrado_id` do usuário
- Guardar `access_token`, `refresh_token`, `region`, expiry timestamps

**Segurança:**
- Email e senha NÃO são armazenados — apenas os tokens OAuth resultantes
- Senha trafega apenas na chamada de login, via edge function (server-side)

