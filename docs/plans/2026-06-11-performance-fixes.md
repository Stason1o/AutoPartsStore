# Performance Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить три деградации на больших объёмах (60k+ товаров): пересчёт цен O(n²) (наценка/курс), импорт 8 строк/сек, экспорт с пиком heap 1.6–2.8 ГБ — без отказа от функционала.

**Architecture:** Пересчёт цен переводится с Java-цикла (запрос курса на каждый товар → autoflush dirty-check всего persistence context) на один bulk-`UPDATE` в SQL на валюту (каскад наценки через `COALESCE`, округление через `CASE`). Импорт-confirm избавляется от запросов внутри цикла (предзагрузка SKU/slug/категорий/машин в Map, батчинг JDBC, `Persistable` для связок). Экспорт переходит на потоковый `SXSSFWorkbook` и постраничную выгрузку товаров с предзагруженными лёгкими проекциями OEM/связок. Поиск получает трёхграммные индексы по выражениям, реально используемым в запросах (`lower(name)`, `normalized`).

**Tech Stack:** Java 25, Spring Boot 4 (Data JPA/Hibernate), PostgreSQL 17 (pg_trgm), Apache POI (SXSSF), Flyway, Testcontainers.

**Диагностика (зафиксировано измерениями 2026-06-11):**
- `PUT /api/admin/rates/markup` при 60k товаров не завершился за 10 мин; thread dump: 617 c CPU в `DefaultAutoFlushEventListener` — перед каждым из 60k запросов курса Hibernate делает dirty-check 60k сущностей. Вызывается также шедулером НБМ 3×/день и после каждого импорта.
- Импорт confirm: 8 строк/сек (autoflush + 6–8 запросов на строку: findBySku, existsBySlug-цикл, categories.findAll() на строку, поиск машин, merge-select связок).
- Экспорт 60k: 19–21 c, heap 111 МБ → 1.6 ГБ used / 2.8 ГБ committed (XSSF + findAll сущностей). Прод: `-Xmx384m` → OOM.
- Поиск: `lower(name) LIKE` не использует gin trgm индекс по `name`; OEM `LIKE '%…%'` по b-tree не работает (seq scan 165k строк).

---

### Task 1: JDBC-батчинг Hibernate

**Files:**
- Modify: `backend/src/main/resources/application.yaml:12-13`

- [ ] **Step 1: Добавить свойства батчинга**

```yaml
    properties:
      hibernate.default_batch_fetch_size: 50
      hibernate.jdbc.batch_size: 50
      hibernate.order_inserts: true
      hibernate.order_updates: true
```

- [ ] **Step 2: Прогнать существующие тесты**

Run: `cd backend && mvn test -q`
Expected: BUILD SUCCESS (поведенческих изменений нет)

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/application.yaml
git commit -m "perf: включить JDBC-батчинг Hibernate (batch_size=50, order_inserts/updates)"
```

---

### Task 2: Пересчёт цен — bulk UPDATE вместо O(n²) цикла

**Files:**
- Modify: `backend/src/main/java/md/sacramento/catalog/ProductRepository.java`
- Modify: `backend/src/main/java/md/sacramento/pricing/PricingService.java:72-87`
- Test: `backend/src/test/java/md/sacramento/pricing/PricingIntegrationTest.java`

- [ ] **Step 1: Написать падающие тесты на каскад категории и правила округления через recalculateAll**

В `PricingIntegrationTest` добавить (категорийную наценку текущий recalc уже поддерживает, тесты фиксируют контракт перед заменой реализации; тест на TO_5 проверяет новый SQL-путь округления):

```java
    @Autowired
    md.sacramento.catalog.CategoryRepository categoryRepository;

    @Test
    void categoryMarkupUsedInRecalculation() {
        var cat = new md.sacramento.catalog.Category();
        cat.setName("Категория 40%");
        cat.setSlug("cat-40");
        cat.setMarkupPercent(new BigDecimal("40"));
        cat = categoryRepository.save(cat);

        Long id = productService.create(new ProductDtos.ProductRequest(
                "CAT-1", "Категорийная наценка", null, null, cat.getId(),
                new BigDecimal("100"), "USD", null, null, false,
                null, 1, null, null, true, null)).id();

        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());

        // 100 × 17.00 × 1.40 = 2380
        assertThat(productRepository.findById(id).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("2380"));
    }

    @Test
    void roundingToFiveAppliedInRecalculation() {
        settings.set(SettingsService.ROUNDING_RULE, "TO_5");
        Long id = productService.create(new ProductDtos.ProductRequest(
                "R5-1", "Округление до 5", null, null, null,
                new BigDecimal("100"), "USD", null, null, false,
                null, 1, null, null, true, null)).id();

        pricingService.saveBankRate("USD", new BigDecimal("17.01"), LocalDate.now());

        // 100 × 17.01 × 1.30 = 2211.3 → ceil(/5)*5 = 2215
        assertThat(productRepository.findById(id).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("2215"));
    }

    @Test
    void roundingNoneKeepsTwoDecimals() {
        settings.set(SettingsService.ROUNDING_RULE, "NONE");
        Long id = productService.create(new ProductDtos.ProductRequest(
                "RN-1", "Без округления", null, null, null,
                new BigDecimal("33.33"), "USD", null, null, false,
                null, 1, null, null, true, null)).id();

        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());

        // 33.33 × 17.00 × 1.30 = 736.593 → 736.59
        assertThat(productRepository.findById(id).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("736.59"));
    }

    @Test
    void currencyWithoutRateIsSkipped() {
        Long id = productService.create(new ProductDtos.ProductRequest(
                "EUR-1", "Нет курса EUR", null, null, null,
                new BigDecimal("100"), "EUR", null, null, false,
                null, 1, null, null, true, null)).id();

        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());

        assertThat(productRepository.findById(id).orElseThrow().getRetailPrice()).isNull();
    }
```

- [ ] **Step 2: Запустить тесты — убедиться, что зелёные на старой реализации (контракт зафиксирован)**

Run: `cd backend && mvn test -q -Dtest=PricingIntegrationTest`
Expected: PASS (старый Java-цикл уже даёт эти результаты; тесты защищают от регрессии при замене на SQL)

- [ ] **Step 3: Добавить методы в ProductRepository**

```java
    /** Валюты закупки, участвующие в автопересчёте. */
    @Query("""
            select distinct p.purchaseCurrency from Product p
            where p.retailPriceManual = false and p.purchasePrice is not null
            """)
    java.util.List<String> findDistinctPurchaseCurrencies();

    /**
     * Массовый пересчёт розницы одним UPDATE: каскад наценки товар→категория→глобальная,
     * округление по правилу. Дублирует PriceCalculator.retail на SQL — менять синхронно.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(nativeQuery = true, value = """
            WITH calc AS (
                SELECT p.id,
                       CASE CAST(:rule AS text)
                           WHEN 'NONE' THEN round(p.purchase_price * :rate
                               * (1 + COALESCE(p.markup_percent, c.markup_percent, :globalMarkup) / 100), 2)
                           WHEN 'TO_1' THEN ceil(p.purchase_price * :rate
                               * (1 + COALESCE(p.markup_percent, c.markup_percent, :globalMarkup) / 100))
                           ELSE ceil(p.purchase_price * :rate
                               * (1 + COALESCE(p.markup_percent, c.markup_percent, :globalMarkup) / 100) / 5) * 5
                       END AS new_price
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.retail_price_manual = false
                  AND p.purchase_price IS NOT NULL
                  AND p.purchase_currency = :currency
            )
            UPDATE products SET retail_price = calc.new_price, updated_at = now()
            FROM calc
            WHERE products.id = calc.id
              AND products.retail_price IS DISTINCT FROM calc.new_price
            """)
    int bulkRecalculate(String currency, java.math.BigDecimal rate,
                        java.math.BigDecimal globalMarkup, String rule);
```

- [ ] **Step 4: Переписать recalculateAll**

В `PricingService` заменить тело `recalculateAll()` (строки 73–87):

```java
    /** Пересчёт всех неручных цен — вызывается после смены курса или наценки. */
    @Transactional
    public int recalculateAll() {
        RoundingRule rule = roundingRule();
        BigDecimal globalMarkup = settings.getDecimal(SettingsService.GLOBAL_MARKUP_PERCENT);
        int updated = 0;
        for (String currency : products.findDistinctPurchaseCurrencies()) {
            Optional<BigDecimal> rate = currentRate(currency);
            if (rate.isEmpty()) {
                continue; // нет курса — цены этой валюты не трогаем (как раньше)
            }
            updated += products.bulkRecalculate(currency, rate.get(), globalMarkup, rule.name());
        }
        log.info("Пересчитано розничных цен: {}", updated);
        return updated;
    }
```

Удалить `ProductRepository.findAllForRecalculation()` (единственный вызов был здесь) и импорт `java.util.List` в PricingService, если стал лишним.

- [ ] **Step 5: Тесты**

Run: `cd backend && mvn test -q -Dtest='Pricing*,Catalog*,ImportExport*'`
Expected: PASS — включая старые `newBankRateRecalculatesAutoPricesButNotManual` (ручные цены не трогаются) и новые из Step 1

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/md/sacramento/catalog/ProductRepository.java \
        backend/src/main/java/md/sacramento/pricing/PricingService.java \
        backend/src/test/java/md/sacramento/pricing/PricingIntegrationTest.java
git commit -m "perf: пересчёт цен одним bulk UPDATE вместо O(n²) цикла с autoflush"
```

---

### Task 3: Импорт — предзагрузка вместо запросов в цикле

**Files:**
- Modify: `backend/src/main/java/md/sacramento/importexport/ImportService.java`
- Modify: `backend/src/main/java/md/sacramento/catalog/ProductRepository.java`
- Modify: `backend/src/main/java/md/sacramento/vehicles/ProductVehicle.java`
- Modify: `backend/src/main/java/md/sacramento/vehicles/ProductVehicleRepository.java`
- Test: existing `backend/src/test/java/md/sacramento/importexport/ImportExportIntegrationTest.java`

- [ ] **Step 1: Базовая линия — тесты импорта зелёные**

Run: `cd backend && mvn test -q -Dtest='ImportExport*,LegacyImport*'`
Expected: PASS

- [ ] **Step 2: Репозиторные методы для предзагрузки**

`ProductRepository`:

```java
    java.util.List<Product> findBySkuIn(java.util.Collection<String> skus);

    @Query("select p.sku from Product p where p.sku in :skus")
    java.util.List<String> findExistingSkus(java.util.Collection<String> skus);

    @Query("select p.slug from Product p")
    java.util.List<String> findAllSlugs();
```

`ProductVehicleRepository`:

```java
    void deleteByIdProductIdIn(java.util.Collection<Long> productIds);
```

- [ ] **Step 3: ProductVehicle → Persistable (убрать merge-SELECT на каждую связку)**

`ProductVehicle` реализует `Persistable<ProductVehicleId>`: конструктор с аргументами помечает сущность новой, после загрузки из БД/persist — не новой.

```java
public class ProductVehicle implements org.springframework.data.domain.Persistable<ProductVehicle.ProductVehicleId> {

    @Transient
    private boolean isNew = false;

    public ProductVehicle(Long productId, Long vehicleId, boolean autoMatched) {
        this.id = new ProductVehicleId(productId, vehicleId);
        this.autoMatched = autoMatched;
        this.isNew = true;          // создаётся только для вставки
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @jakarta.persistence.PostPersist
    @jakarta.persistence.PostLoad
    void markNotNew() {
        this.isNew = false;
    }
    // ... остальное без изменений (getId() уже есть — совпадает с контрактом Persistable)
}
```

(Точные имена полей сверить с текущим классом; суть — `save()` должен идти в `persist`, а не `merge`.)

- [ ] **Step 4: Переписать confirm() без запросов в цикле**

```java
    /** Шаг 2: подтверждение — транзакционный upsert по артикулу. */
    @Transactional
    public Report confirm(String token) {
        PendingImport batch = pending.remove(token);
        if (batch == null || batch.expiresAt().isBefore(Instant.now())) {
            throw new NotFoundException("Предпросмотр не найден или устарел — загрузите файл заново");
        }
        List<ParsedRow> rows = batch.rows();

        // Предзагрузка: всё, что цикл раньше спрашивал у БД по одной строке.
        Map<String, Product> bySku = new java.util.HashMap<>();
        for (List<ParsedRow> chunk : chunks(rows, 1000)) {
            products.findBySkuIn(chunk.stream().map(ParsedRow::sku).toList())
                    .forEach(p -> bySku.put(p.getSku(), p));
        }
        java.util.Set<String> slugs = new java.util.HashSet<>(products.findAllSlugs());
        Map<String, Category> categoryByName = new java.util.HashMap<>();
        categories.findAll().forEach(c -> categoryByName.put(c.getName().toLowerCase(), c));
        Map<String, Vehicle> vehicleByKey = new java.util.HashMap<>();
        vehicles.findAll().forEach(v -> vehicleByKey.put(vehicleKey(
                v.getMake(), v.getModel(), v.getYearFrom(), v.getYearTo(), v.getEngine()), v));

        // Старые связки обновляемых товаров — одним делитом (чанками).
        List<Long> updatedIds = rows.stream()
                .map(r -> bySku.get(r.sku())).filter(Objects::nonNull).map(Product::getId).toList();
        for (List<Long> chunk : chunks(updatedIds, 1000)) {
            productVehicles.deleteByIdProductIdIn(chunk);
        }

        int created = 0;
        int updated = 0;
        List<ProductVehicle> links = new ArrayList<>();
        for (ParsedRow row : rows) {
            Product product = bySku.get(row.sku());
            if (product == null) {
                product = new Product();
                product.setSku(row.sku());
                product.setSlug(uniqueSlug(row.sku() + "-" + row.name(), slugs));
                created++;
            } else {
                updated++;
            }
            applyRow(product, row, categoryByName);
            Product saved = products.save(product);
            for (CatalogFileFormat.VehicleSpec spec : row.vehicles()) {
                Vehicle vehicle = findOrCreateVehicle(spec, vehicleByKey);
                links.add(new ProductVehicle(saved.getId(), vehicle.getId(), row.autoMatchedVehicles()));
            }
        }
        productVehicles.saveAll(links);
        pricingService.recalculateAll();
        audit.log("import.confirm", Map.of("created", created, "updated", updated));
        return new Report(created, updated);
    }

    private static String vehicleKey(String make, String model, Integer yearFrom, Integer yearTo,
                                     String engine) {
        return (make + "|" + model + "|" + yearFrom + "|" + yearTo + "|" + engine).toLowerCase();
    }

    private Vehicle findOrCreateVehicle(CatalogFileFormat.VehicleSpec spec,
                                        Map<String, Vehicle> byKey) {
        return byKey.computeIfAbsent(
                vehicleKey(spec.make(), spec.model(), spec.yearFrom(), spec.yearTo(), spec.engine()),
                k -> {
                    Vehicle v = new Vehicle();
                    v.setMake(spec.make());
                    v.setModel(spec.model());
                    v.setYearFrom(spec.yearFrom());
                    v.setYearTo(spec.yearTo());
                    v.setEngine(spec.engine());
                    return vehicles.save(v);
                });
    }

    private static <T> List<List<T>> chunks(List<T> list, int size) {
        List<List<T>> result = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            result.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return result;
    }
```

`applyRow` принимает `Map<String, Category>` и вместо `findOrCreateCategory(name)` (который делал `categories.findAll()` на каждую строку) использует `computeIfAbsent` по lower-имени с созданием через старую логику slug. `uniqueSlug(source, slugs)` проверяет занятость по in-memory `Set` и добавляет выбранный slug в него (вместо `existsBySlug`-цикла). Старые `findOrCreateCategory(String)`, `uniqueSlug(String)` и `applyVehicles(...)` удалить.

В `preview()`/`registerPending()` заменить `rows.stream().filter(r -> products.existsBySku(r.sku())).count()` на подсчёт через `findExistingSkus` чанками по 1000.

- [ ] **Step 5: Тесты**

Run: `cd backend && mvn test -q -Dtest='ImportExport*,LegacyImport*,ProductVehicles*,Catalog*'`
Expected: PASS (LegacyImport идёт через registerPending/confirm — проверяет тот же путь)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/md/sacramento/importexport/ImportService.java \
        backend/src/main/java/md/sacramento/catalog/ProductRepository.java \
        backend/src/main/java/md/sacramento/vehicles/ProductVehicle.java \
        backend/src/main/java/md/sacramento/vehicles/ProductVehicleRepository.java
git commit -m "perf: импорт — предзагрузка SKU/slug/категорий/машин, без запросов в цикле"
```

---

### Task 4: Экспорт — потоковый XLSX и постраничная выгрузка

**Files:**
- Modify: `backend/src/main/java/md/sacramento/importexport/SnapshotService.java`
- Modify: `backend/src/main/java/md/sacramento/catalog/ProductRepository.java`
- Test: existing `backend/src/test/java/md/sacramento/importexport/ImportExportIntegrationTest.java`

- [ ] **Step 1: Лёгкие проекции вместо findAll() сущностей**

`ProductRepository`:

```java
    @Query("select p.id, o.oemNumber from Product p join p.oemNumbers o")
    java.util.List<Object[]> findAllOemPairs();
```

- [ ] **Step 2: Переписать export(): страницы товаров + SXSSF**

Ключевые изменения `SnapshotService.export()`:

```java
    @Transactional
    public Snapshot export(Snapshot.Trigger trigger) {
        Map<Long, Vehicle> vehicleById = vehicles.findAll().stream()
                .collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<Long, List<Vehicle>> vehiclesByProduct = new java.util.HashMap<>();
        for (ProductVehicle pv : productVehicles.findAll()) {
            vehiclesByProduct.computeIfAbsent(pv.getId().getProductId(), k -> new java.util.ArrayList<>())
                    .add(vehicleById.get(pv.getId().getVehicleId()));
        }
        Map<Long, List<String>> oemByProduct = new java.util.HashMap<>();
        for (Object[] pair : products.findAllOemPairs()) {
            oemByProduct.computeIfAbsent((Long) pair[0], k -> new java.util.ArrayList<>())
                    .add((String) pair[1]);
        }
        Map<Long, String> categoryNameById = categories.findAll().stream()
                .collect(Collectors.toMap(Category::getId, Category::getName));

        int count = 0;
        try (var csvBuffer = new ByteArrayOutputStream();
             var writer = new OutputStreamWriter(csvBuffer, StandardCharsets.UTF_8);
             var workbook = new org.apache.poi.xssf.streaming.SXSSFWorkbook(100)) {
            writer.write(CatalogFileFormat.UTF8_BOM);
            ICSVWriter csv = new CSVWriterBuilder(writer)
                    .withSeparator(CatalogFileFormat.CSV_SEPARATOR).build();
            csv.writeNext(CatalogFileFormat.HEADERS);
            Sheet sheet = workbook.createSheet("Каталог");
            writeRow(sheet.createRow(0), CatalogFileFormat.HEADERS);

            int pageSize = 1000;
            org.springframework.data.domain.Page<Product> page;
            int pageNumber = 0;
            do {
                page = products.findAll(PageRequest.of(pageNumber++, pageSize,
                        org.springframework.data.domain.Sort.by("id")));
                for (Product p : page.getContent()) {
                    String[] row = toRow(p, vehiclesByProduct, oemByProduct, categoryNameById);
                    csv.writeNext(row);
                    writeRow(sheet.createRow(++count), row);
                }
                entityManager.clear(); // не копим сущности страниц в persistence context
            } while (page.hasNext());

            csv.flush();
            var xlsxBuffer = new ByteArrayOutputStream();
            workbook.write(xlsxBuffer);
            workbook.dispose(); // удалить временные файлы SXSSF

            Snapshot saved = snapshots.save(new Snapshot(trigger, count,
                    csvBuffer.toByteArray(), xlsxBuffer.toByteArray()));
            int keep = settings.getInt(SettingsService.SNAPSHOT_KEEP_COUNT);
            snapshots.deleteOlderThanLast(keep);
            log.info("Снэпшот #{} создан: {} товаров ({})", saved.getId(), count, trigger);
            return saved;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
```

`toRow(...)` берёт OEM из `oemByProduct` (не трогает lazy-коллекцию), имя категории — из `categoryNameById` по `p.getCategory().getId()` (id прокси не инициализирует сущность; после `entityManager.clear()` прокси не дёргать — поэтому только id). Инжектировать `jakarta.persistence.EntityManager` через конструктор. `writeCsv`/`writeXlsx` удалить (логика встроена), `CategoryRepository` добавить в конструктор.

- [ ] **Step 3: Тесты**

Run: `cd backend && mvn test -q -Dtest='ImportExport*'`
Expected: PASS (экспорт-импорт roundtrip; порядок строк теперь по id — проверить, что тесты не завязаны на другой порядок)

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/md/sacramento/importexport/SnapshotService.java \
        backend/src/main/java/md/sacramento/catalog/ProductRepository.java
git commit -m "perf: экспорт — SXSSF (поток на диск) и постраничная выгрузка, heap O(страница)"
```

---

### Task 5: Поисковые индексы под реальные запросы

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__search_indexes.sql`

- [ ] **Step 1: Миграция**

```sql
-- Hibernate генерирует lower(name) LIKE '%…%' — старые trgm-индексы по name/sku не используются.
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_sku_trgm;
CREATE INDEX idx_products_name_lower_trgm ON products USING gin (lower(name) gin_trgm_ops);
CREATE INDEX idx_products_sku_lower_trgm  ON products USING gin (lower(sku)  gin_trgm_ops);

-- Поиск по OEM идёт подстрокой: LIKE '%X%' — b-tree (idx_oem_normalized) такое не умеет.
CREATE INDEX idx_oem_normalized_trgm ON product_oem_numbers USING gin (normalized gin_trgm_ops);

-- Кандидаты VIN-декодера: LOWER(make) = LOWER(:make).
CREATE INDEX idx_vehicles_make_lower ON vehicles (lower(make));
```

- [ ] **Step 2: Тесты (Flyway применит миграцию в Testcontainers)**

Run: `cd backend && mvn test -q -Dtest='SchemaAndSeed*,Catalog*,Vin*'`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V5__search_indexes.sql
git commit -m "perf: trgm-индексы по lower(name)/lower(sku)/normalized, индекс по lower(make)"
```

---

### Task 6: Полная верификация на больших объёмах

- [ ] **Step 1: Все тесты**

Run: `cd backend && mvn test -q`
Expected: BUILD SUCCESS

- [ ] **Step 2: Перезапустить бэкенд, посеять 60k товаров / 165k OEM / 11k машин / 279k связей** (SQL-сид из сессии тестирования), замерить:
  - `PUT /api/admin/rates/markup` — цель: секунды (было: >10 мин, не завершился);
  - импорт 10k строк preview+confirm — цель: < 1 мин (было: 8 строк/сек ≈ часы);
  - `POST /api/admin/export/run` — цель: < 10 c и пик heap < 300 МБ (было: 19–21 c, 1.6–2.8 ГБ);
  - поиск по имени/SKU/OEM — `EXPLAIN` должен показывать Bitmap Index Scan по новым индексам.

- [ ] **Step 3: Удалить сид, вернуть базу, финальный smoke витрины/админки.**
