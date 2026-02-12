# Stage 1: Build
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY tsconfig.json ./
COPY spec/ spec/
COPY packages/ packages/

# Build
RUN pnpm -F @ctview/core build
RUN pnpm -F @ctview/web build

# Stage 2: Runtime
FROM node:24-alpine AS runtime

RUN addgroup -S ctview && adduser -S ctview -G ctview

WORKDIR /app

# Copy built output
COPY --from=builder /app/packages/web/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/spec ./spec

# Create data directory
RUN mkdir -p /data && chown ctview:ctview /data

USER ctview

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/credittimeline.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/v1/ready || exit 1

CMD ["node", "build"]
