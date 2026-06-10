package md.sacramento.pricing;

import md.sacramento.TestcontainersConfiguration;
import md.sacramento.catalog.ProductDtos;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.catalog.ProductService;
import md.sacramento.common.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PricingIntegrationTest {

    @Autowired
    PricingService pricingService;

    @Autowired
    ProductService productService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    ExchangeRateRepository rateRepository;

    @Autowired
    SettingsService settings;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        rateRepository.deleteAll();
        settings.set(SettingsService.RATE_MODE, "BANK");
        settings.set(SettingsService.GLOBAL_MARKUP_PERCENT, "30");
        settings.set(SettingsService.ROUNDING_RULE, "TO_1");
    }

    @Test
    void newBankRateRecalculatesAutoPricesButNotManual() {
        Long autoPriced = productService.create(new ProductDtos.ProductRequest(
                "AUTO-1", "Автоцена", null, null, null,
                new BigDecimal("100"), "USD", null, null, false,
                null, 1, null, null, true, null)).id();
        Long manual = productService.create(new ProductDtos.ProductRequest(
                "MANUAL-1", "Ручная цена", null, null, null,
                new BigDecimal("100"), "USD", null, new BigDecimal("999"), true,
                null, 1, null, null, true, null)).id();

        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());

        // 100 × 17.00 × 1.30 = 2210
        assertThat(productRepository.findById(autoPriced).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("2210"));
        assertThat(productRepository.findById(manual).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("999"));
    }

    @Test
    void manualModePrefersManualRate() {
        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());
        pricingService.saveManualRate("USD", new BigDecimal("18.50"));

        pricingService.setRateMode(ExchangeRate.Source.MANUAL);
        assertThat(pricingService.currentRate("USD").orElseThrow())
                .isEqualByComparingTo(new BigDecimal("18.50"));

        pricingService.setRateMode(ExchangeRate.Source.BANK);
        assertThat(pricingService.currentRate("USD").orElseThrow())
                .isEqualByComparingTo(new BigDecimal("17.00"));
    }

    @Test
    void productMarkupOverridesGlobal() {
        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());
        Long id = productService.create(new ProductDtos.ProductRequest(
                "MARKUP-1", "Своя наценка", null, null, null,
                new BigDecimal("100"), "USD", new BigDecimal("50"), null, false,
                null, 1, null, null, true, null)).id();

        // 100 × 17.00 × 1.50 = 2550
        assertThat(productRepository.findById(id).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("2550"));
    }

    @Test
    void mdlPurchaseUsesRateOfOne() {
        Long id = productService.create(new ProductDtos.ProductRequest(
                "MDL-1", "Закупка в леях", null, null, null,
                new BigDecimal("312"), "MDL", new BigDecimal("25"), null, false,
                null, 1, null, null, true, null)).id();

        // 312 × 1 × 1.25 = 390
        assertThat(productRepository.findById(id).orElseThrow().getRetailPrice())
                .isEqualByComparingTo(new BigDecimal("390"));
    }
}
