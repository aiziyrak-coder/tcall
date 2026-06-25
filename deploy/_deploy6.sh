#!/bin/bash
set -e
cd /var/www/tcall
git fetch origin --quiet
git reset --hard origin/main
git log --oneline -1
npm install --no-audit --no-fund --silent
npx prisma generate >/dev/null 2>&1 && echo generated
npx prisma db push --skip-generate 2>&1 | tail -n 3
npm run build 2>&1 | tail -n 3
pm2 restart tcall --update-env >/dev/null 2>&1
sleep 6
pm2 list | grep -E "tcall|vizara"
rm -f _deploy6.sh
echo "### DEPLOY_DONE"
