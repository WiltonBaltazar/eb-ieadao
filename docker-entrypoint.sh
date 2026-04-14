#!/bin/sh
set -e

# Wait for MariaDB to accept connections
echo "Waiting for database..."
until php -r "new PDO('mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    sleep 2
done
echo "Database is ready."

# Generate app key if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:" ]; then
    php artisan key:generate --force
fi

# Run migrations
php artisan migrate --force

# Clear & cache config/routes for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
