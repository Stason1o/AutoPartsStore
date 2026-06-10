package md.sacramento.pricing;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Официальный курс Национального банка Молдовы.
 * XML: https://www.bnm.md/ro/official_exchange_rates?get_xml=1&date=dd.MM.yyyy
 */
@Component
public class BnmRateClient {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final RestClient restClient;

    public BnmRateClient(@Value("${app.bnm.base-url:https://www.bnm.md}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public Optional<BigDecimal> fetchRate(String currency, LocalDate date) {
        String xml = restClient.get()
                .uri("/ro/official_exchange_rates?get_xml=1&date={date}", DATE_FORMAT.format(date))
                .retrieve()
                .body(String.class);
        return xml == null ? Optional.empty() : parseRate(xml, currency);
    }

    /** Курс за 1 единицу валюты в MDL (с учётом Nominal). */
    static Optional<BigDecimal> parseRate(String xml, String currency) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            Document doc = factory.newDocumentBuilder()
                    .parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
            NodeList valutes = doc.getElementsByTagName("Valute");
            for (int i = 0; i < valutes.getLength(); i++) {
                Element valute = (Element) valutes.item(i);
                if (currency.equalsIgnoreCase(text(valute, "CharCode"))) {
                    BigDecimal value = new BigDecimal(text(valute, "Value").replace(',', '.'));
                    BigDecimal nominal = new BigDecimal(text(valute, "Nominal"));
                    return Optional.of(value.divide(nominal, 6, RoundingMode.HALF_UP));
                }
            }
            return Optional.empty();
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось разобрать XML курса BNM", e);
        }
    }

    private static String text(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent().trim() : "";
    }
}
