# Google Drive Re-auth Runbook

Student uploads are written to Google Drive through **OAuth 2.0** configured by:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

The refresh token is long-lived but is user-revocable and tied to the account + client +
scopes it was issued for. Re-auth when `/ready` reports `"drive":"down"`, uploads fail with
token/expiry errors in the logs, or admin can no longer stream submissions.

Alternatively the backend can use a service-account fallback
(`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`). If that path is
active (OAuth env vars empty), this runbook does not apply - rotate the service-account key
in Google Cloud instead.

## 1. Run the consent flow

```bash
cd backend
npm run get-token           # ts-node scripts/get-oauth-token.ts
```

What `get-oauth-token.ts` does:

1. Reads `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` from `backend/.env`
   (prompts for them if absent).
2. Prints a consent URL (`access_type=offline`, `prompt=consent`, Drive scope). You must
   authorize with the **same college account that owns (or is granted access to) the target
   Drive folder** in `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
3. Opens a local listener on `http://localhost:3000/oauth2callback` to catch the redirect,
   then prints the new refresh token.

Authorizing with `access_type=offline` + `prompt=consent` forces a fresh refresh token even
if one already exists for the account.

## 2. Update the secret everywhere it is stored

```bash
# local / staging
# edit backend/.env: replace GOOGLE_OAUTH_REFRESH_TOKEN with the printed value
```

- Render (staging service): environment -> `GOOGLE_OAUTH_REFRESH_TOKEN` -> save.
- Render (production service): same, then deploy so the change takes effect.

Keep `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` aligned across all three
locations - mismatched client + token pairs fail with `invalid_grant`.

## 3. Verify

1. `curl -s https://<render-service>.onrender.com/ready` - expect `drive: "ok"`.
2. On a staging or production site, sign in as a roster student and upload a small test
   video.
3. In the admin review list, confirm the new submission appears and its video streams.

## Rollback

If the new token fails, redeploy with the previous `GOOGLE_OAUTH_REFRESH_TOKEN` value (keep
the old token recorded until verification passes). Refresh tokens do not expire by time;
only rotation or user revocation invalidates them.