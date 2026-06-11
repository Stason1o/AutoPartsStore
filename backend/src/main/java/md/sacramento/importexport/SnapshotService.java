package md.sacramento.importexport;

import com.opencsv.CSVWriterBuilder;
import com.opencsv.ICSVWriter;
import jakarta.persistence.EntityManager;
import md.sacramento.catalog.Category;
import md.sacramento.catalog.CategoryRepository;
import md.sacramento.catalog.Product;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.common.NotFoundException;
import md.sacramento.common.SettingsService;
import md.sacramento.vehicles.ProductVehicleRepository;
import md.sacramento.vehicles.Vehicle;
import md.sacramento.vehicles.VehicleRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SnapshotService {

    private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);
    private static final int PAGE_SIZE = 1000;

    private final ProductRepository products;
    private final ProductVehicleRepository productVehicles;
    private final VehicleRepository vehicles;
    private final CategoryRepository categories;
    private final SnapshotRepository snapshots;
    private final SettingsService settings;
    private final EntityManager entityManager;

    public SnapshotService(ProductRepository products, ProductVehicleRepository productVehicles,
                           VehicleRepository vehicles, CategoryRepository categories,
                           SnapshotRepository snapshots, SettingsService settings,
                           EntityManager entityManager) {
        this.products = products;
        this.productVehicles = productVehicles;
        this.vehicles = vehicles;
        this.categories = categories;
        this.snapshots = snapshots;
        this.settings = settings;
        this.entityManager = entityManager;
    }

    @Transactional
    public Snapshot export(Snapshot.Trigger trigger) {
        // Лёгкие справочники целиком, товары — постранично: heap не зависит от размера каталога.
        Map<Long, Vehicle> vehicleById = vehicles.findAll().stream()
                .collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<Long, List<Vehicle>> vehiclesByProduct = new HashMap<>();
        for (Object[] pair : productVehicles.findAllLinkPairs()) {
            vehiclesByProduct.computeIfAbsent((Long) pair[0], k -> new ArrayList<>())
                    .add(vehicleById.get((Long) pair[1]));
        }
        Map<Long, List<String>> oemByProduct = new HashMap<>();
        for (Object[] pair : products.findAllOemPairs()) {
            oemByProduct.computeIfAbsent((Long) pair[0], k -> new ArrayList<>())
                    .add((String) pair[1]);
        }
        Map<Long, String> categoryNameById = categories.findAll().stream()
                .collect(Collectors.toMap(Category::getId, Category::getName));

        int count = 0;
        ByteArrayOutputStream csvBuffer = new ByteArrayOutputStream();
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             OutputStreamWriter writer = new OutputStreamWriter(csvBuffer, StandardCharsets.UTF_8)) {
            writer.write(CatalogFileFormat.UTF8_BOM);
            ICSVWriter csv = new CSVWriterBuilder(writer)
                    .withSeparator(CatalogFileFormat.CSV_SEPARATOR)
                    .build();
            csv.writeNext(CatalogFileFormat.HEADERS);
            Sheet sheet = workbook.createSheet("Каталог");
            writeRow(sheet.createRow(0), CatalogFileFormat.HEADERS);

            int pageNumber = 0;
            Page<Product> page;
            do {
                page = products.findAll(PageRequest.of(pageNumber++, PAGE_SIZE, Sort.by("id")));
                for (Product p : page.getContent()) {
                    String[] row = toRow(p, vehiclesByProduct, oemByProduct, categoryNameById);
                    csv.writeNext(row);
                    writeRow(sheet.createRow(++count), row);
                }
                entityManager.clear(); // не копим сущности страниц в persistence context
            } while (page.hasNext());

            csv.flush();
            ByteArrayOutputStream xlsxBuffer = new ByteArrayOutputStream();
            workbook.write(xlsxBuffer);
            workbook.dispose(); // временные файлы SXSSF

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

    private String[] toRow(Product p, Map<Long, List<Vehicle>> vehiclesByProduct,
                           Map<Long, List<String>> oemByProduct, Map<Long, String> categoryNameById) {
        return new String[]{
                p.getSku(),
                p.getName(),
                nullToEmpty(p.getBrand()),
                p.getCategory() != null
                        ? categoryNameById.getOrDefault(p.getCategory().getId(), "") : "",
                String.join(CatalogFileFormat.OEM_SEPARATOR,
                        oemByProduct.getOrDefault(p.getId(), List.of())),
                decimal(p.getPurchasePrice()),
                p.getPurchaseCurrency(),
                decimal(p.getMarkupPercent()),
                decimal(p.getRetailPrice()),
                p.isRetailPriceManual() ? "1" : "0",
                decimal(p.getWholesalePrice()),
                String.valueOf(p.getStockQty()),
                nullToEmpty(p.getShelf()),
                vehiclesByProduct.getOrDefault(p.getId(), List.of()).stream()
                        .map(CatalogFileFormat::serializeVehicle)
                        .collect(Collectors.joining(CatalogFileFormat.VEHICLE_SEPARATOR)),
                p.isActive() ? "1" : "0",
                nullToEmpty(p.getAdminNote())
        };
    }

    private void writeRow(Row row, String[] values) {
        for (int i = 0; i < values.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(values[i]);
        }
    }

    @Transactional
    public void delete(Long id) {
        if (!snapshots.existsById(id)) {
            throw new NotFoundException("Снэпшот не найден: " + id);
        }
        snapshots.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<SnapshotRepository.SnapshotMeta> history(int limit) {
        return snapshots.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.clamp(limit, 1, 100)));
    }

    public record FileContent(byte[] bytes, String filename, String contentType) {
    }

    @Transactional(readOnly = true)
    public FileContent download(Long id, boolean xlsx) {
        Snapshot snapshot = snapshots.findById(id)
                .orElseThrow(() -> new NotFoundException("Снэпшот не найден: " + id));
        String date = snapshot.getCreatedAt().atZone(java.time.ZoneId.of("Europe/Chisinau"))
                .toLocalDate().toString();
        return xlsx
                ? new FileContent(snapshot.getXlsxData(), "catalog-" + date + ".xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                : new FileContent(snapshot.getCsvData(), "catalog-" + date + ".csv",
                        "text/csv; charset=UTF-8");
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String decimal(BigDecimal value) {
        return value == null ? "" : value.toPlainString();
    }
}
