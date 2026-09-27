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
- `src/routes/` — UI routes (`/`, `/login`, `/kein-zugang`)

## Security

- Every `createServerFn` / API route that exposes private data must call `requireAppAccess` (or equivalent). Route `beforeLoad` is UX only.
- Separate Authentik application from Connect (own client id/secret, redirect `…/api/auth/callback`).

## Out of scope for now

EasyVerein API, queues, onboarding workflows, shared package with Connect.
