#!/bin/bash
set -e

APP_DIR="/var/www/tcall"
LOG_DIR="/var/log/tcall"
REPO="https://github.com/aiziyrak-coder/tcall.git"

echo "=== Tcall deploy boshlandi ==="

mkdir -p "$APP_DIR" "$LOG_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
fi

cd "$APP_DIR"

# .env fayl mavjud bo'lishi kerak (qo'lda yaratilgan)
if [ ! -f .env ]; then
  echo "XATO: $APP_DIR/.env topilmadi!"
  exit 1
fi

export NODE_ENV=production
source .env 2>/dev/null || true

npm ci
npx prisma generate
npx prisma db push --accept-data-loss

npm run build

# PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

pm2 delete tcall 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

# Nginx — faqat yangi fayllar, mavjudlarga tegmaymiz
cp deploy/nginx/tcall.vizara.uz.conf /etc/nginx/sites-available/tcall.vizara.uz
cp deploy/nginx/tcallapi.vizara.uz.conf /etc/nginx/sites-available/tcallapi.vizara.uz
ln -sf /etc/nginx/sites-available/tcall.vizara.uz /etc/nginx/sites-enabled/tcall.vizara.uz
ln -sf /etc/nginx/sites-available/tcallapi.vizara.uz /etc/nginx/sites-enabled/tcallapi.vizara.uz

nginx -t
systemctl reload nginx

# SSL (agar certbot bo'lsa)
if command -v certbot &>/dev/null; then
  certbot --nginx -d tcall.vizara.uz -d tcallapi.vizara.uz --non-interactive --agree-tos -m admin@vizara.uz --redirect 2>/dev/null || true
fi

echo "=== Tcall deploy tugadi ==="
pm2 status tcall
