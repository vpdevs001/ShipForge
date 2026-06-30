# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────
# 1. deps — install dependencies in isolation so they're cached separately
#    from app source changes (rebuilds are fast unless package.json moves).
# ─────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────
# 2. builder — build the Next.js app (standalone output).
# ─────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These are only needed to satisfy build-time checks (e.g. env var access
# in route handlers evaluated at build time) — real secrets are injected
# at *runtime* via docker-compose's env_file, never baked into the image.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN bun run build

# ─────────────────────────────────────────────────────────────────────────
# 3. runner — minimal final image, runs as a non-root user.
# ─────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next.js standalone output — only the files actually needed at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["bun", "run", "server.js"]
