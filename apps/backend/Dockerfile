FROM node:22-alpine AS build

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/backend/nest-cli.json ./apps/backend/
COPY apps/backend/tsconfig*.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/

RUN pnpm install --frozen-lockfile --filter echoon-backend...

COPY apps/backend ./apps/backend

RUN pnpm --filter echoon-backend prisma:generate \
  && pnpm --filter echoon-backend build

FROM node:22-alpine AS runtime

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma

CMD ["pnpm", "--filter", "echoon-backend", "start:prod"]

