package md.sacramento.pricing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import md.sacramento.common.SettingsService;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/rates")
public class AdminRateController {

    public record RateRow(String currency, BigDecimal rate, ExchangeRate.Source source, LocalDate date) {
        static RateRow of(ExchangeRate r) {
            return new RateRow(r.getCurrency(), r.getRate(), r.getSource(), r.getRateDate());
        }
    }

    public record ManualRateRequest(@NotBlank String currency, @NotNull BigDecimal rate) {
    }

    private final PricingService pricingService;
    private final ExchangeRateRepository rates;
    private final SettingsService settings;

    public AdminRateController(PricingService pricingService, ExchangeRateRepository rates,
                               SettingsService settings) {
        this.pricingService = pricingService;
        this.rates = rates;
        this.settings = settings;
    }

    @GetMapping
    public Map<String, Object> current() {
        Map<String, Object> result = new HashMap<>();
        result.put("mode", settings.get(SettingsService.RATE_MODE));
        result.put("globalMarkupPercent", settings.getDecimal(SettingsService.GLOBAL_MARKUP_PERCENT));
        result.put("roundingRule", settings.get(SettingsService.ROUNDING_RULE));
        result.put("usd", pricingService.currentRate("USD").orElse(null));
        result.put("eur", pricingService.currentRate("EUR").orElse(null));
        return result;
    }

    @GetMapping("/history")
    public List<RateRow> history(@RequestParam(defaultValue = "USD") String currency,
                                 @RequestParam(defaultValue = "30") int limit) {
        return rates.findHistory(currency.toUpperCase(), PageRequest.of(0, Math.clamp(limit, 1, 365)))
                .stream().map(RateRow::of).toList();
    }

    @PostMapping("/manual")
    public RateRow setManual(@Valid @RequestBody ManualRateRequest body) {
        return RateRow.of(pricingService.saveManualRate(body.currency(), body.rate()));
    }

    @PostMapping("/mode")
    public Map<String, String> setMode(@RequestBody Map<String, String> body) {
        ExchangeRate.Source mode = ExchangeRate.Source.valueOf(body.get("mode"));
        pricingService.setRateMode(mode);
        return Map.of("mode", mode.name());
    }

    @PutMapping("/markup")
    public Map<String, BigDecimal> setMarkup(@RequestBody Map<String, BigDecimal> body) {
        BigDecimal percent = body.get("percent");
        pricingService.setGlobalMarkup(percent);
        return Map.of("percent", percent);
    }

    @PutMapping("/rounding")
    public Map<String, String> setRounding(@RequestBody Map<String, String> body) {
        RoundingRule rule = RoundingRule.valueOf(body.get("rule"));
        settings.set(SettingsService.ROUNDING_RULE, rule.name());
        pricingService.recalculateAll();
        return Map.of("rule", rule.name());
    }
}
