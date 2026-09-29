# syntax=docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

ARG BUN_VERSION
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
ARG VITE_BUILD_COMMIT=dev
ENV VITE_BUILD_COMMIT=$VITE_BUILD_COMMIT
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run generate-routes && bun run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Runtime configuration - set via env_file, -e, or orchestrator at deploy time.
ENV APP_URL=""
ENV SESSION_SECRET=""
ENV AUTHENTIK_ISSUER=""
ENV AUTHENTIK_CLIENT_ID=""
ENV AUTHENTIK_CLIENT_SECRET=""
ENV AUTHENTIK_API_URL=""
ENV AUTHENTIK_API_TOKEN=""
ENV AUTHENTIK_PUBLIC_URL=""
ENV HR_GROUP_NAME="HR"
ENV VORSTAND_GROUP_NAME="Vorstand"
ENV ADMIN_GROUP_NAME="Admin"
ENV AUTH_MOCK=""
ENV AUDIT_LOG_PATH="/app/data/audit.jsonl"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs \
  && mkdir -p /app/data \
  && chown nodejs:nodejs /app/data

COPY --from=build --chown=nodejs:nodejs /app/.output ./.output
COPY --from=build /app/package.json ./package.json

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["bun", ".output/server/index.mjs"]
