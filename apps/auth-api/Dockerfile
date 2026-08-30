# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/auth-api/package.json apps/auth-api/
RUN corepack pnpm install --frozen-lockfile || corepack pnpm install
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/auth-api apps/auth-api
RUN corepack pnpm --filter @kornbeat/shared build && corepack pnpm --filter @kornbeat/auth-api build

# ---- Stage 2: runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && apk add --no-cache curl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/auth-api/node_modules ./apps/auth-api/node_modules
COPY --from=build /app/apps/auth-api/dist ./apps/auth-api/dist
COPY --from=build /app/apps/auth-api/package.json ./apps/auth-api/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
EXPOSE 3001
CMD ["node", "apps/auth-api/dist/main.js"]
