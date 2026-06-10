#!/bin/sh
set -eu

mkdir -p /var/log/nginx
touch /var/log/nginx/access.log /var/log/nginx/error.log
chown nginx:nginx /var/log/nginx/access.log /var/log/nginx/error.log

(
  while true; do
    logrotate /etc/logrotate.d/nginx || true
    sleep 3600
  done
) &

exec nginx -g "daemon off;"
