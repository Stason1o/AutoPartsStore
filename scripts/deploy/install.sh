#!/usr/bin/env bash
# ============================================================
#  Sacramento — установка на дроплет (Ubuntu 24.04, БЕЗ Docker)
#  Запускать от root из распакованного релиза:  ./install.sh sacramento.md
#
#  Ставит и настраивает:
#   PostgreSQL (нативно) · бэкенд (native-бинарник или JAR, systemd)
#   витрину Next.js (node, systemd) · админку (статика) · nginx · swap · бэкапы
#  Повторный запуск безопасен — это и способ обновления (новый релиз поверх).
# ============================================================
set -euo pipefail

DOMAIN="${1:-sacramento.md}"
APP_DIR="/opt/sacramento"
HERE="$(cd "$(dirname "$0")" && pwd)"

say() { printf "\n\033[1;34m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }

[ "$(id -u)" = "0" ] || { echo "Запускайте от root"; exit 1; }

# ---------- swap (страховка для 1 ГБ RAM) ----------
if [ ! -f /swapfile ]; then
  say "Создаю swap 2 ГБ..."
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap включён"
fi

# ---------- пакеты ----------
say "Ставлю PostgreSQL, nginx, certbot..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql nginx certbot python3-certbot-nginx >/dev/null
ok "Пакеты установлены"

if [ -d "${HERE}/storefront" ] && ! command -v node >/dev/null; then
  say "Ставлю Node.js 22 (для витрины)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
  ok "Node $(node --version)"
fi

# ---------- база ----------
ENV_FILE="${APP_DIR}/env"
if [ ! -f "${ENV_FILE}" ]; then
  say "Создаю базу и пользователя..."
  DB_PASSWORD="$(openssl rand -hex 18)"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='sacramento'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE USER sacramento WITH PASSWORD '${DB_PASSWORD}';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='sacramento'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE sacramento OWNER sacramento;"
  # тюнинг под 1 ГБ RAM
  sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers='128MB';" >/dev/null
  sudo -u postgres psql -c "ALTER SYSTEM SET max_connections='20';" >/dev/null
  systemctl restart postgresql
  mkdir -p "${APP_DIR}"
  cat >"${ENV_FILE}" <<EOF
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://localhost:5432/sacramento
DB_USER=sacramento
DB_PASSWORD=${DB_PASSWORD}
SERVER_PORT=8080
APP_CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN},https://admin.${DOMAIN}
EOF
  chmod 600 "${ENV_FILE}"
  ok "База создана, пароль сохранён в ${ENV_FILE}"
else
  ok "База уже настроена (${ENV_FILE}) — пропускаю"
fi

# ---------- файлы приложения ----------
say "Раскладываю файлы в ${APP_DIR}..."
id -u sacramento >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d "${APP_DIR}" sacramento
mkdir -p "${APP_DIR}"
systemctl stop sacramento-api sacramento-storefront 2>/dev/null || true
if [ -f "${HERE}/sacramento-backend" ]; then
  install -m 755 "${HERE}/sacramento-backend" "${APP_DIR}/sacramento-backend"
  BACKEND_EXEC="${APP_DIR}/sacramento-backend"
  rm -f "${APP_DIR}/app.jar"
elif [ -f "${HERE}/app.jar" ]; then
  install -m 644 "${HERE}/app.jar" "${APP_DIR}/app.jar"
  command -v java >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-25-jre-headless >/dev/null \
    || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-21-jre-headless >/dev/null
  BACKEND_EXEC="$(command -v java) -Xmx384m -XX:+UseSerialGC -jar ${APP_DIR}/app.jar"
else
  echo "Не найден ни sacramento-backend, ни app.jar"; exit 1
fi
rm -rf "${APP_DIR}/admin" "${APP_DIR}/storefront"
cp -R "${HERE}/admin" "${APP_DIR}/admin"
[ -d "${HERE}/storefront" ] && cp -R "${HERE}/storefront" "${APP_DIR}/storefront"
chown -R sacramento:sacramento "${APP_DIR}"
ok "Файлы на месте"

# ---------- systemd ----------
say "Настраиваю systemd..."
cat >/etc/systemd/system/sacramento-api.service <<EOF
[Unit]
Description=Sacramento backend API
After=postgresql.service
Wants=postgresql.service

[Service]
User=sacramento
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${BACKEND_EXEC}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

if [ -d "${APP_DIR}/storefront" ]; then
  cat >/etc/systemd/system/sacramento-storefront.service <<EOF
[Unit]
Description=Sacramento storefront (Next.js)
After=sacramento-api.service

[Service]
User=sacramento
WorkingDirectory=${APP_DIR}/storefront
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=API_URL=http://127.0.0.1:8080
Environment=NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
fi

systemctl daemon-reload
systemctl enable --now sacramento-api >/dev/null
[ -d "${APP_DIR}/storefront" ] && systemctl enable --now sacramento-storefront >/dev/null
ok "Сервисы запущены"

# ---------- nginx ----------
say "Настраиваю nginx для ${DOMAIN}..."
cat >/etc/nginx/sites-available/sacramento <<EOF
# Витрина — корневой домен
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Админка — статика + API через тот же домен (cookie-сессия без CORS)
server {
    listen 80;
    server_name admin.${DOMAIN};
    client_max_body_size 60m;
    root ${APP_DIR}/admin;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / { try_files \$uri /index.html; }
}

# Чистый API (понадобится, если витрину перенесёте на Vercel)
server {
    listen 80;
    server_name api.${DOMAIN};
    client_max_body_size 60m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/sacramento /etc/nginx/sites-enabled/sacramento
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "nginx настроен"

# ---------- бэкапы ----------
mkdir -p /var/backups/sacramento
cat >/etc/cron.d/sacramento-backup <<EOF
30 23 * * * postgres pg_dump sacramento | gzip > /var/backups/sacramento/db-\$(date +\%F).sql.gz
40 23 * * * root find /var/backups/sacramento -name '*.sql.gz' -mtime +14 -delete
EOF
ok "Ежедневный бэкап БД настроен (23:30, хранится 14 дней)"

# ---------- итог ----------
sleep 3
echo
say "Проверка:"
curl -sf http://127.0.0.1:8080/actuator/health && echo "  <- API живой" || echo "  ✗ API не отвечает: journalctl -u sacramento-api -n 50"
[ -d "${APP_DIR}/storefront" ] && { curl -sfo /dev/null http://127.0.0.1:3000 && echo "  ✓ Витрина живая" || echo "  ✗ Витрина: journalctl -u sacramento-storefront -n 50"; }

cat <<EOF

============================================================
 Установка завершена. Осталось:
 1. DNS: A-записи  @ , www , admin , api  -> IP этого сервера
 2. HTTPS: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d admin.${DOMAIN} -d api.${DOMAIN}
 3. Зайти на https://admin.${DOMAIN} (admin / sacramento2026) и СМЕНИТЬ ПАРОЛЬ
 4. Загрузить учётный .xls: Импорт/экспорт -> «Импорт учётного файла»

 Обновление: соберите новый релиз, скопируйте и снова ./install.sh ${DOMAIN}
============================================================
EOF
