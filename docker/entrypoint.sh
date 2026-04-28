#!/usr/bin/env sh
set -eu

cd /var/www/html

if [ -z "${APP_KEY:-}" ]; then
    php artisan key:generate --force
fi

php artisan migrate --force

mkdir -p /run/nginx /var/log/nginx

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache || true

if [ ! -e /var/www/html/public/storage ]; then
    php artisan storage:link || true
fi

php-fpm -D
exec nginx -g 'daemon off;'
