#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

run_backup() {
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  database="${PGDATABASE:?PGDATABASE is required}"
  backup_file="$BACKUP_DIR/${database}_${timestamp}.dump"

  echo "Starting PostgreSQL backup: $backup_file"
  pg_dump -Fc --no-owner --no-privileges --file="$backup_file"
  echo "PostgreSQL backup complete: $backup_file"
  ls -lh "$BACKUP_DIR"

  if [ -n "${BACKUP_CLOUD_REMOTE:-}" ]; then
    destination="${BACKUP_CLOUD_REMOTE%/}/$(basename "$backup_file")"
    echo "Uploading backup to $destination"
    if rclone copyto "$backup_file" "$destination"; then
      echo "Cloud upload complete: $destination"
    else
      echo "Cloud upload failed for $backup_file" >&2
    fi
  fi

  find "$BACKUP_DIR" -type f -name "*.dump" -mtime +"$BACKUP_RETENTION_DAYS" -print -delete
}

while true; do
  run_backup
  echo "Sleeping for $BACKUP_INTERVAL_SECONDS seconds"
  sleep "$BACKUP_INTERVAL_SECONDS"
done
