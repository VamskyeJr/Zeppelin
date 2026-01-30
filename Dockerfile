FROM node:24 AS build

ARG COMMIT_HASH
ARG BUILD_TIME

WORKDIR /zeppelin

# Enable pnpm via corepack (recommended)
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

# Copy only lock & package files first (better caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
COPY dashboard/package.json dashboard/package.json

# Install all workspace dependencies
RUN CI=true pnpm install

# Copy rest of project
COPY . .

# Build backend
RUN pnpm --filter backend run build

# Build dashboard
RUN pnpm --filter dashboard run build

# Prune to production deps only
RUN pnpm prune --prod

# Add version info
RUN echo "${COMMIT_HASH}" > .commit-hash
RUN echo "${BUILD_TIME}" > .build-time


# --- Runtime image ---
FROM node:24-alpine AS main

WORKDIR /zeppelin

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

COPY --from=build /zeppelin /zeppelin

EXPOSE 3000

CMD ["pnpm", "--filter", "backend", "start"]
