# Деплой на VPS (DigitalOcean $6, 1 vCPU / 1 GB, без Docker)

## 1. Подготовка дроплета (Ubuntu 24.04)

```bash
# swap 2 GB — обязательная страховка на 1 GB RAM
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

apt update && apt install -y postgresql-17 nginx certbot python3-certbot-nginx
```

## 2. PostgreSQL (тюнинг под 1 GB)

```bash
sudo -u postgres psql -c "CREATE USER sacramento WITH PASSWORD '<пароль>';"
sudo -u postgres psql -c "CREATE DATABASE sacramento OWNER sacramento;"
```

В `/etc/postgresql/17/main/postgresql.conf`:
```
shared_buffers = 128MB
max_connections = 20
work_mem = 4MB
```

Бэкап — ежедневный cron: `pg_dump sacramento | gzip > /var/backups/sacramento-$(date +%F).sql.gz`
(плюс встроенный CSV-снэпшот каталога в самом приложении).

## 3. Бэкенд

### Вариант A (основной): GraalVM native image
Сборка требует ~8 GB RAM — собираем НЕ на VPS (CI или локально):
```bash
mvn -Pnative native:compile        # нужен GraalVM JDK 25
scp target/sacramento-backend root@vps:/opt/sacramento/sacramento-backend
```
⚠️ Перед первым прод-релизом проверить в native-сборке экспорт XLSX (Apache POI
требует reachability-метаданных). Если падает — Вариант B.

### Вариант B (фолбэк): обычный JAR
```bash
mvn package
scp target/sacramento-backend-*.jar root@vps:/opt/sacramento/app.jar
# запуск: java -Xmx384m -XX:+UseSerialGC -jar app.jar
```

### systemd: `/etc/systemd/system/sacramento.service`
```ini
[Unit]
Description=Sacramento backend
After=postgresql.service

[Service]
WorkingDirectory=/opt/sacramento
# native image:
ExecStart=/opt/sacramento/sacramento-backend
# или JAR: ExecStart=/usr/bin/java -Xmx384m -XX:+UseSerialGC -jar /opt/sacramento/app.jar
Environment=SPRING_PROFILES_ACTIVE=prod
Environment=DB_PASSWORD=<пароль>
Environment=APP_CORS_ORIGINS=https://sacramento.md,https://admin.sacramento.md
Restart=always
RestartSec=5
User=sacramento

[Install]
WantedBy=multi-user.target
```

## 4. nginx

- `api.sacramento.md` → `proxy_pass http://127.0.0.1:8080` (+ `proxy_set_header X-Forwarded-For`)
- `admin.sacramento.md` → статика админки `/var/www/admin` (Vite build), фолбэк на index.html
- HTTPS: `certbot --nginx -d api.sacramento.md -d admin.sacramento.md`
- Лимит размера загрузки: `client_max_body_size 60m;`

Витрина (Next.js) деплоится на Vercel и ходит на `https://api.sacramento.md`.

## 5. Чек-лист после первого деплоя

1. Сменить пароль админа (`admin / sacramento2026`) через админку.
2. Загрузить учётный .xls: админка → Импорт → «Импорт учётного файла».
3. Проверить курс BNM на dashboard (подтянется в 07:00, или внести вручную).
4. Проверить, что ночной снэпшот появился (после 23:55).
