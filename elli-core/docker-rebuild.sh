#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

echo "Force rebuilding images (no cache)..."
docker compose build --no-cache

echo "Starting services..."
docker compose up "$@"
