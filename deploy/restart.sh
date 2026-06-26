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

cp deploy/nginx/tcall.uz.conf /etc/nginx/sites-available/tcall.uz.conf
cp deploy/nginx/web.tcall.uz.conf /etc/nginx/sites-available/web.tcall.uz.conf
cp deploy/nginx/api.tcall.uz.conf /etc/nginx/sites-available/api.tcall.uz.conf
ln -sf /etc/nginx/sites-available/tcall.uz.conf /etc/nginx/sites-enabled/00-tcall.uz.conf
ln -sf /etc/nginx/sites-available/web.tcall.uz.conf /etc/nginx/sites-enabled/01-web.tcall.uz.conf
ln -sf /etc/nginx/sites-available/api.tcall.uz.conf /etc/nginx/sites-enabled/02-api.tcall.uz.conf
rm -f /etc/nginx/sites-enabled/tcall.uz /etc/nginx/sites-enabled/web.tcall.uz /etc/nginx/sites-enabled/api.tcall.uz 2>/dev/null || true

if command -v certbot &>/dev/null; then
  certbot certonly --nginx --cert-name tcall.uz --expand \
    -d tcall.uz -d www.tcall.uz -d web.tcall.uz -d api.tcall.uz \
    --non-interactive --agree-tos -m admin@tcall.uz 2>/dev/null || true
fi

nginx -t && systemctl reload nginx
pm2 status tcall
