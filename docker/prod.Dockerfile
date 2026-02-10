# ===============================
# Stage 1: Build & Generate Prisma
# ===============================
FROM oven/bun:latest AS builder
WORKDIR /app

# openssl is required for some packages
RUN apt-get update -y && apt-get install -y openssl

# Copy dependency definitions
COPY bun.lock package.json tsconfig.json prisma.config.ts ./

# Install all dependencies (Prisma CLI needed for generate)
RUN bun install

# Copy prisma schema (multi-file: schema/, migrations/)
COPY prisma ./prisma

# copy documentation for prebuild (vitepress build)
COPY docs ./docs

# Copy application source (Prisma generate writes client into src/lib/db)
COPY src ./src

# prisma.config.ts uses env('DATABASE_URL') — read from build arg (e.g. .env); default for when not set
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Build the app (bundles to dist/)
RUN bun run build

# =====================
# Stage 2: Runtime only
# =====================
FROM oven/bun:latest
WORKDIR /app

# openssl is required for some packages
RUN apt-get update -y && apt-get install -y openssl

# Copy only what runtime needs: built app, deps, prisma client, config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/lib/db ./src/lib/db

# Runtime env: pass from build args or set at container run (env_file / environment in compose)
ARG BETTER_AUTH_BASE_URL
ARG CLIENT_URL
ARG NODE_ENV=production
ENV BETTER_AUTH_BASE_URL=${BETTER_AUTH_BASE_URL} \
    CLIENT_URL=${CLIENT_URL} \
    NODE_ENV=${NODE_ENV}

# Expose your application port
EXPOSE 3000

# Start the server (DATABASE_URL, BETTER_AUTH_BASE_URL, CLIENT_URL, NODE_ENV from env_file / environment)
CMD ["bun", "run", "start"]
