# Neuland HR

Internal HR portal for Neuland Ingolstadt e.V. Authentik is the source of truth for users and roles; this app does not store members.

## Quick start

```bash
bun install
cp .env.example .env
bun run dev
```

App: http://127.0.0.1:43127

Without Authentik credentials, `/login` offers mock sign-in. Set env from [`.env.example`](.env.example).

## Authentik

Create a separate OAuth2/OIDC application (not Connect’s):

- Redirect URI: `{APP_URL}/api/auth/callback`
- Scopes: `openid`, `profile`, `email`, `groups`
- Attach Authentik’s **Group membership** scope mapping so the `groups` claim is in the ID token / UserInfo

Access requires membership in `HR`, `Vorstand`, or `Admin` (names via `HR_GROUP_NAME` / `VORSTAND_GROUP_NAME` / `ADMIN_GROUP_NAME`). Admin has the same app permissions as Vorstand.

`/mitglieder` loads name + groups from the Authentik API (`AUTHENTIK_API_URL` / `AUTHENTIK_API_TOKEN`). No emails are shown.

## Docker

```bash
bun run docker:build
docker run --rm -p 3000:3000 --env-file .env neuland-hr
```
