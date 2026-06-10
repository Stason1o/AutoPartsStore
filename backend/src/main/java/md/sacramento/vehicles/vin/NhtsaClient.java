package md.sacramento.vehicles.vin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Optional;

/**
 * NHTSA vPIC — бесплатный государственный декодер VIN (без ключа и лимитов).
 * Для европейских VIN возвращает марку/год, иногда модель. Fail-open:
 * любая ошибка → Optional.empty(), подбор продолжается локальными данными.
 */
@Component
public class NhtsaClient {

    private static final Logger log = LoggerFactory.getLogger(NhtsaClient.class);

    public record NhtsaResult(String make, String model, Integer modelYear, String raw) {
    }

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NhtsaClient(@Value("${app.nhtsa.base-url:https://vpic.nhtsa.dot.gov}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(3));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public Optional<NhtsaResult> decode(String vin) {
        try {
            String body = restClient.get()
                    .uri("/api/vehicles/DecodeVinValues/{vin}?format=json", vin)
                    .retrieve()
                    .body(String.class);
            if (body == null) {
                return Optional.empty();
            }
            JsonNode results = objectMapper.readTree(body).path("Results");
            if (!results.isArray() || results.isEmpty()) {
                return Optional.empty();
            }
            JsonNode row = results.get(0);
            String make = emptyToNull(row.path("Make").asText(""));
            String model = emptyToNull(row.path("Model").asText(""));
            String yearText = row.path("ModelYear").asText("");
            Integer year = yearText.matches("\\d{4}") ? Integer.parseInt(yearText) : null;
            if (make == null && model == null && year == null) {
                return Optional.empty();
            }
            return Optional.of(new NhtsaResult(capitalize(make), model, year, row.toString()));
        } catch (Exception e) {
            log.warn("vPIC недоступен для VIN {}: {}", vin, e.getMessage());
            return Optional.empty();
        }
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() || "null".equalsIgnoreCase(s) ? null : s.trim();
    }

    /** vPIC возвращает марки капсом (VOLKSWAGEN) — приводим к виду нашего справочника. */
    private static String capitalize(String s) {
        if (s == null) {
            return null;
        }
        String lower = s.toLowerCase();
        StringBuilder sb = new StringBuilder(lower.length());
        boolean upperNext = true;
        for (char c : lower.toCharArray()) {
            sb.append(upperNext && Character.isLetter(c) ? Character.toUpperCase(c) : c);
            upperNext = !Character.isLetter(c);
        }
        return sb.toString();
    }
}
