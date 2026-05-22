FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /repo

FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/icp/package.json ./packages/icp/
COPY packages/db/package.json ./packages/db/
COPY packages/scrapers/package.json ./packages/scrapers/
COPY apps/workers/package.json ./apps/workers/

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/workers ./apps/workers

RUN pnpm --filter @job-hunter/workers... build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml /repo/package.json ./
COPY --from=builder /repo/packages/icp/package.json ./packages/icp/
COPY --from=builder /repo/packages/icp/dist ./packages/icp/dist
COPY --from=builder /repo/packages/db/package.json ./packages/db/
COPY --from=builder /repo/packages/db/dist ./packages/db/dist
COPY --from=builder /repo/packages/scrapers/package.json ./packages/scrapers/
COPY --from=builder /repo/packages/scrapers/dist ./packages/scrapers/dist
COPY --from=builder /repo/apps/workers/package.json ./apps/workers/
COPY --from=builder /repo/apps/workers/dist ./apps/workers/dist

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3001
WORKDIR /app/apps/workers
CMD ["node", "dist/server.js"]
