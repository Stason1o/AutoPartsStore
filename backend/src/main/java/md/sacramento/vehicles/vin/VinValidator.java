package md.sacramento.vehicles.vin;

import java.util.regex.Pattern;

public final class VinValidator {

    /** 17 символов, латиница+цифры, без I, O, Q. */
    private static final Pattern VIN_PATTERN = Pattern.compile("[A-HJ-NPR-Z0-9]{17}");

    private VinValidator() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("VIN не указан");
        }
        String vin = raw.trim().toUpperCase().replaceAll("[\\s-]", "");
        if (!VIN_PATTERN.matcher(vin).matches()) {
            throw new IllegalArgumentException(
                    "VIN должен состоять из 17 символов (латинские буквы и цифры, без I, O, Q)");
        }
        return vin;
    }
}
