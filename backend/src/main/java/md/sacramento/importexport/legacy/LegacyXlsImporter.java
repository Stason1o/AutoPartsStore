package md.sacramento.importexport.legacy;

import md.sacramento.importexport.CatalogFileFormat;
import md.sacramento.importexport.ImportService;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Одноразовый импорт текущего учётного файла «наличие» (.xls, лист «офис»).
 * Колонки исходника: 0 — название (с применимостью текстом), 1 — пометки/полка,
 * 2 — артикул, 4 — закупка (USD), 7 — текущий остаток.
 */
@Service
public class LegacyXlsImporter {

    private static final int COL_NAME = 0;
    private static final int COL_NOTE = 1;
    private static final int COL_SKU = 2;
    private static final int COL_PURCHASE = 4;
    private static final int COL_STOCK = 7;

    private static final Pattern SHELF_PATTERN = Pattern.compile("\\d{1,3}[*/]\\d{1,4}");

    private final ImportService importService;

    public LegacyXlsImporter(ImportService importService) {
        this.importService = importService;
    }

    public ImportService.Preview preview(byte[] file) {
        List<ImportService.ParsedRow> rows = new ArrayList<>();
        List<ImportService.RowError> errors = new ArrayList<>();
        Set<String> seenSkus = new HashSet<>();
        DataFormatter formatter = new DataFormatter();

        try (HSSFWorkbook workbook = new HSSFWorkbook(new ByteArrayInputStream(file))) {
            Sheet sheet = workbook.getSheetAt(0);
            for (Row row : sheet) {
                int rowNumber = row.getRowNum() + 1;
                String name = cell(row, COL_NAME, formatter);
                String sku = cell(row, COL_SKU, formatter);
                if (sku.isBlank() || name.isBlank() || "DENUMIREA".equalsIgnoreCase(name.trim())) {
                    continue;
                }
                try {
                    rows.add(parseRow(rowNumber, name.trim(), sku.trim(), row, formatter, seenSkus));
                } catch (Exception e) {
                    errors.add(new ImportService.RowError(rowNumber, e.getMessage()));
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Не удалось прочитать .xls: " + e.getMessage());
        }

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("В файле не найдено ни одной товарной строки");
        }
        return importService.registerPending(rows, errors);
    }

    private ImportService.ParsedRow parseRow(int rowNumber, String name, String rawSku, Row row,
                                             DataFormatter formatter, Set<String> seenSkus) {
        String sku = rawSku;
        String duplicateNote = null;
        int suffix = 2;
        while (!seenSkus.add(sku)) {
            sku = rawSku + "-" + suffix++;
            duplicateNote = "Дубль артикула в исходном файле: " + rawSku;
        }

        String note = cell(row, COL_NOTE, formatter).trim();
        String shelf = null;
        if (SHELF_PATTERN.matcher(note).matches()) {
            shelf = note;
            note = "";
        }
        if (duplicateNote != null) {
            note = note.isBlank() ? duplicateNote : note + "; " + duplicateNote;
        }

        BigDecimal purchase = parseDecimal(cell(row, COL_PURCHASE, formatter));
        int stock = Optional.ofNullable(parseDecimal(cell(row, COL_STOCK, formatter)))
                .map(BigDecimal::intValue)
                .filter(qty -> qty >= 0)
                .orElse(0);

        List<CatalogFileFormat.VehicleSpec> vehicles = ApplicabilityParser.parse(name)
                .map(parsed -> List.of(new CatalogFileFormat.VehicleSpec(
                        parsed.make(), parsed.model(), parsed.yearFrom(), parsed.yearTo(), null)))
                .orElse(List.of());

        return new ImportService.ParsedRow(rowNumber, sku, name,
                "", "", List.of(),
                purchase, "USD", null,
                null, false, null,
                stock, shelf, vehicles, true,
                note.isBlank() ? null : note,
                true);
    }

    private static String cell(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell);
    }

    private static BigDecimal parseDecimal(String value) {
        String normalized = value.trim().replace(',', '.').replaceAll("[^0-9.]", "");
        if (normalized.isEmpty() || normalized.equals(".")) {
            return null;
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
