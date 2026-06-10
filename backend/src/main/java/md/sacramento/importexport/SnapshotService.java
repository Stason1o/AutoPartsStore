package md.sacramento.importexport;

import com.opencsv.CSVWriterBuilder;
import com.opencsv.ICSVWriter;
import md.sacramento.catalog.OemNumber;
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
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SnapshotService {

    private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);

    private final ProductRepository products;
    private final ProductVehicleRepository productVehicles;
    private final VehicleRepository vehicles;
    private final SnapshotRepository snapshots;
    private final SettingsService settings;

    public SnapshotService(ProductRepository products, ProductVehicleRepository productVehicles,
                           VehicleRepository vehicles, SnapshotRepository snapshots,
                           SettingsService settings) {
        this.products = products;
        this.productVehicles = productVehicles;
        this.vehicles = vehicles;
        this.snapshots = snapshots;
        this.settings = settings;
    }

    @Transactional
    public Snapshot export(Snapshot.Trigger trigger) {
        List<Product> all = products.findAll();
        Map<Long, Vehicle> vehicleById = vehicles.findAll().stream()
                .collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<Long, List<Vehicle>> vehiclesByProduct = productVehicles.findAll().stream()
                .collect(Collectors.groupingBy(pv -> pv.getId().getProductId(),
                        Collectors.mapping(pv -> vehicleById.get(pv.getId().getVehicleId()),
                                Collectors.toList())));

        List<String[]> rows = all.stream().map(p -> toRow(p, vehiclesByProduct)).toList();

        Snapshot snapshot = new Snapshot(trigger, rows.size(), writeCsv(rows), writeXlsx(rows));
        Snapshot saved = snapshots.save(snapshot);

        int keep = settings.getInt(SettingsService.SNAPSHOT_KEEP_COUNT);
        snapshots.deleteOlderThanLast(keep);
        log.info("Снэпшот #{} создан: {} товаров ({})", saved.getId(), rows.size(), trigger);
        return saved;
    }

    private String[] toRow(Product p, Map<Long, List<Vehicle>> vehiclesByProduct) {
        return new String[]{
                p.getSku(),
                p.getName(),
                nullToEmpty(p.getBrand()),
                p.getCategory() != null ? p.getCategory().getName() : "",
                p.getOemNumbers().stream().map(OemNumber::getOemNumber)
                        .collect(Collectors.joining(CatalogFileFormat.OEM_SEPARATOR)),
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

    private byte[] writeCsv(List<String[]> rows) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write(CatalogFileFormat.UTF8_BOM);
            ICSVWriter csv = new CSVWriterBuilder(writer)
                    .withSeparator(CatalogFileFormat.CSV_SEPARATOR)
                    .build();
            csv.writeNext(CatalogFileFormat.HEADERS);
            rows.forEach(csv::writeNext);
            csv.flush();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    private byte[] writeXlsx(List<String[]> rows) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Каталог");
            writeRow(sheet.createRow(0), CatalogFileFormat.HEADERS);
            for (int i = 0; i < rows.size(); i++) {
                writeRow(sheet.createRow(i + 1), rows.get(i));
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
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
