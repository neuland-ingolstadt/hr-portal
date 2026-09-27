# Agent notes — Neuland HR

## Source of truth

- **Authentik is the SoT for users, groups, and access.** This app does **not** store members in an application database.
- Roles (`hr`, `vorstand`, `admin`) are derived from Authentik group membership (env-configurable names). `admin` has the same app permissions as `vorstand`.
- Prefer the OIDC `groups` claim (ID token / UserInfo). REST API group lookup is optional fallback only (`sub` UUID is not a valid Authentik user path id).
- Do not add a local user/member table or sync users into Postgres/SQLite for identity.

## Layout

- `src/lib/config.ts` — `serverConfig` (server-only secrets / env)
- `src/lib/auth.ts` — client-safe types/helpers
- `src/lib/auth.server.ts` — OIDC, Authentik API, RBAC helpers
- `src/lib/session.ts` — encrypted httpOnly session cookie
- `src/routes/api/auth/*` — login, callback, logout (+ mock for local)
- `src/routes/` — UI routes (`/`, `/login`, `/no-access`)

## Security

- Every `createServerFn` / API route that exposes private data must call `requireAppAccess` (or equivalent). Route `beforeLoad` is UX only.
- Separate Authentik application from Connect (own client id/secret, redirect `…/api/auth/callback`).

## Onboarding

- `/onboarding` creates Authentik users (`firstname.lastname`, path `neuland-ldap`) and sends the welcome mail via Azure Communication Services + React Email (`src/emails/welcome.tsx`).
- Env: `AUTHENTIK_API_*` (write users), optional `AUTHENTIK_DEFAULT_GROUP` / `AUTHENTIK_USER_PATH`, `AZURE_COMMUNICATION_SERVICE_CONNECTION_STRING`, `FROM_EMAIL`.

## Out of scope for now

EasyVerein API, queues / checklist workflows, shared package with Connect.
