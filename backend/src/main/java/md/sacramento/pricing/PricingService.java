package md.sacramento.pricing;

import md.sacramento.catalog.Product;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.common.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class PricingService {

    private static final Logger log = LoggerFactory.getLogger(PricingService.class);

    private final ExchangeRateRepository rates;
    private final ProductRepository products;
    private final SettingsService settings;

    public PricingService(ExchangeRateRepository rates, ProductRepository products,
                          SettingsService settings) {
        this.rates = rates;
        this.products = products;
        this.settings = settings;
    }

    /** Действующий курс валюты к MDL с учётом режима (BANK / MANUAL). */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> currentRate(String currency) {
        if ("MDL".equalsIgnoreCase(currency)) {
            return Optional.of(BigDecimal.ONE);
        }
        ExchangeRate.Source preferred = ExchangeRate.Source.valueOf(settings.get(SettingsService.RATE_MODE));
        return rates.findFirstByCurrencyAndSourceOrderByRateDateDescCreatedAtDesc(currency, preferred)
                .or(() -> rates.findFirstByCurrencyOrderByRateDateDescCreatedAtDesc(currency))
                .map(ExchangeRate::getRate);
    }

    /** Розничная цена товара или empty, если не хватает данных (нет закупки/курса). */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> priceFor(Product product) {
        if (product.getPurchasePrice() == null) {
            return Optional.empty();
        }
        return currentRate(product.getPurchaseCurrency())
                .map(rate -> PriceCalculator.retail(
                        product.getPurchasePrice(), rate, resolveMarkup(product), roundingRule()));
    }

    /** Каскад наценки: товар → категория → глобальная настройка. */
    BigDecimal resolveMarkup(Product product) {
        if (product.getMarkupPercent() != null) {
            return product.getMarkupPercent();
        }
        if (product.getCategory() != null && product.getCategory().getMarkupPercent() != null) {
            return product.getCategory().getMarkupPercent();
        }
        return settings.getDecimal(SettingsService.GLOBAL_MARKUP_PERCENT);
    }

    RoundingRule roundingRule() {
        return RoundingRule.valueOf(settings.get(SettingsService.ROUNDING_RULE));
    }

    /** Пересчёт всех нерУчных цен — вызывается после смены курса или наценки. */
    @Transactional
    public int recalculateAll() {
        List<Product> toRecalc = products.findAllForRecalculation();
        int updated = 0;
        for (Product product : toRecalc) {
            Optional<BigDecimal> price = priceFor(product);
            if (price.isPresent() && !price.get().equals(product.getRetailPrice())) {
                product.setRetailPrice(price.get());
                updated++;
            }
        }
        products.saveAll(toRecalc);
        log.info("Пересчитано розничных цен: {}", updated);
        return updated;
    }

    @Transactional
    public ExchangeRate saveBankRate(String currency, BigDecimal rate, LocalDate date) {
        ExchangeRate saved = rates.save(
                new ExchangeRate(currency.toUpperCase(), rate, ExchangeRate.Source.BANK, date));
        recalculateAll();
        return saved;
    }

    @Transactional
    public ExchangeRate saveManualRate(String currency, BigDecimal rate) {
        if (rate.signum() <= 0) {
            throw new IllegalArgumentException("Курс должен быть положительным");
        }
        ExchangeRate saved = rates.save(
                new ExchangeRate(currency.toUpperCase(), rate, ExchangeRate.Source.MANUAL, LocalDate.now()));
        recalculateAll();
        return saved;
    }

    @Transactional
    public void setRateMode(ExchangeRate.Source mode) {
        settings.set(SettingsService.RATE_MODE, mode.name());
        recalculateAll();
    }

    @Transactional
    public void setGlobalMarkup(BigDecimal percent) {
        if (percent.signum() < 0) {
            throw new IllegalArgumentException("Наценка не может быть отрицательной");
        }
        settings.set(SettingsService.GLOBAL_MARKUP_PERCENT, percent.toPlainString());
        recalculateAll();
    }
}
