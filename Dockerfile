# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/engine/package.json ./packages/engine/package.json
COPY packages/hooks/package.json ./packages/hooks/package.json
COPY packages/ui-tokens/package.json ./packages/ui-tokens/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build everything ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/engine/node_modules ./packages/engine/node_modules
COPY --from=deps /app/packages/hooks/node_modules ./packages/hooks/node_modules
COPY --from=deps /app/packages/ui-tokens/node_modules ./packages/ui-tokens/node_modules

COPY . .

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Build shared packages first, then apps
RUN pnpm build

# ── Stage 3: Production runner ──
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy Next.js standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy API build
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy shared packages (built)
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist
COPY --from=builder /app/packages/engine/package.json ./packages/engine/package.json
COPY --from=builder /app/packages/engine/node_modules ./packages/engine/node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json

# Copy Prisma schema + generated client
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.pnpm/prisma*/node_modules/prisma ./node_modules/prisma

# Root node_modules for shared deps
COPY --from=builder /app/node_modules ./node_modules

USER appuser

# Start script: run both web and api
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000 3001

# Default: start the Next.js web app
# Override with CMD to start API or both
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
