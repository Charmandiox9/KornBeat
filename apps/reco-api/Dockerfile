# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/reco-api/package.json apps/reco-api/
RUN corepack pnpm install --frozen-lockfile || corepack pnpm install
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/reco-api apps/reco-api
RUN corepack pnpm --filter @kornbeat/shared build && corepack pnpm --filter @kornbeat/reco-api build

# ---- Stage 2: runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && apk add --no-cache curl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/reco-api/node_modules ./apps/reco-api/node_modules
COPY --from=build /app/apps/reco-api/dist ./apps/reco-api/dist
COPY --from=build /app/apps/reco-api/package.json ./apps/reco-api/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
EXPOSE 3003
CMD ["node", "apps/reco-api/dist/main.js"]
