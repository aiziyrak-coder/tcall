#!/bin/bash
# PM2 + nginx qayta ishga tushirish (ma'lumot yo'qotmasdan)
set -e
cd /var/www/tcall
git pull origin main 2>/dev/null || true

# Domen (.env) — web ilova manzili
if [ -f .env ]; then
  grep -q 'NEXT_PUBLIC_WEB_APP_URL' .env || echo 'NEXT_PUBLIC_WEB_APP_URL=https://web.tcall.uz' >> .env
  sed -i 's|NEXT_PUBLIC_APP_URL=https://tcall.uz|NEXT_PUBLIC_APP_URL=https://web.tcall.uz|g' .env
fi

npm install
npx prisma db push --accept-data-loss 2>/dev/null || true
mkdir -p public/uploads/avatars public/uploads/chat public/downloads
pm2 delete tcall 2>/dev/null || true
npm run build
pm2 start deploy/ecosystem.config.js
pm2 save

cp deploy/nginx/tcall.uz.conf /etc/nginx/sites-available/tcall.uz
cp deploy/nginx/web.tcall.uz.conf /etc/nginx/sites-available/web.tcall.uz
cp deploy/nginx/api.tcall.uz.conf /etc/nginx/sites-available/api.tcall.uz
ln -sf /etc/nginx/sites-available/tcall.uz /etc/nginx/sites-enabled/tcall.uz
ln -sf /etc/nginx/sites-available/web.tcall.uz /etc/nginx/sites-enabled/web.tcall.uz
ln -sf /etc/nginx/sites-available/api.tcall.uz /etc/nginx/sites-enabled/api.tcall.uz

nginx -t && systemctl reload nginx
if command -v certbot &>/dev/null; then
  certbot --nginx -d tcall.uz -d www.tcall.uz -d web.tcall.uz -d api.tcall.uz --non-interactive --agree-tos -m admin@tcall.uz --redirect 2>/dev/null || true
fi
pm2 status tcall
