package md.sacramento.pricing;

import md.sacramento.common.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Component
public class BnmRateScheduler {

    private static final Logger log = LoggerFactory.getLogger(BnmRateScheduler.class);
    private static final List<String> CURRENCIES = List.of("USD", "EUR");
    static final ZoneId CHISINAU = ZoneId.of("Europe/Chisinau");

    private final BnmRateClient client;
    private final PricingService pricingService;
    private final ExchangeRateRepository rates;
    private final SettingsService settings;

    public BnmRateScheduler(BnmRateClient client, PricingService pricingService,
                            ExchangeRateRepository rates, SettingsService settings) {
        this.client = client;
        this.pricingService = pricingService;
        this.rates = rates;
        this.settings = settings;
    }

    /** Утром после публикации курса BNM + повторные попытки днём, если утром не вышло. */
    @Scheduled(cron = "0 0 7,10,13 * * *", zone = "Europe/Chisinau")
    public void fetchDailyRates() {
        if (!"BANK".equals(settings.get(SettingsService.RATE_MODE))) {
            return;
        }
        LocalDate today = LocalDate.now(CHISINAU);
        for (String currency : CURRENCIES) {
            if (rates.existsByCurrencyAndRateDateAndSource(currency, today, ExchangeRate.Source.BANK)) {
                continue;
            }
            try {
                client.fetchRate(currency, today).ifPresentOrElse(
                        rate -> {
                            pricingService.saveBankRate(currency, rate, today);
                            log.info("Курс BNM {} на {}: {}", currency, today, rate);
                        },
                        () -> log.warn("BNM не вернул курс {} на {}", currency, today));
            } catch (Exception e) {
                log.error("Ошибка получения курса BNM {}: {}", currency, e.getMessage());
            }
        }
    }
}
