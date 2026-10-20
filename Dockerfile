# Build stage (Bun)
# Pinned. `oven/bun:1` floats across every 1.x release, so two builds of the
# same commit could compile it with different toolchains — and the runtime that
# builds the bundle is as much a dependency as anything in package.json.
# 1.2.21 is the version `packageManager` records for elli-core.
FROM oven/bun:1.2.21 AS builder

WORKDIR /app

# The lockfile is copied and honoured. Without it `bun install` re-resolved
# every caret range at build time, so the image was built from dependency
# versions nothing had ever tested — and the tree does not currently compile
# against the newest ones those ranges allow.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Vite inlines `import.meta.env.VITE_*` at build time, so these have to be
# present *here* — they cannot be supplied when the container starts.
#
# They used to arrive by accident: `COPY . .` copied the developer's local
# `.env` and Vite read it, which is how the mock-data-fill button, the theme
# switcher and the recurring-bills QA clock could all be baked into a
# production bundle. `.dockerignore` now keeps `.env` out, and the values come
# in as build args instead.
#
# The three dev flags deliberately have no default. Absent is off in every
# reader, so an image built without them is the safe one.
ARG VITE_API_BASE_URL
ARG VITE_SENTRY_DSN
ARG VITE_ENABLE_POSTHOG
ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG VITE_PUBLIC_POSTHOG_HOST
ARG VITE_ENABLE_MOCK_DATA_FILL
ARG VITE_ENABLE_THEME_SWITCHER
ARG VITE_ENABLE_RECURRING_BILLS_QA_CLOCK

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN} \
    VITE_ENABLE_POSTHOG=${VITE_ENABLE_POSTHOG} \
    VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=${VITE_PUBLIC_POSTHOG_PROJECT_TOKEN} \
    VITE_PUBLIC_POSTHOG_HOST=${VITE_PUBLIC_POSTHOG_HOST} \
    VITE_ENABLE_MOCK_DATA_FILL=${VITE_ENABLE_MOCK_DATA_FILL} \
    VITE_ENABLE_THEME_SWITCHER=${VITE_ENABLE_THEME_SWITCHER} \
    VITE_ENABLE_RECURRING_BILLS_QA_CLOCK=${VITE_ENABLE_RECURRING_BILLS_QA_CLOCK}

# `build`, not `build:ng`: it runs `tsc -b` first. The image used to skip the
# typecheck entirely, so a type error reached a release unchallenged.
RUN bun run build

# Production stage (Nginx)
FROM nginx:alpine

COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Fails the build on a malformed server block or a missing include, rather
# than at container start in whatever environment first runs it.
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
