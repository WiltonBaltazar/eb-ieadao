# IEADAO Presenças — Deployment Guide

## Shared Hosting / cPanel

This project is set up to deploy on shared hosting with Apache and PHP.

### Recommended layout

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

### Option A: Laravel in subdirectory

1. Upload all files to `/home/username/ieadao/`
2. Set the document root in cPanel to `/home/username/ieadao/public`
3. Use the root [`.htaccess`](/Users/macbookpro/Sites/Codex/eb-ieadao/.htaccess) if your host requires requests to pass through `public/`

### Option B: public_html deployment

1. Upload non-public files to `/home/username/laravel/`
2. Copy or symlink `public/` contents to `public_html/`
3. Use [public/.htaccess](/Users/macbookpro/Sites/Codex/eb-ieadao/public/.htaccess) for Laravel routing and HTTPS
4. Make sure `public_html/` contains at least:
   - `index.php`
   - `.htaccess`
   - `build/`
   - `favicon.ico`
   - `robots.txt`
5. If `public_html/index.php` was copied manually, update the paths so they point to the real app folder:
   ```php
   require __DIR__.'/../laravel/vendor/autoload.php';
   $app = require_once __DIR__.'/../laravel/bootstrap/app.php';
   ```

### SSL / HTTPS

The `.htaccess` files in this repo:

- keep Laravel routing working behind Apache
- send requests to `public/index.php`

On shared hosting, it is usually better to let cPanel or your hosting panel manage SSL and HTTPS redirects. Enable the certificate first, then turn on "Force HTTPS" in the host panel if you want it.

## 404 Troubleshooting

If the site shows a 404 after deployment, it is usually one of these:

1. The domain is pointing to the wrong folder.
   - Best case: point the domain directly to `/home/username/ieadao/public`
   - If the domain points to `public_html`, then `public_html/index.php` and `public_html/.htaccess` must be present
2. Apache rewrites are not being applied.
   - Ensure `mod_rewrite` is enabled on the host
   - Ensure the correct `.htaccess` file is in the actual web root, not only in the repo root
3. The app is being served from the repo root instead of `public/`.
   - Laravel must enter through `public/index.php`
4. The Vite assets are missing.
   - Check that `public/build/manifest.json` exists after `npm run build`
5. The host is showing a Laravel route 404, not an Apache 404.
   - If Apache is working, `/` should redirect to the student login route defined in `routes/web.php`

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
Keep `APP_KEY`, database settings, and other secrets in your hosting panel or `.env` file on the server.

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
Always run `npm run build` **before** uploading the project or running `php artisan` commands on shared hosting.

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
