FROM node:22-alpine AS build

WORKDIR /repo

ARG PNPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=$PNPM_REGISTRY

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
RUN pnpm config set registry "$PNPM_REGISTRY"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY apps/client/package.json ./apps/client/

RUN pnpm install --frozen-lockfile --filter echoon-client...

COPY apps/client ./apps/client

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN pnpm --filter echoon-client build

FROM nginx:alpine

COPY --from=build /repo/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

