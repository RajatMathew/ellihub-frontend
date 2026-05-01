# Build stage (Bun)
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build:ng

# Production stage (Nginx)
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
