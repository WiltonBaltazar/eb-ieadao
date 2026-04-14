#!/bin/sh
set -e

echo "Waiting for database..."
until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    sleep 2
done
echo "Database is ready."

[ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:" ] && php artisan key:generate --force

php artisan migrate --force
php artisan config:cache
php artisan route:cache

exec "$@"
