package md.sacramento.importexport.legacy;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Эвристический разбор применимости из свободного названия товара
 * («Audi A4 8/97>01 радиатор», «VW TIGUAN, 11 - 16 интеркулер»).
 * Точность не 100% — результат помечается auto_matched и проверяется в админке.
 */
public final class ApplicabilityParser {

    public record ParsedApplicability(String make, String model, Integer yearFrom, Integer yearTo) {
    }

    private static final Map<String, String> MAKE_ALIASES = Map.ofEntries(
            Map.entry("audi", "Audi"), Map.entry("vw", "Volkswagen"),
            Map.entry("volkswagen", "Volkswagen"), Map.entry("toyota", "Toyota"),
            Map.entry("porsche", "Porsche"), Map.entry("kia", "Kia"),
            Map.entry("hyundai", "Hyundai"), Map.entry("bmw", "BMW"),
            Map.entry("mercedes", "Mercedes-Benz"), Map.entry("skoda", "Skoda"),
            Map.entry("seat", "Seat"), Map.entry("renault", "Renault"),
            Map.entry("dacia", "Dacia"), Map.entry("ford", "Ford"),
            Map.entry("opel", "Opel"), Map.entry("peugeot", "Peugeot"),
            Map.entry("citroen", "Citroen"), Map.entry("nissan", "Nissan"),
            Map.entry("mazda", "Mazda"), Map.entry("honda", "Honda"),
            Map.entry("lexus", "Lexus"), Map.entry("mitsubishi", "Mitsubishi"),
            Map.entry("suzuki", "Suzuki"), Map.entry("subaru", "Subaru"),
            Map.entry("volvo", "Volvo"), Map.entry("fiat", "Fiat"),
            Map.entry("jeep", "Jeep"), Map.entry("dodge", "Dodge"),
            Map.entry("chevrolet", "Chevrolet"), Map.entry("daewoo", "Daewoo"),
            Map.entry("mini", "Mini"), Map.entry("smart", "Smart"),
            Map.entry("tesla", "Tesla"), Map.entry("prius", "Toyota"));

    // порядок важен: от самого специфичного к самому общему
    private static final Pattern MONTH_YEAR_RANGE = Pattern.compile("\\d{1,2}/(\\d{2})>(\\d{2})");
    private static final Pattern YEAR_TO_YEAR = Pattern.compile("\\b(\\d{2})>(\\d{2})\\b");
    private static final Pattern TWO_DIGIT_RANGE = Pattern.compile("\\b(\\d{2})\\s*-\\s*(\\d{2})\\b");
    private static final Pattern MONTH_YEAR_FROM = Pattern.compile("\\d{1,2}/(\\d{2})>");
    private static final Pattern YEAR_FROM_ARROW = Pattern.compile("\\b(\\d{2})>");
    private static final Pattern YEAR_FROM_DASH = Pattern.compile("\\b(\\d{2})\\s*-(?!\\s*\\d)");
    private static final Pattern FULL_YEAR = Pattern.compile("\\b((?:19|20)\\d{2})\\b");

    private ApplicabilityParser() {
    }

    public static Optional<ParsedApplicability> parse(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        String lower = name.toLowerCase();
        String[] tokens = lower.split("[^\\p{L}\\p{N}]+");

        int makeIndex = -1;
        String make = null;
        for (int i = 0; i < tokens.length; i++) {
            String candidate = MAKE_ALIASES.get(tokens[i]);
            if (candidate != null) {
                makeIndex = i;
                make = candidate;
                break;
            }
        }
        if (make == null) {
            return Optional.empty();
        }

        String model = extractModel(tokens, makeIndex);
        int[] years = extractYears(lower);
        return Optional.of(new ParsedApplicability(make, model,
                years[0] == 0 ? null : years[0],
                years[1] == 0 ? null : years[1]));
    }

    private static String extractModel(String[] tokens, int makeIndex) {
        // "prius" — алиас марки Toyota, сам же является моделью
        if ("prius".equals(tokens[makeIndex])) {
            return "Prius";
        }
        for (int j = makeIndex + 1; j < tokens.length; j++) {
            String token = tokens[j];
            if (token.isEmpty()) {
                continue;
            }
            // «A 2» → «A2»
            if (token.length() == 1 && Character.isLetter(token.charAt(0))
                    && j + 1 < tokens.length && tokens[j + 1].matches("\\d{1,2}")) {
                token = token + tokens[j + 1];
            }
            return capitalize(token);
        }
        return "";
    }

    private static int[] extractYears(String lower) {
        Matcher m = MONTH_YEAR_RANGE.matcher(lower);
        if (m.find()) {
            return new int[]{year(m.group(1)), year(m.group(2))};
        }
        m = YEAR_TO_YEAR.matcher(lower);
        if (m.find()) {
            return new int[]{year(m.group(1)), year(m.group(2))};
        }
        m = TWO_DIGIT_RANGE.matcher(lower);
        if (m.find()) {
            int from = year(m.group(1));
            int to = year(m.group(2));
            if (to >= from) {
                return new int[]{from, to};
            }
        }
        m = MONTH_YEAR_FROM.matcher(lower);
        if (m.find()) {
            return new int[]{year(m.group(1)), 0};
        }
        m = YEAR_FROM_ARROW.matcher(lower);
        if (m.find()) {
            return new int[]{year(m.group(1)), 0};
        }
        m = YEAR_FROM_DASH.matcher(lower);
        if (m.find()) {
            return new int[]{year(m.group(1)), 0};
        }
        m = FULL_YEAR.matcher(lower);
        if (m.find()) {
            int single = Integer.parseInt(m.group(1));
            return new int[]{single, single};
        }
        return new int[]{0, 0};
    }

    /** Двузначный год: 80–99 → 19xx, 00–79 → 20xx. */
    private static int year(String twoDigits) {
        int value = Integer.parseInt(twoDigits);
        return value >= 80 ? 1900 + value : 2000 + value;
    }

    private static String capitalize(String token) {
        if (token.length() <= 3) {
            return token.toUpperCase();
        }
        return Character.toUpperCase(token.charAt(0)) + token.substring(1);
    }
}
