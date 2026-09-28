# Agent notes - Neuland HR

## Source of truth

- **Authentik is the SoT for users, groups, and access.** This app does **not** store members in an application database.
- Roles (`hr`, `vorstand`, `admin`) are derived from Authentik group membership (env-configurable names). `admin` has the same app permissions as `vorstand`.
- Prefer the OIDC `groups` claim (ID token / UserInfo). REST API group lookup is optional fallback only (`sub` UUID is not a valid Authentik user path id).
- OIDC `sub_mode` may be `hashed_user_id`. Directory identity then comes from custom claim `uuid` (Authentik user UUID) on the ID token / UserInfo - stored on the session as `user.uuid`. Onboarding contact matching uses that UUID (not hashed `sub`). If the claim is missing, login / “Mine” fill it once via Authentik API by email.
- Do not add a local user/member table or sync users into Postgres/SQLite for identity.
- **App access** (`requireAppAccess`): `hr` | `vorstand` | `admin`.
- **Elevated** (`requireElevatedAccess` / `hasElevatedAccess`): `vorstand` | `admin` only - applications list/accept, manual member create, member email in directory, offboarding list/actions, **member profile group edit** (ressorts only), **audit log**. HR must not see or act on applications or offboarding.
- Profile group edit never mutates protected Authentik groups: HR, Vorstand, Admin, Ehrenmitglied, technical-users, mitglieder.

## Layout

- `src/lib/config.ts` - `serverConfig` (server-only secrets / env)
- `src/lib/auth.ts` - client-safe types/helpers
- `src/lib/auth.server.ts` - OIDC, Authentik API, RBAC helpers
- `src/lib/authentik-api.server.ts` - shared Authentik REST helpers (headers, fetch, UUID/group resolve)
- `src/lib/authentik-members.server.ts` - barrel; impl in `src/lib/authentik-members/` (directory, profile, stats, onboarding, mock)
- `src/lib/session.ts` - encrypted httpOnly session cookie
- `src/lib/easyverein.server.ts` - EasyVerein API (pending applications / accept)
- Domain modules use `*.ts` (client-safe types) → `*.server.ts` (impl) → `*.functions.ts` (`createServerFn` + auth). Offboarding types/fns live under `offboarding.*`; onboarding contact/stage under `onboarding.*`.
- `src/routes/api/auth/*` - login, callback, logout (+ mock for local)
- `src/routes/` - UI routes (`/`, `/login`, `/no-access`)

## Security

- Every `createServerFn` / API route that exposes private data must call `requireAppAccess` or `requireElevatedAccess`. Route `beforeLoad` is UX only.
- Applications + member create + offboarding use `requireElevatedAccess` (not HR).
- Separate Authentik application from Connect (own client id/secret, redirect `…/api/auth/callback`).
- **Audit trail** (`/audit`, Vorstand/Admin): append-only JSONL at `AUDIT_LOG_PATH` (default `data/audit.jsonl`). Authentik API calls use the service token; the OIDC session user is recorded as actor at each mutation gate. Also emits `[audit]` JSON lines to stdout. Mount a volume in production. Not an identity store.

## Applications (EasyVerein)

- `/applications` is Vorstand/Admin only. Lists members with `is_application=true` from EasyVerein.
- Accept dialog: create Authentik user + welcome mail, then PATCH EasyVerein (`is_application=false`, set `join_date` if missing).
- After accept, automatically set EasyVerein SEPA mandate when IBAN is present and `sepa_mandate` is empty (`sepa_date` = `application_date` or today; reference `NL{memberId}-{YYYYMMDD}`). Never fails the accept; UI alerts only when mandate could not be set.
- Authentik user gets `attributes.easyVereinMemberId` for later linkage.
- Manual Authentik create is a header action on `/applications` (edge cases without an EV application).
- Env: `EASYVEREIN_API_TOKEN`, optional `EASYVEREIN_API_BASE` (default `https://easyverein.com/api/v3.0`).
- Local backfill of missing `easyVereinMemberId`: `bun run backfill:easyverein` (dry-run; `--apply` for email matches, `--apply-name` after reviewing name-only matches).

## Onboarding

- `/onboarding` MVP: lists Mitglieder with Authentik accounts created in the last 12 weeks (`date_joined`) as profile cards, grouped by `onboardingStage`. Prefer accepting via `/applications`.
- Human progress: Authentik `attributes.onboardingStage` (0–4: new → conversation → project → engaging → done). Cards group by stage with a top-edge fill for progress; editable from the member profile (`requireAppAccess`). Not a checklist/queue.
- Staff contact (Betreuung): Authentik `attributes.onboardingContact` (Authentik user UUID / OIDC `uuid` claim of HR, Vorstand, or Admin). Profile picker + “Assign to me”; onboarding board filters all / mine / unassigned. Audit: `member.onboarding_contact.update`. Assigning to someone else sends a privacy-minimal staff mail (mentee first name + assigner + link to `/onboarding`; no email/username). List path avoids staff-group expand (resolves labels only for unique contacts present).
- Shared create helpers live in `src/lib/onboarding*.ts` and the welcome email in `src/emails/welcome.tsx`. Mentor assignment mail: `src/emails/onboarding-contact-assigned.tsx`.
- Env: `AUTHENTIK_API_*` (write users), optional `AUTHENTIK_DEFAULT_GROUP` / `AUTHENTIK_USER_PATH`, `AZURE_COMMUNICATION_SERVICE_CONNECTION_STRING`, `FROM_EMAIL`.

## Out of scope for now

Queues / checklist workflows, shared package with Connect, decline flow in EasyVerein.

## Offboarding

- `/offboarding` is Vorstand/Admin only (`requireElevatedAccess` / `requireElevatedUser`). HR has no nav entry or API access.
- Two-step Authentik pipeline (no EasyVerein writes):
  1. **Revoke Mitglieder** - missing `easyVereinMemberId`, or linked EV id that has left / is missing (read-only EV check); stamps `attributes.membershipRevokedAt`. Future `resignation_date` stays watchlist-only.
  2. **Delete account** - only accounts with `membershipRevokedAt` set (`DELETE /core/users/{pk}/`)
- Step 1 reconciles linked Mitglieder against EasyVerein member + wastebasket snapshots (cached ~5 min).
- Step 2 ignores “no Mitglieder” alone so random non-member accounts are not delete candidates.
- Mutations re-check eligibility against that candidate set (reject watchlist / arbitrary IDs / self).
- **Prozess starten** (button, not on visit / not cron): auto-revokes due stage-1 candidates and hard-deletes stage-2 past `OFFBOARDING_DELETE_GRACE_DAYS` (default 14). Per-row actions remain available.
- Desktop: both stage tables side by side.
