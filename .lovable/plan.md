

## Problem

Based on the eWeLink documentation you shared, there are critical bugs in the token exchange callback:

### Bug 1: Wrong field names in token exchange response
The `/v2/user/oauth/token` endpoint returns `accessToken` and `refreshToken`, but our code reads `tokenData.at` and `tokenData.rt` (which are the field names for the **refresh** endpoint only).

**Docs say:**
- Token exchange: `accessToken`, `refreshToken`, `atExpiredTime`, `rtExpiredTime`
- Token refresh: `at`, `rt`

**Our code (line 126):** `tokenData.at` → `undefined`

### Bug 2: Expiry times are absolute timestamps, not durations
The docs say `atExpiredTime` and `rtExpiredTime` are "expiration timestamps in milliseconds". Our code treats them as durations in seconds and adds them to `now`.

### Bug 3: CN region uses wrong domain
China API uses `cn-apia.coolkit.cn` (`.cn`), not `cn-apia.coolkit.cc` (`.cc`).

## Plan

### 1. Fix `ewelink-oauth-callback/index.ts`
- Read `data.data.accessToken` / `data.data.refreshToken` instead of `.at` / `.rt`
- Convert `atExpiredTime` / `rtExpiredTime` from millisecond timestamps to ISO dates directly (not as duration offsets)
- Use `.cn` domain for `cn` region

### 2. Fix `sync-sensors/index.ts`
- Use `.cn` domain for `cn` region in refresh and device API calls
- Token refresh response uses `at`/`rt` which is correct per docs — no change needed there

### Technical detail

```text
Token exchange response fields:
  data.accessToken  → store as access_token
  data.refreshToken → store as refresh_token  
  data.atExpiredTime → millisecond timestamp → new Date(value).toISOString()
  data.rtExpiredTime → millisecond timestamp → new Date(value).toISOString()

CN domain fix:
  region === "cn" ? "cn-apia.coolkit.cn" : `${region}-apia.coolkit.cc`
```

