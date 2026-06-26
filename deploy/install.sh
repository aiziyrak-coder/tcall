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

source .env 2>/dev/null || true

# Build uchun devDependencies kerak (tailwindcss, typescript)
npm ci
npx prisma generate
npx prisma db push
mkdir -p public/uploads/avatars public/uploads/chat public/downloads

npm run build

export NODE_ENV=production

# PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

pm2 delete tcall 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

# Nginx — SSL bilan (cert: /etc/letsencrypt/live/tcall.uz/)
cp deploy/nginx/tcall.uz.conf /etc/nginx/sites-available/tcall.uz.conf
cp deploy/nginx/web.tcall.uz.conf /etc/nginx/sites-available/web.tcall.uz.conf
cp deploy/nginx/api.tcall.uz.conf /etc/nginx/sites-available/api.tcall.uz.conf
ln -sf /etc/nginx/sites-available/tcall.uz.conf /etc/nginx/sites-enabled/00-tcall.uz.conf
ln -sf /etc/nginx/sites-available/web.tcall.uz.conf /etc/nginx/sites-enabled/01-web.tcall.uz.conf
ln -sf /etc/nginx/sites-available/api.tcall.uz.conf /etc/nginx/sites-enabled/02-api.tcall.uz.conf
rm -f /etc/nginx/sites-enabled/tcall.uz /etc/nginx/sites-enabled/web.tcall.uz /etc/nginx/sites-enabled/api.tcall.uz 2>/dev/null || true

# Sertifikatga web.tcall.uz qo'shish (mavjud bo'lsa expand)
if command -v certbot &>/dev/null; then
  certbot certonly --nginx --cert-name tcall.uz --expand \
    -d tcall.uz -d www.tcall.uz -d web.tcall.uz -d api.tcall.uz \
    --non-interactive --agree-tos -m admin@tcall.uz 2>/dev/null || true
fi

nginx -t
systemctl reload nginx

echo "=== Tcall deploy tugadi ==="
pm2 status tcall
