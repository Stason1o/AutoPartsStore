package md.sacramento.importexport;

import md.sacramento.vehicles.Vehicle;

import java.util.List;

/**
 * Контракт файла снэпшота: колонки и сериализация применимости.
 * Один и тот же формат у CSV и XLSX, экспорт и импорт симметричны.
 */
public final class CatalogFileFormat {

    public static final String[] HEADERS = {
            "Артикул", "Название", "Бренд", "Категория", "OEM",
            "Закупка", "Валюта", "Наценка %", "Розница", "Ручная цена",
            "Опт", "Остаток", "Полка", "Применимость", "Активен", "Заметка"
    };

    public static final char CSV_SEPARATOR = ';';
    /** BOM, чтобы Excel открывал UTF-8 CSV без кракозябр. */
    public static final String UTF8_BOM = "\uFEFF";

    public static final String OEM_SEPARATOR = "|";
    public static final String VEHICLE_SEPARATOR = " ~ ";
    private static final String VEHICLE_FIELD_SEPARATOR = "|";

    private CatalogFileFormat() {
    }

    /** «Audi|A4|1997|2001|1.9 TDI» — пустые поля допустимы. */
    public static String serializeVehicle(Vehicle v) {
        return String.join(VEHICLE_FIELD_SEPARATOR,
                v.getMake(), v.getModel(),
                v.getYearFrom() != null ? v.getYearFrom().toString() : "",
                v.getYearTo() != null ? v.getYearTo().toString() : "",
                v.getEngine() != null ? v.getEngine() : "");
    }

    public record VehicleSpec(String make, String model, Integer yearFrom, Integer yearTo,
                              String engine) {
    }

    public static VehicleSpec parseVehicle(String serialized) {
        String[] parts = serialized.split("\\" + VEHICLE_FIELD_SEPARATOR, -1);
        if (parts.length < 2 || parts[0].isBlank() || parts[1].isBlank()) {
            throw new IllegalArgumentException("Неверный формат применимости: " + serialized);
        }
        return new VehicleSpec(
                parts[0].trim(), parts[1].trim(),
                parts.length > 2 && !parts[2].isBlank() ? Integer.parseInt(parts[2].trim()) : null,
                parts.length > 3 && !parts[3].isBlank() ? Integer.parseInt(parts[3].trim()) : null,
                parts.length > 4 && !parts[4].isBlank() ? parts[4].trim() : null);
    }

    public static List<String> splitList(String value, String separator) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(value.split("\\s*\\" + separator.trim() + "\\s*"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
