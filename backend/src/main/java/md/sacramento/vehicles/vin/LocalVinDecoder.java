package md.sacramento.vehicles.vin;

import org.springframework.stereotype.Component;

import java.time.Year;
import java.util.Map;
import java.util.Optional;

/**
 * Локальное декодирование без внешних запросов:
 * WMI (символы 1–3) → производитель, символ 10 → модельный год.
 */
@Component
public class LocalVinDecoder {

    /** Базовый год (цикл 1980–2009); реальный год = база + 30·k. */
    private static final Map<Character, Integer> YEAR_BASE = Map.ofEntries(
            Map.entry('A', 1980), Map.entry('B', 1981), Map.entry('C', 1982), Map.entry('D', 1983),
            Map.entry('E', 1984), Map.entry('F', 1985), Map.entry('G', 1986), Map.entry('H', 1987),
            Map.entry('J', 1988), Map.entry('K', 1989), Map.entry('L', 1990), Map.entry('M', 1991),
            Map.entry('N', 1992), Map.entry('P', 1993), Map.entry('R', 1994), Map.entry('S', 1995),
            Map.entry('T', 1996), Map.entry('V', 1997), Map.entry('W', 1998), Map.entry('X', 1999),
            Map.entry('Y', 2000),
            Map.entry('1', 2001), Map.entry('2', 2002), Map.entry('3', 2003), Map.entry('4', 2004),
            Map.entry('5', 2005), Map.entry('6', 2006), Map.entry('7', 2007), Map.entry('8', 2008),
            Map.entry('9', 2009));

    private final WmiCodeRepository wmiCodes;

    public LocalVinDecoder(WmiCodeRepository wmiCodes) {
        this.wmiCodes = wmiCodes;
    }

    public Optional<String> make(String vin) {
        return wmiCodes.findById(vin.substring(0, 3)).map(WmiCode::getMake);
    }

    /** Максимальный возможный год ≤ следующего календарного (30-летний цикл VIN). */
    public Optional<Integer> modelYear(String vin) {
        Integer base = YEAR_BASE.get(vin.charAt(9));
        if (base == null) {
            return Optional.empty();
        }
        int maxYear = Year.now().getValue() + 1;
        int year = base;
        while (year + 30 <= maxYear) {
            year += 30;
        }
        return Optional.of(year);
    }
}
