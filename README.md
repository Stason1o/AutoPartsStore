# Sacramento — интернет-магазин автозапчастей

Молдова · цены в MDL по курсу НБМ · подбор запчастей по VIN.

| Часть | Стек | Статус |
|---|---|---|
| [backend/](backend/) | Java 25, Spring Boot 4, PostgreSQL 17, Flyway | ✅ готов |
| [frontend/storefront/](frontend/storefront/) | Next.js + MUI (SSR, Vercel) | ✅ готова |
| [frontend/admin/](frontend/admin/) | React + Vite + MUI (SPA, VPS) | ✅ готова |

## Запуск всего локально

```bash
./scripts/start-local.sh   # витрина :3030 · админка :5180 · API :8090 · Postgres :5544 (Docker)
./scripts/stop-local.sh    # остановить всё
```
Логин в админку: `admin / sacramento2026` (сменить после первого входа).

## Деплой на сервер (без Docker, GraalVM native)

```bash
./scripts/build-release.sh                      # собрать релиз (или `jar` — быстрый фолбэк)
scp release/sacramento-release.tar.gz root@IP:/root/
ssh root@IP 'tar xzf sacramento-release.tar.gz && cd sacramento && ./install.sh sacramento.md'
```

Полное руководство с диаграммами: **[docs/РУКОВОДСТВО.md](docs/РУКОВОДСТВО.md)**

## Документация

- [Спецификация](docs/specs/2026-06-10-autoparts-shop-spec.md)
- [План бэкенда](docs/plans/2026-06-10-backend-plan.md)
- [Промпт для дизайнера](docs/design/designer-prompt.md) (claude.ai/design)
- [Деплой на VPS](docs/ops/deploy.md)

## Запуск бэкенда локально

```bash
cd backend
docker compose -f compose.dev.yaml up -d   # PostgreSQL на :5544
mvn spring-boot:run                         # API на :8090
```

Админ по умолчанию: `admin / sacramento2026` (сменить после первого входа).

Тесты (Testcontainers, нужен Docker): `mvn test`

## Ключевые эндпоинты

| | |
|---|---|
| `POST /api/vin/decode` | VIN → автомобиль → кандидаты из справочника |
| `GET /api/products?search=&vehicleId=&inStock=` | каталог с фильтрами |
| `POST /api/orders` | оформление заказа (гость) |
| `POST /api/admin/login` | вход в админку (сессия + CSRF cookie) |
| `POST /api/admin/import` / `/api/admin/import/legacy` | импорт снэпшота / учётного .xls |
| `GET /api/admin/export/snapshots` | ежедневные CSV/XLSX выгрузки |
