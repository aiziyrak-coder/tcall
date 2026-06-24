#!/bin/bash
# PM2 + nginx qayta ishga tushirish (ma'lumot yo'qotmasdan)
set -e
cd /var/www/tcall
git pull origin main 2>/dev/null || true
npx prisma db push 2>/dev/null || true
mkdir -p public/uploads/avatars public/uploads/chat
pm2 delete tcall 2>/dev/null || true
npm run build
pm2 start deploy/ecosystem.config.js
pm2 save
cp deploy/nginx/tcall.vizara.uz.conf /etc/nginx/sites-available/tcall.vizara.uz
cp deploy/nginx/tcallapi.vizara.uz.conf /etc/nginx/sites-available/tcallapi.vizara.uz
ln -sf /etc/nginx/sites-available/tcall.vizara.uz /etc/nginx/sites-enabled/tcall.vizara.uz
ln -sf /etc/nginx/sites-available/tcallapi.vizara.uz /etc/nginx/sites-enabled/tcallapi.vizara.uz
nginx -t && systemctl reload nginx
if command -v certbot &>/dev/null; then
  certbot --nginx -d tcall.vizara.uz -d tcallapi.vizara.uz --non-interactive --agree-tos -m admin@vizara.uz --redirect 2>/dev/null || true
fi
pm2 status tcall
