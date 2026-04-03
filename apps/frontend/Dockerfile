FROM node:22-alpine AS build

WORKDIR /repo

ARG PNPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=$PNPM_REGISTRY

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

RUN pnpm config set registry "$PNPM_REGISTRY"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile --filter echoon-frontend...

COPY apps/frontend ./apps/frontend

ARG VITE_SERVER_URL
ARG VITE_AUTH_BASE_URL
ARG VITE_ASSET_URL
ARG VITE_BASE_PATH
ARG VITE_PIPETCAT_URL

ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_AUTH_BASE_URL=$VITE_AUTH_BASE_URL
ENV VITE_ASSET_URL=$VITE_ASSET_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_PIPETCAT_URL=$VITE_PIPETCAT_URL

RUN pnpm --filter echoon-frontend build

FROM nginx:alpine AS runtime

COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

