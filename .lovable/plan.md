

## Update eWeLink Credentials

The user has a new eWeLink app with different APPID and APP SECRET. The Redirect URL is already correctly configured.

### Changes

1. **Update `EWELINK_APP_ID` secret** to `dREioQCs1wPnVX4bMeIp0BZ4SE9GMm0t`
2. **Update `EWELINK_APP_SECRET` secret** to `z4H0YNasMJy22CJYMJhCmBBpVsQVF4kP`

No code changes needed — the edge functions already read these from environment variables.

After updating, the user can click "Conectar eWeLink" on the IoT devices page to initiate the OAuth flow.

