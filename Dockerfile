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
#    Note: deliberately Node here, not Bun. Next.js's standalone output is
#    plain Node and Bun's Node-compat layer has had edge cases with
#    streaming responses / some middleware — Node is the safer runtime even
#    though Bun built it.
# ─────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]