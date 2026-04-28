FROM php:8.3-fpm-bookworm AS base

WORKDIR /var/www/html

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    PATH="/root/.composer/vendor/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
        bash \
        curl \
        git \
        libbz2-dev \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libonig-dev \
        libpng-dev \
        libxml2-dev \
        libzip-dev \
        nginx \
        unzip \
        wget \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        dom \
        exif \
        gd \
        intl \
        mbstring \
        pcntl \
        pdo_mysql \
        xml \
        zip

RUN docker-php-source extract \
    && mkdir -p /usr/local/include/php/ext/dom \
    && cp /usr/src/php/ext/dom/dom_ce.h /usr/local/include/php/ext/dom/dom_ce.h \
    && docker-php-source delete

RUN docker-php-ext-install -j"$(nproc)" \
        simplexml \
        xmlreader \
        xmlwriter

FROM node:22-bookworm-slim AS frontend

WORKDIR /app

COPY package.json package-lock.json vite.config.js tsconfig*.json ./
COPY postcss.config.js tailwind.config.js ./
COPY resources ./resources
COPY public ./public
COPY routes ./routes
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database

RUN npm ci
RUN npm run build

FROM base AS vendor

COPY composer.json composer.lock artisan ./
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY public ./public
COPY resources ./resources
COPY routes ./routes
COPY storage ./storage

RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-progress

FROM base

COPY --from=vendor /var/www/html/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build
COPY . .
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /run/nginx /var/log/nginx \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8086

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
