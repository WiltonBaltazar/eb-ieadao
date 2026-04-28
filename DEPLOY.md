# IEADAO Presenças — Deployment Guide

## Coolify + Dockerfile

This project now ships a Dockerfile for Coolify deployments. Use this path for production on the Docker-based stack.

### Coolify settings

- Build method: Dockerfile from the repo root
- Container port: `8086`
- Healthcheck: keep enabled only if the image has `wget` or `curl` available
- Runtime env vars: configure them in Coolify, do not bake a local `.env` into the image
- Persistent uploads: mount a volume for `storage` if needed
- `APP_KEY` should still be set in Coolify, but the container will generate a fallback key if it is missing

### Required production env vars

Set these in Coolify before deploy:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
APP_KEY=base64:...

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ieadao_db
DB_USERNAME=ieadao_user
DB_PASSWORD=strong_password
```

Notes:

- Set `APP_KEY` in Coolify so it stays stable between deploys
- The container can generate a fallback key if `APP_KEY` is missing, but that is only a safety net
- Do not use `DB_CONNECTION=sqlite` in production
- The image exposes port `8086`, so Coolify should map traffic to that port
- The container runs migrations on boot, so database access must be ready when the app starts

### Recommended deploy flow

1. Push the branch to GitHub
2. Let Coolify build the Docker image from the repo root
3. Confirm the container starts on port `8086`
4. If this is the first deploy, optionally run `php artisan db:seed --force`

### Troubleshooting

#### Healthcheck problems

These are Coolify/container startup issues, not Laravel exceptions.

- If the container is marked unhealthy, check whether the image has `wget` or `curl`
- If Coolify healthchecks `/` and fails immediately, confirm the app is listening on `8086`
- If the healthcheck fails before app logs show a Laravel exception, the problem is usually the container healthcheck command or port mapping
- If needed, disable the Coolify healthcheck temporarily while you confirm the app boots

#### Laravel app 500s

These are application/runtime issues after nginx and PHP-FPM are already running.

- Check `storage/logs/laravel.log` for the actual exception
- Verify `APP_KEY` is set in Coolify
- Verify the production database is reachable and migrated
- Make sure the `settings`, `cache`, and `sessions` tables exist if the app uses those drivers
- If the first page load 500s, remember `HandleInertiaRequests` reads the `settings` table on request
- If the container starts but the app returns 500, the issue is inside Laravel, not Coolify's healthcheck

## Environment Setup

Copy `.env.example` to `.env` and configure:

```env
APP_NAME="IEADAO Presenças"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ieadao_db
DB_USERNAME=ieadao_user
DB_PASSWORD=strong_password

SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

**Important:** Never use `DB_CONNECTION=sqlite` in production.
For Docker/Coolify, keep `APP_KEY`, database settings, and other secrets in the platform environment variables instead of baking them into the image.

## Build Steps (run in order)

```bash
# 1. Install PHP dependencies
composer install --optimize-autoloader --no-dev

# 2. Generate app key (first deploy only)
php artisan key:generate

# 3. Build frontend assets (REQUIRED before migrate)
npm install
npm run build

# 4. Clear and cache config
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Run migrations
php artisan migrate --force

# 6. Seed initial data (first deploy only)
php artisan db:seed --force

# 7. Set permissions
chmod -R 775 storage bootstrap/cache
```

## cPanel / Shared Hosting Deployment

### Directory Structure
If your cPanel account root is `/home/username/`:

```
/home/username/
├── .htaccess          ← root redirect to public/
├── public_html/       ← point domain here OR
│   └── (symlink or copy public/ contents)
└── laravel/           ← app root
    ├── public/
    ├── app/
    └── ...
```

### Option A: Laravel in subdirectory (recommended)
1. Upload all files to `/home/username/ieadao/`
2. The root `.htaccess` redirects to `public/`
3. Set document root in cPanel to `/home/username/ieadao/public`

### Option B: public_html deployment
1. Upload non-public files to `/home/username/laravel/`
2. Copy/symlink `public/` contents to `public_html/`
3. Edit `public_html/index.php` to point to correct app path:
   ```php
   require __DIR__.'/../laravel/vendor/autoload.php';
   $app = require_once __DIR__.'/../laravel/bootstrap/app.php';
   ```

### Vite Assets (npm run build)
After `npm run build`, the compiled assets are in `public/build/`.
Always run `npm run build` **before** deploying or running `php artisan` commands.

The `public/build/manifest.json` must exist for Vite to work in production.

## FK Error 1215 (Cannot add foreign key)

If migration fails with SQLSTATE[HY000]: General error: 1215:

**Cause:** Table creation order or missing referenced table.

**Fix:**
```sql
-- Check which tables exist
SHOW TABLES;

-- Drop all app tables and re-migrate (careful with data!)
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS attendances, study_sessions, users, classrooms, settings;
SET FOREIGN_KEY_CHECKS=1;
php artisan migrate --force
```

**Or use the defensive FK migration** (already included) which skips existing constraints.

## Partial Migration Recovery

If a deploy was interrupted mid-migration:

```bash
# Check migration status
php artisan migrate:status

# Roll back only failed migrations
php artisan migrate:rollback --step=1

# Or reset and start fresh (DATA LOSS)
php artisan migrate:fresh --seed
```

## MySQL vs SQLite Notes

- `.env` for local: `DB_CONNECTION=sqlite`
- `.env` for production: `DB_CONNECTION=mysql`
- InnoDB engine is set explicitly on FK tables for MySQL compatibility
- The FK migration uses `information_schema` queries — SQLite-safe (skipped on SQLite)
- `->change()` is avoided entirely to prevent Doctrine DBAL issues on shared hosting

## Seeded Credentials

After `php artisan db:seed`:
- Admin: `admin@ieadao.pt` / `password`
- Teacher: `professor@ieadao.pt` / `password`
- Students: phone numbers `912345001` through `912345010`
