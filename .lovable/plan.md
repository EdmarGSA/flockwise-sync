

## Problem

The eWeLink developer console only allows creating **OAuth2.0** type apps (the App Type field is locked). The current edge function uses `/v2/user/login` which requires a "General" type app and is rejected with `invalid appid`.

## Solution: Implement eWeLink OAuth2.0 Flow

OAuth2.0 requires a one-time interactive login by the user (you) in the browser, after which tokens are stored and auto-refreshed indefinitely (every ~28 days).

### Architecture

```text
[1] User clicks "Conectar eWeLink" button
      ↓
[2] Redirected to eWeLink OAuth login page
      ↓
[3] User authorizes → redirected back with ?code=xxx
      ↓
[4] Edge function exchanges code → access_token + refresh_token
      ↓
[5] Tokens stored in DB table (ewelink_tokens)
      ↓
[6] sync-sensors uses stored token (auto-refreshes if expired)
```

### Changes Required

**1. Database: New `ewelink_tokens` table**
- `id`, `integrado_id`, `access_token`, `refresh_token`, `at_expired_at`, `rt_expired_at`, `region`, `created_at`, `updated_at`
- RLS: only authenticated users for their own integrado_id

**2. Update Redirect URL in eWeLink Console**
- User must change the Redirect URL in eWeLink dev console to: `https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/ewelink-oauth-callback`

**3. New edge function: `ewelink-oauth-callback`**
- Receives the `?code=` from eWeLink redirect
- Exchanges code for tokens via `POST /v2/user/oauth/token` (with HMAC sign)
- Stores tokens in `ewelink_tokens` table
- Redirects user back to `/configuracoes/dispositivos-iot` with success message

**4. Update `sync-sensors` edge function**
- Remove email/password login logic
- Read stored token from `ewelink_tokens` table
- If token expired but refresh token valid → call `/v2/user/refresh` to get new token
- If refresh token also expired → return error asking user to re-authorize

**5. Update `DispositivosIoT.tsx` page**
- Add "Conectar conta eWeLink" button that opens the OAuth authorization URL
- Show connection status (connected/disconnected)
- The OAuth URL format: `https://c2ccdn.coolkit.cc/oauth/index.html?clientId={APP_ID}&redirectUrl={REDIRECT_URL}&grantType=authorization_code&state={STATE}&nonce={NONCE}`

**6. Secrets cleanup**
- `EWELINK_EMAIL` and `EWELINK_PASSWORD` no longer needed
- Keep `EWELINK_APP_ID` and `EWELINK_APP_SECRET`

### User Action Required Before Implementation
You need to update the **Redirect URL** in the eWeLink developer console from `https://gsatibiri.com/` to the edge function callback URL. I will provide the exact URL during implementation.

