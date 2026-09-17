# Fly.io staging deployment. Node pinned to a real, exact version rather
# than a floating `22`/`lts` tag — `node:sqlite` is still an experimental
# Node API (confirmed live: "SQLite is an experimental feature and might
# change at any time"), and this repo's own CI (.github/workflows/ci.yml)
# and local dev both already run 22.23.1; pinning the runtime image to the
# same exact version means "works in CI/dev" and "works in this image"
# stay the same claim, not two claims that happen to agree today.

FROM node:22.23.1-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.23.1-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Real npm test/tsc/eslint already gate merges via CI; this stage only
# builds. `output: "standalone"` (next.config.ts) is what makes the next
# two `COPY --from=builder` lines in the runner stage below sufficient —
# no `npm install` needed in the final image.
RUN npm run build

FROM node:22.23.1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# A real, non-root user — the same "don't run as root in a container"
# baseline every Next.js Docker reference deployment uses.
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# `/data` is where the Fly Volume mounts (see fly.toml) — created here so
# a first boot before the volume is warm still has a writable directory
# for `lib/backend/sqlite/db.ts`'s own `mkdirSync` to land in, and so the
# non-root `nextjs` user genuinely owns it rather than root.
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV SQLITE_DB_PATH=/data/backend.db

CMD ["node", "server.js"]
