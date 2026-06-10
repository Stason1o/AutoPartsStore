package md.sacramento.common;

import java.util.Map;

public final class SlugUtil {

    private static final Map<Character, String> CYRILLIC = Map.ofEntries(
            Map.entry('а', "a"), Map.entry('б', "b"), Map.entry('в', "v"), Map.entry('г', "g"),
            Map.entry('д', "d"), Map.entry('е', "e"), Map.entry('ё', "e"), Map.entry('ж', "zh"),
            Map.entry('з', "z"), Map.entry('и', "i"), Map.entry('й', "y"), Map.entry('к', "k"),
            Map.entry('л', "l"), Map.entry('м', "m"), Map.entry('н', "n"), Map.entry('о', "o"),
            Map.entry('п', "p"), Map.entry('р', "r"), Map.entry('с', "s"), Map.entry('т', "t"),
            Map.entry('у', "u"), Map.entry('ф', "f"), Map.entry('х', "h"), Map.entry('ц', "ts"),
            Map.entry('ч', "ch"), Map.entry('ш', "sh"), Map.entry('щ', "sch"), Map.entry('ъ', ""),
            Map.entry('ы', "y"), Map.entry('ь', ""), Map.entry('э', "e"), Map.entry('ю', "yu"),
            Map.entry('я', "ya"));

    private SlugUtil() {
    }

    /** «Радиатор Audi A4 8/97» → «radiator-audi-a4-8-97». */
    public static String slugify(String input) {
        StringBuilder sb = new StringBuilder(input.length());
        for (char c : input.toLowerCase().toCharArray()) {
            if (CYRILLIC.containsKey(c)) {
                sb.append(CYRILLIC.get(c));
            } else if (Character.isLetterOrDigit(c) && c < 128) {
                sb.append(c);
            } else {
                sb.append('-');
            }
        }
        String slug = sb.toString().replaceAll("-{2,}", "-").replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "item" : slug;
    }
}
