package md.sacramento.pricing;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PriceCalculatorTest {

    @ParameterizedTest
    // закупка; курс; наценка %; правило; ожидание
    @CsvSource({
            // 18.84 USD × 17.33 × 1.30 = 424.4475... → вверх до лея
            "18.84, 17.33, 30, TO_1, 425",
            "18.84, 17.33, 30, TO_5, 425",
            "18.84, 17.33, 30, NONE, 424.45",
            // 100 USD × 17.00 × 1.00 (наценка 0) = 1700 ровно
            "100, 17.00, 0, TO_1, 1700",
            // 312 MDL × 1 × 25% = 390
            "312, 1, 25, TO_1, 390",
            // округление до 5 леев вверх: 101 → 105
            "101, 1, 0, TO_5, 105",
            "100, 1, 0, TO_5, 100",
    })
    void calculatesRetailPrice(String purchase, String rate, String markup, RoundingRule rule,
                               String expected) {
        BigDecimal result = PriceCalculator.retail(
                new BigDecimal(purchase), new BigDecimal(rate), new BigDecimal(markup), rule);
        assertThat(result).isEqualByComparingTo(new BigDecimal(expected));
    }
}
