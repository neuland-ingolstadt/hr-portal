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
- `src/lib/easyverein.server.ts` — EasyVerein API (pending applications / accept)
- `src/routes/api/auth/*` — login, callback, logout (+ mock for local)
- `src/routes/` — UI routes (`/`, `/login`, `/no-access`)

## Security

- Every `createServerFn` / API route that exposes private data must call `requireAppAccess` (or equivalent). Route `beforeLoad` is UX only.
- Separate Authentik application from Connect (own client id/secret, redirect `…/api/auth/callback`).

## Applications (EasyVerein)

- `/applications` lists members with `is_application=true` from EasyVerein.
- Accept dialog: create Authentik user + welcome mail, then PATCH EasyVerein (`is_application=false`, set `join_date` if missing).
- Authentik user gets `attributes.easyVereinMemberId` for later linkage.
- Manual Authentik create is a header action on `/applications` (edge cases without an EV application).
- Env: `EASYVEREIN_API_TOKEN`, optional `EASYVEREIN_API_BASE` (default `https://easyverein.com/api/v3.0`).

## Onboarding

- `/onboarding` is planned (coming soon). Prefer accepting via `/applications`.
- Shared create helpers live in `src/lib/onboarding*.ts` and the welcome email in `src/emails/welcome.tsx`.
- Env: `AUTHENTIK_API_*` (write users), optional `AUTHENTIK_DEFAULT_GROUP` / `AUTHENTIK_USER_PATH`, `AZURE_COMMUNICATION_SERVICE_CONNECTION_STRING`, `FROM_EMAIL`.

## Out of scope for now

Queues / checklist workflows, shared package with Connect, decline flow in EasyVerein.
