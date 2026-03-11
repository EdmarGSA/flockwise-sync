

## Problem

The eWeLink OAuth flow uses `window.location.href` to redirect, which fails inside the iframe preview environment. The page gets stuck spinning because the redirect is blocked by browser security (third-party cookie restrictions in iframes).

## Solution

Use a **popup window** for the OAuth flow instead of a redirect. The popup opens the eWeLink login page, and after authorization, the callback edge function closes the popup and notifies the parent window.

## Changes

### 1. Edge function `ewelink-oauth-callback/index.ts`
Instead of redirecting back to the app URL after storing tokens, return an HTML page with JavaScript that:
- Sends a `postMessage` to `window.opener` (the parent window)
- Closes itself

### 2. Frontend `DispositivosIoT.tsx`
- Replace `window.location.href = oauthUrl` with `window.open(oauthUrl, 'ewelink-oauth', 'width=600,height=700')`
- Add a `message` event listener to detect when the popup completes
- On success, refresh connection status and show success toast
- Handle popup blocked scenario with fallback instructions

### Technical flow
```text
User clicks "Conectar eWeLink"
  → Popup opens eWeLink OAuth page
  → User logs in & authorizes
  → eWeLink redirects to callback edge function
  → Edge function stores tokens, returns HTML with postMessage script
  → Parent window receives message, closes popup, refreshes state
```

