#!/bin/bash
# PM2 + nginx qayta ishga tushirish (ma'lumot yo'qotmasdan)
set -e
cd /var/www/tcall
git pull origin main 2>/dev/null || true

# Domen migratsiyasi (.env)
if [ -f .env ]; then
  sed -i 's|https://tcall.vizara.uz|https://tcall.uz|g' .env
  sed -i 's|https://tcallapi.vizara.uz|https://api.tcall.uz|g' .env
  sed -i 's|COOKIE_DOMAIN=.vizara.uz|COOKIE_DOMAIN=.tcall.uz|g' .env
fi

npm install
npx prisma db push 2>/dev/null || true
mkdir -p public/uploads/avatars public/uploads/chat
pm2 delete tcall 2>/dev/null || true
npm run build
pm2 start deploy/ecosystem.config.js
pm2 save

cp deploy/nginx/tcall.uz.conf /etc/nginx/sites-available/tcall.uz
cp deploy/nginx/api.tcall.uz.conf /etc/nginx/sites-available/api.tcall.uz
ln -sf /etc/nginx/sites-available/tcall.uz /etc/nginx/sites-enabled/tcall.uz
ln -sf /etc/nginx/sites-available/api.tcall.uz /etc/nginx/sites-enabled/api.tcall.uz

# Eski domen konfiglarini o'chirish (mavjud bo'lsa)
rm -f /etc/nginx/sites-enabled/tcall.vizara.uz /etc/nginx/sites-enabled/tcallapi.vizara.uz 2>/dev/null || true

nginx -t && systemctl reload nginx
if command -v certbot &>/dev/null; then
  certbot --nginx -d tcall.uz -d www.tcall.uz -d api.tcall.uz --non-interactive --agree-tos -m admin@tcall.uz --redirect 2>/dev/null || true
fi
pm2 status tcall
