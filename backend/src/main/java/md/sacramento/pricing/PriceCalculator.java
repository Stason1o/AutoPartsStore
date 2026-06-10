package md.sacramento.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class PriceCalculator {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal FIVE = new BigDecimal("5");

    private PriceCalculator() {
    }

    /** retail(MDL) = закупка × курс × (1 + наценка/100), затем округление по правилу. */
    public static BigDecimal retail(BigDecimal purchase, BigDecimal rate,
                                    BigDecimal markupPercent, RoundingRule rule) {
        BigDecimal raw = purchase.multiply(rate)
                .multiply(BigDecimal.ONE.add(markupPercent.divide(HUNDRED, 6, RoundingMode.HALF_UP)));
        return switch (rule) {
            case NONE -> raw.setScale(2, RoundingMode.HALF_UP);
            case TO_1 -> raw.setScale(0, RoundingMode.CEILING);
            case TO_5 -> raw.divide(FIVE, 0, RoundingMode.CEILING).multiply(FIVE);
        };
    }
}
