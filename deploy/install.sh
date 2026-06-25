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
npx prisma db push
mkdir -p public/uploads/avatars public/uploads/chat

npm run build

# PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

pm2 delete tcall 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

# Nginx
cp deploy/nginx/tcall.uz.conf /etc/nginx/sites-available/tcall.uz
cp deploy/nginx/api.tcall.uz.conf /etc/nginx/sites-available/api.tcall.uz
ln -sf /etc/nginx/sites-available/tcall.uz /etc/nginx/sites-enabled/tcall.uz
ln -sf /etc/nginx/sites-available/api.tcall.uz /etc/nginx/sites-enabled/api.tcall.uz
rm -f /etc/nginx/sites-enabled/tcall.vizara.uz /etc/nginx/sites-enabled/tcallapi.vizara.uz 2>/dev/null || true

nginx -t
systemctl reload nginx

if command -v certbot &>/dev/null; then
  certbot --nginx -d tcall.uz -d www.tcall.uz -d api.tcall.uz --non-interactive --agree-tos -m admin@tcall.uz --redirect 2>/dev/null || true
fi

echo "=== Tcall deploy tugadi ==="
pm2 status tcall
