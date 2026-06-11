package md.sacramento.importexport;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import md.sacramento.catalog.Category;
import md.sacramento.catalog.CategoryRepository;
import md.sacramento.catalog.OemNumber;
import md.sacramento.catalog.Product;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.common.NotFoundException;
import md.sacramento.common.SlugUtil;
import md.sacramento.pricing.PricingService;
import md.sacramento.vehicles.ProductVehicle;
import md.sacramento.vehicles.ProductVehicleRepository;
import md.sacramento.vehicles.Vehicle;
import md.sacramento.vehicles.VehicleRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ImportService {

    private static final java.time.Duration PREVIEW_TTL = java.time.Duration.ofMinutes(30);

    public record RowError(int row, String message) {
    }

    public record ParsedRow(int rowNumber, String sku, String name, String brand, String category,
                            List<String> oemNumbers, BigDecimal purchasePrice, String currency,
                            BigDecimal markupPercent, BigDecimal retailPrice, boolean retailManual,
                            BigDecimal wholesalePrice, int stockQty, String shelf,
                            List<CatalogFileFormat.VehicleSpec> vehicles, boolean active,
                            String adminNote, boolean autoMatchedVehicles) {
    }

    public record Preview(String token, int toCreate, int toUpdate, List<RowError> errors) {
    }

    public record Report(int created, int updated) {
    }

    private record PendingImport(List<ParsedRow> rows, Instant expiresAt) {
    }

    private final Map<String, PendingImport> pending = new ConcurrentHashMap<>();

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final VehicleRepository vehicles;
    private final ProductVehicleRepository productVehicles;
    private final PricingService pricingService;
    private final md.sacramento.common.AuditService audit;

    public ImportService(ProductRepository products, CategoryRepository categories,
                         VehicleRepository vehicles, ProductVehicleRepository productVehicles,
                         PricingService pricingService, md.sacramento.common.AuditService audit) {
        this.products = products;
        this.categories = categories;
        this.vehicles = vehicles;
        this.productVehicles = productVehicles;
        this.pricingService = pricingService;
        this.audit = audit;
    }

    /** Шаг 1: разбор файла → предпросмотр (ничего не записывает). */
    @Transactional(readOnly = true)
    public Preview preview(byte[] file, String filename) {
        List<String[]> rawRows = filename != null && filename.toLowerCase().endsWith(".xlsx")
                ? readXlsx(file)
                : readCsv(file);
        if (rawRows.isEmpty()) {
            throw new IllegalArgumentException("Файл пуст");
        }
        Map<String, Integer> headerIndex = headerIndex(rawRows.getFirst());

        List<ParsedRow> rows = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        java.util.Set<String> seenSkus = new java.util.HashSet<>();
        for (int i = 1; i < rawRows.size(); i++) {
            int rowNumber = i + 1;
            String[] raw = rawRows.get(i);
            if (isBlankRow(raw)) {
                continue;
            }
            try {
                ParsedRow row = parseRow(rowNumber, raw, headerIndex);
                if (!seenSkus.add(row.sku())) {
                    errors.add(new RowError(rowNumber, "Дубликат артикула в файле: " + row.sku()));
                    continue;
                }
                rows.add(row);
            } catch (Exception e) {
                errors.add(new RowError(rowNumber, e.getMessage()));
            }
        }

        return registerPending(rows, errors);
    }

    /** Регистрация разобранных строк (используется и обычным, и legacy-импортом). */
    @Transactional(readOnly = true)
    public Preview registerPending(List<ParsedRow> rows, List<RowError> errors) {
        int toUpdate = 0;
        for (List<ParsedRow> chunk : chunks(rows, 1000)) {
            toUpdate += products.findExistingSkus(chunk.stream().map(ParsedRow::sku).toList()).size();
        }
        String token = UUID.randomUUID().toString();
        pending.put(token, new PendingImport(rows, Instant.now().plus(PREVIEW_TTL)));
        pending.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(Instant.now()));

        return new Preview(token, rows.size() - toUpdate, toUpdate, errors);
    }

    /** Шаг 2: подтверждение — транзакционный upsert по артикулу. */
    @Transactional
    public Report confirm(String token) {
        PendingImport batch = pending.remove(token);
        if (batch == null || batch.expiresAt().isBefore(Instant.now())) {
            throw new NotFoundException("Предпросмотр не найден или устарел — загрузите файл заново");
        }
        List<ParsedRow> rows = batch.rows();

        // Предзагрузка одним махом всего, что цикл раньше спрашивал у БД на каждую строку.
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

        // Старые связки обновляемых товаров — чанкованным делитом вместо делита на строку.
        List<Long> updatedIds = rows.stream()
                .map(r -> bySku.get(r.sku()))
                .filter(java.util.Objects::nonNull)
                .map(Product::getId)
                .toList();
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

    private void applyRow(Product p, ParsedRow row, Map<String, Category> categoryByName) {
        p.setName(row.name());
        p.setBrand(emptyToNull(row.brand()));
        p.setCategory(row.category() == null || row.category().isBlank()
                ? null : findOrCreateCategory(row.category(), categoryByName));
        p.setPurchasePrice(row.purchasePrice());
        p.setPurchaseCurrency(row.currency() == null || row.currency().isBlank()
                ? "USD" : row.currency().toUpperCase());
        p.setMarkupPercent(row.markupPercent());
        p.setRetailPriceManual(row.retailManual());
        if (row.retailManual() || row.retailPrice() != null) {
            p.setRetailPrice(row.retailPrice());
        }
        p.setWholesalePrice(row.wholesalePrice());
        p.setStockQty(row.stockQty());
        p.setShelf(emptyToNull(row.shelf()));
        p.setAdminNote(emptyToNull(row.adminNote()));
        p.setActive(row.active());
        p.getOemNumbers().clear();
        row.oemNumbers().stream().map(OemNumber::new).distinct().forEach(p.getOemNumbers()::add);
    }

    private static String vehicleKey(String make, String model, Integer yearFrom, Integer yearTo,
                                     String engine) {
        return (make + "|" + model + "|" + yearFrom + "|" + yearTo + "|" + engine).toLowerCase();
    }

    private Vehicle findOrCreateVehicle(CatalogFileFormat.VehicleSpec spec, Map<String, Vehicle> byKey) {
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

    private Category findOrCreateCategory(String name, Map<String, Category> byName) {
        return byName.computeIfAbsent(name.trim().toLowerCase(), k -> {
            Category category = new Category();
            category.setName(name.trim());
            category.setSlug(uniqueCategorySlug(name));
            return categories.save(category);
        });
    }

    private static <T> List<List<T>> chunks(List<T> list, int size) {
        List<List<T>> result = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            result.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return result;
    }

    private ParsedRow parseRow(int rowNumber, String[] raw, Map<String, Integer> header) {
        String sku = cell(raw, header, "Артикул");
        String name = cell(raw, header, "Название");
        if (sku.isBlank()) {
            throw new IllegalArgumentException("Не указан артикул");
        }
        if (name.isBlank()) {
            throw new IllegalArgumentException("Не указано название");
        }
        List<CatalogFileFormat.VehicleSpec> vehicleSpecs =
                CatalogFileFormat.splitList(cell(raw, header, "Применимость"), "~").stream()
                        .map(CatalogFileFormat::parseVehicle)
                        .toList();
        return new ParsedRow(rowNumber, sku.trim(), name.trim(),
                cell(raw, header, "Бренд"),
                cell(raw, header, "Категория"),
                CatalogFileFormat.splitList(cell(raw, header, "OEM"), CatalogFileFormat.OEM_SEPARATOR),
                decimal(cell(raw, header, "Закупка")),
                cell(raw, header, "Валюта"),
                decimal(cell(raw, header, "Наценка %")),
                decimal(cell(raw, header, "Розница")),
                "1".equals(cell(raw, header, "Ручная цена").trim()),
                decimal(cell(raw, header, "Опт")),
                intValue(cell(raw, header, "Остаток")),
                cell(raw, header, "Полка"),
                vehicleSpecs,
                !"0".equals(cell(raw, header, "Активен").trim()),
                cell(raw, header, "Заметка"),
                false);
    }

    private Map<String, Integer> headerIndex(String[] headerRow) {
        Map<String, Integer> index = new java.util.HashMap<>();
        for (int i = 0; i < headerRow.length; i++) {
            index.put(headerRow[i].replace(CatalogFileFormat.UTF8_BOM, "").trim(), i);
        }
        for (String required : List.of("Артикул", "Название")) {
            if (!index.containsKey(required)) {
                throw new IllegalArgumentException(
                        "В файле нет обязательной колонки «" + required + "»");
            }
        }
        return index;
    }

    private List<String[]> readCsv(byte[] file) {
        try (CSVReader reader = new CSVReaderBuilder(
                new InputStreamReader(new ByteArrayInputStream(file), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder()
                        .withSeparator(CatalogFileFormat.CSV_SEPARATOR).build())
                .build()) {
            return reader.readAll();
        } catch (Exception e) {
            throw new IllegalArgumentException("Не удалось прочитать CSV: " + e.getMessage());
        }
    }

    private List<String[]> readXlsx(byte[] file) {
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            Sheet sheet = workbook.getSheetAt(0);
            List<String[]> rows = new ArrayList<>();
            int maxColumns = CatalogFileFormat.HEADERS.length;
            for (Row row : sheet) {
                String[] values = new String[maxColumns];
                for (int c = 0; c < maxColumns; c++) {
                    Cell cell = row.getCell(c);
                    values[c] = cell == null ? "" : formatter.formatCellValue(cell);
                }
                rows.add(values);
            }
            return rows;
        } catch (Exception e) {
            throw new IllegalArgumentException("Не удалось прочитать XLSX: " + e.getMessage());
        }
    }

    private static String cell(String[] raw, Map<String, Integer> header, String column) {
        Integer index = header.get(column);
        return index == null || index >= raw.length || raw[index] == null ? "" : raw[index];
    }

    private static boolean isBlankRow(String[] raw) {
        for (String value : raw) {
            if (value != null && !value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static BigDecimal decimal(String value) {
        String normalized = value.trim().replace(',', '.').replace(" ", "");
        return normalized.isEmpty() ? null : new BigDecimal(normalized);
    }

    private static int intValue(String value) {
        BigDecimal parsed = decimal(value);
        return parsed == null ? 0 : parsed.intValue();
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    /** Подбор свободного slug по in-memory множеству занятых (вместо запроса на попытку). */
    private String uniqueSlug(String source, java.util.Set<String> taken) {
        String base = SlugUtil.slugify(source);
        String slug = base;
        int i = 2;
        while (!taken.add(slug)) {
            slug = base + "-" + i++;
        }
        return slug;
    }

    private String uniqueCategorySlug(String name) {
        String base = SlugUtil.slugify(name);
        String slug = base;
        int i = 2;
        while (categories.existsBySlug(slug)) {
            slug = base + "-" + i++;
        }
        return slug;
    }
}
