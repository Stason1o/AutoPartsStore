# Sacramento Backend — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline).
> Спецификация: `docs/specs/2026-06-10-autoparts-shop-spec.md`.

**Goal:** REST API бэкенд магазина автозапчастей: каталог, VIN-подбор, цены по курсу BNM,
заказы, фото в БД, ежедневный снэпшот CSV/XLSX + импорт, админ-аутентификация.

**Architecture:** монолит Spring Boot 4 (Java 25), модули по пакетам
`md.sacramento.{catalog,vehicles,pricing,orders,importexport,media,auth,config,common}`.
PostgreSQL 17 + Flyway. Сессионная аутентификация админа (Spring Security 7).
Локальная разработка: Postgres в Docker (порт **5544**), приложение на **8081**.
Тесты: JUnit 5 + Testcontainers + MockMvc.

**Tech Stack:** Spring Boot 4.0.6, Spring Data JPA, Spring Security, Flyway,
PostgreSQL 17, Apache POI (XLSX/XLS), OpenCSV, Thumbnailator (миниатюры), springdoc-openapi.

---

## Контракты (фиксируются здесь, используются во всех задачах)

### Схема БД (Flyway `V1__init.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  markup_percent NUMERIC(6,2),            -- переопределение глобальной наценки
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT,
  description TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price NUMERIC(12,2),
  purchase_currency CHAR(3) NOT NULL DEFAULT 'USD',   -- USD | MDL
  markup_percent NUMERIC(6,2),             -- переопределение (товар > категория > глобал)
  retail_price NUMERIC(12,2),               -- всегда в MDL
  retail_price_manual BOOLEAN NOT NULL DEFAULT FALSE,
  wholesale_price NUMERIC(12,2),            -- MDL, видна только админу
  stock_qty INT NOT NULL DEFAULT 0,
  reserved_qty INT NOT NULL DEFAULT 0,
  shelf TEXT,                                -- место на складе «43*19»
  admin_note TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm  ON products USING gin (sku gin_trgm_ops);
CREATE INDEX idx_products_category  ON products(category_id);

CREATE TABLE product_oem_numbers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  oem_number TEXT NOT NULL,
  normalized TEXT NOT NULL                  -- UPPER, только [A-Z0-9]
);
CREATE INDEX idx_oem_normalized ON product_oem_numbers(normalized);

CREATE TABLE product_photos (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  data BYTEA NOT NULL,
  thumbnail BYTEA NOT NULL,                 -- JPEG ~400px
  content_type TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  size_bytes INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INT,
  year_to INT,
  engine TEXT,
  UNIQUE (make, model, year_from, year_to, engine)
);

CREATE TABLE product_vehicles (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  auto_matched BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_id, vehicle_id)
);

CREATE TABLE exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  currency CHAR(3) NOT NULL,
  rate NUMERIC(12,6) NOT NULL,              -- 1 ед. валюты = rate MDL
  source TEXT NOT NULL CHECK (source IN ('BANK','MANUAL')),
  rate_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rates_lookup ON exchange_rates(currency, rate_date DESC, created_at DESC);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- ключи: global_markup_percent, rounding_rule (NONE|TO_1|TO_5), rate_mode (BANK|MANUAL),
-- delivery_fee_mdl, pickup_address, pickup_hours, photo_max_size_mb, snapshot_keep_count

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,              -- S-000123
  status TEXT NOT NULL CHECK (status IN
    ('NEW','CONFIRMED','ASSEMBLING','DELIVERING','READY_FOR_PICKUP','DONE','CANCELLED')),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('COURIER','PICKUP')),
  payment_method TEXT NOT NULL CHECK (payment_method IN
    ('CASH_COURIER','CARD_PICKUP','CASH_PICKUP')),
  comment TEXT,
  wholesale BOOLEAN NOT NULL DEFAULT FALSE,
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(12,2),
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  items_total NUMERIC(12,2) NOT NULL,
  grand_total NUMERIC(12,2) NOT NULL,
  cancel_reason TEXT,
  viewed BOOLEAN NOT NULL DEFAULT FALSE,    -- для счётчика новых в админке
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  retail_price NUMERIC(12,2) NOT NULL,      -- цена на момент заказа
  wholesale_price NUMERIC(12,2),
  applied_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE vin_cache (
  vin CHAR(17) PRIMARY KEY,
  make TEXT,
  model TEXT,
  model_year INT,
  raw_response JSONB,
  decoded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wmi_codes (
  wmi VARCHAR(6) PRIMARY KEY,               -- 3 символа или 3+3 для мелких
  make TEXT NOT NULL
);

CREATE TABLE snapshots (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger TEXT NOT NULL CHECK (trigger IN ('SCHEDULED','MANUAL')),
  product_count INT NOT NULL,
  csv_data BYTEA NOT NULL,
  xlsx_data BYTEA NOT NULL
);

CREATE TABLE admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB
);
```

`V2__seed.sql`: настройки по умолчанию, WMI-словарь (~120 кодов: Audi, VW, Toyota,
Porsche, Kia, Hyundai, BMW, Mercedes, Skoda, Seat, Renault, Dacia, Ford, Opel, Peugeot,
Citroen, Nissan, Mazda, Honda, Lexus, Mitsubishi, Suzuki, Volvo, Fiat…), админ
`admin / sacramento2026` (bcrypt, сменить после первого входа).

### REST API

**Публичное** (без аутентификации):
| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/categories` | дерево категорий (активные) |
| GET | `/api/products` | параметры: `search, categoryId, vehicleId, brand, inStock, priceMin, priceMax, page, size, sort` |
| GET | `/api/products/{slug}` | карточка (включая применимость, OEM) |
| GET | `/api/photos/{photoId}?thumb=1` | бинарник фото, ETag/Cache-Control |
| POST | `/api/vin/decode` | `{vin}` → `{vin, make, modelYear, candidates:[{vehicleId,…}]}` |
| GET | `/api/vehicles/makes` · `/api/vehicles?make=&model=` | ручной подбор |
| POST | `/api/orders` | оформление → `{number}` |
| GET | `/api/public-settings` | доставка/самовывоз для чекаута |

**Админ** (`/api/admin/**`, сессия + CSRF):
login/logout/me; products CRUD + photos; categories CRUD; vehicles CRUD +
привязка/отвязка + `unmatched`; orders: список/карточка/статус/опт/скидка/отмена;
rates: текущий, история, ручной, режим; settings GET/PUT; dashboard;
export: история, run-now, download; import: upload→preview, confirm; legacy-import (.xls).

### Алгоритмы

- **Розничная цена**: `retail = round(purchase × rate(currency) × (1 + markup/100))`,
  `markup = product.markup ?? category.markup ?? global`; rate(MDL)=1.
  Округление: NONE / TO_1 (до лея) / TO_5 (до 5 леев), вверх (ceiling).
  Пересчёт всех нерУчных цен — после смены курса/наценки.
- **VIN**: валидация (17, без I/O/Q) → `vin_cache` → WMI-таблица (3 символа; если
  нет — первые 2) → год по 10-му символу (буквы/цифры, 30-летний цикл, берём
  максимальный ≤ текущий+1) → vPIC enrich (timeout 3s, fail-open) → кандидаты:
  `vehicles WHERE make ILIKE … AND (year_from IS NULL OR year_from-1 <= y) AND
  (year_to IS NULL OR year_to+1 >= y)`.
- **Статусы заказа**: NEW→CONFIRMED→ASSEMBLING→(DELIVERING|READY_FOR_PICKUP)→DONE;
  CANCELLED из любого. CONFIRMED: `reserved += qty` (проверка
  `stock-reserved >= qty`); DONE: `stock -= qty, reserved -= qty`;
  CANCELLED после CONFIRMED: `reserved -= qty`.
- **Парсер применимости** (legacy-импорт): словарь марок + алиасы (VW/Volkswagen…),
  модель — следующее слово после марки из белого списка моделей либо токен до
  года; годы — паттерны `8/97>01`, `97>`, `(00-)`, `11 - 16`, `2010`, `82>`.
  2-значный год: ≥80 → 19xx, иначе 20xx.

---

## Задачи

### Задача 0. Скелет проекта ✅ критерий: `mvn test` зелёный, app стартует
- [ ] git init, .gitignore
- [ ] Сгенерировать проект со start.spring.io (boot 4.0.6, java 25, maven):
      web, data-jpa, postgresql, flyway, security, validation, actuator
- [ ] Добавить зависимости: POI (poi-ooxml + poi для HSSF), opencsv, thumbnailator,
      springdoc-openapi, testcontainers (postgresql, junit-jupiter)
- [ ] `compose.dev.yaml`: postgres:17 на 5544 (только для локальной разработки)
- [ ] `application.yaml`: датасорс, flyway, профили dev/prod, порт 8081 (dev)
- [ ] Smoke-тест: контекст поднимается на Testcontainers
- [ ] Commit

### Задача 1. Схема БД + сущности + сиды
- [ ] `V1__init.sql` (DDL выше), `V2__seed.sql` (настройки, WMI, админ)
- [ ] JPA-сущности + Spring Data репозитории (по модулям)
- [ ] Тест: миграции применяются, сиды читаются (admin существует, WMI > 100)
- [ ] Commit

### Задача 2. Аутентификация админки
- [ ] SecurityConfig: `/api/admin/**` → ROLE_ADMIN, остальное permitAll;
      сессии, JSON-login `/api/admin/login`, logout, `/me`; CSRF cookie;
      CORS из настроек; задержка при неверном пароле
- [ ] Тесты MockMvc: login ok/fail, доступ к admin без сессии → 401
- [ ] Commit

### Задача 3. Каталог: категории + товары (admin CRUD + публичный)
- [ ] TDD: CategoryService (дерево, slug-генерация, защита от цикла) + контроллеры
- [ ] TDD: ProductService CRUD, slug, OEM-номера (нормализация), поиск
      (trgm: name/sku/OEM), фильтры, пагинация
- [ ] Публичные DTO без закупки/опта/полки; админские — полные
- [ ] Тесты интеграционные на поиск по части артикула и опечатке
- [ ] Commit (по подзадачам)

### Задача 4. Медиа: фото в БД
- [ ] Upload (multipart, лимит из settings, проверка типа), thumbnail JPEG 400px
      (Thumbnailator), is_main, sort; отдача с ETag/Cache-Control (30 дней)
- [ ] Тесты: загрузка PNG → thumbnail создан, ETag 304
- [ ] Commit

### Задача 5. Цены и курс BNM
- [ ] TDD: `PriceCalculator` (чистая логика: наценка-каскад, округление)
- [ ] `BnmRateClient`: XML `https://www.bnm.md/ro/official_exchange_rates?get_xml=1&date=dd.MM.yyyy`,
      парсинг JAXB/DOM → курс USD
- [ ] `@Scheduled` (cron 07:00 Europe/Chisinau) + ретрай; режим MANUAL — скип
- [ ] Пересчёт retail всех неручных товаров при изменении курса/наценки
- [ ] Админ-API: текущий курс, история, ручной курс, режим, глобальная наценка
- [ ] Тесты: калькулятор (таблично), парсер XML с фикстурой, пересчёт
- [ ] Commit

### Задача 6. VIN-подбор
- [ ] TDD: `VinValidator` (формат), `LocalVinDecoder` (WMI + год)
- [ ] `NhtsaClient` (vPIC, timeout 3s, fail-open) — WireMock/MockRestServiceServer тест
- [ ] `VinService`: cache → local → nhtsa → кандидаты из vehicles; rate-limit 10/мин/IP
- [ ] Vehicles API: makes/models, admin CRUD, привязка к товарам, unmatched
- [ ] Тесты: известные VIN (WVWZZZ… → Volkswagen), год из 10-го символа
- [ ] Commit

### Задача 7. Заказы
- [ ] TDD: `OrderService.checkout` (валидация позиций, фиксация цен, номер S-NNNNNN)
- [ ] TDD: статусная машина + резервирование (см. алгоритм) — единственное место
      изменения stock/reserved; оптимистичные блокировки (@Version на product)
- [ ] Опт/скидка: пересчёт applied_price и итогов при переключении админом
- [ ] Админ-API: список (фильтр по статусу), карточка, смена статуса (с причиной
      для отмены), viewed; dashboard summary (новые, за сегодня, нулевой остаток, курс)
- [ ] Rate-limit на POST /api/orders (5/мин/IP)
- [ ] Тесты: happy-path чекаут, нехватка остатка при CONFIRMED, отмена возвращает резерв
- [ ] Commit

### Задача 8. Экспорт / импорт
- [ ] `SnapshotService.export()`: CSV (UTF-8 BOM, `;`) + XLSX (SXSSF) — колонки:
      артикул; название; бренд; категория (путь); OEM (через `|`); закупка; валюта;
      наценка; розница; ручная_цена(0/1); опт; остаток; полка; применимость
      (`Make Model year_from-year_to` через `|`); активен(0/1); заметка
- [ ] `@Scheduled` 23:55 Europe/Chisinau + удержание N последних; админ-API:
      история, run-now, download csv/xlsx
- [ ] Импорт: parse (CSV/XLSX по заголовкам) → валидация → preview
      `{toCreate, toUpdate, errors[{row, message}]}` (токен в памяти, TTL 30 мин)
      → confirm → upsert по артикулу в транзакции → отчёт
- [ ] Тест: export → import того же файла → 0 created, all updated, 0 errors (round-trip)
- [ ] Commit

### Задача 9. Legacy-импорт текущего .xls
- [ ] TDD: `ApplicabilityParser` (марка/модель/годы из названия — паттерны выше,
      фикстуры из реальных названий файла)
- [ ] `LegacyXlsImporter` (POI HSSF): колонки файла «офис»: 0=название, 2=артикул,
      7=остаток, 4=закупка USD (если есть; иначе 12/курс — НЕ автоматизируем,
      просто закупка из col4 + валюта USD, либо пусто), 1/11=пометки → admin_note,
      полка из col1 при паттерне `NN*NN`; пропуск строк без артикула; дубли SKU —
      суффикс `-2` + пометка
- [ ] Админ-эндпоинт `POST /api/admin/import/legacy` (multipart) с тем же
      preview/confirm флоу; авто-привязка распознанной применимости (auto_matched)
- [ ] Тест на фикстуре из ~30 реальных строк (обезличенных)
- [ ] Commit

### Задача 10. Сквозное и прод-готовность
- [ ] Аудит-лог: смена цены/курса/остатка/статуса (AOP или явные вызовы)
- [ ] OpenAPI UI только в dev; actuator health
- [ ] `application-prod.yaml` (порт 8080, env-переменные), заметка по systemd
      и native image (профиль сборки `native`) в `docs/ops/deploy.md`
- [ ] Финальный прогон: `mvn verify` зелёный
- [ ] Commit

## Порядок и проверка
Задачи строго по порядку (3→4→5 можно переставлять, 7 зависит от 5).
После каждой задачи: `mvn test` зелёный + commit. В конце — выборочная ручная
проверка через curl по основным флоу (каталог, VIN, заказ, экспорт/импорт).
